import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { DashboardEmptyState } from "../components/dashboard/DashboardEmptyState";
import { DashboardSection } from "../components/dashboard/DashboardSection";
import { TransactionDetailModal } from "../components/transactions/TransactionDetailModal";
import { TransactionListRow } from "../components/transactions/TransactionListRow";
import { Card } from "../components/ui/Card";
import { PrimaryButton } from "../components/ui/Button";
import { ScreenContainer } from "../components/ui/ScreenContainer";
import type { Account } from "../db/models/account";
import { SETTING_KEYS } from "../db/models/setting";
import type { Transaction } from "../db/models/transaction";
import { getAccountById } from "../db/repositories/accountsRepository";
import { getSetting } from "../db/repositories/settingsRepository";
import { listTransactionsByAccount } from "../db/repositories/transactionsRepository";
import type { RootStackParamList } from "../navigation/types";
import { formatAccountTypeLabel } from "../utils/formatAccountLabel";
import { formatCurrency } from "../utils/formatCurrency";
import { formatLastSyncedAt } from "../utils/formatLastSync";

type Props = NativeStackScreenProps<RootStackParamList, "AccountDetail">;

type ScreenState = "loading" | "ready" | "error";

const LOAD_ERROR = "Could not load this account from local storage.";

export function AccountDetailScreen({ route }: Props) {
  const { accountId } = route.params;
  const [state, setState] = useState<ScreenState>("loading");
  const [account, setAccount] = useState<Account | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(
    null,
  );

  const loadAccountDetail = useCallback(async () => {
    setState("loading");

    try {
      const [accountRow, transactionRows, syncSetting] = await Promise.all([
        getAccountById(accountId),
        listTransactionsByAccount(accountId),
        getSetting(SETTING_KEYS.LAST_SYNC_AT),
      ]);

      if (!accountRow) {
        setAccount(null);
        setTransactions([]);
        setState("error");
        return;
      }

      setAccount(accountRow);
      setTransactions(transactionRows);
      setLastSyncedAt(syncSetting?.value ?? accountRow.last_updated);
      setState("ready");
    } catch {
      setState("error");
    }
  }, [accountId]);

  useEffect(() => {
    void loadAccountDetail();
  }, [loadAccountDetail]);

  const lastSyncedLabel = formatLastSyncedAt(lastSyncedAt);
  const showLoading = state === "loading";
  const showError = state === "error";

  return (
    <ScreenContainer contentClassName="pb-16">
      {showLoading ? (
        <Card variant="elevated" className="items-center py-16">
          <ActivityIndicator size="large" color="#0284c7" />
          <Text className="mt-5 text-center text-lg font-semibold text-slate-900">
            Loading account
          </Text>
        </Card>
      ) : null}

      {showError ? (
        <Card variant="elevated" className="items-center py-8">
          <Text className="text-center text-lg font-semibold text-slate-900">
            Account not found
          </Text>
          <Text className="mt-2 text-center text-sm leading-5 text-rose-600">
            {LOAD_ERROR}
          </Text>
          <PrimaryButton
            title="Try again"
            onPress={() => void loadAccountDetail()}
            className="mt-5 w-full"
          />
        </Card>
      ) : null}

      {state === "ready" && account ? (
        <View className="gap-6">
          <View>
            <Text className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              {account.institution_name}
            </Text>
            <Text className="mt-1.5 text-[28px] font-bold tracking-tight text-slate-900">
              {account.account_name}
            </Text>
            <Text className="mt-1 text-sm text-slate-500">
              {formatAccountTypeLabel(account)}
            </Text>
            {lastSyncedLabel ? (
              <Text className="mt-2 text-sm text-slate-500">
                Last synced {lastSyncedLabel}
              </Text>
            ) : null}
          </View>

          <Card variant="elevated">
            <Text className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Current balance
            </Text>
            <Text className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
              {formatCurrency(account.current_balance)}
            </Text>
            <Text className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Available
            </Text>
            <Text className="mt-1 text-lg font-semibold tabular-nums text-slate-800">
              {formatCurrency(account.available_balance)}
            </Text>
          </Card>

          <DashboardSection title="Transactions" subtitle="Cached on this device">
            {transactions.length === 0 ? (
              <DashboardEmptyState
                title="No transactions yet"
                message="Transactions for this account will appear here after a dashboard sync."
              />
            ) : (
              <View>
                {transactions.map((transaction, index) => (
                  <TransactionListRow
                    key={transaction.id}
                    transaction={transaction}
                    isFirst={index === 0}
                    onPress={() => setSelectedTransactionId(transaction.id)}
                  />
                ))}
              </View>
            )}
          </DashboardSection>
        </View>
      ) : null}

      <TransactionDetailModal
        visible={selectedTransactionId !== null}
        transactionId={selectedTransactionId}
        accountLabel={account?.account_name ?? "Account"}
        onClose={() => setSelectedTransactionId(null)}
        onCategorySaved={() => void loadAccountDetail()}
      />
    </ScreenContainer>
  );
}
