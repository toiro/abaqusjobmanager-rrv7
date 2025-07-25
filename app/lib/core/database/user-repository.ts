/**
 * User Repository - BaseRepository継承による重複コード削除
 * Martin Fowler Template Method パターンの具体実装
 */

import { BaseRepository } from "./base-repository";
import { 
  UserSchema, 
  CreateUserSchema,
  PersistedUserSchema,
  UpdateUserSchema,
  type User,
  type CreateUser,
  type PersistedUser,
  type UpdateUser
} from "../types/database";
import { emitUserCreated, emitUserUpdated, emitUserDeleted, emitUserStatusChanged } from "../../services/sse/sse.server";
import type { UserEventData } from "../../services/sse/sse-schemas";
import { executeQuery } from "./db-utils";

/**
 * UserRepository - Template Method Pattern 適用
 */
export class UserRepository extends BaseRepository<PersistedUser, CreateUser, Omit<UpdateUser, 'id'>> {
  protected readonly tableName = 'users';
  protected readonly entitySchema = PersistedUserSchema;
  protected readonly createSchema = CreateUserSchema;
  protected readonly updateSchema = UserSchema.omit({ created_at: true, updated_at: true }).partial();

  // === Public API Methods ===

  createUser(data: CreateUser): number {
    return this.create(data);
  }

  findUserById(id: number): PersistedUser | null {
    return this.findById(id);
  }

  findAllUsers(): PersistedUser[] {
    return this.findAll();
  }

  updateUser(data: UpdateUser): boolean {
    const { id, ...updateData } = data;
    return this.update({ ...updateData, id } as Omit<UpdateUser, 'id'> & { id: number });
  }

  deleteUser(id: number): boolean {
    return this.delete(id);
  }

  // === Specialized User Methods ===

  findUserByDisplayName(displayName: string): PersistedUser | null {
    const sql = "SELECT * FROM users WHERE display_name = ?";
    const results = this.findByCondition(sql, [displayName]);
    return results.length > 0 ? results[0] : null;
  }

  findActiveUsers(): PersistedUser[] {
    const sql = "SELECT * FROM users WHERE is_active = 1 ORDER BY display_name";
    return this.findByCondition(sql, []);
  }

  activateUser(id: number): boolean {
    const sql = `
      UPDATE users 
      SET is_active = 1, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `;
    return this.executeStatusUpdate(sql, [id], 'activate');
  }

  deactivateUser(id: number): boolean {
    const sql = `
      UPDATE users 
      SET is_active = 0, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `;
    return this.executeStatusUpdate(sql, [id], 'deactivate');
  }

  getCurrentJobCount(userId: number): number {
    try {
      const { selectQuery } = require("./db-utils");
      const result = selectQuery(
        "SELECT COUNT(*) as count FROM jobs WHERE user_id = ? AND status IN ('waiting', 'running')",
        [userId],
        PersistedUserSchema.pick({ id: true }).extend({ count: PersistedUserSchema.shape.id }),
        true
      ) as { count: number } | null;
      
      return result?.count || 0;
    } catch (error) {
      const { handleDbError } = require("./db-utils");
      handleDbError(error, 'get current job count', { userId });
      return 0;
    }
  }

  canCreateJob(userId: number): boolean {
    try {
      const user = this.findUserById(userId);
      if (!user || !user.is_active) {
        return false;
      }
      
      const currentJobs = this.getCurrentJobCount(userId);
      return currentJobs < user.max_concurrent_jobs;
    } catch (error) {
      const { handleDbError } = require("./db-utils");
      handleDbError(error, 'check can create job', { userId });
      return false;
    }
  }

  // === Hook Method Implementations ===

  protected afterCreate(id: number, _data: CreateUser): void {
    const createdUser = this.findUserById(id);
    if (createdUser) {
      emitUserCreated(this.userToEventData(createdUser));
    }
  }

  protected afterUpdate(id: number, _data: Omit<UpdateUser, 'id'>): void {
    const updatedUser = this.findUserById(id);
    if (updatedUser) {
      emitUserUpdated(this.userToEventData(updatedUser));
    }
  }

  protected beforeDelete(id: number): PersistedUser | null {
    return this.findUserById(id);
  }

  protected afterDelete(_id: number, deletedUser?: PersistedUser | null): void {
    if (deletedUser) {
      emitUserDeleted(this.userToEventData(deletedUser));
    }
  }

  protected extractLogData(data: CreateUser | Omit<UpdateUser, 'id'>): Record<string, any> {
    if ('display_name' in data) {
      return { displayName: data.display_name };
    }
    return {};
  }

  // === Private Helper Methods ===

  private findByCondition(sql: string, params: any[]): PersistedUser[] {
    const { selectQuery, safeDbOperation } = require("./db-utils");
    return safeDbOperation(
      () => selectQuery(sql, params, this.entitySchema, false, 'Database') as PersistedUser[],
      `find users by condition`,
      []
    );
  }

  private executeStatusUpdate(sql: string, params: any[], operation: string): boolean {
    try {
      const result = executeQuery(sql, params);
      
      if (result.success && result.result.changes > 0) {
        const { logDbSuccess } = require("./db-utils");
        logDbSuccess(`User ${operation}d`, { id: params[0] });
        
        // Emit SSE event for real-time updates
        const updatedUser = this.findUserById(params[0]);
        if (updatedUser) {
          emitUserStatusChanged(this.userToEventData(updatedUser));
        }
        
        return true;
      }
      
      return false;
    } catch (error) {
      const { handleDbError } = require("./db-utils");
      handleDbError(error, `${operation} user`, { id: params[0] });
      return false;
    }
  }

  private userToEventData(user: PersistedUser): UserEventData {
    return {
      userId: user.id,
      userName: user.display_name,
      maxConcurrentJobs: user.max_concurrent_jobs,
      isActive: user.is_active
    };
  }
}

// Singleton instance
export const userRepository = new UserRepository();