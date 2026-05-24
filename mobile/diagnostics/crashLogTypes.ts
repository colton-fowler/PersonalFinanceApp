export type CrashErrorType =
  | "react_render"
  | "uncaught_js"
  | "unhandled_promise";

export type CrashLogRecord = {
  id: number;
  recorded_at: string;
  error_type: CrashErrorType;
  message: string;
  stack: string | null;
  component_stack: string | null;
  platform: string;
  app_version: string;
  build_number: string | null;
  is_fatal: boolean;
};

export type CrashLogInput = {
  error_type: CrashErrorType;
  message: string;
  stack?: string | null;
  component_stack?: string | null;
  is_fatal?: boolean;
};
