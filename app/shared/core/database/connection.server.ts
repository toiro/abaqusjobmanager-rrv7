/**
 * Server-only database connection
 * This file will NOT be included in client bundles
 */

import { Database } from "bun:sqlite";
import { env } from "../env";

let db: Database | null = null;

/**
 * Get database instance with lazy initialization
 */
export function getDatabase(): Database {
	if (!db) {
		db = connectDatabase(env.DATABASE_PATH);
	}

	return db;
}

/**
 * Connect database instance with lazy initialization
 */

/**
 * Close database connection
 */
export function closeDatabase(): void {
	if (db) {
		db.close();
		db = null;
	}
}

/**
 * Reset database connection (for tests)
 * Forces creation of a new database instance
 */
export function resetDatabase(): void {
	closeDatabase();
}

function connectDatabase(databasePath: string) {
	const database = new Database(databasePath);

	// Enable foreign keys and WAL mode for better performance
	database.exec("PRAGMA foreign_keys = ON");

	// Use WAL mode only for file databases, not for :memory:
	if (databasePath !== ":memory:") {
		database.exec("PRAGMA journal_mode = WAL");
	}
	return database;
}
