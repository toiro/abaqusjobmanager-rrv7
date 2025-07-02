/**
 * Simple database utilities for common patterns
 * Replaces complex BaseRepository abstraction with direct, reusable functions
 */

import { getDatabase } from "./connection";
import type { Database } from "bun:sqlite";
import { logger } from "../logger/logger";
import type { ZodSchema } from "zod";

/**
 * Get database instance with error handling
 */
export function getDb(): Database {
  try {
    return getDatabase();
  } catch (error) {
    logger.error('Failed to get database connection', 'Database', { error });
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
    
    logger.debug('SQL query executed', 'Database', { 
      sql: sql.substring(0, 100) + '...', 
      paramCount: params.length,
      changes: result.changes 
    });
    
    return { success: true, result };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('SQL query failed', context, { sql, params, error: errorMessage });
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
        logger.warn('Single query result validation failed', context, { 
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
    logger.error('SELECT query failed', context, { sql, params, error });
    return single ? null : [];
  }
}

/**
 * Build UPDATE SQL dynamically
 */
export function buildUpdateSQL(
  tableName: string, 
  data: Record<string, any>, 
  idField: string = 'id'
): { sql: string; values: any[] } {
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
export function handleDbError(error: unknown, operation: string, context: Record<string, any> = {}): never {
  const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
  logger.error(`Database operation failed: ${operation}`, 'Database', { ...context, error: errorMessage });
  throw new Error(`${operation}: ${errorMessage}`);
}

/**
 * Log successful database operation
 */
export function logDbSuccess(operation: string, context: Record<string, any> = {}): void {
  logger.info(`Database operation successful: ${operation}`, 'Database', context);
}