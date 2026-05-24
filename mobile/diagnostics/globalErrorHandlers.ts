import { recordCrash } from "./recordCrash";

type GlobalHandler = (error: unknown, isFatal?: boolean) => void;

type ErrorUtilsLike = {
  getGlobalHandler?: () => GlobalHandler;
  setGlobalHandler?: (handler: GlobalHandler) => void;
};

let installed = false;

function getErrorUtils(): ErrorUtilsLike | null {
  const candidate = (globalThis as { ErrorUtils?: ErrorUtilsLike }).ErrorUtils;
  if (
    candidate &&
    typeof candidate.getGlobalHandler === "function" &&
    typeof candidate.setGlobalHandler === "function"
  ) {
    return candidate;
  }
  return null;
}

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

function installUncaughtJsHandler(): boolean {
  const errorUtils = getErrorUtils();
  if (!errorUtils?.getGlobalHandler || !errorUtils?.setGlobalHandler) {
    return false;
  }

  const previousHandler = errorUtils.getGlobalHandler();

  errorUtils.setGlobalHandler((error: unknown, isFatal?: boolean) => {
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

  return true;
}

/** Installs global JS handlers once; chains to the previous handler when supported. */
export function installGlobalErrorHandlers(): void {
  if (installed) {
    return;
  }
  installed = true;

  try {
    installUncaughtJsHandler();
  } catch {
    // ErrorUtils unavailable or handler install failed — continue without it
  }

  try {
    installPromiseRejectionTracking();
  } catch {
    // Promise rejection tracking unavailable
  }
}
