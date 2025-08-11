/**
 * Timer management service
 */

export class TimerService {
  private timerInstance: number | null = null;
  private viewDuration = 0;
  private readonly INTERVAL_MS = 100;

  start(): void {
    if (this.timerInstance) return;

    this.timerInstance = window.setInterval(() => {
      this.viewDuration += this.INTERVAL_MS;
    }, this.INTERVAL_MS);
  }

  stop(): void {
    if (this.timerInstance) {
      clearInterval(this.timerInstance);
      this.timerInstance = null;
    }
  }

  reset(): void {
    this.viewDuration = 0;
  }

  getViewDuration(): number {
    return this.viewDuration;
  }

  isRunning(): boolean {
    return this.timerInstance !== null;
  }
}
