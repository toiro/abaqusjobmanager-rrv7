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
 * Execute SQL file
 */
function executeSqlFile(database: Database, filePath: string): void {
  try {
    const sqlContent = fs.readFileSync(filePath, 'utf-8');
    database.exec(sqlContent);
    console.log(`Executed SQL file: ${filePath}`);
  } catch (error) {
    console.error(`Failed to execute SQL file ${filePath}:`, error);
    throw error;
  }
}

/**
 * Initialize database with required tables
 */
export function initializeDatabase(isTest: boolean = false): void {
  const database = getDatabase();
  const sqlDir = path.join(process.cwd(), "resources", "sql");
  
  // Execute SQL files in order
  let sqlFiles: string[];
  if (isTest) {
    // For tests, only create tables without sample data
    sqlFiles = ["test_setup.sql"];
  } else {
    sqlFiles = [
      "01_create_tables.sql",
      "02_insert_default_config.sql",
      "03_sample_data.sql"
    ];
  }
  
  for (const fileName of sqlFiles) {
    const filePath = path.join(sqlDir, fileName);
    if (fs.existsSync(filePath)) {
      executeSqlFile(database, filePath);
    } else {
      console.warn(`SQL file not found: ${filePath}`);
    }
  }
  
  console.log("Database initialization completed");
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