import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { DashboardEmptyState } from "../components/dashboard/DashboardEmptyState";
import { DashboardSection } from "../components/dashboard/DashboardSection";
import { SubscriptionDetailModal } from "../components/subscriptions/SubscriptionDetailModal";
import { CategorySpendingModal } from "../components/transactions/CategorySpendingModal";
import { TransactionCategoryChip } from "../components/transactions/TransactionCategoryChip";
import { TransactionDetailModal } from "../components/transactions/TransactionDetailModal";
import { TransactionSearchInput } from "../components/transactions/TransactionSearchInput";
import type { Account } from "../db/models/account";
import { SETTING_KEYS } from "../db/models/setting";
import type { Subscription } from "../db/models/subscription";
import type { Transaction } from "../db/models/transaction";
import { listAccounts } from "../db/repositories/accountsRepository";
import { getSetting } from "../db/repositories/settingsRepository";
import { listVisibleSubscriptions } from "../db/repositories/subscriptionsRepository";
import {
  listAllTransactions,
} from "../db/repositories/transactionsRepository";
import { syncDashboardFromPlaid } from "../services/dashboardSyncService";
import {
  listMonthlySpendingTransactionsForCategory,
  sumSpendingTransactionAmounts,
  summarizeMonthlySpending,
  type MonthlySpendingSummary,
} from "../services/monthlySpendingService";
import {
  groupAccountsByCategory,
  sumAccountBalances,
} from "../utils/accountGroups";
import { formatCadenceLabel } from "../utils/formatCadence";
import { formatCurrency } from "../utils/formatCurrency";
import { formatLastSyncedAt } from "../utils/formatLastSync";
import {
  formatTransactionAmount,
  formatTransactionDate,
} from "../utils/formatTransactionAmount";
import {
  filterTransactionRows,
  normalizeTransactionSearchQuery,
} from "../utils/filterTransactions";

type DashboardState = "loading" | "ready" | "error";

type TransactionRow = Transaction & {
  accountLabel: string;
};

const GENERIC_ERROR =
  "Sync failed. Check your connection and proxy server, then try again.";
const RECENT_TRANSACTION_LIMIT = 25;

export function Dashboard() {
  const [state, setState] = useState<DashboardState>("loading");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [monthlySpending, setMonthlySpending] = useState<MonthlySpendingSummary | null>(
    null,
  );
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(
    null,
  );
  const [selectedSpendingCategory, setSelectedSpendingCategory] = useState<string | null>(
    null,
  );
  const [selectedSubscriptionId, setSelectedSubscriptionId] = useState<string | null>(
    null,
  );
  const [transactionSearchQuery, setTransactionSearchQuery] = useState("");
  const hasLoadedOnce = useRef(false);
  const refreshInFlight = useRef(false);

  const loadLocalDashboardData = useCallback(async () => {
    const [accountRows, allTransactionRows, subscriptionRows, syncSetting] =
      await Promise.all([
        listAccounts(),
        listAllTransactions(),
        listVisibleSubscriptions(),
        getSetting(SETTING_KEYS.LAST_SYNC_AT),
      ]);

    const recentTransactionRows = [...allTransactionRows]
      .sort((left, right) => {
        const dateCompare = right.date.localeCompare(left.date);
        if (dateCompare !== 0) {
          return dateCompare;
        }
        return right.created_at.localeCompare(left.created_at);
      })
      .slice(0, RECENT_TRANSACTION_LIMIT);

    const spendingSummary = summarizeMonthlySpending(allTransactionRows);

    setAccounts(accountRows);
    setAllTransactions(allTransactionRows);
    setTransactions(recentTransactionRows);
    setSubscriptions(subscriptionRows);
    setMonthlySpending(spendingSummary);
    setLastSyncedAt(syncSetting?.value ?? null);
  }, []);

  const loadDashboard = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      if (refreshInFlight.current) {
        return;
      }

      refreshInFlight.current = true;
      setSyncError(null);

      if (mode === "initial" && !hasLoadedOnce.current) {
        setState("loading");
      } else {
        setIsRefreshing(true);
      }

      try {
        const syncResult = await syncDashboardFromPlaid();
        await loadLocalDashboardData();
        setLastSyncedAt(syncResult.lastSyncedAt);
        hasLoadedOnce.current = true;
        setState("ready");
      } catch {
        if (hasLoadedOnce.current) {
          setSyncError(GENERIC_ERROR);
          setState("ready");
        } else {
          setState("error");
        }
      } finally {
        refreshInFlight.current = false;
        setIsRefreshing(false);
      }
    },
    [loadLocalDashboardData],
  );

  useEffect(() => {
    void loadDashboard("initial");
  }, [loadDashboard]);

  const accountLabelById = useMemo(() => {
    const map = new Map<string, string>();
    for (const account of accounts) {
      map.set(account.id, account.account_name);
    }
    return map;
  }, [accounts]);

  const transactionRows: TransactionRow[] = useMemo(
    () =>
      transactions.map((transaction) => ({
        ...transaction,
        accountLabel:
          accountLabelById.get(transaction.account_id) ?? "Account",
      })),
    [transactions, accountLabelById],
  );

  const selectedTransaction = useMemo(() => {
    if (!selectedTransactionId) {
      return null;
    }

    const transaction =
      allTransactions.find((row) => row.id === selectedTransactionId) ??
      transactions.find((row) => row.id === selectedTransactionId);

    if (!transaction) {
      return null;
    }

    return {
      ...transaction,
      accountLabel: accountLabelById.get(transaction.account_id) ?? "Account",
    };
  }, [selectedTransactionId, allTransactions, transactions, accountLabelById]);

  const categorySpendingRows = useMemo(() => {
    if (!selectedSpendingCategory || !monthlySpending) {
      return [];
    }

    return listMonthlySpendingTransactionsForCategory(
      allTransactions,
      selectedSpendingCategory,
      monthlySpending.monthKey,
    ).map((transaction) => ({
      ...transaction,
      accountLabel: accountLabelById.get(transaction.account_id) ?? "Account",
    }));
  }, [selectedSpendingCategory, allTransactions, monthlySpending, accountLabelById]);

  const categorySpendingTotal = useMemo(
    () => sumSpendingTransactionAmounts(categorySpendingRows),
    [categorySpendingRows],
  );

  const normalizedTransactionSearch = useMemo(
    () => normalizeTransactionSearchQuery(transactionSearchQuery),
    [transactionSearchQuery],
  );

  const filteredTransactionRows = useMemo(
    () => filterTransactionRows(transactionRows, normalizedTransactionSearch),
    [transactionRows, normalizedTransactionSearch],
  );

  const totalBalance = sumAccountBalances(accounts);
  const groups = groupAccountsByCategory(accounts);
  const institutionName = accounts[0]?.institution_name ?? "Your accounts";
  const lastSyncedLabel = formatLastSyncedAt(lastSyncedAt);
  const showInitialLoading = state === "loading" && !hasLoadedOnce.current;
  const showFatalError = state === "error" && !hasLoadedOnce.current;

  return (
    <ScrollView
      className="flex-1 bg-slate-50"
      contentContainerClassName="px-5 pb-12 pt-14"
    >
      <View className="mb-6">
        <Text className="text-xs font-semibold uppercase tracking-widest text-slate-500">
          {institutionName}
        </Text>
        <Text className="mt-1 text-3xl font-bold text-slate-900">Dashboard</Text>
        {lastSyncedLabel ? (
          <Text className="mt-2 text-sm text-slate-500">
            Last refreshed {lastSyncedLabel}
          </Text>
        ) : null}
      </View>

      {isRefreshing ? (
        <View className="mb-4 flex-row items-center rounded-xl border border-brand-100 bg-brand-50 px-4 py-3">
          <ActivityIndicator size="small" color="#0284c7" />
          <Text className="ml-3 text-sm text-brand-700">Refreshing dashboard…</Text>
        </View>
      ) : null}

      {syncError ? (
        <View className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <Text className="text-sm leading-5 text-red-700">{syncError}</Text>
        </View>
      ) : null}

      {showInitialLoading ? (
        <View className="items-center rounded-2xl border border-slate-100 bg-white px-6 py-14 shadow-sm">
          <ActivityIndicator size="large" color="#0284c7" />
          <Text className="mt-4 text-center text-base font-medium text-slate-900">
            Setting up your dashboard
          </Text>
          <Text className="mt-2 text-center text-sm leading-5 text-slate-500">
            Syncing accounts, transactions, subscriptions, and spending totals.
          </Text>
        </View>
      ) : null}

      {showFatalError ? (
        <View className="rounded-2xl border border-slate-100 bg-white px-5 py-6 shadow-sm">
          <Text className="text-center text-base font-medium text-slate-900">
            Couldn&apos;t load dashboard
          </Text>
          <Text className="mt-2 text-center text-sm leading-5 text-red-600">
            {GENERIC_ERROR}
          </Text>
          <Pressable
            onPress={() => void loadDashboard("initial")}
            disabled={isRefreshing}
            className={`mt-4 items-center rounded-xl bg-brand-600 py-3 ${
              isRefreshing ? "opacity-50" : "active:bg-brand-700"
            }`}
          >
            <Text className="font-semibold text-white">Try again</Text>
          </Pressable>
        </View>
      ) : null}

      {state === "ready" ? (
        <View className="gap-5">
          <View className="rounded-2xl bg-brand-600 px-6 py-7 shadow-md">
            <Text className="text-sm font-medium text-brand-100">Total balance</Text>
            <Text className="mt-2 text-4xl font-bold text-white">
              {formatCurrency(totalBalance)}
            </Text>
            <Text className="mt-2 text-sm text-brand-100">
              {accounts.length > 0
                ? `Across ${accounts.length} linked account${accounts.length === 1 ? "" : "s"}`
                : "Connect a bank to see balances"}
            </Text>
          </View>

          <DashboardSection
            title="Accounts"
            subtitle="Balances by account type"
          >
            {groups.length === 0 ? (
              <DashboardEmptyState message="No linked accounts yet. Connect your bank, then refresh to pull balances." />
            ) : (
              <View className="gap-3">
                {groups.map((group) => (
                  <View
                    key={group.key}
                    className="flex-row items-center justify-between rounded-xl bg-slate-50 px-4 py-4"
                  >
                    <View className="flex-1 pr-4">
                      <Text className="text-base font-semibold text-slate-900">
                        {group.label}
                      </Text>
                      <Text className="mt-1 text-sm text-slate-500">
                        {group.accounts.length} account
                        {group.accounts.length === 1 ? "" : "s"}
                      </Text>
                    </View>
                    <Text className="text-lg font-bold text-slate-900">
                      {formatCurrency(group.total)}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </DashboardSection>

          <DashboardSection
            title="Monthly spending"
            subtitle={monthlySpending?.monthLabel ?? "This month"}
          >
            {monthlySpending && monthlySpending.totalSpent > 0 ? (
              <View className="gap-3">
                <View className="rounded-xl bg-slate-50 px-4 py-4">
                  <Text className="text-sm font-medium text-slate-500">
                    Total spent this month
                  </Text>
                  <Text className="mt-1 text-2xl font-bold text-slate-900">
                    {formatCurrency(monthlySpending.totalSpent)}
                  </Text>
                </View>

                {monthlySpending.topCategories.map((categorySpend) => (
                  <ListRow
                    key={categorySpend.category}
                    onPress={() => setSelectedSpendingCategory(categorySpend.category)}
                    trailing={
                      <Text className="text-base font-semibold text-red-600">
                        {formatCurrency(categorySpend.amount)}
                      </Text>
                    }
                  >
                    <Text className="font-medium text-slate-900">
                      {categorySpend.category}
                    </Text>
                    <Text className="mt-1 text-sm text-slate-500">
                      {categorySpend.percentage}% of monthly spend
                    </Text>
                  </ListRow>
                ))}
              </View>
            ) : (
              <DashboardEmptyState message="No posted spending this month yet. Expenses appear here after transactions sync." />
            )}
          </DashboardSection>

          <DashboardSection
            title="Subscriptions"
            subtitle="Detected from recurring charges"
          >
            {subscriptions.length === 0 ? (
              <DashboardEmptyState message="No subscriptions detected yet. We look for at least two similar charges from the same merchant on a weekly or monthly cadence." />
            ) : (
              <View>
                {subscriptions.map((subscription) => (
                  <ListRow
                    key={subscription.id}
                    onPress={() => setSelectedSubscriptionId(subscription.id)}
                    trailing={
                      <Text className="text-base font-semibold text-slate-900">
                        {formatCurrency(subscription.estimated_amount)}
                      </Text>
                    }
                  >
                    <Text className="font-medium text-slate-900">
                      {subscription.display_name}
                    </Text>
                    <Text className="mt-1 text-sm text-slate-500">
                      {formatCadenceLabel(subscription.cadence)} · Next{" "}
                      {formatTransactionDate(subscription.next_estimated_charge_date)}
                    </Text>
                  </ListRow>
                ))}
              </View>
            )}
          </DashboardSection>

          <DashboardSection title="Recent transactions" subtitle="Last 30 days">
            {transactionRows.length === 0 ? (
              <DashboardEmptyState message="No transactions yet. Plaid may take a few minutes after linking—refresh when ready." />
            ) : (
              <View>
                <TransactionSearchInput
                  value={transactionSearchQuery}
                  onChangeText={setTransactionSearchQuery}
                />
                {filteredTransactionRows.length === 0 ? (
                  <DashboardEmptyState message="No matching transactions." />
                ) : (
                  filteredTransactionRows.map((transaction) => {
                    const displayName =
                      transaction.merchant_name ?? transaction.name;
                    const amountDisplay = formatTransactionAmount(transaction.amount);

                    return (
                      <ListRow
                        key={transaction.id}
                        onPress={() => setSelectedTransactionId(transaction.id)}
                        trailing={
                          <Text
                            className={`text-base font-semibold ${
                              amountDisplay.isOutflow
                                ? "text-red-600"
                                : "text-green-700"
                            }`}
                          >
                            {amountDisplay.text}
                          </Text>
                        }
                      >
                        <Text className="font-medium text-slate-900">
                          {displayName}
                        </Text>
                        <TransactionCategoryChip
                          category={transaction.category}
                          categorySource={transaction.category_source}
                        />
                        <Text className="mt-1 text-sm text-slate-500">
                          {formatTransactionDate(transaction.date)} ·{" "}
                          {transaction.accountLabel}
                        </Text>
                        {transaction.pending ? (
                          <Text className="mt-1 text-xs font-medium text-amber-600">
                            Pending
                          </Text>
                        ) : null}
                      </ListRow>
                    );
                  })
                )}
              </View>
            )}
          </DashboardSection>

          <Pressable
            onPress={() => void loadDashboard("refresh")}
            disabled={isRefreshing}
            className={`flex-row items-center justify-center rounded-xl border border-slate-200 bg-white py-3.5 ${
              isRefreshing ? "opacity-50" : "active:bg-slate-100"
            }`}
          >
            {isRefreshing ? (
              <ActivityIndicator size="small" color="#0284c7" />
            ) : null}
            <Text
              className={`font-semibold text-brand-600 ${isRefreshing ? "ml-2" : ""}`}
            >
              {isRefreshing ? "Refreshing…" : "Refresh dashboard"}
            </Text>
          </Pressable>
        </View>
      ) : null}

      <CategorySpendingModal
        visible={selectedSpendingCategory !== null}
        category={selectedSpendingCategory}
        monthLabel={monthlySpending?.monthLabel ?? "This month"}
        transactions={categorySpendingRows}
        categoryTotal={categorySpendingTotal}
        onClose={() => setSelectedSpendingCategory(null)}
        onSelectTransaction={setSelectedTransactionId}
      />

      <SubscriptionDetailModal
        visible={selectedSubscriptionId !== null}
        subscriptionId={selectedSubscriptionId}
        allTransactions={allTransactions}
        onClose={() => setSelectedSubscriptionId(null)}
        onDecisionSaved={() => void loadLocalDashboardData()}
      />

      <TransactionDetailModal
        visible={selectedTransactionId !== null}
        transactionId={selectedTransactionId}
        accountLabel={selectedTransaction?.accountLabel ?? "Account"}
        onClose={() => setSelectedTransactionId(null)}
        onCategorySaved={() => void loadLocalDashboardData()}
      />
    </ScrollView>
  );
}

function ListRow({
  children,
  trailing,
  onPress,
}: {
  children: ReactNode;
  trailing: ReactNode;
  onPress?: () => void;
}) {
  const content = (
    <>
      <View className="flex-1 pr-3">{children}</View>
      {trailing}
    </>
  );

  if (!onPress) {
    return (
      <View className="flex-row items-start justify-between border-t border-slate-100 pt-3 first:border-t-0 first:pt-0">
        {content}
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-start justify-between border-t border-slate-100 pt-3 active:bg-slate-50 first:border-t-0 first:pt-0"
      accessibilityRole="button"
    >
      {content}
    </Pressable>
  );
}
