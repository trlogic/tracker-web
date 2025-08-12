import TrackerEventMapping from "./TrackerEventMapping";
import TrackerTrigger from "./trigger/TrackerTrigger";
import TrackerVariable from "./variable/TrackerVariable";

interface TrackerSchema {
  name:      string;
  platform:  TrackerPlatform;
  triggers:  TrackerTrigger[];
  variables: TrackerVariable[];
  event:     TrackerEventMapping;
}

export enum TrackerPlatform {
  WEB = "WEB",
  MOBILE = "MOBILE",
}

export default TrackerSchema;
