import { safeLogger } from "../security/safeLogger";
import { appendCrashLog } from "./crashLogStore";
import type { CrashLogInput } from "./crashLogTypes";

/** Persists a crash record locally and logs a redacted summary to Metro. */
export async function recordCrash(input: CrashLogInput): Promise<number | null> {
  try {
    const id = await appendCrashLog(input);
    safeLogger.error("Crash recorded", {
      recordId: id,
      errorType: input.error_type,
      isFatal: Boolean(input.is_fatal),
      messagePreview: input.message.slice(0, 120),
    });
    return id;
  } catch {
    safeLogger.error("Failed to persist crash log");
    return null;
  }
}
