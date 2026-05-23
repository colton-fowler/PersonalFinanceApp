/**
 * @deprecated Import from `mobile/db` or `mobile/db/index` instead.
 * Kept for backward compatibility during refactor.
 */
export {
  openDatabase as getLocalDatabase,
  initializeDatabase as initLocalDatabase,
  resetDatabase as resetLocalDatabase,
} from "./index";
