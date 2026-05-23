# RMoney

Local-only personal finance dashboard (Rocket Money–style) for private use.

## Architecture

- **`mobile/`** — Expo React Native app. Financial data in SQLite; Plaid token in Secure Store.
- **`server/`** — Minimal private Plaid proxy. **No database, no persistence.**
- **`SECURITY.md`** — Threat model, data flows, and encryption notes.

## Quick start (after credentials)

Install dependencies **only** inside `mobile/` and `server/` (not the repo root).

```bash
# Terminal 1 — Plaid proxy (copy server/.env.example → server/.env first)
cd server && npm install && npm run dev

# Terminal 2 — Mobile app
cd mobile && npm install && npx expo start
```

No Supabase, Firebase, cloud database, or analytics/crash SDKs.
