/**
 * Variable resolution service
 */

import { SuspiciousFlags } from "src/domain/suspicious-flags";
import TrackerVariable, {
  TrackerCookieVariable,
  TrackerCustomEventVariable,
  TrackerElementVariable,
  TrackerEventVariable,
  TrackerJavascriptVariable,
  TrackerUrlVariable,
} from "src/domain/variable/TrackerVariable";
import { TrackerVariableWebType } from "src/domain/variable/VariableTypeDefinitions";
import { BrowserDetector } from "src/utils/browser-detector";
import { EnvironmentChangeFlags, riskMetricsService } from "./risk-metrics";

export class VariableResolver {
  constructor(
    private ip: string,
    private deviceFingerprint: string,
    private suspiciousFlags: SuspiciousFlags,
    private globalVariables: Record<string, unknown>,
  ) {}

  async resolve(
    trackerVariableSchema: TrackerVariable,
    mouseEvent: MouseEvent,
  ): Promise<string | number | boolean | Record<string, unknown> | null> {
    switch (trackerVariableSchema.type) {
      case TrackerVariableWebType.URL:
        return this.resolveUrlVariable(trackerVariableSchema as TrackerUrlVariable);
      case TrackerVariableWebType.COOKIE:
        return this.resolveCookieVariable(trackerVariableSchema as TrackerCookieVariable);
      case TrackerVariableWebType.ELEMENT:
        return this.resolveElementVariable(trackerVariableSchema as TrackerElementVariable);
      case TrackerVariableWebType.JAVASCRIPT:
        return this.resolveJavascriptVariable(trackerVariableSchema as TrackerJavascriptVariable);
      case TrackerVariableWebType.EVENT:
        return this.resolveTriggerVariable(trackerVariableSchema as TrackerEventVariable, mouseEvent);
      case TrackerVariableWebType.IP_ADDRESS:
        return this.resolveIpAddressVariable();
      case TrackerVariableWebType.DEVICE_FINGERPRINT:
        return this.resolveDeviceFingerprint();
      case TrackerVariableWebType.SUSPICIOUS_ACTIVITY:
        return this.resolveSuspiciousActivityVariable();
      case TrackerVariableWebType.SUSPICIOUS_BROWSER:
        return BrowserDetector.isSuspiciousBrowser();
      case TrackerVariableWebType.LANGUAGE:
        return BrowserDetector.getLanguage();
      case TrackerVariableWebType.TIMEZONE:
        return BrowserDetector.getTimezone();
      case TrackerVariableWebType.OS:
        return BrowserDetector.getOS();
      case TrackerVariableWebType.BROWSER:
        return BrowserDetector.getBrowser();
      case TrackerVariableWebType.CUSTOM:
        return this.resolveCustomVariable(trackerVariableSchema as TrackerCustomEventVariable);
      case TrackerVariableWebType.SCREEN_RESOLUTION:
        return `${window.screen.width}x${window.screen.height}`;
      case TrackerVariableWebType.USER_AGENT:
        return navigator.userAgent;
      case TrackerVariableWebType.NO_MOUSE_MOVE_DURATION_MS:
      case TrackerVariableWebType.CLICK_ONLY_PATTERN:
      case TrackerVariableWebType.FAST_PAGE_TRANSITION:
      case TrackerVariableWebType.FORM_FILL_ANOMALY:
      case TrackerVariableWebType.FORM_FILL_DURATION_MS:
      case TrackerVariableWebType.NAVIGATION_VELOCITY:
      case TrackerVariableWebType.INPUT_PASTE_RATIO:
      case TrackerVariableWebType.REMOTE_ACCESS_SCORE:
      case TrackerVariableWebType.REMOTE_ACCESS_FLAGS_JSON:
      case TrackerVariableWebType.ENVIRONMENT_CHANGE_FLAGS:
      case TrackerVariableWebType.ENVIRONMENT_CHANGE_SCORE:
      case TrackerVariableWebType.HEADLESS_INDICATOR_COUNT:
        return this.resolveRiskVariable(trackerVariableSchema.type) as
          | string
          | number
          | boolean
          | Record<string, unknown>
          | null;
      default:
        return "";
    }
  }

  private resolveRiskVariable(type: TrackerVariableWebType): unknown {
    const agg = riskMetricsService.getAggregates();
    const env = window as unknown as {
      __formicaEnvChange?:          { flags: EnvironmentChangeFlags; score: number };
      __formicaHeadlessIndicators?: number;
      __formicaSuspiciousFlags?:    SuspiciousFlags;
      __formicaRemoteAccessScore?:  number;
      __formicaRemoteAccessFlags?:  Record<string, unknown>;
    };

    switch (type) {
      case TrackerVariableWebType.NO_MOUSE_MOVE_DURATION_MS:
        return agg.noMouseMoveDurationMs;
      case TrackerVariableWebType.CLICK_ONLY_PATTERN:
        return agg.clickOnlyPattern;
      case TrackerVariableWebType.FAST_PAGE_TRANSITION:
        return agg.fastPageTransition;
      case TrackerVariableWebType.FORM_FILL_ANOMALY:
        return agg.formFillAnomaly;
      case TrackerVariableWebType.FORM_FILL_DURATION_MS:
        return agg.formFillDurationMs;
      case TrackerVariableWebType.NAVIGATION_VELOCITY:
        return agg.navigationVelocity;
      case TrackerVariableWebType.INPUT_PASTE_RATIO:
        return agg.inputPasteRatio;
      case TrackerVariableWebType.ENVIRONMENT_CHANGE_FLAGS:
        return env.__formicaEnvChange?.flags ? JSON.stringify(env.__formicaEnvChange.flags) : "{}";
      case TrackerVariableWebType.ENVIRONMENT_CHANGE_SCORE:
        return env.__formicaEnvChange?.score ?? 0;
      case TrackerVariableWebType.HEADLESS_INDICATOR_COUNT:
        return env.__formicaHeadlessIndicators ?? 0;
      case TrackerVariableWebType.REMOTE_ACCESS_FLAGS_JSON:
        return env.__formicaRemoteAccessFlags ? JSON.stringify(env.__formicaRemoteAccessFlags) : "{}";
      case TrackerVariableWebType.REMOTE_ACCESS_SCORE:
        return env.__formicaRemoteAccessScore ?? 0;
      default:
        return "";
    }
  }

  private resolveCustomVariable(trackerVariableSchema: TrackerCustomEventVariable): string {
    const variableName = trackerVariableSchema.name;
    return String(this.globalVariables[variableName] ?? "");
  }

  private resolveUrlVariable(trackerVariableSchema: TrackerUrlVariable): string {
    const location = window.location;
    const option = trackerVariableSchema.selection;

    switch (option) {
      case "full":
        return location.href;
      case "host":
        return location.hostname;
      case "port":
        return location.port;
      case "path":
        return location.pathname;
      case "query":
        return location.search.substring(1);
      case "fragment": {
        const parts = location.href.split("#");
        return parts.length > 1 ? parts[1] : "";
      }
      case "protocol":
        return location.protocol.substring(0, location.protocol.length - 1);
      default:
        return "";
    }
  }

  private resolveCookieVariable(trackerVariableSchema: TrackerCookieVariable): string {
    const cookieName = trackerVariableSchema.cookieName;
    const cookies = document.cookie
      .split(";")
      .map((cookie) => cookie.trim())
      .filter((cookie) => cookie.startsWith(cookieName))
      .map((cookie) =>
        trackerVariableSchema.decodeUrlCookie
          ? decodeURIComponent(cookie.substring(cookieName.length + 1))
          : cookie.substring(cookieName.length + 1),
      );

    return cookies[0] ?? "";
  }

  private resolveElementVariable(trackerVariableSchema: TrackerElementVariable): string {
    const option = trackerVariableSchema.option;
    const element = document.querySelector(option.cssSelector);

    if (!element) return "";

    if (!option.attribute) {
      return element.textContent ?? "";
    }

    return element.getAttribute(option.attribute) ?? "";
  }

  private resolveJavascriptVariable(trackerVariableSchema: TrackerJavascriptVariable): string {
    try {
      // Note: eval is still used here as it's part of the original functionality
      // In a production environment, consider using a safer alternative
      const result = eval(trackerVariableSchema.code);
      return String(result ?? "");
    } catch (error) {
      console.error("Error executing JavaScript variable:", error);
      return "";
    }
  }

  private resolveIpAddressVariable(): string {
    return this.ip === "unknown" ? "" : this.ip;
  }

  private resolveDeviceFingerprint(): string {
    return this.deviceFingerprint;
  }

  private resolveSuspiciousActivityVariable(): number {
    const flags = this.suspiciousFlags;
    let score = 0;

    if (flags.unnaturalMouseMoves) score += 0.25;
    if (flags.bigClipboardPaste) score += 0.25;
    if (flags.lowFPSDetected) score += 0.25;
    if (flags.delayedClickDetected) score += 0.25;

    return score;
  }

  private resolveTriggerVariable(trackerVariableSchema: TrackerEventVariable, mouseEvent: MouseEvent): string {
    const elementOption = trackerVariableSchema.selection;
    const parent = document.createElement("div");

    const target = mouseEvent.target as Element | null;
    if (!target) return "";

    parent.appendChild(target.cloneNode(true));
    const element = parent.querySelector(elementOption.cssSelector);

    if (!element) return "";

    if (elementOption.attribute) {
      return element.getAttribute(elementOption.attribute) ?? "";
    }

    return element.textContent ?? "";
  }
}
