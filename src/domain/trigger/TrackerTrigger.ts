import TrackerFilterJsonModel from "../filter/TrackerFilterJsonModel";
import {TrackerTriggerTypeMobile, TrackerTriggerTypeWeb} from "../TrackerTriggerType";

interface TrackerTrigger {
  name: string;
  type: TrackerTriggerTypeMobile|TrackerTriggerTypeWeb;
  filters: TrackerFilterJsonModel[];
  option: ClickOption | ScrollOptions | CustomEventOption;
}

export type ClickOption = { justLinks: boolean }
export type ScrollOptions = { horizontal: boolean; vertical: boolean; }
export type CustomEventOption = { event: string };


export default TrackerTrigger
