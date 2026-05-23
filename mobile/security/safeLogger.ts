type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_PREFIX = "[RMoney]";

/** Keys that must never appear in log metadata (values redacted). */
const SENSITIVE_KEY_PATTERN =
  /token|secret|password|balance|amount|account|transaction|plaid|merchant|pan|ssn|email/i;

function sanitizeMeta(meta?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!meta) return undefined;
  const safe: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(meta)) {
    if (SENSITIVE_KEY_PATTERN.test(key)) {
      safe[key] = "[REDACTED]";
    } else if (typeof value === "object" && value !== null) {
      safe[key] = "[OBJECT_REDACTED]";
    } else {
      safe[key] = value;
    }
  }
  return safe;
}

function log(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
  const safeMeta = sanitizeMeta(meta);
  const formatted = safeMeta
    ? `${message} ${JSON.stringify(safeMeta)}`
    : message;

  switch (level) {
    case "debug":
      console.debug(LOG_PREFIX, formatted);
      break;
    case "info":
      console.info(LOG_PREFIX, formatted);
      break;
    case "warn":
      console.warn(LOG_PREFIX, formatted);
      break;
    case "error":
      console.error(LOG_PREFIX, formatted);
      break;
  }
}

/** App-wide logger — never pass bank data, tokens, or PII in meta. */
export const safeLogger = {
  debug: (message: string, meta?: Record<string, unknown>) => log("debug", message, meta),
  info: (message: string, meta?: Record<string, unknown>) => log("info", message, meta),
  warn: (message: string, meta?: Record<string, unknown>) => log("warn", message, meta),
  error: (message: string, meta?: Record<string, unknown>) => log("error", message, meta),
};
