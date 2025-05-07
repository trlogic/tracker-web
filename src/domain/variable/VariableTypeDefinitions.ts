export type TriggerVariableType = "element" | "history";
export type URLSelection = "full" | "host" | "port" | "path" | "query" | "fragment" | "protocol";
export type HistorySelection = "newUrl" | "oldUrl" | "newState" | "oldState" | "changeSource";

export type HistoryOption = { selection: HistorySelection };
export type ElementOption = { cssSelector: string, attribute?: string, urlSelection?: UrlOption }
export type VisibilityOption = { cssSelector: string, thresholdPercentage: number }
export type UrlOption = { selection: URLSelection }
export type CookieOption = { cookieName: string; decodeUrlCookie: boolean; }
export type JavascriptOption = { code: string; }
export type TriggerOption = { type: TriggerVariableType, option: ElementOption | HistoryOption }



export enum TrackerVariableWebType {
  URL = "URL",
  ELEMENT = "ELEMENT",
  COOKIE = "COOKIE",
  JAVASCRIPT = "JAVASCRIPT",
  EVENT = "EVENT",
  CUSTOM = "CUSTOM"
}
