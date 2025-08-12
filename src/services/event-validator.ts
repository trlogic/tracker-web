/**
 * Event validation service
 */

import TrackerTrigger, { ClickOption } from "src/domain/trigger/TrackerTrigger";

export class EventValidator {
  static validate(event: MouseEvent, triggerSchema: TrackerTrigger): boolean {
    switch (triggerSchema.name) {
      case "click":
        return this.validateClick(event, triggerSchema.option as ClickOption | undefined);
      case "scroll":
        // TODO: Add horizontal and vertical flag checks
        return true;
      default:
        return true;
    }
  }

  private static validateClick(event: MouseEvent, clickOption?: ClickOption): boolean {
    if (typeof clickOption !== "undefined" && !clickOption.justLinks) return true;

    const target = event.target as Element | null;
    if (!target) return false;

    return target.hasAttribute("href");
  }
}
