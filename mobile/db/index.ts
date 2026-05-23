/**
 * Local persistence public API — financial data never leaves SQLite on device.
 */

export { openDatabase, closeDatabase, withTransaction, DB_FILE_NAME } from "./connection";

export { runMigrations, getLatestMigrationVersion } from "./migrations";
export { initializeDatabase, resetDatabase } from "./services/databaseService";
export { seedSampleData, type SampleDataSummary } from "./services/sampleDataService";

export * from "./models/category";
export * from "./models/account";
export * from "./models/transaction";
export * from "./models/subscription";
export * from "./models/setting";
export * from "./models/transactionRule";

export * as accountsRepository from "./repositories/accountsRepository";
export * as transactionRulesRepository from "./repositories/transactionRulesRepository";
export * as transactionsRepository from "./repositories/transactionsRepository";
export * as subscriptionsRepository from "./repositories/subscriptionsRepository";
export * as settingsRepository from "./repositories/settingsRepository";
