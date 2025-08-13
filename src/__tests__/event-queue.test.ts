import { EventQueue } from "src/services/event-queue";
import { TrackerPayload } from "src/types/tracker";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock HttpClient
vi.mock("src/utils/http", () => ({
  HttpClient: vi.fn().mockImplementation(() => ({
    post: vi.fn(),
  })),
}));

// Mock navigator.onLine
Object.defineProperty(navigator, "onLine", {
  configurable: true,
  writable:     true,
  value:        true,
});

describe("EventQueue", () => {
  let eventQueue: EventQueue;
  let mockHttpClient: { post: ReturnType<typeof vi.fn> };
  const mockPayload: TrackerPayload = {
    name:      "test-event",
    key:       "test-key",
    variables: { test: "value" },
  };

  beforeEach(() => {
    // Clear all mocks
    vi.clearAllMocks();

    // Create new instance
    eventQueue = new EventQueue("test-tenant", "https://api.test.com");

    // Get the mocked HttpClient instance
    mockHttpClient = (eventQueue as unknown as { httpClient: typeof mockHttpClient }).httpClient;
  });

  afterEach(() => {
    eventQueue.stopProcessing();
  });

  describe("add", () => {
    it("adds payload to queue", () => {
      eventQueue.add(mockPayload);
      expect(eventQueue.getQueueLength()).toBe(1);
    });

    it("adds multiple payloads to queue", () => {
      eventQueue.add(mockPayload);
      eventQueue.add(mockPayload);
      expect(eventQueue.getQueueLength()).toBe(2);
    });
  });

  describe("sendSync", () => {
    it("sends payload synchronously with tenant header", async () => {
      mockHttpClient.post.mockResolvedValueOnce({ success: true });

      const result = await eventQueue.sendSync(mockPayload);

      expect(mockHttpClient.post).toHaveBeenCalledWith("https://api.test.com", mockPayload, {
        headers: { tenant: "test-tenant" },
        timeout: undefined,
      });
      expect(result).toEqual({ success: true });
    });

    it("sends payload synchronously with custom timeout", async () => {
      mockHttpClient.post.mockResolvedValueOnce({ success: true });

      await eventQueue.sendSync(mockPayload, 5000);

      expect(mockHttpClient.post).toHaveBeenCalledWith("https://api.test.com", mockPayload, {
        headers: { tenant: "test-tenant" },
        timeout: 5000,
      });
    });

    it("handles sync send errors", async () => {
      const error = new Error("Network error");
      mockHttpClient.post.mockRejectedValueOnce(error);

      await expect(eventQueue.sendSync(mockPayload)).rejects.toThrow("Network error");
    });
  });

  describe("processing", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("starts processing interval", () => {
      eventQueue.startProcessing();
      expect((eventQueue as unknown as { processingInterval: number | null }).processingInterval).not.toBeNull();
    });

    it("does not start multiple processing intervals", () => {
      eventQueue.startProcessing();
      const firstInterval = (eventQueue as unknown as { processingInterval: number | null }).processingInterval;

      eventQueue.startProcessing();
      const secondInterval = (eventQueue as unknown as { processingInterval: number | null }).processingInterval;

      expect(firstInterval).toBe(secondInterval);
    });

    it("stops processing interval", () => {
      eventQueue.startProcessing();
      expect((eventQueue as unknown as { processingInterval: number | null }).processingInterval).not.toBeNull();

      eventQueue.stopProcessing();
      expect((eventQueue as unknown as { processingInterval: number | null }).processingInterval).toBeNull();
    });

    it("processes queue when online", async () => {
      mockHttpClient.post.mockResolvedValue({ success: true });

      eventQueue.add(mockPayload);
      eventQueue.startProcessing();

      // Wait for the first processing cycle
      await vi.advanceTimersByTimeAsync(3000);

      expect(mockHttpClient.post).toHaveBeenCalledWith("https://api.test.com", mockPayload, {
        headers: { tenant: "test-tenant" },
      });
      expect(eventQueue.getQueueLength()).toBe(0);
    });

    it("does not process queue when offline", async () => {
      Object.defineProperty(navigator, "onLine", { value: false });

      eventQueue.add(mockPayload);
      eventQueue.startProcessing();

      await vi.advanceTimersByTimeAsync(3000);

      expect(mockHttpClient.post).not.toHaveBeenCalled();
      expect(eventQueue.getQueueLength()).toBe(1);

      // Restore online status
      Object.defineProperty(navigator, "onLine", { value: true });
    });

    it("does not process empty queue", async () => {
      eventQueue.startProcessing();

      await vi.advanceTimersByTimeAsync(3000);

      expect(mockHttpClient.post).not.toHaveBeenCalled();
    });

    it("re-adds failed events to queue", async () => {
      const error = new Error("Network error");
      mockHttpClient.post.mockRejectedValueOnce(error);

      // Mock console.error to prevent error output during test
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {
        // Suppress error output
      });

      eventQueue.add(mockPayload);
      eventQueue.startProcessing();

      await vi.advanceTimersByTimeAsync(3000);

      // Event should be back in queue after failure
      expect(eventQueue.getQueueLength()).toBe(1);

      // Restore console.error
      consoleSpy.mockRestore();
    });

    it("processes multiple events in queue", async () => {
      mockHttpClient.post.mockResolvedValue({ success: true });

      eventQueue.add(mockPayload);
      eventQueue.add({ ...mockPayload, key: "test-key-2" });
      eventQueue.startProcessing();

      await vi.advanceTimersByTimeAsync(3000);

      expect(mockHttpClient.post).toHaveBeenCalledTimes(2);
      expect(eventQueue.getQueueLength()).toBe(0);
    });
  });

  describe("getQueueLength", () => {
    it("returns correct queue length", () => {
      expect(eventQueue.getQueueLength()).toBe(0);

      eventQueue.add(mockPayload);
      expect(eventQueue.getQueueLength()).toBe(1);

      eventQueue.add(mockPayload);
      expect(eventQueue.getQueueLength()).toBe(2);
    });
  });
});
