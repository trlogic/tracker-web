/**
 * Risk metrics collection & baseline management
 */

import { SuspiciousFlags } from "../domain/suspicious-flags";

interface EnvironmentBaseline {
  language:  string | null;
  timezone:  string | null;
  os:        string | null;
  browser:   string | null;
  firstSeen: number;
}

interface EnvironmentChangeFlags {
  languageChanged: boolean;
  timezoneChanged: boolean;
  osChanged:       boolean;
  browserChanged:  boolean;
}

export interface RemoteAccessAggregates {
  headlessIndicatorCount: number;
  noMouseMoveDurationMs:  number;
  clickOnlyPattern:       boolean;
  fastPageTransition:     boolean;
  navigationVelocity:     number;
  formFillAnomaly:        boolean;
  formFillDurationMs:     number;
  inputPasteRatio:        number;
}

const BASELINE_KEY_PREFIX = "formica_baseline_";

class RiskMetricsService {
  private lastMouseMoveTs = Date.now();
  private lastClickTs = Date.now();
  private mouseMoveCounterWindow = 0;
  private clickCounterWindow = 0;
  private pageViewTimestamps:       number[] = [];
  private pasteCharCount = 0;
  private typedCharCount = 0;
  private lastPageViewTs:           number | null = null;
  private lastFormInteractionStart: number | null = null;
  private lastFormFieldCount = 0;
  private lastFormDurationMs = 0;
  private formFillAnomaly = false;
  private fastPageTransition = false;

  /** register global listeners (idempotent) */
  initListeners(): void {
    const w = window as unknown as { __riskMetricsListenersAttached?: boolean };
    if (w.__riskMetricsListenersAttached) return;
    w.__riskMetricsListenersAttached = true;

    window.addEventListener("mousemove", () => {
      this.lastMouseMoveTs = Date.now();
      this.mouseMoveCounterWindow++;
    });
    document.addEventListener("click", () => {
      this.lastClickTs = Date.now();
      this.clickCounterWindow++;
    });
    document.addEventListener("paste", (e: ClipboardEvent) => {
      const text = e.clipboardData?.getData("text") || "";
      this.pasteCharCount += text.length;
    });
    document.addEventListener("keydown", (e) => {
      if (e.key.length === 1) this.typedCharCount += 1;
    });

    // Basic form tracking
    document.addEventListener("focusin", (e) => {
      const form = (e.target as HTMLElement)?.closest("form");
      if (!form) return;
      if (this.lastFormInteractionStart === null) {
        this.lastFormInteractionStart = Date.now();
        this.lastFormFieldCount = form.querySelectorAll("input,textarea,select").length;
      }
    });
    document.addEventListener("submit", (e) => {
      const form = e.target as HTMLFormElement;
      if (!form) return;
      if (this.lastFormInteractionStart) {
        this.lastFormDurationMs = Date.now() - this.lastFormInteractionStart;
        this.formFillAnomaly = this.detectFormAnomaly(this.lastFormDurationMs, this.lastFormFieldCount);
      }
      this.lastFormInteractionStart = null;
    });
  }

  /** Called on each page view */
  registerPageView(): void {
    const now = Date.now();
    if (this.lastPageViewTs && now - this.lastPageViewTs < 1500) {
      this.fastPageTransition = true;
    } else {
      this.fastPageTransition = false;
    }
    this.lastPageViewTs = now;
    this.pageViewTimestamps.push(now);
    // keep last 5 minutes
    const cutoff = now - 5 * 60 * 1000;
    this.pageViewTimestamps = this.pageViewTimestamps.filter((t) => t >= cutoff);
  }

  getAggregates(): RemoteAccessAggregates {
    const now = Date.now();
    const noMouseMoveDurationMs = now - this.lastMouseMoveTs;
    const clickOnlyPattern =
      noMouseMoveDurationMs > 10000 && this.clickCounterWindow >= 3 && this.mouseMoveCounterWindow < 2;
    const navigationVelocity = this.pageViewTimestamps.length / 5; // per 5 min -> count/5 gives per minute
    const inputPasteRatio = this.computePasteRatio();

    return {
      headlessIndicatorCount: 0, // will be filled externally if needed
      noMouseMoveDurationMs,
      clickOnlyPattern,
      fastPageTransition:     this.fastPageTransition,
      navigationVelocity,
      formFillAnomaly:        this.formFillAnomaly,
      formFillDurationMs:     this.lastFormDurationMs,
      inputPasteRatio,
    };
  }

  computePasteRatio(): number {
    const total = this.pasteCharCount + this.typedCharCount;
    if (total === 0) return 0;
    return this.pasteCharCount / total;
  }

  resetRollingWindow(): void {
    this.mouseMoveCounterWindow = 0;
    this.clickCounterWindow = 0;
  }

  private detectFormAnomaly(durationMs: number, fieldCount: number): boolean {
    if (fieldCount === 0) return false;
    const adaptiveThreshold = Math.min(fieldCount * 120, 1500); // ms
    return durationMs < adaptiveThreshold;
  }

  // Baseline
  loadBaseline(tenant: string, deviceId: string): EnvironmentBaseline | null {
    try {
      const raw = localStorage.getItem(this.getBaselineKey(tenant, deviceId));
      if (!raw) return null;
      return JSON.parse(raw) as EnvironmentBaseline;
    } catch {
      return null;
    }
  }

  ensureBaseline(tenant: string, deviceId: string, data: Omit<EnvironmentBaseline, "firstSeen">): EnvironmentBaseline {
    const existing = this.loadBaseline(tenant, deviceId);
    if (existing) return existing;
    const baseline: EnvironmentBaseline = { ...data, firstSeen: Date.now() };
    try {
      localStorage.setItem(this.getBaselineKey(tenant, deviceId), JSON.stringify(baseline));
    } catch (err) {
      // ignore storage write errors (quota / disabled)
      void err;
    }
    return baseline;
  }

  diffEnvironment(
    baseline: EnvironmentBaseline,
    current: Omit<EnvironmentBaseline, "firstSeen">,
  ): EnvironmentChangeFlags {
    return {
      languageChanged: baseline.language !== current.language,
      timezoneChanged: baseline.timezone !== current.timezone,
      osChanged:       baseline.os !== current.os,
      browserChanged:  baseline.browser !== current.browser,
    };
  }

  calcEnvironmentChangeScore(flags: EnvironmentChangeFlags): number {
    let score = 0;
    if (flags.languageChanged) score += 0.25;
    if (flags.timezoneChanged) score += 0.25;
    if (flags.osChanged) score += 0.2;
    if (flags.browserChanged) score += 0.3;
    return Math.min(1, score);
  }

  calcRemoteAccessScore(flags: SuspiciousFlags, envMismatch: boolean, agg: RemoteAccessAggregates): number {
    let score = 0;
    if (flags.unnaturalMouseMoves) score += 0.2;
    if (flags.bigClipboardPaste) score += 0.15;
    if (flags.lowFPSDetected) score += 0.15;
    if (flags.delayedClickDetected) score += 0.1;
    if (agg.clickOnlyPattern) score += 0.15;
    if (agg.headlessIndicatorCount > 0) score += Math.min(agg.headlessIndicatorCount * 0.05, 0.25);
    if (envMismatch) score += 0.2;
    return Math.min(1, score);
  }

  private getBaselineKey(tenant: string, deviceId: string): string {
    return `${BASELINE_KEY_PREFIX}${tenant}_${deviceId}`;
  }
}

export const riskMetricsService = new RiskMetricsService();
export type { EnvironmentBaseline, EnvironmentChangeFlags };
