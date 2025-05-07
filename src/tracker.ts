//  ******************** TRACKER  ********************
import axios, {AxiosInstance, AxiosRequestConfig, AxiosResponse} from "axios";
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
import TrackerEventMapping from "./domain/TrackerEventMapping";
import {TrackerTriggerTypeWeb} from "./domain/TrackerTriggerType";

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

const globalVariables: Record<string, any> = {
  viewDuration: 0
}

let previousHref: string | undefined;

let tenant: string;
let serviceUrl: string;
let apiKey: string;

namespace TrackerManager {

  export type TrackerInitializeArgs = {
    serviceUrl: string;
    tenantName: string;
    apiKey: string
  };

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
      trackerConfig.trackers.forEach(tracker => tracker.triggers.forEach(triggerSchema => initListener(triggerSchema, tracker.variables, tracker.event)));
      return Promise.resolve();
    } catch (e) {
      return Promise.reject(e);
    }
  };

  export const triggerCustom = (name: string, variables: Record<string, any>) => {
    const payloads = buildCustomTriggerPayloads(name, variables);
    eventQueue.push(...payloads);
  }

  export const triggerCustomSync = async <T>(payload: TrackerPayload): Promise<T> => {
    try {
      const response: AxiosResponse<T> = await _axios.post(trackerConfig.apiUrl, payload, {
        headers: {
          "Content-Type": "application/json",
          "tenant": tenant
        }
      });
      return response.data;
    } catch (e: any) {
      throw new Error(e);
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

const buildCustomTriggerPayloads = (name: string, variables: Record<string, any>) => {
  const payloads: TrackerPayload[] = [];
  for (const tracker of trackerConfig.trackers) {
    const events = tracker.triggers.filter(t => t.type == TrackerTriggerTypeWeb.CUSTOM && ((t.option as CustomEventOption)?.event == name || t.name == name));
    if (events.length == 0) continue;
    const payload = buildEvent(tracker.event, variables);
    payloads.push(payload);
  }
  return payloads;
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

    const events: TrackerPayload[] = [];
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

const initListener = (triggerSchema: TrackerTrigger, trackerVariableSchemas: TrackerVariable[], eventSchema: TrackerEventMapping) => {
  switch (triggerSchema.type) {
    case TrackerTriggerTypeWeb.PAGE_VIEW: {
      previousHref = document.location.href;
      window.addEventListener("load", function (e) {
        const bodyList: HTMLElement = document.querySelector("body")!
        const observer = new MutationObserver(function (mutations) {
          mutations.forEach(function () {
            if (previousHref !== document.location.href) {
              eventListenerHandler(e, triggerSchema, trackerVariableSchemas, eventSchema);
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
        eventListenerHandler(e, triggerSchema, trackerVariableSchemas, eventSchema)
      });
      break;
    }
    default: {
      document.addEventListener(triggerSchema.type.toLowerCase(), (e) => {
        eventListenerHandler(e, triggerSchema, trackerVariableSchemas, eventSchema)
      });
      break;
    }
  }
};

const eventListenerHandler = (e: any, triggerSchema: TrackerTrigger, trackerVariableSchemas: TrackerVariable[], eventSchema: TrackerEventMapping) => {
  const trackerVariables: Record<string, any> = {};
  trackerVariableSchemas.forEach(trackerVariableSchema => {
    trackerVariables[trackerVariableSchema.name] = resolveTrackerVariable(trackerVariableSchema, e as MouseEvent)
  });
  const validated: boolean = validate(e as MouseEvent, triggerSchema);
  if (validated) {
    const event: TrackerPayload = buildEvent(eventSchema, trackerVariables);
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
interface TrackerConfig {
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

const resolveTrackerVariable = (trackerVariableSchema: TrackerVariable, mouseEvent: MouseEvent): string => {
  switch (trackerVariableSchema.type) {
    case "URL":
      return resolveUrlVariable(trackerVariableSchema as TrackerUrlVariable);
    case "COOKIE":
      return resolveCookieVariable(trackerVariableSchema as TrackerCookieVariable);
    case "ELEMENT":
      return resolveElementVariable(trackerVariableSchema as TrackerElementVariable)
//    case "VISIBILITY":
//      return resolveVisibilityVariable(trackerVariableSchema);
    case "JAVASCRIPT":
      return resolveJavascriptVariable(trackerVariableSchema as TrackerJavascriptVariable);
//    case "VIEW_DURATION":
//      return globalVariables.viewDuration ?? 0;
    case "EVENT":
      return resolveTriggerVariable(trackerVariableSchema as TrackerEventVariable, mouseEvent)
    case TrackerVariableWebType.CUSTOM:
      return resolveCustomVariable(trackerVariableSchema as TrackerCustomEventVariable);
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

const resolveTriggerVariable = (trackerVariableSchema: TrackerEventVariable, mouseEvent: MouseEvent): string => {
  const elementOption: ElementOption = trackerVariableSchema.selection as ElementOption;
  const parent: Element = document.createElement("div") as Element;
  // @ts-ignore
  parent.append(mouseEvent.target.cloneNode(true));
  const element: Element = parent.querySelector(elementOption.cssSelector) as Element;
  // @ts-ignore
  return element ? elementOption.attribute ? element.getAttribute(elementOption.attribute) : element.innerText : "";
}

// -----
const buildEvent = (eventSchema: TrackerEventMapping, trackerVariables: Record<string, any>): TrackerPayload => {
  const name: string = eventSchema.name;
  const variables: Record<string, any> = {};
  Object.entries(eventSchema.variableMappings).forEach(([key, value]) => variables[key] = resolveMapping(value, trackerVariables));

  return {name, key: variables[eventSchema.keyMapping], variables}
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
