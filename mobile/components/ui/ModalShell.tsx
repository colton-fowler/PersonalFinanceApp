import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

type ModalShellProps = {
  visible: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  loading?: boolean;
  children: ReactNode;
  headerExtra?: ReactNode;
};

export function ModalShell({
  visible,
  title,
  subtitle,
  onClose,
  loading = false,
  children,
  headerExtra,
}: ModalShellProps) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-surface-50">
        <View className="border-b border-slate-200/80 bg-white px-5 pb-4 pt-14">
          <View className="flex-row items-start justify-between">
            <View className="min-w-0 flex-1 pr-4">
              <Text className="text-xl font-bold tracking-tight text-slate-900">
                {title}
              </Text>
              {subtitle ? (
                <Text className="mt-1 text-sm text-slate-500">{subtitle}</Text>
              ) : null}
              {headerExtra}
            </View>
            <Pressable
              onPress={onClose}
              className="rounded-full bg-slate-100 px-3.5 py-2 active:bg-slate-200"
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Text className="text-sm font-semibold text-slate-700">Close</Text>
            </Pressable>
          </View>
        </View>

        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#0284c7" />
          </View>
        ) : (
          <ScrollView
            className="flex-1"
            contentContainerClassName="gap-5 px-5 pb-12 pt-5"
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}
