import { installGlobalErrorHandlers } from "./globalErrorHandlers";
import { registerDevCrashTools } from "./registerDevCrashTools";

let started = false;

/** Call once before the React root mounts. */
export function setupCrashDiagnostics(): void {
  if (started) {
    return;
  }
  started = true;

  installGlobalErrorHandlers();
  registerDevCrashTools();
}
