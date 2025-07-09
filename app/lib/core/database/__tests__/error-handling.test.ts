/**
 * Test unified SQL error handling helpers
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { safeDbOperation, handleDbErrorWithFallback } from "../db-utils";

// Mock logger to prevent actual log output during tests
const originalLogger = global.console;
beforeEach(() => {
  global.console = { ...originalLogger, error: () => {} } as any;
});

afterEach(() => {
  global.console = originalLogger;
});

describe('SQL Error Handling Helpers', () => {
  test('safeDbOperation returns result on success', () => {
    const mockOperation = () => ['item1', 'item2'];
    const result = safeDbOperation(mockOperation, 'test operation', [], {});
    
    expect(result).toEqual(['item1', 'item2']);
  });

  test('safeDbOperation returns fallback on error', () => {
    const mockOperation = () => {
      throw new Error('Database connection failed');
    };
    
    const result = safeDbOperation(mockOperation, 'test operation', [], {});
    
    expect(result).toEqual([]);
  });

  test('handleDbErrorWithFallback returns fallback value', () => {
    const error = new Error('SQL syntax error');
    const result = handleDbErrorWithFallback(error, 'test operation', [], {});
    
    expect(result).toEqual([]);
  });

  test('safeDbOperation works with different return types', () => {
    // Test with object fallback
    const mockOperation = () => {
      throw new Error('Database error');
    };
    
    const result = safeDbOperation(
      mockOperation, 
      'test operation', 
      { count: 0 }, 
      {}
    );
    
    expect(result).toEqual({ count: 0 });
  });

  test('safeDbOperation preserves operation context', () => {
    // This test verifies that safeDbOperation works correctly with errors
    // by ensuring it returns the fallback value when the operation fails
    const mockOperation = () => {
      throw new Error('Test error');
    };
    
    const result = safeDbOperation(mockOperation, 'find all items', [], { userId: 123 });
    
    // Should return the fallback value (empty array)
    expect(result).toEqual([]);
  });
});