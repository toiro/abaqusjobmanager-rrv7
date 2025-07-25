#!/usr/bin/env bun
/**
 * Database initialization script
 * Run once to set up the database and initial data
 */

import { getDatabase } from "../app/lib/core/database/connection.server";
import path from "path";
import fs from "fs";

/**
 * Check database health
 */
export function checkDatabaseHealth(): boolean {
  try {
    const db = getDatabase();
    const result = db.prepare("SELECT 1 as test").get() as { test: number };
    return result.test === 1;
  } catch {
    return false;
  }
}

/**
 * Execute SQL file
 */
function executeSqlFile(database: any, filePath: string): void {
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

console.log("🗄️  Starting database initialization...");

try {
  // Initialize database
  initializeDatabase();
  
  // Verify database health
  if (checkDatabaseHealth()) {
    console.log("✅ Database initialization completed successfully");
    console.log("📊 Database health check: PASSED");
  } else {
    console.error("❌ Database health check: FAILED");
    process.exit(1);
  }
} catch (error) {
  console.error("❌ Database initialization failed:", error);
  process.exit(1);
}

console.log("🎉 Database is ready for use!");