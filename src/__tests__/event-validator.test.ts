import { TrackerTriggerTypeWeb } from "src/domain/TrackerTriggerType";
import TrackerTrigger, { ClickOption } from "src/domain/trigger/TrackerTrigger";
import { EventValidator } from "src/services/event-validator";
import { beforeEach, describe, expect, it } from "vitest";

describe("EventValidator", () => {
  beforeEach(() => {
    // Set up DOM
    document.body.innerHTML = "";
  });

  describe("click validation", () => {
    it("validates click event without options - checks for href", () => {
      const trigger: TrackerTrigger = {
        name:    "click",
        type:    TrackerTriggerTypeWeb.CLICK,
        filters: [],
        option:  undefined as unknown as ClickOption,
      };

      // Create a link element with href
      const element = document.createElement("a");
      element.setAttribute("href", "https://example.com");
      document.body.appendChild(element);

      const event = new MouseEvent("click", { bubbles: true });
      Object.defineProperty(event, "target", { value: element });

      const result = EventValidator.validate(event, trigger);
      expect(result).toBe(true);
    });

    it("validates click event with justLinks=false - returns true", () => {
      const trigger: TrackerTrigger = {
        name:    "click",
        type:    TrackerTriggerTypeWeb.CLICK,
        filters: [],
        option:  { justLinks: false },
      };

      // Create a div element (not a link)
      const divElement = document.createElement("div");
      document.body.appendChild(divElement);

      const event = new MouseEvent("click", { bubbles: true });
      Object.defineProperty(event, "target", { value: divElement });

      const result = EventValidator.validate(event, trigger);
      expect(result).toBe(true);
    });

    it("validates click event with justLinks option - valid link", () => {
      const trigger: TrackerTrigger = {
        name:    "click",
        type:    TrackerTriggerTypeWeb.CLICK,
        filters: [],
        option:  { justLinks: true },
      };

      // Create a link element
      const linkElement = document.createElement("a");
      linkElement.setAttribute("href", "https://example.com");
      document.body.appendChild(linkElement);

      const event = new MouseEvent("click", { bubbles: true });
      Object.defineProperty(event, "target", { value: linkElement });

      const result = EventValidator.validate(event, trigger);
      expect(result).toBe(true);
    });

    it("validates click event with justLinks option - invalid non-link", () => {
      const trigger: TrackerTrigger = {
        name:    "click",
        type:    TrackerTriggerTypeWeb.CLICK,
        filters: [],
        option:  { justLinks: true },
      };

      // Create a div element (not a link)
      const divElement = document.createElement("div");
      document.body.appendChild(divElement);

      const event = new MouseEvent("click", { bubbles: true });
      Object.defineProperty(event, "target", { value: divElement });

      const result = EventValidator.validate(event, trigger);
      expect(result).toBe(false);
    });

    it("handles click event with null target", () => {
      const trigger: TrackerTrigger = {
        name:    "click",
        type:    TrackerTriggerTypeWeb.CLICK,
        filters: [],
        option:  { justLinks: true },
      };

      const event = new MouseEvent("click", { bubbles: true });
      Object.defineProperty(event, "target", { value: null });

      const result = EventValidator.validate(event, trigger);
      expect(result).toBe(false);
    });
  });

  describe("scroll validation", () => {
    it("validates scroll event - returns true by default", () => {
      const trigger: TrackerTrigger = {
        name:    "scroll",
        type:    TrackerTriggerTypeWeb.SCROLL,
        filters: [],
        option:  { horizontal: true, vertical: true },
      };

      const event = new MouseEvent("scroll");
      const result = EventValidator.validate(event, trigger);
      expect(result).toBe(true);
    });
  });

  describe("default validation", () => {
    it("validates unknown event types - returns true by default", () => {
      const trigger: TrackerTrigger = {
        name:    "unknown",
        type:    "unknown" as TrackerTriggerTypeWeb,
        filters: [],
        option:  {} as ClickOption,
      };

      const event = new MouseEvent("unknown");
      const result = EventValidator.validate(event, trigger);
      expect(result).toBe(true);
    });
  });
});
