/**
 * Formica Tracker Web SDK
 * Main tracker implementation with clean architecture
 */

import TrackerSchema from "./domain/TrackerSchema";
import { TrackerTriggerTypeWeb } from "./domain/TrackerTriggerType";
import { TransactionResult } from "./domain/TransactionResult";
import { SuspiciousFlags } from "./domain/suspicious-flags";
import TrackerTrigger, { CustomEventOption } from "./domain/trigger/TrackerTrigger";
import { TrackerVariableWebType } from "./domain/variable/VariableTypeDefinitions";
import { monitorRemoteControlSuspicion } from "./remote";
import { EnvironmentChangeFlags, riskMetricsService } from "./services/risk-metrics";
import { BrowserDetector } from "./utils/browser-detector";

// Services
import { EventBuilder } from "./services/event-builder";
import { EventQueue } from "./services/event-queue";
import { EventValidator } from "./services/event-validator";
import { FingerprintService } from "./services/fingerprint-service";
import { IpService } from "./services/ip-service";
import { TimerService } from "./services/timer-service";
import { TrackerConfigService } from "./services/tracker-config-service";
import { VariableResolver } from "./services/variable-resolver";

// Types
import {
  GlobalVariables,
  TrackerConfig,
  TrackerInitializeArgs as TrackerInitializeArgsType,
  TrackerPayload,
  TrackerRequestConfig as TrackerRequestConfigType,
  TrackerState,
} from "./types/tracker";
import { logger } from "./utils/logger";

class FormicaTracker {
  private state: TrackerState = {
    tenant:     "",
    serviceUrl: "",
    apiKey:     "",
  };

  private config: TrackerConfig = {
    apiUrl:   "",
    trackers: [],
  };

  private globalVariables: GlobalVariables = {
    viewDuration: 0,
  };

  private suspiciousFlags: SuspiciousFlags = {
    unnaturalMouseMoves:  false,
    bigClipboardPaste:    false,
    lowFPSDetected:       false,
    delayedClickDetected: false,
  };

  private eventQueue?:          EventQueue;
  private timerService:         TimerService = new TimerService();
  private trackerConfigService: TrackerConfigService = new TrackerConfigService();
  private variableResolver?:    VariableResolver;
  private lastRiskAlertScore = 0;
  private lastRiskAlertAt = 0; // epoch ms
  private riskAlertCooldownMs = 60_000; // 60s
  private riskAlertThreshold = 0.7;
  private riskAlertEnabled = true;

  /**
   * Initialize the tracker with configuration
   */
  async initialize(args: TrackerInitializeArgs): Promise<void> {
    try {
      this.validateInitArgs(args);

      const { serviceUrl, tenantName, apiKey } = args;
      this.state = {
        tenant: tenantName,
        serviceUrl,
        apiKey,
      };

      await this.setupTracker();
      await this.initializeServices();
      this.setupEventListeners();
      this.startMonitoring();
    } catch (error) {
      console.error("Tracker initialization failed:", error);
      throw error;
    }
  }

  /**
   * Trigger a custom event asynchronously
   */
  async triggerCustom(name: string, variables: Record<string, unknown>): Promise<void> {
    const payload = await this.buildCustomTriggerPayload(name, variables);
    if (payload && this.eventQueue) {
      this.eventQueue.add(payload);
    }
  }

  /**
   * Trigger a custom event synchronously
   */
  async triggerCustomSync(
    name: string,
    variables: Record<string, unknown>,
    config?: TrackerRequestConfig,
  ): Promise<TransactionResult | null> {
    try {
      const payload = await this.buildCustomTriggerPayload(name, variables);
      if (!payload || !this.eventQueue) return null;

      const response = await this.eventQueue.sendSync(payload, config?.timeoutMs);
      return response as TransactionResult;
    } catch (error) {
      console.error("Sync trigger failed:", error);
      return null;
    }
  }

  /**
   * Set a user-defined variable
   */
  setUserDefinedVariable(name: string, value: unknown): void {
    this.globalVariables[name] = value;
  }

  /**
   * Get a user-defined variable
   */
  getUserDefinedVariable(name: string): unknown {
    return this.globalVariables[name];
  }

  /**
   * Get a copy of all user-defined variables
   */
  getUserDefinedVariables(): Record<string, unknown> {
    return { ...this.globalVariables };
  }

  private validateInitArgs(args: TrackerInitializeArgs): void {
    if (!args) {
      throw new Error("Tracker initialization args must be provided");
    }
    if (!args.serviceUrl?.trim()) {
      throw new Error("Service URL must be provided");
    }
    if (!args.apiKey?.trim()) {
      throw new Error("API key must be provided");
    }
    if (!args.tenantName?.trim()) {
      throw new Error("Tenant name must be provided");
    }
  }

  private async setupTracker(): Promise<void> {
    const { trackers, apiUrl } = await this.trackerConfigService.getTrackers(
      this.state.serviceUrl,
      this.state.tenant,
      this.state.apiKey,
    );

    this.config = { trackers, apiUrl };
  }

  private async initializeServices(): Promise<void> {
    // Initialize IP and fingerprint
    this.state.ip = await IpService.fetchIp();
    this.state.deviceIdFingerPrint = await FingerprintService.getDeviceFingerprint();

    // Initialize event queue
    this.eventQueue = new EventQueue(this.state.tenant, this.config.apiUrl);
    this.eventQueue.startProcessing();

    // Initialize variable resolver
    this.variableResolver = new VariableResolver(
      this.state.ip || "",
      this.state.deviceIdFingerPrint || "",
      this.suspiciousFlags,
      this.globalVariables,
    );

    // Start timer
    this.timerService.start();
  }

  private setupEventListeners(): void {
    this.config.trackers.forEach((tracker) => {
      tracker.triggers.forEach((triggerSchema) => {
        this.initListener(triggerSchema, tracker);
      });
    });
  }

  private startMonitoring(): void {
    monitorRemoteControlSuspicion((flags) => {
      this.suspiciousFlags = { ...flags };
      const w = window as unknown as { __formicaRemoteAccessFlags?: Record<string, unknown> };
      w.__formicaRemoteAccessFlags = { ...flags };
    });
    riskMetricsService.initListeners();
    this.setupEnvironmentBaseline();
    this.computeHeadlessIndicators();
    window.setInterval(() => this.updateCompositeRiskScores(), 5000);
  }

  private setupEnvironmentBaseline(): void {
    try {
      const w = window as unknown as { __formicaEnvChange?: { flags: EnvironmentChangeFlags; score: number } };
      const baseline = riskMetricsService.ensureBaseline(this.state.tenant, this.state.deviceIdFingerPrint || "anon", {
        language: BrowserDetector.getLanguage(),
        timezone: BrowserDetector.getTimezone(),
        os:       BrowserDetector.getOS(),
        browser:  BrowserDetector.getBrowser(),
      });
      const current = {
        language: BrowserDetector.getLanguage(),
        timezone: BrowserDetector.getTimezone(),
        os:       BrowserDetector.getOS(),
        browser:  BrowserDetector.getBrowser(),
      };
      const diff = riskMetricsService.diffEnvironment(baseline, current);
      const score = riskMetricsService.calcEnvironmentChangeScore(diff);
      w.__formicaEnvChange = { flags: diff, score };
    } catch {
      logger.warn("Failed to setup environment baseline, continuing without it");
    }
  }

  private async computeHeadlessIndicators(): Promise<void> {
    try {
      const w = window as unknown as { __formicaHeadlessIndicators?: number };
      let count = 0;
      if (navigator.webdriver) count++;
      if (!navigator.languages || navigator.languages.length === 0) count++;
      if (!navigator.plugins || navigator.plugins.length === 0) count++;
      const canvas = document.createElement("canvas");
      const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
      if (!gl) count++;
      canvas.remove();
      if (BrowserDetector.isBot()) count++;
      w.__formicaHeadlessIndicators = count;
    } catch {
      logger.warn("Failed to compute headless indicators");
    }
  }

  private updateCompositeRiskScores(): void {
    try {
      const w = window as unknown as {
        __formicaHeadlessIndicators?: number;
        __formicaEnvChange?:          { flags: EnvironmentChangeFlags; score: number };
        __formicaRemoteAccessScore?:  number;
        __formicaRemoteAccessFlags?:  Record<string, unknown>;
      };
      const agg = riskMetricsService.getAggregates();
      agg.headlessIndicatorCount = w.__formicaHeadlessIndicators || 0;
      const envMismatch = (w.__formicaEnvChange?.score || 0) > 0.5;
      const remoteAccessScore = riskMetricsService.calcRemoteAccessScore(this.suspiciousFlags, envMismatch, agg);
      w.__formicaRemoteAccessScore = remoteAccessScore;
      w.__formicaRemoteAccessFlags = {
        ...this.suspiciousFlags,
        clickOnlyPattern:       agg.clickOnlyPattern,
        fastPageTransition:     agg.fastPageTransition,
        headlessIndicatorCount: agg.headlessIndicatorCount,
        envChangeScore:         w.__formicaEnvChange?.score || 0,
      };
      this.maybeEmitRiskAlert(remoteAccessScore);
    } catch {
      logger.warn("Failed to update composite risk scores");
    }
  }

  private async maybeEmitRiskAlert(score: number): Promise<void> {
    if (!this.riskAlertEnabled) return;
    const now = Date.now();
    const crossedUp = this.lastRiskAlertScore < this.riskAlertThreshold && score >= this.riskAlertThreshold;
    const cooldownOk = now - this.lastRiskAlertAt > this.riskAlertCooldownMs;
    this.lastRiskAlertScore = score;
    if (!crossedUp || !cooldownOk) return;
    this.lastRiskAlertAt = now;
    if (!this.variableResolver || !this.eventQueue) return;
    for (const tracker of this.config.trackers) {
      const alertTrigger = tracker.triggers.find((t) => t.type === TrackerTriggerTypeWeb.RISK_ALERT);
      if (!alertTrigger) continue;
      const vars: Record<string, unknown> = { riskScore: score };
      for (const variable of tracker.variables) {
        if (variable.type === TrackerVariableWebType.CUSTOM) continue;
        vars[variable.name] = await this.variableResolver.resolve(variable, new MouseEvent(""));
      }
      const payload = EventBuilder.buildEvent(tracker, vars);
      this.eventQueue.add(payload);
    }
  }

  private initListener(triggerSchema: TrackerTrigger, tracker: TrackerSchema): void {
    switch (triggerSchema.type) {
      case TrackerTriggerTypeWeb.PAGE_VIEW:
        this.setupPageViewListener(triggerSchema, tracker);
        break;
      case TrackerTriggerTypeWeb.RISK_ALERT:
        // internal emission only; no DOM listener needed
        break;
      case TrackerTriggerTypeWeb.CUSTOM:
        this.setupCustomEventListener(triggerSchema, tracker);
        break;
      default:
        this.setupDefaultEventListener(triggerSchema, tracker);
        break;
    }
  }

  private setupPageViewListener(triggerSchema: TrackerTrigger, tracker: TrackerSchema): void {
    this.state.previousHref = document.location.href;

    window.addEventListener("load", () => {
      const bodyElement = document.querySelector("body");
      if (!bodyElement) return;
      // initial registration
      riskMetricsService.registerPageView();

      const observer = new MutationObserver(() => {
        if (this.state.previousHref !== document.location.href) {
          this.handleEvent(new Event("pageview"), triggerSchema, tracker);
          this.state.previousHref = document.location.href;
          riskMetricsService.registerPageView();
        }
      });

      observer.observe(bodyElement, {
        childList: true,
        subtree:   true,
      });
    });
  }

  private setupCustomEventListener(triggerSchema: TrackerTrigger, tracker: TrackerSchema): void {
    document.addEventListener(triggerSchema.name, (event) => {
      this.handleEvent(event, triggerSchema, tracker);
    });
  }

  private setupDefaultEventListener(triggerSchema: TrackerTrigger, tracker: TrackerSchema): void {
    document.addEventListener(triggerSchema.type.toLowerCase(), (event) => {
      this.handleEvent(event, triggerSchema, tracker);
    });
  }

  private async handleEvent(event: Event, triggerSchema: TrackerTrigger, tracker: TrackerSchema): Promise<void> {
    if (!this.variableResolver || !this.eventQueue) return;

    const trackerVariables: Record<string, unknown> = {};
    const mouseEvent = event as MouseEvent;

    // Resolve variables
    for (const variable of tracker.variables) {
      trackerVariables[variable.name] = await this.variableResolver.resolve(variable, mouseEvent);
    }

    // Validate event
    const isValid = EventValidator.validate(mouseEvent, triggerSchema);
    if (!isValid) return;

    // Build and send event
    const payload = EventBuilder.buildEvent(tracker, trackerVariables);
    this.eventQueue.add(payload);
  }

  private async buildCustomTriggerPayload(
    name: string,
    variables: Record<string, unknown>,
  ): Promise<TrackerPayload | null> {
    if (!this.variableResolver) return null;

    for (const tracker of this.config.trackers) {
      const event = tracker.triggers.find(
        (t) =>
          t.type === TrackerTriggerTypeWeb.CUSTOM &&
          ((t.option as CustomEventOption)?.event === name || t.name === name),
      );

      if (!event) continue;

      // Resolve variables
      for (const variable of tracker.variables) {
        if (variable.type === TrackerVariableWebType.CUSTOM) {
          if (!Object.prototype.hasOwnProperty.call(variables, variable.name)) {
            variables[variable.name] = await this.variableResolver.resolve(variable, new MouseEvent(""));
          }
        } else {
          variables[variable.name] = await this.variableResolver.resolve(variable, new MouseEvent(""));
        }
      }

      return EventBuilder.buildEvent(tracker, variables);
    }

    return null;
  }

  /** Public: configure risk alert parameters */
  configureRiskAlert(options: { threshold?: number; cooldownMs?: number; enabled?: boolean }): void {
    if (typeof options.threshold === "number" && options.threshold >= 0 && options.threshold <= 1) {
      this.riskAlertThreshold = options.threshold;
    }
    if (typeof options.cooldownMs === "number" && options.cooldownMs >= 0) {
      this.riskAlertCooldownMs = options.cooldownMs;
    }
    if (typeof options.enabled === "boolean") {
      this.riskAlertEnabled = options.enabled;
    }
  }
}

// Export singleton instance
const formicaTracker = new FormicaTracker();

export type TrackerInitializeArgs = TrackerInitializeArgsType;
export type TrackerRequestConfig = TrackerRequestConfigType;

// eslint-disable-next-line @typescript-eslint/no-namespace
namespace TrackerManager {
  export type TrackerInitializeArgs = TrackerInitializeArgsType;
  export type TrackerRequestConfig = TrackerRequestConfigType;
}

const TrackerManager = {
  initialize:              formicaTracker.initialize.bind(formicaTracker),
  triggerCustom:           formicaTracker.triggerCustom.bind(formicaTracker),
  triggerCustomSync:       formicaTracker.triggerCustomSync.bind(formicaTracker),
  setUserDefinedVariable:  formicaTracker.setUserDefinedVariable.bind(formicaTracker),
  getUserDefinedVariable:  formicaTracker.getUserDefinedVariable.bind(formicaTracker),
  getUserDefinedVariables: formicaTracker.getUserDefinedVariables.bind(formicaTracker),
  configureRiskAlert:      formicaTracker.configureRiskAlert.bind(formicaTracker),
};

export default TrackerManager;
