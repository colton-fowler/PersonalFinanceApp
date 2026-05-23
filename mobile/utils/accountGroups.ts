import type { Account } from "../db/models/account";

export type AccountGroup = {
  key: string;
  label: string;
  total: number;
  accounts: Account[];
};

const SUBTYPE_ORDER = [
  "cash",
  "checking",
  "savings",
  "money market",
  "cd",
  "credit card",
  "paypal",
];

function groupLabel(account: Account): string {
  const subtype = (account.subtype ?? "").toLowerCase();
  const type = account.account_type.toLowerCase();

  if (subtype.includes("checking")) {
    return "Checking";
  }
  if (subtype.includes("savings") || subtype.includes("money market")) {
    return "Savings";
  }
  if (
    subtype.includes("cash") ||
    subtype.includes("paypal") ||
    subtype === "prepaid"
  ) {
    return "Cash";
  }
  if (type === "credit" || subtype.includes("credit")) {
    return "Credit";
  }
  if (subtype) {
    return subtype
      .split(" ")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }

  return type.charAt(0).toUpperCase() + type.slice(1);
}

function groupSortIndex(label: string): number {
  const index = SUBTYPE_ORDER.findIndex((entry) =>
    label.toLowerCase().includes(entry),
  );
  return index === -1 ? SUBTYPE_ORDER.length : index;
}

export function groupAccountsByCategory(accounts: Account[]): AccountGroup[] {
  const map = new Map<string, AccountGroup>();

  for (const account of accounts) {
    const label = groupLabel(account);
    const key = label.toLowerCase();
    const existing = map.get(key);

    if (existing) {
      existing.accounts.push(account);
      existing.total += account.current_balance;
      continue;
    }

    map.set(key, {
      key,
      label,
      total: account.current_balance,
      accounts: [account],
    });
  }

  return [...map.values()].sort(
    (a, b) => groupSortIndex(a.label) - groupSortIndex(b.label),
  );
}

export function sumAccountBalances(accounts: Account[]): number {
  return accounts.reduce((sum, account) => sum + account.current_balance, 0);
}
