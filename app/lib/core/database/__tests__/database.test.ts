import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { getDatabase } from "../connection";
import { initializeTestDatabase } from "../test-setup";

// Store original environment variables
const originalEnv = process.env;

describe("Database System", () => {
  beforeEach(() => {
    // Set up for each test
    process.env.DATABASE_PATH = ":memory:";
    initializeTestDatabase();
  });

  afterEach(() => {
    // Restore environment variables
    process.env = { ...originalEnv };
  });

  describe("Database Connection", () => {
    test("should establish database connection", () => {
      const db = getDatabase();
      expect(db).toBeDefined();
      
      // Simple health check
      const result = db.prepare("SELECT 1 as test").get() as { test: number };
      expect(result.test).toBe(1);
    });

    test("should use in-memory database for tests", () => {
      process.env.DATABASE_PATH = ":memory:";
      const db = getDatabase();
      expect(db).toBeDefined();
      
      // Verify basic SQL operations work with existing tables
      // Check that system_config table exists (created by initializeTestDatabase)
      const result = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='system_config'").get() as { name: string } | undefined;
      expect(result?.name).toBe('system_config');
    });

    test("should create singleton database connection", () => {
      process.env.DATABASE_PATH = ":memory:";
      const db1 = getDatabase();
      const db2 = getDatabase();
      expect(db1).toBe(db2); // Should be the same instance
    });
  });

  describe("Database Pragmas", () => {
    test("should set proper SQLite pragmas on connection", () => {
      process.env.DATABASE_PATH = ":memory:";
      const db = getDatabase();
      
      // Test that we can query pragma settings
      const foreignKeys = db.prepare("PRAGMA foreign_keys").get() as { foreign_keys: number };
      expect(foreignKeys.foreign_keys).toBe(1);
    });
  });

  describe("Error Handling", () => {
    test("should handle SQL execution errors", () => {
      process.env.DATABASE_PATH = ":memory:";
      const db = getDatabase();
      
      expect(() => {
        db.exec("INVALID SQL STATEMENT");
      }).toThrow();
    });
  });
});