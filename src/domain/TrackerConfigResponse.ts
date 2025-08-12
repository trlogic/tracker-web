import TrackerSchema from "./TrackerSchema";

export interface TrackerConfigResponse {
  configs:           TrackerSchema[];
  transactionApiUrl: string;
}
