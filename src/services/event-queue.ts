/**
 * Event queue management service
 */

import { TrackerPayload } from "src/types/tracker";
import { HttpClient } from "src/utils/http";
import { logger } from "src/utils/logger";

export class EventQueue {
  private queue:              TrackerPayload[] = [];
  private httpClient:         HttpClient;
  private tenant:             string;
  private apiUrl:             string;
  private processingInterval: number | null = null;

  constructor(tenant: string, apiUrl: string) {
    this.tenant = tenant;
    this.apiUrl = apiUrl;
    this.httpClient = new HttpClient();
  }

  add(payload: TrackerPayload): void {
    this.queue.push(payload);
  }

  async sendSync(payload: TrackerPayload, timeoutMs?: number): Promise<unknown> {
    return this.httpClient.post(this.apiUrl, payload, {
      headers: { tenant: this.tenant },
      timeout: timeoutMs,
    });
  }

  startProcessing(): void {
    if (this.processingInterval) return;

    this.processingInterval = window.setInterval(() => {
      this.processQueue();
    }, 3000);
  }

  stopProcessing(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
  }

  private async processQueue(): Promise<void> {
    if (!navigator.onLine || this.queue.length === 0) return;

    while (this.queue.length > 0 && navigator.onLine) {
      const event = this.queue.pop();
      if (!event) break;

      try {
        await this.httpClient.post(this.apiUrl, event, {
          headers: { tenant: this.tenant },
        });
      } catch (error) {
        logger.error("Failed to send event:", error);
        // Re-add the event to the queue for retry
        this.queue.unshift(event);
        break;
      }
    }
  }

  getQueueLength(): number {
    return this.queue.length;
  }
}
