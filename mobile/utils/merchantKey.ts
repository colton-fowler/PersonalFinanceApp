/** Location / store-id suffixes stripped before generic token cleanup. */
const LOCATION_SUFFIX_PATTERNS = [
  /\s*#\s*[\w-]*\d+[\w-]*/gi,
  /\s+\bno\.?\s*\d+\b/gi,
  /\s+\bstore\s+#?\s*\d+\b/gi,
  /\s+\bloc(?:ation)?\.?\s+#?\s*\d+\b/gi,
  /\s+\bunit\s+#?\s*\d+\b/gi,
  /\s+\bste\.?\s+#?\s*\d+\b/gi,
  /\s+\b\d{3,6}\b\s*$/i,
];

/** Trailing business-type words dropped after location ids (e.g. "starbucks coffee"). */
const TRAILING_GENERIC_TOKENS = new Set([
  "store",
  "shop",
  "cafe",
  "coffee",
  "restaurant",
  "market",
  "inc",
  "llc",
  "co",
  "ltd",
  "corp",
  "company",
  "supercenter",
  "supermarket",
  "gas",
  "fuel",
  "online",
]);

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function removePunctuation(value: string): string {
  return value
    .replace(/[''`]/g, "")
    .replace(/[.,;:!?()[\]{}|\\/<>@*&$%+_~`-]/g, " ");
}

function stripLocationSuffixes(value: string): string {
  let result = value;
  let changed = true;

  while (changed) {
    changed = false;
    for (const pattern of LOCATION_SUFFIX_PATTERNS) {
      const next = collapseWhitespace(result.replace(pattern, " "));
      if (next !== result) {
        result = next;
        changed = true;
      }
    }
  }

  return result;
}

function stripTrailingGenericTokens(value: string): string {
  const parts = value.split(" ").filter(Boolean);

  while (parts.length > 1) {
    const last = parts[parts.length - 1]!.toLowerCase();
    if (TRAILING_GENERIC_TOKENS.has(last)) {
      parts.pop();
      continue;
    }
    break;
  }

  return parts.join(" ");
}

/**
 * Normalized merchant key for rule matching.
 * Case-insensitive; strips store numbers, punctuation, and generic suffix tokens.
 */
export function toMerchantKey(merchantNameOrLabel: string): string {
  let key = removePunctuation(merchantNameOrLabel);
  key = key.toLowerCase();
  key = collapseWhitespace(key);
  key = stripLocationSuffixes(key);
  key = stripTrailingGenericTokens(key);
  return collapseWhitespace(key);
}

export function merchantKeyFromTransaction(
  merchantName: string | null,
  transactionName: string,
): string | null {
  const label = (merchantName ?? transactionName).trim();
  if (!label) {
    return null;
  }

  const key = toMerchantKey(label);
  return key.length > 0 ? key : null;
}
