import { describe, test, expect, beforeEach, mock } from "bun:test";

// Mock LogTape before importing logger
const mockLogger = {
  error: mock(() => {}),
  warn: mock(() => {}),
  info: mock(() => {}),
  debug: mock(() => {})
};

const mockGetLogger = mock(() => mockLogger);
const mockConfigure = mock(() => Promise.resolve());
const mockGetConsoleSink = mock(() => ({ type: 'console' }));

mock.module("@logtape/logtape", () => ({
  getLogger: mockGetLogger,
  configure: mockConfigure,
  getConsoleSink: mockGetConsoleSink
}));

// Import after mocking
import { AppLogger, type LogContext } from "../core/logger/logger";
import { initializeLogger } from "../core/logger/config";

describe("Simplified Logger System", () => {
  let testLogger: AppLogger;

  beforeEach(() => {
    // Clear all mocks
    mockLogger.error.mockClear();
    mockLogger.warn.mockClear();
    mockLogger.info.mockClear();
    mockLogger.debug.mockClear();
    mockGetLogger.mockClear();
    mockConfigure.mockClear();
    
    // Create fresh logger instance for each test
    testLogger = new AppLogger();
  });

  describe("AppLogger Instance", () => {
    test("should create logger instance", () => {
      expect(testLogger).toBeDefined();
      expect(mockGetLogger).toHaveBeenCalledWith("abaqus-job-manager");
    });

    test("should be instance of AppLogger", () => {
      expect(testLogger).toBeInstanceOf(AppLogger);
    });
  });

  describe("Basic Logging Methods", () => {
    test("should log error with context and data", () => {
      testLogger.error("Test error", "Database", { key: "value" });
      
      expect(mockLogger.error).toHaveBeenCalledTimes(1);
      expect(mockLogger.error).toHaveBeenCalledWith("Test error", {
        context: "Database",
        key: "value"
      });
    });

    test("should log error without context", () => {
      testLogger.error("Simple error");
      
      expect(mockLogger.error).toHaveBeenCalledTimes(1);
      expect(mockLogger.error).toHaveBeenCalledWith("Simple error", undefined);
    });

    test("should log error with context only", () => {
      testLogger.error("Error with context", "Database");
      
      expect(mockLogger.error).toHaveBeenCalledTimes(1);
      expect(mockLogger.error).toHaveBeenCalledWith("Error with context", {
        context: "Database"
      });
    });

    test("should log error with data only", () => {
      testLogger.error("Error with data", undefined, { userId: 123 });
      
      expect(mockLogger.error).toHaveBeenCalledTimes(1);
      expect(mockLogger.error).toHaveBeenCalledWith("Error with data", {
        userId: 123
      });
    });

    test("should log warn messages", () => {
      testLogger.warn("Test warning", "Routes", { url: "/api/test" });
      
      expect(mockLogger.warn).toHaveBeenCalledTimes(1);
      expect(mockLogger.warn).toHaveBeenCalledWith("Test warning", {
        context: "Routes",
        url: "/api/test"
      });
    });

    test("should log info messages", () => {
      testLogger.info("Test info", "SSE", { channel: "jobs" });
      
      expect(mockLogger.info).toHaveBeenCalledTimes(1);
      expect(mockLogger.info).toHaveBeenCalledWith("Test info", {
        context: "SSE",
        channel: "jobs"
      });
    });

    test("should log debug messages", () => {
      testLogger.debug("Test debug", "JobExecution", { jobId: 123 });
      
      expect(mockLogger.debug).toHaveBeenCalledTimes(1);
      expect(mockLogger.debug).toHaveBeenCalledWith("Test debug", {
        context: "JobExecution",
        jobId: 123
      });
    });
  });

  describe("LogContext Type Validation", () => {
    test("should accept all valid LogContext values", () => {
      const validContexts: LogContext[] = [
        'Database',
        'SSE',
        'JobExecution',
        'Routes',
        'Auth',
        'FileOps',
        'HealthCheck',
        'RemotePwsh'
      ];

      validContexts.forEach(context => {
        testLogger.info(`Test ${context}`, context);
      });

      expect(mockLogger.info).toHaveBeenCalledTimes(validContexts.length);
    });
  });

  describe("Specialized Logging Methods", () => {
    test("should log error with exception details", () => {
      const error = new Error("Test exception");
      error.stack = "Error: Test exception\n    at test (/test.js:1:1)";

      testLogger.errorWithException("Exception occurred", error, "Database", { extra: "data" });

      expect(mockLogger.error).toHaveBeenCalledTimes(1);
      expect(mockLogger.error).toHaveBeenCalledWith("Exception occurred", {
        context: "Database",
        error: {
          name: "Error",
          message: "Test exception",
          stack: "Error: Test exception\n    at test (/test.js:1:1)"
        },
        extra: "data"
      });
    });

    test("should log error with exception without context", () => {
      const error = new Error("Simple exception");

      testLogger.errorWithException("Exception occurred", error);

      expect(mockLogger.error).toHaveBeenCalledTimes(1);
      expect(mockLogger.error).toHaveBeenCalledWith("Exception occurred", {
        error: {
          name: "Error",
          message: "Simple exception",
          stack: error.stack
        }
      });
    });

    test("should log performance metrics", () => {
      testLogger.performance("Operation completed", 1500, "Routes", { operation: "fetch" });

      expect(mockLogger.info).toHaveBeenCalledTimes(1);
      expect(mockLogger.info).toHaveBeenCalledWith("Operation completed", {
        context: "Routes",
        type: "PERFORMANCE",
        durationMs: 1500,
        operation: "fetch"
      });
    });

    test("should log performance without context", () => {
      testLogger.performance("Fast operation", 200);

      expect(mockLogger.info).toHaveBeenCalledTimes(1);
      expect(mockLogger.info).toHaveBeenCalledWith("Fast operation", {
        type: "PERFORMANCE",
        durationMs: 200
      });
    });

    test("should log security events with warn level", () => {
      testLogger.security("Security event", "warn", "Auth", { user: "test" });

      expect(mockLogger.warn).toHaveBeenCalledTimes(1);
      expect(mockLogger.warn).toHaveBeenCalledWith("Security event", {
        context: "Auth",
        type: "SECURITY",
        user: "test"
      });
    });

    test("should log security events with error level", () => {
      testLogger.security("Security breach", "error", "Auth", { severity: "high" });

      expect(mockLogger.error).toHaveBeenCalledTimes(1);
      expect(mockLogger.error).toHaveBeenCalledWith("Security breach", {
        context: "Auth",
        type: "SECURITY",
        severity: "high"
      });
    });

    test("should log security events with info level", () => {
      testLogger.security("Security info", "info", "Auth");

      expect(mockLogger.info).toHaveBeenCalledTimes(1);
      expect(mockLogger.info).toHaveBeenCalledWith("Security info", {
        context: "Auth",
        type: "SECURITY"
      });
    });

    test("should default security level to warn", () => {
      testLogger.security("Default security event");

      expect(mockLogger.warn).toHaveBeenCalledTimes(1);
      expect(mockLogger.warn).toHaveBeenCalledWith("Default security event", {
        type: "SECURITY"
      });
    });
  });

  describe("Context Handling", () => {
    test("should handle null data gracefully", () => {
      testLogger.info("Test message", "Database", null);

      expect(mockLogger.info).toHaveBeenCalledWith("Test message", {
        context: "Database"
      });
    });

    test("should handle undefined values in data", () => {
      testLogger.info("Test message", "Database", { defined: "value", undefined: undefined });

      expect(mockLogger.info).toHaveBeenCalledWith("Test message", {
        context: "Database",
        defined: "value",
        undefined: undefined
      });
    });

    test("should merge data properly", () => {
      testLogger.info("Test message", "Database", { 
        key1: "value1", 
        key2: "value2",
        nested: { prop: "value" }
      });

      expect(mockLogger.info).toHaveBeenCalledWith("Test message", {
        context: "Database",
        key1: "value1",
        key2: "value2",
        nested: { prop: "value" }
      });
    });
  });
});

describe("Logger Configuration", () => {
  beforeEach(() => {
    mockConfigure.mockClear();
    mockGetConsoleSink.mockClear();
  });

  test("should initialize logger successfully", async () => {
    await initializeLogger();
    
    expect(mockConfigure).toHaveBeenCalledTimes(1);
    // getConsoleSink is not used in the new implementation
  });

  test("should handle initialization errors gracefully", async () => {
    const consoleErrorSpy = mock(() => {});
    const consoleWarnSpy = mock(() => {});
    
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;
    
    console.error = consoleErrorSpy;
    console.warn = consoleWarnSpy;
    
    mockConfigure.mockImplementationOnce(() => {
      throw new Error("Configuration failed");
    });

    await initializeLogger();

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Failed to initialize LogTape:",
      expect.any(Error)
    );
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      "Falling back to console logging only"
    );

    // Restore console methods
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
  });
});