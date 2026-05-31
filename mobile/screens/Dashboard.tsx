import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { AccountListRow } from "../components/dashboard/AccountListRow";
import { DashboardEmptyState } from "../components/dashboard/DashboardEmptyState";
import { DashboardSection } from "../components/dashboard/DashboardSection";
import { SubscriptionDetailModal } from "../components/subscriptions/SubscriptionDetailModal";
import { CategorySpendingModal } from "../components/transactions/CategorySpendingModal";
import { TransactionDetailModal } from "../components/transactions/TransactionDetailModal";
import { TransactionListRow } from "../components/transactions/TransactionListRow";
import { TransactionSearchInput } from "../components/transactions/TransactionSearchInput";
import { Card } from "../components/ui/Card";
import { ListRow } from "../components/ui/ListRow";
import { MerchantAvatar } from "../components/ui/MerchantAvatar";
import { Pill } from "../components/ui/Pill";
import { PrimaryButton, SecondaryButton } from "../components/ui/Button";
import { ScreenContainer } from "../components/ui/ScreenContainer";
import type { Account } from "../db/models/account";
import { SETTING_KEYS } from "../db/models/setting";
import type { Subscription } from "../db/models/subscription";
import type { Transaction } from "../db/models/transaction";
import { listAccounts } from "../db/repositories/accountsRepository";
import { getSetting } from "../db/repositories/settingsRepository";
import { listVisibleSubscriptions } from "../db/repositories/subscriptionsRepository";
import { listAllTransactions } from "../db/repositories/transactionsRepository";
import type { RootStackParamList } from "../navigation/types";
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
import { formatManualRefreshThrottleMessage } from "../utils/formatPlaidSyncWait";
import { formatTransactionDate } from "../utils/formatTransactionAmount";
import {
  filterTransactionRows,
  normalizeTransactionSearchQuery,
} from "../utils/filterTransactions";
import { getSubscriptionStatusBadge } from "../utils/subscriptionUi";

type DashboardState = "loading" | "ready" | "error";

type TransactionRow = Transaction & {
  accountLabel: string;
};

const GENERIC_ERROR =
  "Sync failed. Check your connection and proxy server, then try again.";
const RECENT_TRANSACTION_LIMIT = 25;

type DashboardNavigation = NativeStackNavigationProp<
  RootStackParamList,
  "Dashboard"
>;

export function Dashboard() {
  const navigation = useNavigation<DashboardNavigation>();
  const [state, setState] = useState<DashboardState>("loading");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [refreshNotice, setRefreshNotice] = useState<string | null>(null);
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
  const syncCallCount = useRef(0);
  const scrollRef = useRef<ScrollView>(null);

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
      const alreadySyncing = refreshInFlight.current;
      syncCallCount.current += 1;
      refreshInFlight.current = true;
      setSyncError(null);

      const isManualRefresh = mode === "refresh";
      if (isManualRefresh) {
        setRefreshNotice(null);
      }

      const syncSetting = await getSetting(SETTING_KEYS.LAST_SYNC_AT);
      const hasCachedSync = Boolean(syncSetting?.value);
      const isFirstPaint = mode === "initial" && !hasLoadedOnce.current;

      if (!alreadySyncing) {
        if (isFirstPaint) {
          if (hasCachedSync) {
            await loadLocalDashboardData();
            hasLoadedOnce.current = true;
            setState("ready");
          } else {
            setState("loading");
          }
        } else if (isManualRefresh) {
          setIsRefreshing(true);
        }
      }

      try {
        const syncResult = await syncDashboardFromPlaid({
          mode: isManualRefresh ? "manual" : "auto",
        });

        if (syncResult.skipped) {
          if (isManualRefresh) {
            setRefreshNotice(
              formatManualRefreshThrottleMessage(syncResult.nextAllowedAt),
            );
          }

          if (!hasLoadedOnce.current) {
            await loadLocalDashboardData();
            hasLoadedOnce.current = true;
            setState("ready");
          }

          return;
        }

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
        syncCallCount.current -= 1;
        if (syncCallCount.current <= 0) {
          syncCallCount.current = 0;
          refreshInFlight.current = false;
          setIsRefreshing(false);
        }
      }
    },
    [loadLocalDashboardData],
  );

  const handleRefreshDashboard = useCallback(
    (scrollToTop: boolean) => {
      if (scrollToTop) {
        scrollRef.current?.scrollTo({ y: 0, animated: true });
      }

      void loadDashboard("refresh");
    },
    [loadDashboard],
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
  const showRefreshBanner = isRefreshing && state === "ready";

  return (
    <ScreenContainer
      ref={scrollRef}
      contentClassName="pb-16"
      refreshControl={
        state === "ready" ? (
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => handleRefreshDashboard(false)}
            tintColor="#0284c7"
            colors={["#0284c7"]}
          />
        ) : undefined
      }
    >
      <View className="mb-7 flex-row items-start justify-between gap-3">
        <View className="min-w-0 flex-1">
          <Text className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            {institutionName}
          </Text>
          <Text className="mt-1.5 text-[32px] font-bold tracking-tight text-slate-900">
            Dashboard
          </Text>
          {lastSyncedLabel ? (
            <Text className="mt-2 text-sm text-slate-500">
              Updated {lastSyncedLabel}
            </Text>
          ) : null}
        </View>
        <Pressable
          onPress={() => navigation.navigate("Settings")}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 active:bg-slate-50"
          accessibilityRole="button"
          accessibilityLabel="Open settings"
        >
          <Text className="text-sm font-semibold text-slate-700">Settings</Text>
        </Pressable>
      </View>

      {showRefreshBanner ? (
        <Card
          variant="elevated"
          className="mb-5 flex-row items-center border-2 border-brand-200 bg-brand-50 py-4"
        >
          <ActivityIndicator size="small" color="#0284c7" />
          <View className="ml-3 flex-1">
            <Text className="text-sm font-bold text-brand-800">Refreshing dashboard…</Text>
            <Text className="mt-0.5 text-xs text-brand-600">
              Syncing balances, transactions, and subscriptions
            </Text>
          </View>
        </Card>
      ) : null}

      {refreshNotice ? (
        <Card variant="muted" className="mb-5 border border-slate-200/80 bg-slate-50/80">
          <Text className="text-sm leading-5 text-slate-600">{refreshNotice}</Text>
        </Card>
      ) : null}

      {syncError ? (
        <Card variant="muted" className="mb-5 border border-rose-200/80 bg-rose-50/50">
          <Text className="text-sm leading-5 text-rose-700">{syncError}</Text>
        </Card>
      ) : null}

      {showInitialLoading ? (
        <Card variant="elevated" className="items-center py-16">
          <ActivityIndicator size="large" color="#0284c7" />
          <Text className="mt-5 text-center text-lg font-semibold text-slate-900">
            Setting up your dashboard
          </Text>
          <Text className="mt-2 max-w-xs text-center text-sm leading-5 text-slate-500">
            Syncing accounts, transactions, subscriptions, and spending totals.
          </Text>
        </Card>
      ) : null}

      {showFatalError ? (
        <Card variant="elevated" className="items-center py-8">
          <Text className="text-center text-lg font-semibold text-slate-900">
            Couldn&apos;t load dashboard
          </Text>
          <Text className="mt-2 text-center text-sm leading-5 text-rose-600">
            {GENERIC_ERROR}
          </Text>
          <PrimaryButton
            title="Try again"
            onPress={() => void loadDashboard("initial")}
            disabled={isRefreshing}
            className="mt-5 w-full"
          />
        </Card>
      ) : null}

      {state === "ready" ? (
        <View className="gap-6">
          <Card variant="hero" className="overflow-hidden">
            <View className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-white/5" />
            <View className="absolute -bottom-16 -left-8 h-40 w-40 rounded-full bg-brand-500/10" />
            <Text className="text-sm font-medium text-slate-300">Total balance</Text>
            <Text className="mt-2 text-[40px] font-bold tracking-tight text-white">
              {formatCurrency(totalBalance)}
            </Text>
            <Text className="mt-2 text-sm text-slate-400">
              {accounts.length > 0
                ? `${accounts.length} linked account${accounts.length === 1 ? "" : "s"}`
                : "Connect a bank to see balances"}
            </Text>
          </Card>

          <DashboardSection title="Accounts" subtitle="Tap an account for details">
            {groups.length === 0 ? (
              <DashboardEmptyState
                title="No accounts yet"
                message="Connect your bank, then refresh to pull balances."
              />
            ) : (
              <View>
                {groups.map((group, groupIndex) => (
                  <View
                    key={group.key}
                    className={groupIndex === 0 ? "" : "mt-5 border-t border-slate-100/90 pt-4"}
                  >
                    <View className="mb-2 flex-row items-baseline justify-between px-0.5">
                      <Text className="text-xs font-medium uppercase tracking-wide text-slate-400">
                        {group.label}
                      </Text>
                      <Text className="text-xs font-medium tabular-nums text-slate-400">
                        {formatCurrency(group.total)}
                      </Text>
                    </View>
                    <View>
                      {group.accounts.map((account, index) => (
                        <AccountListRow
                          key={account.id}
                          account={account}
                          isFirst={index === 0}
                          onPress={() =>
                            navigation.navigate("AccountDetail", {
                              accountId: account.id,
                            })
                          }
                        />
                      ))}
                    </View>
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
              <View>
                <Card variant="muted" className="mb-4">
                  <Text className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Spent this month
                  </Text>
                  <Text className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
                    {formatCurrency(monthlySpending.totalSpent)}
                  </Text>
                </Card>

                {monthlySpending.topCategories.map((categorySpend, index) => (
                  <ListRow
                    key={categorySpend.category}
                    isFirst={index === 0}
                    onPress={() => setSelectedSpendingCategory(categorySpend.category)}
                    title={categorySpend.category}
                    subtitle={`${categorySpend.percentage}% of monthly spend`}
                    trailing={
                      <View className="items-end">
                        <Text className="text-base font-bold tabular-nums text-rose-600">
                          {formatCurrency(categorySpend.amount)}
                        </Text>
                        <Text className="mt-0.5 text-xs text-slate-400">View</Text>
                      </View>
                    }
                  />
                ))}
              </View>
            ) : (
              <DashboardEmptyState
                title="No spending yet"
                message="Posted expenses for this month will show up here after transactions sync."
              />
            )}
          </DashboardSection>

          <DashboardSection
            title="Subscriptions"
            subtitle="Recurring charges we detected"
          >
            {subscriptions.length === 0 ? (
              <DashboardEmptyState
                title="Nothing detected yet"
                message="We look for at least two similar charges from the same merchant on a weekly or monthly cadence."
              />
            ) : (
              <View>
                {subscriptions.map((subscription, index) => {
                  const statusBadge = getSubscriptionStatusBadge(subscription);

                  return (
                    <ListRow
                      key={subscription.id}
                      isFirst={index === 0}
                      onPress={() => setSelectedSubscriptionId(subscription.id)}
                      leading={
                        <MerchantAvatar label={subscription.display_name} size="sm" />
                      }
                      title={subscription.display_name}
                      subtitle={`Next ${formatTransactionDate(subscription.next_estimated_charge_date)}`}
                      trailing={
                        <Text className="text-base font-bold tabular-nums text-slate-900">
                          {formatCurrency(subscription.estimated_amount)}
                        </Text>
                      }
                    >
                      <View className="mt-2 flex-row flex-wrap gap-1.5">
                        <Pill label={formatCadenceLabel(subscription.cadence)} tone="neutral" />
                        <Pill label={statusBadge.label} tone={statusBadge.tone} />
                      </View>
                    </ListRow>
                  );
                })}
              </View>
            )}
          </DashboardSection>

          <DashboardSection title="Recent transactions" subtitle="Last 30 days">
            {transactionRows.length === 0 ? (
              <DashboardEmptyState
                title="No transactions"
                message="Plaid may take a few minutes after linking—refresh when ready."
              />
            ) : (
              <View>
                <TransactionSearchInput
                  value={transactionSearchQuery}
                  onChangeText={setTransactionSearchQuery}
                />
                {filteredTransactionRows.length === 0 ? (
                  <DashboardEmptyState message="No matching transactions." />
                ) : (
                  filteredTransactionRows.map((transaction, index) => (
                    <TransactionListRow
                      key={transaction.id}
                      transaction={transaction}
                      accountLabel={transaction.accountLabel}
                      isFirst={index === 0}
                      onPress={() => setSelectedTransactionId(transaction.id)}
                    />
                  ))
                )}
              </View>
            )}
          </DashboardSection>

          <SecondaryButton
            title={isRefreshing ? "Refreshing…" : "Refresh dashboard"}
            onPress={() => handleRefreshDashboard(true)}
            loading={isRefreshing}
            disabled={isRefreshing}
          />
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
    </ScreenContainer>
  );
}
