# RMoney Security Model

RMoney is a **single-user, personal finance app** intended for private use on your own devices. **Security is the top priority.** Financial data must never leave your control except where Plaid’s API contract requires it.

## Design principles

| Principle | Implementation |
|-----------|----------------|
| No cloud database | All accounts, transactions, categories, subscriptions, chart inputs, and settings live in **on-device SQLite** (`expo-sqlite`). |
| No Supabase / Firebase / BaaS | Removed entirely. No remote auth or sync. |
| Secrets stay off the client binary | **Plaid `client_secret` lives only on the private Node proxy** (`server/`). |
| Tokens on device only | Plaid **access_token** is stored in **expo-secure-store** after exchange; never logged. |
| Backend is a dumb proxy | **No DB**, **no persistence** of tokens or transactions; sensitive values exist **only in request memory**. |
| Safe logging | `mobile/security/safeLogger.ts` redacts financial fields; never log tokens, balances, merchant names, etc. |
| No telemetry | No analytics SDKs, crash reporters, or third-party tracking. |

## What data touches Plaid

Plaid is used only to:

- Launch Link (via `link_token`)
- Exchange `public_token` → `access_token`
- Fetch transactions and balances when **you** trigger a sync

Plaid receives institution credentials during Link; RMoney does not store bank passwords.

## What data touches the backend (`server/`)

The private proxy accepts authenticated **POST** requests from your phone/emulator:

| Endpoint | Purpose |
|----------|---------|
| `POST /plaid/link-token` | Create Plaid Link token (`PLAID_CLIENT_ID` + `PLAID_SECRET` server-side only) |
| `POST /plaid/exchange-token` | Exchange `publicToken` → return `access_token` + `item_id` to device (not stored on server) |
| `POST /plaid/transactions` | Proxy `transactionsGet` when device sends `accessToken` + date range |

**Authentication:** every `/plaid/*` route requires:

```http
Authorization: Bearer <API_SHARED_SECRET>
```

Set `API_SHARED_SECRET` in `server/.env` (see `server/.env.example`). The mobile app will store the same value locally (non-Plaid secret) when Link is wired — never commit it to git.

**Environment (server only):** `PLAID_CLIENT_ID`, `PLAID_SECRET`, `PLAID_ENV`, `API_SHARED_SECRET`, optional `HOST`, `PORT`, `ALLOWED_ORIGIN`.

The server:

- Does **not** use a database or persist transactions/tokens
- Does **not** log tokens, balances, or transaction payloads
- Holds sensitive values **in memory only for the duration of a request**
- Uses **helmet**, **rate limiting**, **Zod** body validation, and a **32kb** JSON limit

`GET /health` is unauthenticated (liveness only; no financial data).

Run bound to **`127.0.0.1`** (default) or behind a personal VPN; do not expose to the public internet.

## What stays on the device (`mobile/`)

| Data | Storage |
|------|---------|
| Plaid `access_token` | `expo-secure-store` via `mobile/security/secureStore.ts` |
| App lock PIN hash (future) | Same Secure Store — key `APP_LOCK_PIN_HASH` |
| Accounts, transactions, subscriptions, settings | SQLite (`mobile/db/`) |
| Charts and spending summaries (Victory Native, local only) | Computed from local DB only — not third-party analytics SDKs |

**Local wipe:** `mobile/security/dataReset.ts` deletes Secure Store secrets and clears SQLite tables (settings UI will call this later).

### Secure Store (`mobile/security/secureStore.ts`)

Sensitive strings use **expo-secure-store** (iOS Keychain / Android Keystore), not SQLite or AsyncStorage.

| API | Purpose |
|-----|---------|
| `saveSecret(key, value)` | Write token or PIN hash — **never log `value`** |
| `getSecret(key)` | Read for Plaid sync or lock check — **never log return value** |
| `hasSecret(key)` | Check presence without exposing content in logs |
| `deleteSecret(key)` | Remove on disconnect or full local wipe |

Reserved keys (`SECRET_KEYS`):

- `PLAID_ACCESS_TOKEN` — Plaid item access token after proxy exchange; must not appear in git, Metro logs, or crash reports.
- `API_SHARED_SECRET` — Bearer secret for `mobile/services/plaidApi.ts` → server `/plaid/*`; pair with `API_SHARED_SECRET` in `server/.env`.
- `APP_LOCK_PIN_HASH` — hashed PIN for future app lock (not plaintext PIN).

Proxy URL (non-secret) is stored in SQLite settings as `api_base_url`, or `EXPO_PUBLIC_API_BASE_URL` at build time.

Options: `WHEN_UNLOCKED_THIS_DEVICE_ONLY` so secrets are unavailable when the device is locked at the OS level.

Plaid tokens must **never** be committed to the repo, pasted into issues, or stored in the SQLite financial database.

## What is never logged

Anywhere in the repo, do **not** log:

- Plaid tokens (`access_token`, `public_token`, `link_token`)
- Account numbers or masks
- Balances or amounts tied to identifiable accounts
- Transaction names, merchants, or categories in debug output
- Email, phone, or other PII

Use `safeLogger` with non-sensitive metadata only (e.g. `path`, `status`, `keyName`).

## Local encryption strategy

| Layer | Today | Notes |
|-------|--------|------|
| Secrets | **iOS Keychain / Android Keystore** via `expo-secure-store` | `WHEN_UNLOCKED_THIS_DEVICE_ONLY` |
| Financial rows | **SQLite file** on app sandbox | Protected by OS app sandbox; not encrypted at rest yet |
| In transit | TLS to Plaid + TLS to your proxy | Use HTTPS in production proxy deployment |

### Future improvements (planned)

- **Biometric / PIN app lock** before showing balances (`mobile/security/`)
- **SQLCipher** or field-level encryption for SQLite
- **Certificate pinning** for the Plaid proxy URL
- **Jailbreak/root detection** signals (platform-specific)
- Optional **app attestation** if you ever deploy the proxy beyond localhost

## Threat model (practical)

| Threat | Mitigation |
|--------|------------|
| Leaked Plaid secret in mobile app | Secret only in `server/.env`; never in Expo bundle |
| Server breach storing bank data | Server does not persist transactions or tokens |
| Lost phone | OS disk encryption + sandbox; wipe via in-app reset; optional PIN later |
| Malicious LAN caller hitting proxy | Bind localhost, rate limit, optional `ALLOWED_ORIGIN` |
| Over-logging in dev | `safeLogger` redaction rules |
| Supply-chain telemetry | No analytics/crash SDKs |

## Repository layout

```
/mobile   — Expo app (local DB + secure storage)
/server   — Private Plaid proxy (memory-only handling)
SECURITY.md
```

## Environment files

- **`server/.env.example`** — Plaid credentials for the proxy only
- **No `.env` in mobile** for Plaid secrets
- `EXPO_PUBLIC_API_BASE_URL` (optional build-time default) and `api_base_url` in SQLite settings
- `API_SHARED_SECRET` in Secure Store via `setApiSharedSecret()` (same value as server `.env`)

Never commit `.env`, SQLite files, or device backups containing `rmoney_local.db`.
