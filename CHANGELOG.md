# Changelog

All notable changes to this project will be documented in this file.

## [1.2.0] - 2025-08-12

### Added

- Comprehensive risk & anomaly signal framework.
- New variable types (screenResolution, userAgent, remoteAccessScore, remoteAccessFlags, environmentChangeFlags, environmentChangeScore, headlessIndicatorCount, noMouseMoveDurationMs, clickOnlyPattern, fastPageTransition, navigationVelocity, formFillAnomaly, formFillDurationMs, inputPasteRatio).
- Composite remote access score calculation & periodic refresh loop.
- Environment baseline diff (language / timezone / OS / browser) stored in localStorage.
- Headless / bot heuristic indicator counting.
- Automatic `RISK_ALERT` trigger type with threshold (0.7 default) & cooldown (60s default).
- Public `configureRiskAlert` API to adjust threshold, cooldown, enable/disable.

### Changed

- Tracker initialization now starts risk metrics listeners and periodic score updates.

### Internal

- Introduced `risk-metrics` service for aggregation and scoring.
- Extended `VariableResolver` to resolve new risk variable enums.

### Notes

- Risk signals are heuristic; may produce false positives. Tune thresholds backend-side.
- Baseline disabled if localStorage unavailable.

## [1.1.4]

### Previous

- Existing functionality prior to risk feature set (see repository history).

---

Semantic version bumped minor due to additive, non-breaking feature expansion.
