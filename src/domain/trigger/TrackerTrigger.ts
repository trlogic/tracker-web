import TrackerFilterJsonModel from "../filter/TrackerFilterJsonModel";
import { TrackerTriggerTypeWeb } from "../TrackerTriggerType";

interface TrackerTrigger {
  name: string;
  type: TrackerTriggerTypeWeb;
  filters: TrackerFilterJsonModel[];
  option: ClickOption | ScrollOptions | CustomEventOption;
}

export type ClickOption = { justLinks: boolean };
export type ScrollOptions = { horizontal: boolean; vertical: boolean };
export type CustomEventOption = { event: string };

export default TrackerTrigger;
