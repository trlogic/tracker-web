import { TimerService } from "src/services/timer-service";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("TimerService", () => {
  let timerService: TimerService;

  beforeEach(() => {
    timerService = new TimerService();
    vi.useFakeTimers();
  });

  afterEach(() => {
    timerService.stop();
    vi.useRealTimers();
  });

  describe("start", () => {
    it("starts the timer", () => {
      timerService.start();
      expect(timerService.isRunning()).toBe(true);
    });

    it("does not start multiple timers", () => {
      timerService.start();
      const firstStart = timerService.isRunning();

      timerService.start();
      const secondStart = timerService.isRunning();

      expect(firstStart).toBe(true);
      expect(secondStart).toBe(true);
      // Should still have only one timer running
    });
  });

  describe("stop", () => {
    it("stops the timer", () => {
      timerService.start();
      expect(timerService.isRunning()).toBe(true);

      timerService.stop();
      expect(timerService.isRunning()).toBe(false);
    });

    it("can stop timer that was never started", () => {
      expect(() => timerService.stop()).not.toThrow();
      expect(timerService.isRunning()).toBe(false);
    });
  });

  describe("getViewDuration", () => {
    it("returns 0 for stopped timer", () => {
      expect(timerService.getViewDuration()).toBe(0);
    });

    it("returns elapsed time for running timer", () => {
      timerService.start();

      // Advance time by 5 seconds (50 intervals of 100ms)
      vi.advanceTimersByTime(5000);

      expect(timerService.getViewDuration()).toBe(5000);
    });

    it("returns last duration after stopping", () => {
      timerService.start();

      // Advance time by 3 seconds
      vi.advanceTimersByTime(3000);

      timerService.stop();

      expect(timerService.getViewDuration()).toBe(3000);
    });

    it("maintains duration after reset", () => {
      timerService.start();
      vi.advanceTimersByTime(2000);
      timerService.stop();

      expect(timerService.getViewDuration()).toBe(2000);

      timerService.reset();
      expect(timerService.getViewDuration()).toBe(0);

      // Start again
      timerService.start();
      vi.advanceTimersByTime(1000);

      expect(timerService.getViewDuration()).toBe(1000);
    });
  });

  describe("isRunning", () => {
    it("returns false initially", () => {
      expect(timerService.isRunning()).toBe(false);
    });

    it("returns true when started", () => {
      timerService.start();
      expect(timerService.isRunning()).toBe(true);
    });

    it("returns false when stopped", () => {
      timerService.start();
      timerService.stop();
      expect(timerService.isRunning()).toBe(false);
    });
  });

  describe("reset", () => {
    it("resets view duration to 0", () => {
      timerService.start();
      vi.advanceTimersByTime(2000);
      timerService.stop();

      expect(timerService.getViewDuration()).toBe(2000);

      timerService.reset();
      expect(timerService.getViewDuration()).toBe(0);
    });
  });

  describe("edge cases", () => {
    it("handles rapid start/stop cycles", () => {
      for (let i = 0; i < 5; i++) {
        timerService.start();
        vi.advanceTimersByTime(100);
        timerService.stop();
      }

      expect(timerService.getViewDuration()).toBe(500); // 5 * 100ms
      expect(timerService.isRunning()).toBe(false);
    });

    it("maintains accurate time across multiple operations", () => {
      timerService.start();
      vi.advanceTimersByTime(1000);

      const duration1 = timerService.getViewDuration();
      expect(duration1).toBe(1000);

      vi.advanceTimersByTime(2000);

      const duration2 = timerService.getViewDuration();
      expect(duration2).toBe(3000);

      timerService.stop();

      const finalDuration = timerService.getViewDuration();
      expect(finalDuration).toBe(3000);
    });
  });
});
