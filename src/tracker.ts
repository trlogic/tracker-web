//  ******************** TRACKER  ********************
import axios, {AxiosInstance, AxiosRequestConfig} from "axios";
import TrackerSchema from "./domain/TrackerSchema";
import TrackerTrigger, {ClickOption, CustomEventOption} from "./domain/trigger/TrackerTrigger";
import TrackerVariable, {
  TrackerCookieVariable,
  TrackerCustomEventVariable,
  TrackerElementVariable,
  TrackerEventVariable,
  TrackerJavascriptVariable,
  TrackerUrlVariable
} from "./domain/variable/TrackerVariable";
import {
  ElementOption,
  TrackerVariableWebType,
  URLSelection,
} from "./domain/variable/VariableTypeDefinitions";
import {TrackerTriggerTypeWeb} from "./domain/TrackerTriggerType";
import FingerprintJS from '@fingerprintjs/fingerprintjs';
import {monitorRemoteControlSuspicion, SuspiciousFlags} from "./remote";
import {TransactionResult} from "./domain/TransactionResult";

export type TrackerPayload = { name: string, key: string, variables: Record<string, any> };
export type TrackerResponse = {
  transactionApiUrl: string;
  configs: Array<TrackerSchema>
}
const _axios: AxiosInstance = axios.create({headers: {"Content-Type": "application/json"}});
const eventQueue: TrackerPayload[] = [];

const trackerConfig: TrackerConfig = {
  apiUrl: "",
  trackers: []
}

let timerInstance: any = undefined;
let ip: string | undefined = undefined;
let deviceIdFingerPrint: string | undefined = undefined;

const globalVariables: Record<string, any> = {
  viewDuration: 0
}

let previousHref: string | undefined;

let tenant: string;
let serviceUrl: string;
let apiKey: string;

let suspiciousFlags: SuspiciousFlags = {
  unnaturalMouseMoves: false,
  bigClipboardPaste: false,
  lowFPSDetected: false,
  delayedClickDetected: false,
}

namespace TrackerManager {

  export type TrackerInitializeArgs = {
    serviceUrl: string;
    tenantName: string;
    apiKey: string
  };

  export type TrackerRequestConfig = {
    timeoutMs?: number;
  }

  export const initialize = async (args: TrackerInitializeArgs): Promise<void> => {
    try {
      const {serviceUrl: _serviceUrl, tenantName, apiKey: _apiKey} = args;
      if (args == undefined) {
        console.error("Tracker run args must be passed as parameters");
        return;
      }
      if (_serviceUrl == null || _serviceUrl.trim().length == 0) {
        console.error("Service url must be passed");
        return;
      }
      if (args.apiKey == null || args.apiKey.trim().length == 0) {
        console.error("API key must be passed as parameters");
        return;
      }
      if (tenantName == null || tenantName.trim().length == 0) {
        console.error("Tenant name must be passed");
        return;
      }
      tenant = tenantName;
      serviceUrl = _serviceUrl
      apiKey = _apiKey;
      await getTrackers();
      initClientWorker();
      initTimer();
      await fetchIp();
      await getDeviceIdFingerPrint();
      monitorRemoteControlSuspicion((flags) => {
        suspiciousFlags = {...flags};
      })
      trackerConfig.trackers.forEach(tracker => tracker.triggers.forEach(triggerSchema => initListener(triggerSchema, tracker)));
      return Promise.resolve();
    } catch (e) {
      return Promise.reject(e);
    }
  };

  export const triggerCustom = async (name: string, variables: Record<string, any>) => {
    const payload = await buildCustomTriggerPayload(name, variables);
    if (payload) {
      eventQueue.push(payload);
    }
  }

  export const triggerCustomSync = async (name: string, variables: Record<string, any>, config?: TrackerRequestConfig): Promise<TransactionResult | null> => {
    try {
      const payload = await buildCustomTriggerPayload(name, variables);
      if (!payload) return null;
      const response = await _axios.post<TransactionResult>(trackerConfig.apiUrl, payload, {
        headers: {
          tenant: tenant
        },
        timeout: config?.timeoutMs
      });
      return response.data;
    } catch (e: any) {
      return null;
    }
  }

  export const setUserDefinedVariable = (name: string, value: any) => {
    globalVariables[name] = value;
  }

  export const getUserDefinedVariable = (name: string): any => {
    return globalVariables[name];
  }

  /**
   * Returns clones of all user defined variables
   */
  export const getUserDefinedVariables = () => {
    return {...globalVariables};
  }
}

export default TrackerManager

const fetchIp = async (): Promise<void> => {
  try {
    const response = await _axios.get("https://api.ipify.org?format=json");
    ip = response.data.ip;
  } catch (e) {
    console.error("Error fetching IP address:", e);
    ip = "unknown";
  }
}

const getDeviceIdFingerPrint = async (): Promise<void> => {
  const fp = await FingerprintJS.load();
  const result = await fp.get();
  deviceIdFingerPrint = result.visitorId;
}

const buildCustomTriggerPayload = async (name: string, variables: Record<string, any>) => {
  for (const tracker of trackerConfig.trackers) {
    const event = tracker.triggers.find(t => t.type == TrackerTriggerTypeWeb.CUSTOM && ((t.option as CustomEventOption)?.event == name || t.name == name));
    if (!event) continue;
    for (const variable of tracker.variables) {
      if (variable.type == TrackerVariableWebType.CUSTOM) {
        if (!variables.hasOwnProperty(variable.name)) {
          variables[variable.name] = await resolveTrackerVariable(variable, new MouseEvent(""));
        }
      } else {
        variables[variable.name] = await resolveTrackerVariable(variable, new MouseEvent(""));
      }
    }
    return buildEvent(tracker, variables)
  }
  return null;
}

const getTrackers = async () => {
  try {
    const requestConfig: AxiosRequestConfig = {
      headers: {
        "tenant": tenant,
        "api-key": apiKey,
        "Content-Type": "application/json",
        "platform": "web"
      }
    }
    const apiUrl = `${serviceUrl}/sentinel/v1`;
    const config = await _axios.get<TrackerResponse>(apiUrl, requestConfig)
    trackerConfig.trackers = config.data.configs;
    trackerConfig.apiUrl = apiUrl
    return Promise.resolve();
  } catch (e) {
    return Promise.reject(e);
  }
}

const initClientWorker = () => {
  setInterval(() => {
    const isOnline = window.navigator.onLine;
    if (!isOnline) return;

    while (eventQueue.length > 0) {
      if (!isOnline) {
        break;
      }
      const event: TrackerPayload = eventQueue.pop()!;
      _axios.post(trackerConfig.apiUrl, event, {
        headers: {
          tenant: tenant
        }
      });
    }
  }, 3000);
}

//  ******************** TIMER  ********************

const initTimer = () => {
  timerInstance = setInterval(timerHandler, 100);
}

const resetTimer = () => {
  globalVariables.viewDuration = 0;
}

const timerHandler = () => {
  globalVariables.viewDuration += 100;
}

//  ******************** EVENT HANDLERS  ********************

const initListener = (triggerSchema: TrackerTrigger, tracker: TrackerSchema) => {
  switch (triggerSchema.type) {
    case TrackerTriggerTypeWeb.PAGE_VIEW: {
      previousHref = document.location.href;
      window.addEventListener("load", function (e) {
        const bodyList: HTMLElement = document.querySelector("body")!
        const observer = new MutationObserver(function (mutations) {
          mutations.forEach(function () {
            if (previousHref !== document.location.href) {
              eventListenerHandler(e, triggerSchema, tracker);
              previousHref = document.location.href;
            }
          });
        });
        const config = {
          childList: true,
          subtree: true
        };
        observer.observe(bodyList, config);
      });
      break;
    }
    case TrackerTriggerTypeWeb.CUSTOM: {
      document.addEventListener(triggerSchema.name, (e) => {
        eventListenerHandler(e, triggerSchema, tracker)
      });
      break;
    }
    default: {
      document.addEventListener(triggerSchema.type.toLowerCase(), (e) => {
        eventListenerHandler(e, triggerSchema, tracker)
      });
      break;
    }
  }
};

const eventListenerHandler = async (e: any, triggerSchema: TrackerTrigger, tracker: TrackerSchema) => {
  const trackerVariables: Record<string, any> = {};
  for (const variable of tracker.variables) {
    trackerVariables[variable.name] = await resolveTrackerVariable(variable, e as MouseEvent)
  }
  const validated: boolean = validate(e as MouseEvent, triggerSchema);
  if (validated) {
    const event: TrackerPayload = buildEvent(tracker, trackerVariables);
    sendEvent(event);
  }
}

const validate = (e: MouseEvent, triggerSchema: TrackerTrigger,): boolean => {
  switch (triggerSchema.name) {
    case "click":
      const clickOption: ClickOption = triggerSchema.option as ClickOption;
      // @ts-ignore
      if (clickOption.justLinks && !e.target.hasAttribute("href")) return false;
      else break;
    case "scroll":
      // TODO horizontal ve vertical flag kontrolleri yapılacak
      break
  }
  return true;
  //return triggerSchema.filters.length == 0 || triggerSchema.filters.every(filter => calculateFilter(filter, trackerVariables));
}

//  ******************** CLIENT ********************
const sendEvent = (event: TrackerPayload) => {
  eventQueue.push(event);
}

//  ******************** CONFIG ********************
export interface TrackerConfig {
  trackers: TrackerSchema[];
  apiUrl: string
}

//  ******************** TRIGGER ********************
declare type Operator =
  "isEquals" | "isEqualsIgnoreCase" | "notEquals" | "notEqualsIgnoreCase" |
  "isContains" | "isContainsIgnoreCase" | "notContains" | "notContainsIgnoreCase" |
  "isStartsWith" | "isStartsWithIgnoreCase" | "notStartsWith" | "notStartsWithIgnoreCase" |
  "isEndsWith" | "isEndsWithIgnoreCase" | "notEndsWith" | "notEndsWithIgnoreCase" |
  "isRegexMatch" | "isRegexMatchIgnoreCase" | "notRegexMatch" | "notRegexMatchIgnoreCase" |
  "lessThan" | "lessThanOrEquals" | "greaterThan" | "greaterThanOrEquals";

interface Filter {
  left: string

  operator: Operator;

  right: string
}


// ******************** TRACKER UTILS ********************

const calculateFilter = (filter: Filter, variables: Record<string, any>): boolean => {
  const leftValue: string = variables[filter.left];
  const rightValue: string = filter.right;

  switch (filter.operator) {
    case "isEquals":
      return leftValue == rightValue;
    case "isEqualsIgnoreCase":
      return leftValue.toLowerCase() == rightValue.toLowerCase();
    case "notEquals":
      return leftValue != rightValue;
    case "notEqualsIgnoreCase":
      return leftValue.toLowerCase() != rightValue.toLowerCase();
    case "isContains":
      return leftValue.includes(rightValue);
    case "isContainsIgnoreCase":
      return leftValue.toLowerCase().includes(rightValue.toLowerCase());
    case "notContains":
      return !leftValue.includes(rightValue);
    case "notContainsIgnoreCase":
      return !leftValue.toLowerCase().includes(rightValue.toLowerCase());
    case "isStartsWith":
      return leftValue.startsWith(rightValue);
    case "isStartsWithIgnoreCase":
      return leftValue.toLowerCase().startsWith(rightValue.toLowerCase());
    case "notStartsWith":
      return !leftValue.startsWith(rightValue);
    case "notStartsWithIgnoreCase":
      return !leftValue.toLowerCase().startsWith(rightValue.toLowerCase());
    case "isEndsWith":
      return leftValue.endsWith(rightValue);
    case "isEndsWithIgnoreCase":
      return leftValue.toLowerCase().endsWith(rightValue.toLowerCase());
    case "notEndsWith":
      return !leftValue.endsWith(rightValue);
    case "notEndsWithIgnoreCase":
      return !leftValue.toLowerCase().endsWith(rightValue.toLowerCase());
    case "lessThan":
      return (Number.parseFloat(leftValue) < Number.parseFloat(rightValue));
    case "lessThanOrEquals":
      return (Number.parseFloat(leftValue) <= Number.parseFloat(rightValue));
    case "greaterThan":
      return (Number.parseFloat(leftValue) > Number.parseFloat(rightValue));
    case "greaterThanOrEquals":
      return (Number.parseFloat(leftValue) >= Number.parseFloat(rightValue));
    case "isRegexMatch": {
      const result = new RegExp(`${rightValue}`, "g").exec(leftValue);
      return result != undefined && result.length > 0;
    }
    case "isRegexMatchIgnoreCase": {
      const result = new RegExp(`${rightValue}`, "g").exec(leftValue.toLowerCase());
      return result != undefined && result.length > 0;
    }
    case "notRegexMatch": {
      const result = new RegExp(`${rightValue}`, "g").exec(leftValue);
      return !(result != undefined && result.length > 0);
    }
    case "notRegexMatchIgnoreCase": {
      const result = new RegExp(`${rightValue}`, "g").exec(leftValue.toLowerCase());
      return !(result != undefined && result.length > 0);
    }
    default:
      return false;
  }
}

// -----

const resolveTrackerVariable = async (trackerVariableSchema: TrackerVariable, mouseEvent: MouseEvent): Promise<string | number | boolean | Record<string, any> | null> => {
  switch (trackerVariableSchema.type) {
    case TrackerVariableWebType.URL:
      return resolveUrlVariable(trackerVariableSchema as TrackerUrlVariable);
    case TrackerVariableWebType.COOKIE:
      return resolveCookieVariable(trackerVariableSchema as TrackerCookieVariable);
    case TrackerVariableWebType.ELEMENT:
      return resolveElementVariable(trackerVariableSchema as TrackerElementVariable)
    case TrackerVariableWebType.JAVASCRIPT:
      return resolveJavascriptVariable(trackerVariableSchema as TrackerJavascriptVariable);
    case TrackerVariableWebType.EVENT:
      return resolveTriggerVariable(trackerVariableSchema as TrackerEventVariable, mouseEvent)
    case TrackerVariableWebType.IP_ADDRESS:
      return resolveIpAddressVariable();
    case TrackerVariableWebType.DEVICE_FINGERPRINT:
      return resolveDeviceFingerPrint()
    case TrackerVariableWebType.SUSPICIOUS_ACTIVITY:
      return resolveSuspiciousActivityVariable();
    case TrackerVariableWebType.SUSPICIOUS_BROWSER:
      return isSuspiciousBrowser();
    case TrackerVariableWebType.LANGUAGE:
      return navigator.language || (navigator as any).userLanguage || "";
    case TrackerVariableWebType.TIMEZONE:
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    case TrackerVariableWebType.OS:
      return resolveOS()
    case TrackerVariableWebType.BROWSER:
      return resolveBrowser();
    case TrackerVariableWebType.CUSTOM:
      return resolveCustomVariable(trackerVariableSchema as TrackerCustomEventVariable);
    //    case "VISIBILITY":
    //      return resolveVisibilityVariable(trackerVariableSchema);
    //    case "VIEW_DURATION":
    //      return globalVariables.viewDuration ?? 0;
    default :
      return "";
  }
};

const resolveCustomVariable = (trackerVariableSchema: TrackerCustomEventVariable): string => {
  const variableName: string = trackerVariableSchema.name;
  return globalVariables[variableName] ?? "";
}

const resolveUrlVariable = (trackerVariableSchema: TrackerUrlVariable): string => {
  const location: Location = window.location;
  const option: URLSelection = trackerVariableSchema.selection;
  switch (option) {
    case "full":
      return location.href;
    case "host":
      return location.hostname;
    case "port":
      return location.port;
    case "path":
      return location.pathname;
    case "query":
      return location.search.substring(1);
    case "fragment":
      let parts: string[] = location.href.split("#");
      return parts.length > 1 ? parts[1] : "";
    case "protocol":
      return location.protocol.substring(0, location.protocol.length - 1);
    default:
      return "";
  }
}

const resolveCookieVariable = (trackerVariableSchema: TrackerCookieVariable): string => {
  const cookieName: string = trackerVariableSchema.cookieName;
  const cookies: string[] = document.cookie.split(';')
    .map(cookie => cookie.trim())
    .filter(cookie => cookie.substring(0, cookieName.length) == cookieName)
    .map(cookie => trackerVariableSchema.decodeUrlCookie ? decodeURIComponent(cookie.substring(cookieName.length)) : cookie);

  return cookies[0] ?? "";
}

const resolveElementVariable = (trackerVariableSchema: TrackerElementVariable): string => {
  const option: ElementOption = trackerVariableSchema.option as ElementOption;
  const element: Element | null = document.querySelector(option.cssSelector);
  return !element ? "" : !option.attribute ? element.textContent ?? "" : element.getAttribute(option.attribute) ?? "";
}

/*const resolveVisibilityVariable = (trackerVariableSchema: TrackerVariable): string => {
  const option: VisibilityOption = trackerVariableSchema.option as VisibilityOption;
return ""; //TODO yapılacak
}*/

const resolveJavascriptVariable = (trackerVariableSchema: TrackerJavascriptVariable): string => {
  try {
    return eval(trackerVariableSchema.code) ?? "";
  } catch (error) {
    console.error(error);
    return "";
  }
}

const resolveIpAddressVariable = (): string => {
  if (ip == undefined || ip == "unknown") {
    return "";
  }
  return ip;
}

const resolveBrowser = (): string | null => {
  const userAgent = navigator.userAgent;
  if (/Edg/i.test(userAgent)) return 'Edge';
  if (/OPR|Opera/i.test(userAgent)) return 'Opera';
  if (/Chrome/i.test(userAgent)) return 'Chrome';
  if (/Safari/i.test(userAgent)) return 'Safari';
  if (/Firefox/i.test(userAgent)) return 'Firefox';
  if (/MSIE|Trident/i.test(userAgent)) return 'Internet Explorer';
  return null;
}

const resolveOS = (): string | null => {
  const userAgent = navigator.userAgent;
  const platform = navigator.platform;
  if (/Win/i.test(platform)) return 'Windows';
  if (/Mac/i.test(platform)) return 'macOS';
  if (/Linux/i.test(platform)) return 'Linux';
  if (/Android/i.test(userAgent)) return 'Android';
  if (/iPhone|iPad|iPod/i.test(userAgent)) return 'iOS';
  return null;
}

const resolveDeviceFingerPrint = (): string => {
  return deviceIdFingerPrint ?? "";
}

const resolveSuspiciousActivityVariable = () => {
  const flags: SuspiciousFlags = suspiciousFlags;
  let score: number = 0;
  if (flags.unnaturalMouseMoves) score += 0.25;
  if (flags.bigClipboardPaste) score += 0.25;
  if (flags.lowFPSDetected) score += 0.25;
  if (flags.delayedClickDetected) score += 0.25;
  return score;
}

const resolveTriggerVariable = (trackerVariableSchema: TrackerEventVariable, mouseEvent: MouseEvent): string => {
  const elementOption: ElementOption = trackerVariableSchema.selection as ElementOption;
  const parent: Element = document.createElement("div") as Element;
  // @ts-ignore
  parent.append(mouseEvent.target?.cloneNode(true));
  const element: Element = parent.querySelector(elementOption.cssSelector) as Element;
  // @ts-ignore
  return element ? elementOption.attribute ? element.getAttribute(elementOption.attribute) : element.innerText : "";
}

// -----
const buildEvent = (eventSchema: TrackerSchema, trackerVariables: Record<string, any>): TrackerPayload => {
  const name: string = eventSchema.event.name;
  const variables: Record<string, any> = {};
  Object.entries(eventSchema.event.variableMappings).forEach(([key, value]) => variables[key] = resolveMapping(value, trackerVariables));

  return {name, key: variables[eventSchema.event.keyMapping], variables}
};

const resolveMapping = (mapping: string, trackerVariables: Record<string, any>): string => {
  const matches: string[] = findMatches(mapping, /{.*?}/g)

  //if not match, then we check if mapping name is match any of tracker variable match
  if (matches.length == 0 && trackerVariables.hasOwnProperty(mapping)) {
    return trackerVariables[mapping];
  }

  matches.forEach(match => {
    const variableName: string = match.substring(1, match.length - 1);
    const variableValue: string = trackerVariables[variableName];
    mapping = mapping.replace(match, variableValue);
  });

  return mapping;
}

const findMatches = (string: string, regex: RegExp): string[] => {
  const matches: string[] = [];
  let regExpExecArray: RegExpExecArray | null;
  while ((regExpExecArray = regex.exec(string)) != undefined) {
    const match = regExpExecArray[0];
    matches.push(match)
  }

  return matches;
}

const isSuspiciousBrowser = async () => {
  try {
    if (navigator.webdriver) return true;

    if (!navigator.languages || navigator.languages.length === 0) return true;
    if (!navigator.plugins || navigator.plugins.length === 0) return true;

    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) return true;
    canvas.remove();

    if (navigator.permissions) {
      const result = await navigator.permissions.query({name: 'notifications'});
      if (Notification.permission === 'denied' && result.state === 'prompt') {
        return true;
      }
    }

    if (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 1) return true;

    if (/Mobi|Android/i.test(navigator.userAgent) && !('ontouchstart' in window)) return true;

    return false;
  } catch (e) {
    return true;
  }
}
