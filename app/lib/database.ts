/**
 * SQLite database connection and configuration
 * Using bun:sqlite for SQLite operations
 */

import { Database } from "bun:sqlite";
import path from "path";
import fs from "fs";

let db: Database | null = null;

/**
 * Get database file path based on environment
 */
function getDatabasePath(): string {
  // Allow override via environment variable
  if (process.env.DATABASE_PATH) {
    return process.env.DATABASE_PATH;
  }

  const sqliteDir = path.join(process.cwd(), "sqlite");
  
  // Ensure sqlite directory exists
  if (!fs.existsSync(sqliteDir)) {
    fs.mkdirSync(sqliteDir, { recursive: true });
  }

  // Determine database file based on environment
  const isTest = process.env.NODE_ENV === 'test' || process.env.BUN_ENV === 'test';
  const isDevelopment = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === undefined;
  
  let dbFileName: string;
  if (isTest) {
    dbFileName = 'test.db';
  } else if (isDevelopment) {
    dbFileName = 'development.db';
  } else {
    dbFileName = 'production.db';
  }

  return path.join(sqliteDir, dbFileName);
}

/**
 * Get database instance (singleton pattern)
 */
export function getDatabase(): Database {
  if (!db) {
    const dbPath = getDatabasePath();
    
    db = new Database(dbPath);
    
    // Enable WAL mode for better concurrent access
    db.exec("PRAGMA journal_mode = WAL;");
    db.exec("PRAGMA synchronous = NORMAL;");
    db.exec("PRAGMA cache_size = 1000;");
    db.exec("PRAGMA foreign_keys = ON;");
    
    console.log(`Database connected: ${dbPath}`);
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
    console.log("Database connection closed");
  }
}

/**
 * Reset database connection (for testing)
 */
export function resetDatabase(): void {
  closeDatabase();
}


/**
 * Get system configuration value
 */
export function getSystemConfig(key: string): string | null {
  const database = getDatabase();
  const stmt = database.prepare("SELECT value FROM system_config WHERE key = ?");
  const result = stmt.get(key) as { value: string } | null;
  return result?.value || null;
}

/**
 * Set system configuration value
 */
export function setSystemConfig(key: string, value: string, description?: string): void {
  const database = getDatabase();
  const stmt = database.prepare(`
    INSERT OR REPLACE INTO system_config (key, value, description, updated_at)
    VALUES (?, ?, COALESCE(?, (SELECT description FROM system_config WHERE key = ?)), CURRENT_TIMESTAMP)
  `);
  stmt.run(key, value, description || null, key);
}

/**
 * Health check for database connection
 */
export function checkDatabaseHealth(): boolean {
  try {
    const database = getDatabase();
    const result = database.prepare("SELECT 1 as test").get() as { test: number };
    return result.test === 1;
  } catch (error) {
    console.error("Database health check failed:", error);
    return false;
  }
}