import { describe, test, expect, beforeEach } from "bun:test";
import { 
  getLicenseConfig, 
  setLicenseServerName, 
  setTotalLicenseTokens, 
  updateLicenseConfig,
  getAvailableLicenseTokens,
  hasAvailableLicenseTokens
} from "../license-config.server";
import { getDatabase } from "../../../core/database/connection.server";
import { initializeTestDatabase } from "../../../core/database/test-setup";

// Initialize test database
beforeEach(() => {
  // Use in-memory database for isolated tests
  process.env.DATABASE_PATH = ":memory:";
  
  // Initialize database tables
  initializeTestDatabase();
});

describe("License Configuration", () => {
  test("should get default license configuration", () => {
    const config = getLicenseConfig();
    expect(config.serverName).toBe("test-server");
    expect(config.totalTokens).toBe(10);
  });

  test("should update license server name", () => {
    setLicenseServerName("new-server.local");
    
    const config = getLicenseConfig();
    expect(config.serverName).toBe("new-server.local");
    expect(config.totalTokens).toBe(10); // Should remain unchanged
  });

  test("should update total license tokens", () => {
    setTotalLicenseTokens(25);
    
    const config = getLicenseConfig();
    expect(config.serverName).toBe("test-server"); // Should remain unchanged
    expect(config.totalTokens).toBe(25);
  });

  test("should update both license configuration values", () => {
    const newConfig = {
      serverName: "production-server",
      totalTokens: 100
    };
    
    updateLicenseConfig(newConfig);
    
    const config = getLicenseConfig();
    expect(config.serverName).toBe("production-server");
    expect(config.totalTokens).toBe(100);
  });

  test("should validate server name - empty", () => {
    expect(() => setLicenseServerName("")).toThrow("License server name cannot be empty");
    expect(() => setLicenseServerName("   ")).toThrow("License server name cannot be empty");
  });

  test("should validate server name - too long", () => {
    const longName = "a".repeat(256);
    expect(() => setLicenseServerName(longName)).toThrow("License server name cannot exceed 255 characters");
  });

  test("should validate server name - invalid characters", () => {
    expect(() => setLicenseServerName("server@invalid")).toThrow("License server name can only contain alphanumeric characters, dots, and hyphens");
    expect(() => setLicenseServerName("server with spaces")).toThrow("License server name can only contain alphanumeric characters, dots, and hyphens");
  });

  test("should validate server name - valid patterns", () => {
    // These should not throw
    expect(() => setLicenseServerName("localhost")).not.toThrow();
    expect(() => setLicenseServerName("server.local")).not.toThrow();
    expect(() => setLicenseServerName("test-server")).not.toThrow();
    expect(() => setLicenseServerName("192.168.1.100")).not.toThrow();
  });

  test("should validate token count - must be integer", () => {
    expect(() => setTotalLicenseTokens(10.5)).toThrow("License token count must be an integer");
  });

  test("should validate token count - minimum value", () => {
    expect(() => setTotalLicenseTokens(0)).toThrow("License token count must be at least 1");
    expect(() => setTotalLicenseTokens(-5)).toThrow("License token count must be at least 1");
  });

  test("should validate token count - maximum value", () => {
    expect(() => setTotalLicenseTokens(10001)).toThrow("License token count cannot exceed 10,000");
  });

  test("should validate token count - valid values", () => {
    // These should not throw
    expect(() => setTotalLicenseTokens(1)).not.toThrow();
    expect(() => setTotalLicenseTokens(50)).not.toThrow();
    expect(() => setTotalLicenseTokens(10000)).not.toThrow();
  });

  test("should get available license tokens", () => {
    // With default config (10 total tokens) and no running jobs
    const available = getAvailableLicenseTokens();
    expect(available).toBe(10);
  });

  test("should check license token availability", () => {
    // With default config (10 total tokens)
    expect(hasAvailableLicenseTokens(5)).toBe(true);
    expect(hasAvailableLicenseTokens(10)).toBe(true);
    expect(hasAvailableLicenseTokens(15)).toBe(false);
  });

  test("should handle configuration update validation errors", () => {
    const invalidConfig = {
      serverName: "", // Invalid
      totalTokens: 50
    };
    
    expect(() => updateLicenseConfig(invalidConfig)).toThrow("License server name cannot be empty");
    
    // Original config should remain unchanged
    const config = getLicenseConfig();
    expect(config.serverName).toBe("test-server");
    expect(config.totalTokens).toBe(10);
  });
});