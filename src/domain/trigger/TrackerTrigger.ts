import TrackerFilterJsonModel from "../filter/TrackerFilterJsonModel";
import { TrackerTriggerTypeWeb } from "../TrackerTriggerType";

interface TrackerTrigger {
  name:    string;
  type:    TrackerTriggerTypeWeb;
  filters: TrackerFilterJsonModel[];
  option:  ClickOption | ScrollOptions | CustomEventOption;
}

export interface ClickOption {
  justLinks: boolean;
}
export interface ScrollOptions {
  horizontal: boolean;
  vertical:   boolean;
}
export interface CustomEventOption {
  event: string;
}

export default TrackerTrigger;
