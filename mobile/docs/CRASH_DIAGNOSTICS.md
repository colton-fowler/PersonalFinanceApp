# Crash diagnostics (local, dev-focused)

RMoney records recent JS/React crashes on-device for debugging. No external crash reporting service is configured.

## What gets captured

| Source | `error_type` | Typical cause |
|--------|----------------|---------------|
| React Error Boundary | `react_render` | Component render/lifecycle throw |
| `ErrorUtils` global handler | `uncaught_js` | Uncaught JavaScript exception |
| Promise rejection tracking | `unhandled_promise` | Unhandled `Promise` rejection |

Each record includes: timestamp, platform, app version, message, stack, optional component stack, fatal flag.

Up to **50** records are kept in a separate SQLite file: `rmoney_crash_logs.db` (not the financial database).

## Metro / Expo terminal (JS errors)

When running the dev client:

```bash
cd mobile
npm start
```

Watch the terminal where Metro is running. JS errors appear with the `[RMoney]` logger prefix and stack traces. This is the first place to look for **JavaScript** issues.

## Android logcat (native + JS)

With a device/emulator connected:

```bash
adb logcat *:E
```

For React Native / Expo tags:

```bash
adb logcat ReactNative:V ReactNativeJS:V Expo:V AndroidRuntime:E *:S
```

### JS crash vs native crash

| Signal | Likely type |
|--------|-------------|
| Red Metro overlay, `ReactNativeJS` in logcat, stack points to `.tsx`/`.ts` files | **JavaScript** |
| App closes instantly, no redbox, `FATAL EXCEPTION` / `AndroidRuntime` in logcat | **Native Android** |
| Emulator freezes or adb disconnects with no app stack | **Emulator / environment** |
| Friendly in-app “Something went wrong” with **Try again** | **React render** (Error Boundary caught it) |

Native crashes are **not** stored in the local crash log DB today—use logcat.

## Dev-only crash log commands

In a **development** build, open the JS debugger console and run:

```javascript
await globalThis.__RMONEY_CRASH_LOGS__?.list()
await globalThis.__RMONEY_CRASH_LOGS__?.export()
await globalThis.__RMONEY_CRASH_LOGS__?.clear()
```

`export()` prints JSON to the console and returns the string.

## Manual test (dev)

1. In a dev build, trigger: `throw new Error("test uncaught")` from a button — check Metro + `list()`.
2. Trigger: `Promise.reject(new Error("test promise"))` — should log `unhandled_promise`.
3. Temporarily throw in a component render — Error Boundary UI + `react_render` record.

Remove test throws before committing.
