import TrackerTrigger from "./trigger/TrackerTrigger";
import TrackerVariable from "./variable/TrackerVariable";
import TrackerEventMapping from "./TrackerEventMapping";

interface TrackerSchema {
  name: string;
  platform: TrackerPlatform;
  triggers: Array<TrackerTrigger>;
  variables: Array<TrackerVariable>;
  event: TrackerEventMapping;
}

export enum TrackerPlatform {
  WEB = "WEB",
  MOBILE = "MOBILE"
}

export default TrackerSchema;
