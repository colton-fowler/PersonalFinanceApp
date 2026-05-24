import { createElement } from "react";
import "react-native-gesture-handler";
import { registerRootComponent } from "expo";

import App from "./App";
import { AppErrorBoundary } from "./diagnostics/AppErrorBoundary";
import { setupCrashDiagnostics } from "./diagnostics/setupCrashDiagnostics";

setupCrashDiagnostics();

function Root() {
  return createElement(AppErrorBoundary, null, createElement(App));
}

registerRootComponent(Root);
