/**
 * SDK logger — single output surface for every internal `console.*` call.
 *
 * Hosts can replace the default (which calls through to `console.*`) with
 * `setSdkLogger()` to silence the SDK, pipe it into Sentry, or tag entries.
 *
 * Defaults call through lazily (no captured reference) so tests can still
 * stub `console.warn = () => {}` without first swapping the SDK logger.
 */

export type SdkLogLevel = "debug" | "log" | "info" | "warn" | "error";

export interface SdkLogger {
  debug: (...args: unknown[]) => void;
  log: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
}

const defaultLogger: SdkLogger = {
  debug: (...args) => console.debug(...args),
  log: (...args) => console.log(...args),
  info: (...args) => console.info(...args),
  warn: (...args) => console.warn(...args),
  error: (...args) => console.error(...args),
};

let current: SdkLogger = defaultLogger;

export function setSdkLogger(logger: Partial<SdkLogger> | null): void {
  if (!logger) {
    current = defaultLogger;
    return;
  }
  current = {
    debug: logger.debug ?? defaultLogger.debug,
    log: logger.log ?? defaultLogger.log,
    info: logger.info ?? defaultLogger.info,
    warn: logger.warn ?? defaultLogger.warn,
    error: logger.error ?? defaultLogger.error,
  };
}

export function getSdkLogger(): SdkLogger {
  return current;
}

/**
 * Scoped logger — prefixes every entry with `[scope]`.
 * Use one per module so disabling a noisy area is a single line in the host.
 */
export function createScopedLogger(scope: string): SdkLogger {
  const tag = `[${scope}]`;
  return {
    debug: (...args) => current.debug(tag, ...args),
    log: (...args) => current.log(tag, ...args),
    info: (...args) => current.info(tag, ...args),
    warn: (...args) => current.warn(tag, ...args),
    error: (...args) => current.error(tag, ...args),
  };
}

export const sdkLog = createScopedLogger("sdk");
