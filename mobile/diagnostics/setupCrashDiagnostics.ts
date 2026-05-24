import { installGlobalErrorHandlers } from "./globalErrorHandlers";
import { registerDevCrashTools } from "./registerDevCrashTools";

let started = false;

/** Call once before the React root mounts. Never throws — diagnostics must not block startup. */
export function setupCrashDiagnostics(): void {
  if (started) {
    return;
  }
  started = true;

  try {
    installGlobalErrorHandlers();
  } catch {
    // Skip global handlers if runtime does not support them
  }

  try {
    registerDevCrashTools();
  } catch {
    // Dev tools are optional
  }
}
