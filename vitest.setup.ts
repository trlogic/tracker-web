// Global test setup for vitest

// Polyfill performance if needed (jsdom provides performance.now)

// Silence console noise from expected errors during tests
const originalConsoleError = console.error;
console.error = (...args: (string | string[])[]) => {
  if (typeof args[0] === "string" && args[0].includes("HTTP Error")) return;
  originalConsoleError(...args);
};

// Jsdom does not implement full canvas/webgl; stub to prevent noisy errors in fingerprint & headless detection
if (!HTMLCanvasElement.prototype.getContext) {
  (HTMLCanvasElement.prototype as unknown as { getContext: (ctx: string) => unknown }).getContext = () => ({
    getExtension: () => null,
    getParameter: () => null,
  });
}
