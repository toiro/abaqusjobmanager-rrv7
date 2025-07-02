/**
 * Test database setup utilities
 * Uses scripts/init-db.ts functions for consistency
 */

import { getDatabase, resetDatabase } from "./connection";
import { initializeDatabase, checkDatabaseHealth } from "../../../scripts/init-db";

/**
 * Initialize database with test schema
 * Delegates to scripts/init-db.ts for consistency
 */
export function initializeTestDatabase(): void {
  // Reset database connection to ensure fresh instance
  resetDatabase();
  
  // Initialize with test mode
  initializeDatabase(true);
}

/**
 * Clean up test database
 */
export function cleanupTestDatabase(): void {
  try {
    const db = getDatabase();
    
    // Drop all tables in reverse order due to foreign key constraints
    const tables = ['job_logs', 'jobs', 'files', 'users', 'nodes', 'system_config'];
    
    for (const table of tables) {
      db.exec(`DROP TABLE IF EXISTS ${table}`);
    }
  } catch {
    // Ignore cleanup errors (tables might not exist)
  }
  
  // Reset connection to ensure clean state
  resetDatabase();
}

// checkDatabaseHealth is now exported from scripts/init-db.ts
export { checkDatabaseHealth };