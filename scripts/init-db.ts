#!/usr/bin/env bun
/**
 * Database initialization script
 * Run once to set up the database and initial data
 */

import { initializeDatabase, checkDatabaseHealth } from "../app/lib/database";

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