import type { Account } from "../db/models/account";

function titleCase(value: string): string {
  if (!value) {
    return value;
  }

  return value
    .split(/[\s_]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

export function formatAccountTypeLabel(account: Account): string {
  const type = titleCase(account.account_type);
  const subtype = account.subtype ? titleCase(account.subtype) : null;
  return subtype ? `${type} · ${subtype}` : type;
}
