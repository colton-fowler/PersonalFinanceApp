# Changelog

## Conventions (required for every change)

Each release entry **must** include these sections in order:

1. **Exact changes** — bullet list of what changed and why.
2. **Files modified** — table with path and precise action (created / updated / deleted).
3. **Commands run** — copy-paste shell commands actually executed.
4. **Errors encountered** — `None` if clean; otherwise symptom + resolution (no secrets in output).
5. **Migration / schema changes** — `None` if N/A; otherwise version, tables, rollback SQL notes.
6. **Rollback notes** — how to revert if relevant; `None` if not applicable.

**Logging rule:** Never record Plaid tokens, `API_SHARED_SECRET`, PIN hashes, balances, account IDs, transaction names, or raw Plaid/SQLite payloads in this file or app logs.

---

## [0.5.1] - 2026-05-22 — Changelog conventions

### Exact changes

- Documented mandatory CHANGELOG structure (commands, errors, migrations, rollback, no secrets in logs).
- Backfilled **[0.5.0]** entry with errors, migration/schema, and rollback sections.

### Files modified

| Path | Change |
|------|--------|
| `CHANGELOG.md` | Conventions block + 0.5.1 entry + 0.5.0 backfill |

### Commands run

```bash
# Documentation-only change — no project commands required
```

### Errors encountered

None.

### Migration / schema changes

None.

### Rollback notes

Revert `CHANGELOG.md` to the previous commit if the convention block is unwanted.

---

## [0.5.0] - 2026-05-22 — Plaid Link connection test (mobile)

### Exact changes

- Installed `react-native-plaid-link-sdk` (requires **development build**, not Expo Go).
- Added `components/ConnectBank.tsx`: `createLinkToken()` → Plaid `create`/`open` → `exchangeToken()` → `savePlaidAccessToken()`.
- Wired `<ConnectBank />` into `App.tsx` after DB init; generic success/error UI only.
- `__DEV__` bootstrap: optional `EXPO_PUBLIC_API_BASE_URL` and `EXPO_PUBLIC_API_SHARED_SECRET` copied into settings/Secure Store (values never logged).

### Files modified

| Path | Change |
|------|--------|
| `mobile/package.json` | Added dependency `react-native-plaid-link-sdk` |
| `mobile/package-lock.json` | Lockfile updated |
| `mobile/components/ConnectBank.tsx` | **Created** |
| `mobile/App.tsx` | Import and render `ConnectBank` |
| `CHANGELOG.md` | 0.5.0 entry |

### Commands run

```bash
cd mobile
npm install react-native-plaid-link-sdk
npm run typecheck
```

### Errors encountered

None during `npm run typecheck`.

**Runtime caveat (not a build error):** Plaid Link native module does not run in Expo Go; use `npx expo prebuild` + `npx expo run:android` or `run:ios`.

### Migration / schema changes

None. `item_id` may be written to SQLite `settings` key `plaid_item_id` after exchange; no new migrations.

### Rollback notes

1. Remove `react-native-plaid-link-sdk` from `mobile/package.json` and run `npm install`.
2. Delete `mobile/components/ConnectBank.tsx`.
3. Remove `<ConnectBank />` from `App.tsx`.
4. Clear Plaid token: call `wipeAllLocalData()` or delete `plaid_access_token` from Secure Store manually.
5. Re-run `npx expo prebuild` if native project was generated with the SDK.

---

## [0.4.1] - 2026-05-22 — Mobile Plaid API client aligned with proxy

### What changed

- Updated `mobile/services/plaidApi.ts` for server routes: `/plaid/link-token`, `/exchange-token`, `/transactions`.
- Config: `API_BASE_URL` (settings / `EXPO_PUBLIC_API_BASE_URL`), `API_SHARED_SECRET` (Secure Store only).
- Typed request/response interfaces; `PlaidApiError` for generic safe errors (no response body in logs).
- Removed `fetchBalances` and legacy `/exchange-public-token` client paths.
- `SECRET_KEYS.API_SHARED_SECRET`, `SETTING_KEYS.API_BASE_URL`; full wipe clears proxy secret.

### Files modified

| Path | Change |
|------|--------|
| `mobile/services/plaidApi.ts` | Proxy client + config helpers |
| `mobile/security/secureStore.ts` | `API_SHARED_SECRET` key |
| `mobile/security/dataReset.ts` | Wipe proxy secret |
| `mobile/db/models/setting.ts` | `API_BASE_URL` key |
| `SECURITY.md` | Mobile proxy config docs |
| `CHANGELOG.md` | This entry |

### Commands

```bash
cd mobile && npm run typecheck
```

---

## [0.4.0] - 2026-05-22 — Plaid proxy server skeleton

### What changed

- Hardened **`server/`** private Plaid proxy: `API_SHARED_SECRET` Bearer auth on all `/plaid/*` routes.
- Renamed `plaidService.ts` → **`plaidClient.ts`**; routes aligned to `POST /plaid/link-token`, `/exchange-token`, `/transactions`.
- Removed `/plaid/balances` and `/plaid/exchange-public-token` (skeleton scope).
- **`middleware/auth.ts`** — validates `Authorization: Bearer <API_SHARED_SECRET>`; never logs the secret.
- Zod body validation, rate limiting, 32kb JSON cap, no DB, no financial/token logging.
- `.env.example` adds `API_SHARED_SECRET`.

### Files modified (`server/` unless noted)

| Path | Change |
|------|--------|
| `server/src/index.ts` | Auth middleware on `/plaid`, error handling |
| `server/src/config.ts` | `API_SHARED_SECRET` required |
| `server/src/routes/plaid.ts` | Three endpoints + zod schemas |
| `server/src/services/plaidClient.ts` | **Created** (replaces `plaidService.ts`) |
| `server/src/middleware/auth.ts` | **Created** |
| `server/src/middleware/rateLimit.ts` | Unchanged |
| `server/src/middleware/validate.ts` | Unchanged |
| `server/.env.example` | `API_SHARED_SECRET` |
| `server/src/services/plaidService.ts` | **Deleted** |
| `SECURITY.md` | Proxy auth + endpoints |
| `CHANGELOG.md` | This entry |

### Commands

```bash
cd server && npm install && npm run typecheck
```

### Note

---

## [0.3.2] - 2026-05-22 — Secure Store service

### What changed

- Added `mobile/security/secureStore.ts` with `saveSecret`, `getSecret`, `deleteSecret`, `hasSecret`.
- Reserved keys: `PLAID_ACCESS_TOKEN`, `APP_LOCK_PIN_HASH` (`SECRET_KEYS`).
- Consolidated secret access; removed `secureStorage.ts` and `keys.ts`.
- `dataReset` clears both reserved secrets on full wipe.
- Documented Secure Store usage in `SECURITY.md`.
- `expo-secure-store` already present in `mobile/package.json` (verified via `npx expo install`).

### Files modified

| Path | Change |
|------|--------|
| `mobile/security/secureStore.ts` | **Created** |
| `mobile/security/secureStorage.ts` | **Deleted** (replaced by `secureStore.ts`) |
| `mobile/security/keys.ts` | **Deleted** (keys moved to `secureStore.ts`) |
| `mobile/security/dataReset.ts` | Import `secureStore`; wipe PIN hash key |
| `mobile/services/plaidTokenStore.ts` | Use `saveSecret` / `SECRET_KEYS` |
| `SECURITY.md` | Secure Store API and key documentation |
| `CHANGELOG.md` | This entry |

### Commands

```bash
cd mobile && npx expo install expo-secure-store && npm run typecheck
```

---

## [0.3.1] - 2026-05-22 — Database init at app startup

### What changed

- **`initializeDatabase()`** runs once on launch from `App.tsx` (migrations + default settings).
- Loading state while SQLite initializes; generic error screen on failure (no error details shown to user).
- Init failures logged via `safeLogger` only — no financial data, no thrown error message in logs.

### Files modified

| Path | Change |
|------|--------|
| `mobile/App.tsx` | `useEffect` startup init, loading/error/ready states |
| `CHANGELOG.md` | This entry |

### Commands

```bash
cd mobile && npm run typecheck && npx expo start
```

---

## [0.3.0] - 2026-05-22 — Local SQLite persistence layer

### What changed

- Implemented **versioned migration runner** (`schema_migrations` table + `001_initial`).
- Added **typed models**, **repositories** (CRUD), and **services** (`initializeDatabase`, `resetDatabase`, `seedSampleData`).
- Centralized DB access in `connection.ts` with **`withTransaction`** wrapper (expo-sqlite `withTransactionAsync`).
- Replaced legacy `schema.sql` / stub `database.ts` with layered `mobile/db/` architecture.
- Repositories log **counts only** — never balances, merchants, transaction names, or account IDs.
- Documented **SQLCipher hook** in `openDatabase()` for future encrypted SQLite.
- Wired `security/dataReset.ts` → `resetDatabase()` from new service layer.

### Architecture (brief)

```
openDatabase() → runMigrations() → repositories (parameterized SQL) → services
                      ↑
              001_initial (accounts, transactions, subscriptions, settings)
```

### Files created

| Path | Purpose |
|------|---------|
| `mobile/db/connection.ts` | DB open/close, transactions, SQLCipher TODO |
| `mobile/db/migrations/001_initial.ts` | Baseline DDL |
| `mobile/db/migrations/001_initial.sql` | Human-readable DDL reference |
| `mobile/db/migrations/index.ts` | Migration runner |
| `mobile/db/migrations/types.ts` | Migration type |
| `mobile/db/models/*` | Account, Transaction, Subscription, Setting, Category |
| `mobile/db/repositories/*` | CRUD per table |
| `mobile/db/services/databaseService.ts` | `initializeDatabase`, `resetDatabase` |
| `mobile/db/services/sampleDataService.ts` | `seedSampleData` (dev fixtures) |
| `mobile/db/utils/id.ts` | Local UUID + timestamps |
| `mobile/db/index.ts` | Public exports |

### Files modified / removed

| Action | Path |
|--------|------|
| **Replaced** | `mobile/db/database.ts` → thin re-exports |
| **Updated** | `mobile/types/database.ts` (re-exports from `db/`) |
| **Updated** | `mobile/security/dataReset.ts` |
| **Removed** | `mobile/db/schema.sql` (superseded by migrations) |

### Usage (dev, no UI)

```typescript
import { initializeDatabase, seedSampleData, resetDatabase } from "./db";

await initializeDatabase();
await seedSampleData(); // skips if accounts exist
await resetDatabase();  // clears rows; schema remains
```

### Suggested next steps

1. Call `initializeDatabase()` from app entry when UI work starts.
2. Plaid sync service: write via `withTransaction` + repositories.
3. SQLCipher: swap `openDatabase()` implementation + encryption key from Secure Store.
4. Dashboard UI: read via repositories only.

---

## [0.2.1] - 2026-05-22 — Cloud remnant purge (audit)

### Audit summary

Full-repo scan for Supabase/cloud/auth/telemetry leftovers. Findings and actions:

| Category | Found | Action |
|----------|--------|--------|
| **Source file** | `mobile/types/auth.ts` (Supabase `Session`/`User` types) | **Deleted** — missed in 0.2.0 move |
| **Shim** | `mobile/utils/logger.ts` (deprecated re-export) | **Deleted** — unused; all code uses `safeLogger` directly |
| **Orphan install** | Root `node_modules/` containing `@supabase/*`, `@react-native-async-storage` from pre-monorepo scaffold | **Deleted** — not referenced by current `package.json` files |
| **Docs only** | `CHANGELOG.md`, `README.md`, `SECURITY.md` mention Supabase/Firebase as “removed” | **Kept** — intentional security documentation |
| **Lockfiles** | `mobile/package-lock.json`, `server/package-lock.json` | **Clean** — no `@supabase`, Firebase, or analytics SDK entries |
| **Env vars** | No `EXPO_PUBLIC_SUPABASE_*` in repo | **None** — only `server/.env.example` Plaid vars remain |

### Removed (this pass) — why

| Item | Why removed |
|------|----------------|
| `mobile/types/auth.ts` | Supabase auth types; app is single-user local with no remote auth |
| `mobile/utils/logger.ts` | Unused alias; risk of future imports bypassing `safeLogger` redaction |
| Root `node_modules/` | Stale packages from 0.1.0 (`@supabase/supabase-js`, AsyncStorage for cloud sessions); installs belong under `mobile/` and `server/` only |

### Previously removed (0.2.0) — why

| Item | Why removed |
|------|----------------|
| `@supabase/supabase-js` | Cloud auth + Postgres; violates local-only requirement |
| `@react-native-async-storage/async-storage` | Used only for Supabase session persistence |
| `react-native-url-polyfill` | Required by Supabase client only |
| Root `.env.example` with `EXPO_PUBLIC_SUPABASE_*` | Mobile must not hold cloud credentials |
| `lib/supabase.ts`, `services/authService.ts`, `store/authStore.ts`, `hooks/useAuth.ts` | Remote authentication flow |
| `screens/auth/*`, `app/navigation/*`, `components/ui/*` | Supabase-gated UI (replaced by minimal shell) |
| `supabase/schema.sql` | Cloud Postgres schema + RLS |
| `types/database.ts` `Profile`, `user_id`, Supabase `Database` generic | Cloud multi-tenant model |

### Never present / confirmed absent

- Firebase, Amplify, Appwrite, MongoDB/Prisma/Postgres on server
- Analytics / crash SDKs (Sentry, Amplitude, Segment, Mixpanel, Crashlytics)
- Server-side financial DB or token persistence (proxy is memory-only per request)
- `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` in any tracked file

### Allowed environment variables (current architecture)

**Server only** (`server/.env` — never commit):

- `PLAID_CLIENT_ID`
- `PLAID_SECRET`
- `PLAID_ENV`
- `HOST`, `PORT`
- `ALLOWED_ORIGIN` (optional)

**Mobile (future, non-secret only):**

- `EXPO_PUBLIC_PLAID_PROXY_URL` (TODO in `plaidApi.ts`) — URL to your private proxy, not Plaid secret

### Files modified

- **Deleted:** `mobile/types/auth.ts`, `mobile/utils/logger.ts`, root `node_modules/`
- **Updated:** `SECURITY.md` (clarify “analytics” = local charts, not SDKs), `CHANGELOG.md`

---

## [0.2.0] - 2026-05-22 — Security architecture refactor (local-only)

### What changed

- **Removed Supabase** and all cloud auth/database assumptions (packages, client, auth screens, navigators, `supabase/schema.sql`).
- **Reorganized monorepo**: Expo app → `mobile/`; new private Plaid proxy → `server/`.
- **Security-first model** documented in root `SECURITY.md` (data flows, threat model, encryption roadmap).
- **Local storage plan**: `expo-sqlite` for financial rows, `expo-secure-store` for Plaid `access_token`.
- **`safeLogger`**: redacts sensitive keys; financial values must not appear in logs.
- **`dataReset`**: wipes Secure Store secrets + SQLite tables (UI button in a later pass).
- **Minimal Plaid proxy**: link token, public token exchange, transactions/balances proxy — **no DB, no token persistence, in-memory per request**.
- **Server hardening**: Helmet, rate limiting, Zod validation, 32kb JSON cap, localhost bind default.
- **Mobile shell only** — no dashboard UI in this pass.

### Files modified / created

| Action | Path |
|--------|------|
| **Moved to `mobile/`** | `App.tsx`, `index.ts`, `app.json`, `babel.config.js`, `metro.config.js`, `tailwind.config.js`, `global.css`, `nativewind-env.d.ts`, `package.json`, `package-lock.json`, `tsconfig.json`, `assets/` |
| **Deleted** | Root Expo files; `supabase/schema.sql`; `lib/supabase.ts`; `services/authService.ts`; `store/authStore.ts`; `hooks/useAuth.ts`; `screens/**`; `components/**`; `app/navigation/**`; root `.env.example` |
| **Created — root** | `SECURITY.md`, `README.md`, `package.json`, `.gitignore` |
| **Created — mobile** | `security/keys.ts`, `secureStorage.ts`, `safeLogger.ts`, `dataReset.ts`; `db/schema.sql`, `database.ts`; `services/plaidApi.ts`, `plaidTokenStore.ts`; `app/README.md` |
| **Updated — mobile** | `App.tsx`, `package.json`, `types/database.ts`, `tailwind.config.js`, `css.d.ts` |
| **Created — server** | `package.json`, `tsconfig.json`, `.env.example`, `src/index.ts`, `src/config.ts`, `src/routes/plaid.ts`, `src/services/plaidService.ts`, `src/middleware/rateLimit.ts`, `src/middleware/validate.ts` |

### Bugs / errors encountered

- `mobile/types/auth.ts` was left behind after 0.2.0 file move (fixed in 0.2.1).
- SQLite migrations implemented in **0.3.0** (`mobile/db/migrations/`).

### Suggested next steps

1. Copy `server/.env.example` → `server/.env` with Plaid sandbox credentials; run proxy on `127.0.0.1`.
2. Run `npm install` only inside `mobile/` and `server/` (not repo root).
3. Complete SQLite migrations from `schema.sql`.
4. Add `EXPO_PUBLIC_PLAID_PROXY_URL` for device → proxy URL.
5. Build UI: settings **Delete all local data** → `wipeAllLocalData()`.
6. Plaid Link → local token store → sync into SQLite.
7. Dashboard + charts (Victory Native) from local DB only.

---

## [0.1.0] - 2026-05-22 — Initial scaffold (superseded)

Supabase + email auth prototype at repo root. **Replaced by 0.2.0 local-only architecture.** Do not use cloud setup steps from this release.

### 0.1.0 inventory (all superseded)

**Packages:** `@supabase/supabase-js`, `@react-native-async-storage/async-storage`, `react-native-url-polyfill`, plus auth/navigation stack.

**Env vars:** `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` (root `.env.example`).

**Code paths:** `lib/supabase.ts`, `services/authService.ts`, `store/authStore.ts`, `hooks/useAuth.ts`, `types/auth.ts`, `screens/auth/LoginScreen.tsx`, `SignUpScreen.tsx`, `app/navigation/*`, `supabase/schema.sql` (cloud `profiles`, `user_id`, RLS).
