/**
 * Event mapping and payload building service
 */

import TrackerSchema from "src/domain/TrackerSchema";
import { TrackerPayload } from "src/types/tracker";

export class EventBuilder {
  static buildEvent(eventSchema: TrackerSchema, trackerVariables: Record<string, unknown>): TrackerPayload {
    const name = eventSchema.event.name;
    const variables: Record<string, unknown> = {};

    Object.entries(eventSchema.event.variableMappings).forEach(([key, value]) => {
      variables[key] = this.resolveMapping(value, trackerVariables);
    });

    return {
      name,
      key: String(variables[eventSchema.event.keyMapping] ?? ""),
      variables,
    };
  }

  private static resolveMapping(mapping: string, trackerVariables: Record<string, unknown>): unknown {
    const matches = this.findMatches(mapping, /{.*?}/g);

    // If no matches, check if mapping name matches any tracker variable
    if (matches.length === 0 && Object.prototype.hasOwnProperty.call(trackerVariables, mapping)) {
      return trackerVariables[mapping];
    }

    let resolvedMapping = mapping;
    matches.forEach((match) => {
      const variableName = match.substring(1, match.length - 1);
      const variableValue = String(trackerVariables[variableName] ?? "");
      resolvedMapping = resolvedMapping.replace(match, variableValue);
    });

    return resolvedMapping;
  }

  private static findMatches(string: string, regex: RegExp): string[] {
    const matches: string[] = [];
    let regExpExecArray: RegExpExecArray | null;

    // Reset regex lastIndex to avoid issues with global regex
    regex.lastIndex = 0;

    while ((regExpExecArray = regex.exec(string)) !== null) {
      matches.push(regExpExecArray[0]);

      // Prevent infinite loop with zero-length matches
      if (regExpExecArray[0].length === 0) {
        regex.lastIndex++;
      }
    }

    return matches;
  }
}
