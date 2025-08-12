// Lightweight dev-only logger. Messages are suppressed in production builds.
const isDev = (() => {
  try {
    const g = (typeof globalThis !== "undefined" ? globalThis : {}) as Record<string, unknown> & {
      process?: { env?: { NODE_ENV?: string } };
    };
    const env = g.process?.env?.NODE_ENV;
    return env !== "production";
  } catch {
    return true; // default to dev if uncertain
  }
})();

export const logger = {
  debug: (...args: unknown[]) => {
    if (isDev) console.debug("[tracker]", ...args);
  },
  info: (...args: unknown[]) => {
    if (isDev) console.info("[tracker]", ...args);
  },
  warn: (...args: unknown[]) => {
    if (isDev) console.warn("[tracker]", ...args);
  },
  error: (...args: unknown[]) => {
    if (isDev) console.error("[tracker]", ...args);
  },
};

export type Logger = typeof logger;
