import type TrackerSchema from "src/domain/TrackerSchema";
import { TrackerPlatform } from "src/domain/TrackerSchema";
import { EventBuilder } from "src/services/event-builder";
import { describe, expect, it } from "vitest";

const trackerSchema: TrackerSchema = {
  name:      "testTracker",
  platform:  TrackerPlatform.WEB,
  triggers:  [],
  variables: [],
  event:     {
    name:             "purchase",
    keyMapping:       "orderId",
    variableMappings: {
      orderId:     "{orderId}",
      amount:      "{amount}",
      currency:    "USD",
      composed:    "ID-{orderId}-AMT-{amount}",
      passthrough: "rawVariable",
    },
  },
};

describe("EventBuilder", () => {
  it("builds event payload with variable interpolation", () => {
    const payload = EventBuilder.buildEvent(trackerSchema, {
      orderId:     "123",
      amount:      50,
      rawVariable: "rawValue",
    });

    expect(payload.name).toBe("purchase");
    expect(payload.key).toBe("123");
    expect(payload.variables).toMatchObject({
      orderId:     "123",
      amount:      "50",
      currency:    "USD",
      composed:    "ID-123-AMT-50",
      passthrough: "rawValue",
    });
  });
});
