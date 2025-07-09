/**
 * Simple database utilities for common patterns
 * Replaces complex BaseRepository abstraction with direct, reusable functions
 */

import { getDatabase } from "./connection";
import type { Database } from "bun:sqlite";
import { getLogger } from "../logger";
import type { ZodSchema } from "zod";

/**
 * Get database instance with error handling
 */
export function getDb(): Database {
  try {
    return getDatabase();
  } catch (error) {
    getLogger().error('Failed to get database connection', 'Database', { error });
    throw error;
  }
}

/**
 * Validate data using Zod schema
 */
export function validateData<T>(schema: ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new Error(`Validation failed: ${result.error.issues.map(i => i.message).join(', ')}`);
  }
  return result.data;
}

/**
 * Validate array of data using Zod schema, filtering out invalid items
 */
export function validateArray<T>(schema: ZodSchema<T>, data: unknown[]): T[] {
  return data
    .map(item => {
      const result = schema.safeParse(item);
      return result.success ? result.data : null;
    })
    .filter((item): item is T => item !== null);
}

/**
 * Execute SQL with error handling and logging
 */
export function executeQuery(
  sql: string, 
  params: any[] = [], 
  context: 'Database' = 'Database'
): { success: boolean; result?: any; error?: string } {
  try {
    const db = getDb();
    const stmt = db.prepare(sql);
    const result = stmt.run(...params);
    
    getLogger().debug('SQL query executed', 'Database', { 
      sql: sql.substring(0, 100) + '...', 
      paramCount: params.length,
      changes: result.changes 
    });
    
    return { success: true, result };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    getLogger().error('SQL query failed', context, { sql, params, error: errorMessage });
    return { success: false, error: errorMessage };
  }
}

/**
 * Execute SELECT query with validation
 */
export function selectQuery<T>(
  sql: string, 
  params: any[] = [], 
  schema: ZodSchema<T>,
  single: boolean = false,
  context: 'Database' = 'Database'
): T[] | T | null {
  try {
    const db = getDb();
    const stmt = db.prepare(sql);
    
    if (single) {
      const result = stmt.get(...params);
      if (!result) return null;
      
      const validated = schema.safeParse(result);
      if (!validated.success) {
        getLogger().warn('Single query result validation failed', context, { 
          sql, 
          errors: validated.error.issues 
        });
        return null;
      }
      return validated.data;
    } else {
      const results = stmt.all(...params);
      return validateArray(schema, results);
    }
  } catch (error) {
    getLogger().error('SELECT query failed', context, { sql, params, error });
    return single ? null : [];
  }
}

/**
 * Build UPDATE SQL dynamically
 */
export function buildUpdateSQL(
  tableName: string, 
  data: Record<string, unknown>, 
  idField: string = 'id'
): { sql: string; values: unknown[] } {
  const fields = Object.keys(data).filter(key => 
    data[key] !== undefined && key !== idField
  );
  
  if (fields.length === 0) {
    throw new Error('No valid fields to update');
  }
  
  const setClause = fields.map(field => `${field} = ?`).join(', ');
  const values = fields.map(field => data[field] === undefined ? null : data[field]);
  
  const sql = `UPDATE ${tableName} SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE ${idField} = ?`;
  
  return { sql, values };
}

/**
 * Standard error handler for database operations
 */
export function handleDbError(error: unknown, operation: string, context: Record<string, unknown> = {}): never {
  const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
  getLogger().error(`Database operation failed: ${operation}`, 'Database', { ...context, error: errorMessage });
  throw new Error(`${operation}: ${errorMessage}`);
}

/**
 * Error handler for array-returning database operations
 * Returns empty array instead of throwing to maintain UI stability
 */
export function handleDbErrorWithFallback<T>(
  error: unknown, 
  operation: string, 
  fallbackValue: T,
  context: Record<string, unknown> = {}
): T {
  const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
  getLogger().error(`Database operation failed: ${operation}`, 'Database', { ...context, error: errorMessage });
  return fallbackValue;
}

/**
 * Wrapper for database operations that need error handling with fallback values
 * Eliminates repetitive try-catch blocks
 */
export function safeDbOperation<T>(
  operation: () => T,
  operationName: string,
  fallbackValue: T,
  context: Record<string, unknown> = {}
): T {
  try {
    return operation();
  } catch (error) {
    return handleDbErrorWithFallback(error, operationName, fallbackValue, context);
  }
}

/**
 * Log successful database operation
 */
export function logDbSuccess(operation: string, context: Record<string, unknown> = {}): void {
  getLogger().info(`Database operation successful: ${operation}`, 'Database', context);
}