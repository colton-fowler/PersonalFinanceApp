import { ErrorUtils } from "react-native";
import { recordCrash } from "./recordCrash";

type GlobalHandler = NonNullable<typeof ErrorUtils.setGlobalHandler extends (h: infer H) => void ? H : never>;

let installed = false;

function normalizeError(error: unknown): { message: string; stack: string | null } {
  if (error instanceof Error) {
    return {
      message: error.message || error.name,
      stack: error.stack ?? null,
    };
  }
  return {
    message: String(error),
    stack: null,
  };
}

function installPromiseRejectionTracking(): void {
  try {
    // RN bundles promise rejection tracking for dev tooling.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const rejectionTracking = require("promise/setimmediate/rejection-tracking") as {
      enable: (options: {
        allRejections: boolean;
        onUnhandled: (id: number, error: unknown) => void;
        onHandled: (id: number) => void;
      }) => void;
    };

    rejectionTracking.enable({
      allRejections: true,
      onUnhandled: (_id, error) => {
        const normalized = normalizeError(error);
        void recordCrash({
          error_type: "unhandled_promise",
          message: normalized.message,
          stack: normalized.stack,
        });
      },
      onHandled: () => {
        // no-op
      },
    });
  } catch {
    // Optional — unavailable in some runtimes
  }
}

/** Installs global JS handlers once; chains to the previous handler. */
export function installGlobalErrorHandlers(): void {
  if (installed) {
    return;
  }
  installed = true;

  const previousHandler = ErrorUtils.getGlobalHandler() as GlobalHandler | undefined;

  ErrorUtils.setGlobalHandler((error: unknown, isFatal?: boolean) => {
    const normalized = normalizeError(error);
    void recordCrash({
      error_type: "uncaught_js",
      message: normalized.message,
      stack: normalized.stack,
      is_fatal: Boolean(isFatal),
    });

    if (previousHandler) {
      previousHandler(error, isFatal);
      return;
    }

    throw error;
  });

  installPromiseRejectionTracking();
}
