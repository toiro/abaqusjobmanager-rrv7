/**
 * Server-only database connection
 * This file will NOT be included in client bundles
 */

import { Database } from "bun:sqlite";

let db: Database | null = null;

/**
 * Get database instance with lazy initialization
 */
export function getDatabase(): Database {
  if (!db) {
    const dbPath = process.env.DATABASE_PATH || process.env.DATABASE_URL || "./data/abaqus.db";
    db = new Database(dbPath);
    
    // Enable foreign keys and WAL mode for better performance
    db.exec("PRAGMA foreign_keys = ON");
    
    // Use WAL mode only for file databases, not for :memory:
    if (dbPath !== ":memory:") {
      db.exec("PRAGMA journal_mode = WAL");
    }
  }
  
  return db;
}

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