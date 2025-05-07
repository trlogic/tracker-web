import TrackerFilterOperator from "./TrackerFilterOperator";

interface TrackerFilterJsonModel {
  field: string;
  operator: TrackerFilterOperator;
  value: string;
}

export default TrackerFilterJsonModel;
