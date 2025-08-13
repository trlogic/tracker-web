import { riskMetricsService } from "src/services/risk-metrics";
import { describe, expect, it } from "vitest";

// Basic test for remote access score calculation

describe("riskMetricsService", () => {
  it("calculates remote access score with flags", () => {
    const score = riskMetricsService.calcRemoteAccessScore(
      {
        unnaturalMouseMoves:  true,
        bigClipboardPaste:    true,
        lowFPSDetected:       false,
        delayedClickDetected: true,
      },
      false,
      {
        headlessIndicatorCount: 2,
        noMouseMoveDurationMs:  0,
        clickOnlyPattern:       false,
        fastPageTransition:     false,
        navigationVelocity:     0,
        formFillAnomaly:        false,
        formFillDurationMs:     0,
        inputPasteRatio:        0,
      },
    );
    expect(score).toBeGreaterThan(0);
  });
});
