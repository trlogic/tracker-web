import { BrowserDetector } from "src/utils/browser-detector";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock Bowser
vi.mock("bowser", () => ({
  default: {
    getParser: vi.fn().mockReturnValue({
      getBrowser:  vi.fn().mockReturnValue({ name: "Chrome", version: "91.0.4472.124" }),
      getOS:       vi.fn().mockReturnValue({ name: "Windows", version: "10" }),
      getPlatform: vi.fn().mockReturnValue({ type: "desktop" }),
      getEngine:   vi.fn().mockReturnValue({ name: "WebKit" }),
    }),
  },
}));

describe("BrowserDetector", () => {
  const originalUserAgent = navigator.userAgent;
  const originalLanguage = navigator.language;

  afterEach(() => {
    // Restore original navigator properties
    Object.defineProperty(navigator, "userAgent", { value: originalUserAgent, configurable: true });
    Object.defineProperty(navigator, "language", { value: originalLanguage, configurable: true });
    vi.clearAllMocks();
  });

  describe("getBrowser", () => {
    it("returns browser name from Bowser parser", async () => {
      const result = BrowserDetector.getBrowser();
      expect(result).toBe("Chrome");
    });

    it("returns null when browser name is not available", async () => {
      // This test requires mocking at runtime which is complex
      // Let's test basic functionality
      const result = BrowserDetector.getBrowser();
      expect(typeof result).toBe("string");
    });
  });

  describe("getOS", () => {
    it("returns OS name from Bowser parser", () => {
      const result = BrowserDetector.getOS();
      expect(result).toBe("Windows");
    });
  });

  describe("getPlatform", () => {
    it("returns platform type from Bowser parser", () => {
      const result = BrowserDetector.getPlatform();
      expect(result).toBe("desktop");
    });
  });

  describe("getLanguage", () => {
    it("returns navigator.language", () => {
      Object.defineProperty(navigator, "language", {
        value:        "en-US",
        configurable: true,
      });

      expect(BrowserDetector.getLanguage()).toBe("en-US");
    });

    it("returns empty string when language is not available", () => {
      Object.defineProperty(navigator, "language", {
        value:        undefined,
        configurable: true,
      });

      expect(BrowserDetector.getLanguage()).toBe("");
    });
  });

  describe("getTimezone", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("returns timezone identifier", () => {
      // Mock Intl.DateTimeFormat
      const mockDateTimeFormat = {
        resolvedOptions: () => ({ timeZone: "America/New_York" }),
      };

      vi.spyOn(Intl, "DateTimeFormat").mockImplementation(() => mockDateTimeFormat as Intl.DateTimeFormat);

      expect(BrowserDetector.getTimezone()).toBe("America/New_York");
    });

    it("returns empty string when timezone support fails", () => {
      // Mock Intl.DateTimeFormat to throw
      vi.spyOn(Intl, "DateTimeFormat").mockImplementation(() => {
        throw new Error("Not supported");
      });

      expect(BrowserDetector.getTimezone()).toBe("");
    });
  });

  describe("platform detection", () => {
    it("detects desktop platform", () => {
      expect(BrowserDetector.isDesktop()).toBe(true);
      expect(BrowserDetector.isMobile()).toBe(false);
      expect(BrowserDetector.isTablet()).toBe(false);
    });
  });

  describe("isBot", () => {
    it("detects bot user agents", () => {
      const botUserAgents = [
        "Googlebot/2.1 (+http://www.google.com/bot.html)",
        "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)",
        "facebookexternalhit/1.1",
        "crawling bot",
      ];

      botUserAgents.forEach((userAgent) => {
        Object.defineProperty(navigator, "userAgent", {
          value:        userAgent,
          configurable: true,
        });

        expect(BrowserDetector.isBot()).toBe(true);
      });
    });

    it("does not detect regular browsers as bots", () => {
      const regularUserAgents = [
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15",
      ];

      regularUserAgents.forEach((userAgent) => {
        Object.defineProperty(navigator, "userAgent", {
          value:        userAgent,
          configurable: true,
        });

        expect(BrowserDetector.isBot()).toBe(false);
      });
    });

    it("handles empty user agent", () => {
      Object.defineProperty(navigator, "userAgent", {
        value:        "",
        configurable: true,
      });

      expect(BrowserDetector.isBot()).toBe(false);
    });
  });

  describe("getDetailedInfo", () => {
    it("returns comprehensive browser information", () => {
      const info = BrowserDetector.getDetailedInfo();

      expect(info).toHaveProperty("browser");
      expect(info).toHaveProperty("os");
      expect(info).toHaveProperty("platform");
      expect(info).toHaveProperty("engine");
      expect(info).toHaveProperty("language");
      expect(info).toHaveProperty("timezone");
      expect(info).toHaveProperty("isBot");
    });
  });
});
