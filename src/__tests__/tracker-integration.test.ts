import { TrackerPlatform } from "src/domain/TrackerSchema";
import { TrackerTriggerTypeWeb } from "src/domain/TrackerTriggerType";
import TrackerManager from "src/tracker";
import { TrackerInitializeArgs } from "src/types/tracker";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock all external dependencies
vi.mock("src/services/tracker-config-service");
vi.mock("src/services/ip-service");
vi.mock("src/services/fingerprint-service");
vi.mock("src/utils/http");
vi.mock("@fingerprintjs/fingerprintjs");

// Mock window and navigator objects
Object.defineProperty(window, "setInterval", {
  value: vi.fn().mockImplementation((fn, ms) => {
    return setTimeout(fn, ms);
  }),
});

Object.defineProperty(window, "clearInterval", {
  value: vi.fn().mockImplementation(clearTimeout),
});

Object.defineProperty(navigator, "onLine", {
  value:    true,
  writable: true,
});

describe("TrackerManager Integration Tests", () => {
  const mockInitArgs: TrackerInitializeArgs = {
    serviceUrl: "https://test-service.com",
    tenantName: "test-tenant",
    apiKey:     "test-api-key",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Mock document.body
    if (document.body) {
      document.body.innerHTML = "";
    }

    // Mock console.error to avoid noise in tests
    vi.spyOn(console, "error").mockImplementation(() => {
      // Intentionally empty
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("initialize", () => {
    it("initializes tracker with valid arguments", async () => {
      // Mock the dependencies to return valid responses
      const { TrackerConfigService } = await import("src/services/tracker-config-service");
      const { IpService } = await import("src/services/ip-service");
      const { FingerprintService } = await import("src/services/fingerprint-service");

      vi.mocked(TrackerConfigService.prototype.getTrackers).mockResolvedValue({
        trackers: [
          {
            name:      "test-tracker",
            platform:  TrackerPlatform.WEB,
            triggers:  [],
            variables: [],
            event:     {
              name:             "test-event",
              keyMapping:       "id",
              variableMappings: {},
            },
          },
        ],
        apiUrl: "https://api.test.com",
      });

      vi.mocked(IpService.fetchIp).mockResolvedValue("127.0.0.1");
      vi.mocked(FingerprintService.getDeviceFingerprint).mockResolvedValue("test-fingerprint");

      await expect(TrackerManager.initialize(mockInitArgs)).resolves.not.toThrow();
    });

    it("throws error for missing service URL", async () => {
      const invalidArgs = { ...mockInitArgs, serviceUrl: "" };

      await expect(TrackerManager.initialize(invalidArgs)).rejects.toThrow("Service URL must be provided");
    });

    it("throws error for missing API key", async () => {
      const invalidArgs = { ...mockInitArgs, apiKey: "" };

      await expect(TrackerManager.initialize(invalidArgs)).rejects.toThrow("API key must be provided");
    });

    it("throws error for missing tenant name", async () => {
      const invalidArgs = { ...mockInitArgs, tenantName: "" };

      await expect(TrackerManager.initialize(invalidArgs)).rejects.toThrow("Tenant name must be provided");
    });

    it("throws error for null arguments", async () => {
      await expect(TrackerManager.initialize(null as unknown as TrackerInitializeArgs)).rejects.toThrow(
        "Tracker initialization args must be provided",
      );
    });

    it("handles initialization failure gracefully", async () => {
      const { TrackerConfigService } = await import("src/services/tracker-config-service");

      vi.mocked(TrackerConfigService.prototype.getTrackers).mockRejectedValue(new Error("Network error"));

      await expect(TrackerManager.initialize(mockInitArgs)).rejects.toThrow("Network error");
    });
  });

  describe("user-defined variables", () => {
    beforeEach(async () => {
      // Setup successful initialization
      const { TrackerConfigService } = await import("src/services/tracker-config-service");
      const { IpService } = await import("src/services/ip-service");
      const { FingerprintService } = await import("src/services/fingerprint-service");

      vi.mocked(TrackerConfigService.prototype.getTrackers).mockResolvedValue({
        trackers: [],
        apiUrl:   "https://api.test.com",
      });
      vi.mocked(IpService.fetchIp).mockResolvedValue("127.0.0.1");
      vi.mocked(FingerprintService.getDeviceFingerprint).mockResolvedValue("test-fingerprint");

      await TrackerManager.initialize(mockInitArgs);
    });

    it("sets and gets user-defined variables", () => {
      TrackerManager.setUserDefinedVariable("testVar", "testValue");

      expect(TrackerManager.getUserDefinedVariable("testVar")).toBe("testValue");
    });

    it("sets and gets complex variable types", () => {
      const complexValue = { nested: { value: 123 }, array: [1, 2, 3] };

      TrackerManager.setUserDefinedVariable("complexVar", complexValue);

      expect(TrackerManager.getUserDefinedVariable("complexVar")).toEqual(complexValue);
    });

    it("returns undefined for non-existent variables", () => {
      expect(TrackerManager.getUserDefinedVariable("nonExistentVar")).toBeUndefined();
    });

    it("gets all user-defined variables", () => {
      TrackerManager.setUserDefinedVariable("var1", "value1");
      TrackerManager.setUserDefinedVariable("var2", "value2");

      const allVars = TrackerManager.getUserDefinedVariables();

      expect(allVars).toEqual(
        expect.objectContaining({
          var1:         "value1",
          var2:         "value2",
          viewDuration: expect.any(Number),
        }),
      );
    });

    it("returns a copy of variables (not reference)", () => {
      TrackerManager.setUserDefinedVariable("testVar", "originalValue");

      const variables1 = TrackerManager.getUserDefinedVariables();
      const variables2 = TrackerManager.getUserDefinedVariables();

      variables1.testVar = "modifiedValue";

      expect(variables2.testVar).toBe("originalValue");
      expect(TrackerManager.getUserDefinedVariable("testVar")).toBe("originalValue");
    });
  });

  describe("custom event triggering", () => {
    beforeEach(async () => {
      // Setup successful initialization
      const { TrackerConfigService } = await import("src/services/tracker-config-service");
      const { IpService } = await import("src/services/ip-service");
      const { FingerprintService } = await import("src/services/fingerprint-service");

      vi.mocked(TrackerConfigService.prototype.getTrackers).mockResolvedValue({
        trackers: [
          {
            name:     "test-tracker",
            platform: TrackerPlatform.WEB,
            triggers: [
              {
                name:    "customEvent",
                type:    TrackerTriggerTypeWeb.CUSTOM,
                filters: [],
                option:  { event: "customEvent" },
              },
            ],
            variables: [],
            event:     {
              name:             "test-event",
              keyMapping:       "id",
              variableMappings: {},
            },
          },
        ],
        apiUrl: "https://api.test.com",
      });
      vi.mocked(IpService.fetchIp).mockResolvedValue("127.0.0.1");
      vi.mocked(FingerprintService.getDeviceFingerprint).mockResolvedValue("test-fingerprint");

      await TrackerManager.initialize(mockInitArgs);
    });

    it("triggers custom event asynchronously", async () => {
      await expect(TrackerManager.triggerCustom("customEvent", { param: "value" })).resolves.not.toThrow();
    });

    it("triggers custom event synchronously", async () => {
      const { HttpClient } = await import("src/utils/http");

      vi.mocked(HttpClient.prototype.post).mockResolvedValue({ success: true });

      const result = await TrackerManager.triggerCustomSync("customEvent", { param: "value" });

      expect(result).toEqual({ success: true });
    });

    it("handles sync trigger with timeout", async () => {
      const { HttpClient } = await import("src/utils/http");

      vi.mocked(HttpClient.prototype.post).mockResolvedValue({ success: true });

      const result = await TrackerManager.triggerCustomSync("customEvent", { param: "value" }, { timeoutMs: 5000 });

      expect(result).toEqual({ success: true });
    });

    it("returns null for sync trigger failure", async () => {
      const { HttpClient } = await import("src/utils/http");

      vi.mocked(HttpClient.prototype.post).mockRejectedValue(new Error("Network error"));

      const result = await TrackerManager.triggerCustomSync("customEvent", { param: "value" });

      expect(result).toBeNull();
    });

    it("handles non-existent custom events gracefully", async () => {
      await expect(TrackerManager.triggerCustom("nonExistentEvent", {})).resolves.not.toThrow();

      const result = await TrackerManager.triggerCustomSync("nonExistentEvent", {});
      expect(result).toBeNull();
    });
  });

  describe("risk alert configuration", () => {
    beforeEach(async () => {
      // Setup successful initialization
      const { TrackerConfigService } = await import("src/services/tracker-config-service");
      const { IpService } = await import("src/services/ip-service");
      const { FingerprintService } = await import("src/services/fingerprint-service");

      vi.mocked(TrackerConfigService.prototype.getTrackers).mockResolvedValue({
        trackers: [],
        apiUrl:   "https://api.test.com",
      });
      vi.mocked(IpService.fetchIp).mockResolvedValue("127.0.0.1");
      vi.mocked(FingerprintService.getDeviceFingerprint).mockResolvedValue("test-fingerprint");

      await TrackerManager.initialize(mockInitArgs);
    });

    it("configures risk alert threshold", () => {
      expect(() => TrackerManager.configureRiskAlert({ threshold: 0.8 })).not.toThrow();
    });

    it("configures risk alert cooldown", () => {
      expect(() => TrackerManager.configureRiskAlert({ cooldownMs: 30000 })).not.toThrow();
    });

    it("configures risk alert enabled state", () => {
      expect(() => TrackerManager.configureRiskAlert({ enabled: false })).not.toThrow();
    });

    it("configures multiple risk alert options", () => {
      expect(() =>
        TrackerManager.configureRiskAlert({
          threshold:  0.9,
          cooldownMs: 45000,
          enabled:    true,
        }),
      ).not.toThrow();
    });

    it("ignores invalid threshold values", () => {
      expect(() => TrackerManager.configureRiskAlert({ threshold: -0.1 })).not.toThrow();
      expect(() => TrackerManager.configureRiskAlert({ threshold: 1.1 })).not.toThrow();
    });

    it("ignores invalid cooldown values", () => {
      expect(() => TrackerManager.configureRiskAlert({ cooldownMs: -1000 })).not.toThrow();
    });
  });

  describe("edge cases and error handling", () => {
    it("handles initialization without proper DOM setup", async () => {
      // Remove body element
      document.body.remove();

      const { TrackerConfigService } = await import("src/services/tracker-config-service");
      const { IpService } = await import("src/services/ip-service");
      const { FingerprintService } = await import("src/services/fingerprint-service");

      vi.mocked(TrackerConfigService.prototype.getTrackers).mockResolvedValue({
        trackers: [],
        apiUrl:   "https://api.test.com",
      });
      vi.mocked(IpService.fetchIp).mockResolvedValue("127.0.0.1");
      vi.mocked(FingerprintService.getDeviceFingerprint).mockResolvedValue("test-fingerprint");

      await expect(TrackerManager.initialize(mockInitArgs)).resolves.not.toThrow();
    });

    it("handles operations before initialization gracefully", async () => {
      // Try to use tracker before initialization
      expect(() => TrackerManager.setUserDefinedVariable("test", "value")).not.toThrow();
      expect(TrackerManager.getUserDefinedVariable("test")).toBe("value");

      await expect(TrackerManager.triggerCustom("test", {})).resolves.not.toThrow();

      const result = await TrackerManager.triggerCustomSync("test", {});
      expect(result).toBeNull();
    });
  });
});
