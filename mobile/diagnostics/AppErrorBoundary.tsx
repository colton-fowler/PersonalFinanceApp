import { Component, type ErrorInfo, type ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { recordCrash } from "./recordCrash";

type AppErrorBoundaryProps = {
  children: ReactNode;
};

type AppErrorBoundaryState = {
  hasError: boolean;
  resetKey: number;
};

export class AppErrorBoundary extends Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = {
    hasError: false,
    resetKey: 0,
  };

  static getDerivedStateFromError(): Partial<AppErrorBoundaryState> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    void recordCrash({
      error_type: "react_render",
      message: error.message || error.name,
      stack: error.stack ?? null,
      component_stack: info.componentStack ?? null,
    });
  }

  private handleRetry = (): void => {
    this.setState((prev) => ({
      hasError: false,
      resetKey: prev.resetKey + 1,
    }));
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <View className="flex-1 items-center justify-center bg-slate-50 px-8">
          <Text className="text-center text-2xl font-bold text-slate-900">
            Something went wrong
          </Text>
          <Text className="mt-3 text-center text-base leading-6 text-slate-600">
            The app hit an unexpected error. Your data on this device should be
            safe. Try again, or check Metro / logcat if this keeps happening.
          </Text>
          <Pressable
            onPress={this.handleRetry}
            className="mt-8 rounded-2xl bg-brand-600 px-8 py-3.5 active:bg-brand-700"
            accessibilityRole="button"
          >
            <Text className="font-semibold text-white">Try again</Text>
          </Pressable>
        </View>
      );
    }

    return (
      <View key={this.state.resetKey} className="flex-1">
        {this.props.children}
      </View>
    );
  }
}
