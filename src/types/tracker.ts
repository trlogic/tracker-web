/**
 * Type definitions for tracker payload and response
 */

import TrackerSchema from "src/domain/TrackerSchema";

export interface TrackerPayload {
  name:      string;
  key:       string;
  variables: Record<string, unknown>;
}

export interface TrackerResponse {
  transactionApiUrl: string;
  configs:           TrackerSchema[];
}

export interface TrackerInitializeArgs {
  serviceUrl: string;
  tenantName: string;
  apiKey:     string;
}

export interface TrackerRequestConfig {
  timeoutMs?: number;
}

export interface TrackerConfig {
  trackers: TrackerSchema[];
  apiUrl:   string;
}

export interface TrackerState {
  tenant:               string;
  serviceUrl:           string;
  apiKey:               string;
  ip?:                  string;
  deviceIdFingerPrint?: string;
  previousHref?:        string;
  timerInstance?:       number;
}

export interface GlobalVariables {
  viewDuration: number;
  [key: string]: unknown;
}
