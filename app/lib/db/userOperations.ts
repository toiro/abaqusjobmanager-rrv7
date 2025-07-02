/**
 * Simple, direct user database operations
 */

import { UserSchema, type User } from "../types/database";
import { validateData, selectQuery, executeQuery, buildUpdateSQL, handleDbError, logDbSuccess } from "./dbUtils";

export type CreateUserInput = Omit<User, 'id' | 'created_at' | 'updated_at'>;
export type UpdateUserInput = Partial<CreateUserInput>;

/**
 * Create a new user
 */
export function createUser(data: CreateUserInput): number {
  try {
    const validated = validateData(
      UserSchema.omit({ id: true, created_at: true, updated_at: true }), 
      data
    );
    
    const sql = `
      INSERT INTO users (display_name, max_concurrent_jobs, is_active)
      VALUES (?, ?, ?)
    `;
    
    const params = [
      validated.display_name,
      validated.max_concurrent_jobs || 3,
      validated.is_active !== false
    ];
    
    const result = executeQuery(sql, params);
    if (!result.success) {
      throw new Error(result.error || 'Failed to create user');
    }
    
    const userId = result.result.lastInsertRowid as number;
    logDbSuccess('User created', { userId, displayName: validated.display_name });
    return userId;
  } catch (error) {
    handleDbError(error, 'create user', { data });
  }
}

/**
 * Find user by ID
 */
export function findUserById(id: number): User | null {
  try {
    return selectQuery(
      "SELECT * FROM users WHERE id = ?",
      [id],
      UserSchema,
      true,
      'Database'
    ) as User | null;
  } catch (error) {
    handleDbError(error, 'find user by id', { id });
  }
}

/**
 * Find user by display name
 */
export function findUserByDisplayName(displayName: string): User | null {
  try {
    return selectQuery(
      "SELECT * FROM users WHERE display_name = ?",
      [displayName],
      UserSchema,
      true,
      'Database'
    ) as User | null;
  } catch (error) {
    handleDbError(error, 'find user by display name', { displayName });
  }
}

/**
 * Find all users
 */
export function findAllUsers(): User[] {
  try {
    return selectQuery(
      "SELECT * FROM users ORDER BY created_at DESC",
      [],
      UserSchema,
      false,
      'Database'
    ) as User[];
  } catch (error) {
    handleDbError(error, 'find all users', {});
  }
}

/**
 * Find active users
 */
export function findActiveUsers(): User[] {
  try {
    return selectQuery(
      "SELECT * FROM users WHERE is_active = 1 ORDER BY display_name",
      [],
      UserSchema,
      false,
      'Database'
    ) as User[];
  } catch (error) {
    handleDbError(error, 'find active users', {});
  }
}

/**
 * Update user
 */
export function updateUser(id: number, data: UpdateUserInput): boolean {
  try {
    const validated = validateData(
      UserSchema.omit({ id: true, created_at: true, updated_at: true }).partial(),
      data
    );
    
    const { sql, values } = buildUpdateSQL('users', validated);
    const result = executeQuery(sql, [...values, id]);
    
    if (result.success && result.result.changes > 0) {
      logDbSuccess('User updated', { id, fields: Object.keys(validated) });
      return true;
    }
    
    return false;
  } catch (error) {
    handleDbError(error, 'update user', { id, data });
  }
}

/**
 * Delete user
 */
export function deleteUser(id: number): boolean {
  try {
    const result = executeQuery("DELETE FROM users WHERE id = ?", [id]);
    
    if (result.success && result.result.changes > 0) {
      logDbSuccess('User deleted', { id });
      return true;
    }
    
    return false;
  } catch (error) {
    handleDbError(error, 'delete user', { id });
  }
}

/**
 * Activate user
 */
export function activateUser(id: number): boolean {
  try {
    const sql = `
      UPDATE users 
      SET is_active = 1, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `;
    
    const result = executeQuery(sql, [id]);
    
    if (result.success && result.result.changes > 0) {
      logDbSuccess('User activated', { id });
      return true;
    }
    
    return false;
  } catch (error) {
    handleDbError(error, 'activate user', { id });
  }
}

/**
 * Deactivate user
 */
export function deactivateUser(id: number): boolean {
  try {
    const sql = `
      UPDATE users 
      SET is_active = 0, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `;
    
    const result = executeQuery(sql, [id]);
    
    if (result.success && result.result.changes > 0) {
      logDbSuccess('User deactivated', { id });
      return true;
    }
    
    return false;
  } catch (error) {
    handleDbError(error, 'deactivate user', { id });
  }
}

/**
 * Count current running jobs for user
 */
export function getCurrentJobCount(userId: number): number {
  try {
    const result = selectQuery(
      "SELECT COUNT(*) as count FROM jobs WHERE user_id = ? AND status IN ('waiting', 'running')",
      [userId],
      UserSchema.pick({ id: true }).extend({ count: UserSchema.shape.id }),
      true
    ) as { count: number } | null;
    
    return result?.count || 0;
  } catch (error) {
    handleDbError(error, 'get current job count', { userId });
  }
}

/**
 * Check if user can create new job (within concurrent limit)
 */
export function canCreateJob(userId: number): boolean {
  try {
    const user = findUserById(userId);
    if (!user || !user.is_active) {
      return false;
    }
    
    const currentJobs = getCurrentJobCount(userId);
    return currentJobs < user.max_concurrent_jobs;
  } catch (error) {
    handleDbError(error, 'check can create job', { userId });
  }
}