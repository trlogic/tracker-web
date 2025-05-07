import {VariableProperties} from "../VariablePropertiesDomains";
import {
  CookieOption,
  JavascriptOption, TrackerVariableWebType, TriggerOption, UrlOption,
  VisibilityOption
} from "./VariableTypeDefinitions";

interface TrackerVariable {
  type: TrackerVariableWebType;
  name: string;
  description: string;
  properties: VariableProperties;
}

export interface TrackerUrlVariable extends TrackerVariable {
  type: TrackerVariableWebType.URL;
  selection: URLSelection;
}

export interface TrackerElementVariable extends TrackerVariable {
  type: TrackerVariableWebType.ELEMENT;
  option: ElementOption
}

export interface TrackerCookieVariable extends TrackerVariable {
  type: TrackerVariableWebType.COOKIE;
  cookieName: string;
  decodeUrlCookie: boolean;
}

export interface TrackerJavascriptVariable extends TrackerVariable {
  type: TrackerVariableWebType.JAVASCRIPT;
  code: string;
}

export interface TrackerEventVariable extends TrackerVariable {
  type: TrackerVariableWebType.EVENT;
  selection: ElementOption;
}

export interface TrackerCustomEventVariable extends TrackerVariable {
  type: TrackerVariableWebType.CUSTOM;
}

export type ElementOption = { cssSelector: string; attribute: string; urlSelection?: URLSelection; }
export type URLSelection = "full" | "host" | "port" | "path" | "query" | "fragment" | "protocol";
export type HistorySelection = "newUrl" | "oldUrl" | "newState" | "oldState" | "changeSource";

export default TrackerVariable;
