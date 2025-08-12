export type TriggerVariableType = "element" | "history";
export type URLSelection = "full" | "host" | "port" | "path" | "query" | "fragment" | "protocol";
export type HistorySelection = "newUrl" | "oldUrl" | "newState" | "oldState" | "changeSource";

export interface HistoryOption {
  selection: HistorySelection;
}
export interface ElementOption {
  cssSelector:   string;
  attribute?:    string;
  urlSelection?: UrlOption;
}
export interface VisibilityOption {
  cssSelector:         string;
  thresholdPercentage: number;
}
export interface UrlOption {
  selection: URLSelection;
}
export interface CookieOption {
  cookieName:      string;
  decodeUrlCookie: boolean;
}
export interface JavascriptOption {
  code: string;
}
export interface TriggerOption {
  type:   TriggerVariableType;
  option: ElementOption | HistoryOption;
}

export enum TrackerVariableWebType {
  URL = "URL",
  ELEMENT = "ELEMENT",
  COOKIE = "COOKIE",
  JAVASCRIPT = "JAVASCRIPT",
  EVENT = "EVENT",
  IP_ADDRESS = "IP_ADDRESS",
  DEVICE_FINGERPRINT = "DEVICE_FINGERPRINT",
  SUSPICIOUS_ACTIVITY = "SUSPICIOUS_ACTIVITY",
  SUSPICIOUS_BROWSER = "SUSPICIOUS_BROWSER",
  LANGUAGE = "LANGUAGE",
  TIMEZONE = "TIMEZONE",
  OS = "OS",
  BROWSER = "BROWSER",
  CUSTOM = "CUSTOM",
  SCREEN_RESOLUTION = "SCREEN_RESOLUTION",
  USER_AGENT = "USER_AGENT",
  REMOTE_ACCESS_SCORE = "REMOTE_ACCESS_SCORE",
  REMOTE_ACCESS_FLAGS_JSON = "REMOTE_ACCESS_FLAGS_JSON",
  ENVIRONMENT_CHANGE_FLAGS = "ENVIRONMENT_CHANGE_FLAGS",
  ENVIRONMENT_CHANGE_SCORE = "ENVIRONMENT_CHANGE_SCORE",
  NO_MOUSE_MOVE_DURATION_MS = "NO_MOUSE_MOVE_DURATION_MS",
  CLICK_ONLY_PATTERN = "CLICK_ONLY_PATTERN",
  FAST_PAGE_TRANSITION = "FAST_PAGE_TRANSITION",
  FORM_FILL_ANOMALY = "FORM_FILL_ANOMALY",
  FORM_FILL_DURATION_MS = "FORM_FILL_DURATION_MS",
  NAVIGATION_VELOCITY = "NAVIGATION_VELOCITY",
  INPUT_PASTE_RATIO = "INPUT_PASTE_RATIO",
  HEADLESS_INDICATOR_COUNT = "HEADLESS_INDICATOR_COUNT",
}
