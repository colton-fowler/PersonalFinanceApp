import { useNavigation } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { Alert, Text, View } from "react-native";
import { Card } from "../components/ui/Card";
import {
  DestructiveButton,
  PrimaryButton,
  SecondaryButton,
} from "../components/ui/Button";
import { ScreenContainer } from "../components/ui/ScreenContainer";
import {
  clearLocalFinancialData,
  wipeAllLocalData,
} from "../security/dataReset";
import { syncDashboardFromPlaid } from "../services/dashboardSyncService";
import { formatManualRefreshThrottleMessage } from "../utils/formatPlaidSyncWait";

type SettingsScreenProps = {
  onUnlinked: () => void;
};

export function SettingsScreen({ onUnlinked }: SettingsScreenProps) {
  const navigation = useNavigation();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [refreshNotice, setRefreshNotice] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleRefreshDashboard = useCallback(async () => {
    setIsRefreshing(true);
    setRefreshNotice(null);
    setStatusMessage(null);

    try {
      const result = await syncDashboardFromPlaid({ mode: "manual" });
      if (result.skipped) {
        setRefreshNotice(formatManualRefreshThrottleMessage(result.nextAllowedAt));
        return;
      }

      setStatusMessage("Dashboard refreshed from Plaid.");
    } catch {
      setStatusMessage("Refresh failed. Check your connection and proxy server.");
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  const confirmDisconnect = useCallback(() => {
    Alert.alert(
      "Disconnect Plaid on this device?",
      "This removes your local RMoney copy of linked accounts, transactions, subscriptions, sync timestamps, and stored Plaid credentials. It does not close or delete anything at your bank.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Disconnect",
          style: "destructive",
          onPress: () => {
            void (async () => {
              setIsResetting(true);
              setStatusMessage(null);
              try {
                await wipeAllLocalData();
                onUnlinked();
              } catch {
                setStatusMessage("Could not reset local Plaid data. Try again.");
                setIsResetting(false);
              }
            })();
          },
        },
      ],
    );
  }, [onUnlinked]);

  const confirmClearLocal = useCallback(() => {
    Alert.alert(
      "Clear local app data?",
      "This deletes cached accounts, transactions, subscriptions, and sync timestamps from SQLite on this device. Your Plaid access token stays in Secure Store so you can refresh without re-linking.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear data",
          style: "destructive",
          onPress: () => {
            void (async () => {
              setIsResetting(true);
              setStatusMessage(null);
              try {
                await clearLocalFinancialData();
                setStatusMessage("Local financial data cleared.");
                navigation.goBack();
              } catch {
                setStatusMessage("Could not clear local data. Try again.");
              } finally {
                setIsResetting(false);
              }
            })();
          },
        },
      ],
    );
  }, [navigation]);

  return (
    <ScreenContainer contentClassName="pb-16">
      <Text className="mb-1 text-[28px] font-bold tracking-tight text-slate-900">
        Settings
      </Text>
      <Text className="mb-6 text-sm leading-5 text-slate-500">
        Local dev controls for RMoney. These actions only affect data stored on
        this device.
      </Text>

      {refreshNotice ? (
        <Card variant="muted" className="mb-4 border border-slate-200/80 bg-slate-50/80">
          <Text className="text-sm leading-5 text-slate-600">{refreshNotice}</Text>
        </Card>
      ) : null}

      {statusMessage ? (
        <Card variant="muted" className="mb-4 border border-slate-200/80 bg-slate-50/80">
          <Text className="text-sm leading-5 text-slate-600">{statusMessage}</Text>
        </Card>
      ) : null}

      <View className="gap-4">
        <Card variant="elevated">
          <Text className="text-base font-semibold text-slate-900">Sync</Text>
          <Text className="mt-1 text-sm leading-5 text-slate-500">
            Run the same manual Plaid refresh used on the dashboard (subject to
            the 2-minute throttle).
          </Text>
          <PrimaryButton
            title={isRefreshing ? "Refreshing…" : "Refresh dashboard"}
            onPress={() => void handleRefreshDashboard()}
            loading={isRefreshing}
            disabled={isRefreshing || isResetting}
            className="mt-4"
          />
        </Card>

        <Card variant="elevated">
          <Text className="text-base font-semibold text-slate-900">
            Disconnect / reset Plaid data
          </Text>
          <Text className="mt-1 text-sm leading-5 text-slate-500">
            Full local reset: SQLite financial data, sync timestamps, and Plaid
            credentials. Use this before linking real data again.
          </Text>
          <DestructiveButton
            title="Disconnect / reset Plaid data"
            onPress={confirmDisconnect}
            loading={isResetting}
            disabled={isRefreshing || isResetting}
            className="mt-4"
          />
        </Card>

        <Card variant="elevated">
          <Text className="text-base font-semibold text-slate-900">
            Clear local app data
          </Text>
          <Text className="mt-1 text-sm leading-5 text-slate-500">
            Wipes cached accounts, transactions, and subscriptions from SQLite but
            keeps your Plaid token so you can sync again from the dashboard.
          </Text>
          <SecondaryButton
            title="Clear local app data"
            onPress={confirmClearLocal}
            loading={isResetting}
            disabled={isRefreshing || isResetting}
            className="mt-4"
          />
        </Card>
      </View>
    </ScreenContainer>
  );
}
