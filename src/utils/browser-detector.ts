/**
 * Browser and system detection utilities using Bowser
 */

import Bowser from "bowser";

export class BrowserDetector {
  private static parser = Bowser.getParser(window.navigator.userAgent);

  static getBrowser(): string | null {
    const browser = this.parser.getBrowser();
    return browser.name || null;
  }

  static getBrowserVersion(): string | null {
    const browser = this.parser.getBrowser();
    return browser.version || null;
  }

  static getOS(): string | null {
    const os = this.parser.getOS();
    return os.name || null;
  }

  static getOSVersion(): string | null {
    const os = this.parser.getOS();
    return os.version || null;
  }

  static getPlatform(): string | null {
    const platform = this.parser.getPlatform();
    return platform.type || null;
  }

  static getEngine(): string | null {
    const engine = this.parser.getEngine();
    return engine.name || null;
  }

  static getLanguage(): string {
    return navigator.language || (navigator as any).userLanguage || "";
  }

  static getTimezone(): string {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    } catch {
      return "";
    }
  }

  static isDesktop(): boolean {
    return this.parser.getPlatform().type === "desktop";
  }

  static isMobile(): boolean {
    return this.parser.getPlatform().type === "mobile";
  }

  static isTablet(): boolean {
    return this.parser.getPlatform().type === "tablet";
  }

  static isBot(): boolean {
    // Bowser doesn't have built-in bot detection, so we'll keep some basic checks
    const userAgent = navigator.userAgent.toLowerCase();
    const botPatterns = [
      "bot",
      "crawler",
      "spider",
      "crawling",
      "facebook",
      "google",
      "baidu",
      "bing",
      "msn",
      "duckduckbot",
      "teoma",
      "slurp",
      "yandex",
    ];

    return botPatterns.some((pattern) => userAgent.includes(pattern));
  }

  static async isSuspiciousBrowser(): Promise<boolean> {
    try {
      // Check for webdriver
      if (navigator.webdriver) return true;

      // Check for missing languages
      if (!navigator.languages || navigator.languages.length === 0) return true;

      // Check for missing plugins (less reliable in modern browsers)
      if (!navigator.plugins || navigator.plugins.length === 0) return true;

      // Check WebGL support
      const canvas = document.createElement("canvas");
      const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
      if (!gl) return true;
      canvas.remove();

      // Check notification permissions
      if (navigator.permissions) {
        try {
          const result = await navigator.permissions.query({
            name: "notifications" as PermissionName,
          });
          if (Notification.permission === "denied" && result.state === "prompt") {
            return true;
          }
        } catch {
          // Ignore permission errors
        }
      }

      // Check hardware concurrency
      if (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 1) return true;

      // Check touch support on mobile user agent
      if (this.isMobile() && !("ontouchstart" in window)) return true;

      // Check if it's a known bot
      if (this.isBot()) return true;

      return false;
    } catch {
      return true;
    }
  }

  /**
   * Get detailed browser information
   */
  static getDetailedInfo() {
    return {
      browser: {
        name: this.getBrowser(),
        version: this.getBrowserVersion(),
      },
      os: {
        name: this.getOS(),
        version: this.getOSVersion(),
      },
      platform: {
        type: this.getPlatform(),
        isDesktop: this.isDesktop(),
        isMobile: this.isMobile(),
        isTablet: this.isTablet(),
      },
      engine: this.getEngine(),
      language: this.getLanguage(),
      timezone: this.getTimezone(),
      isBot: this.isBot(),
    };
  }
}
