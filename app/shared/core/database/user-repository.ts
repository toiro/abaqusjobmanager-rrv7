/**
 * User Repository - BaseRepository継承による重複コード削除
 * Martin Fowler Template Method パターンの具体実装
 */

import type { UserId } from "../../../domain/value-objects/entity-ids";
import {
	emitUserCreated,
	emitUserDeleted,
	emitUserStatusChanged,
	emitUserUpdated,
} from "../../../server/services/sse/sse.server";
import type { UserEventData } from "../../../server/services/sse/sse-schemas";
import {
	type CreateUser,
	CreateUserSchema,
	type PersistedUser,
	PersistedUserSchema,
	type UpdateUser,
	UpdateUserSchema,
	type User,
	UserSchema,
} from "../types/database";
import { BaseRepository } from "./base-repository";
import { executeQuery, safeDbOperation, selectQuery } from "./db-utils";

/**
 * UserRepository - Template Method Pattern 適用
 */
export class UserRepository extends BaseRepository<
	PersistedUser,
	CreateUser,
	Omit<UpdateUser, "id">,
	UserId
> {
	protected readonly tableName = "users";
	protected readonly entitySchema = PersistedUserSchema;
	protected readonly createSchema = CreateUserSchema;
	protected readonly updateSchema = UserSchema.omit({
		created_at: true,
		updated_at: true,
	}).partial();

	/**
	 * String IDの場合は提供されたIDを返す
	 */
	protected getIdFromCreateResult(result: any, data: CreateUser): UserId {
		return data.id as UserId;
	}

	// === Public API Methods ===

	createUser(data: CreateUser): UserId {
		return this.create(data);
	}

	findUserById(id: UserId): PersistedUser | null {
		return this.findById(id);
	}

	findAllUsers(): PersistedUser[] {
		return this.findAll();
	}

	updateUser(data: UpdateUser): boolean {
		const { id, ...updateData } = data;
		return this.update({ ...updateData, id });
	}

	deleteUser(id: UserId): boolean {
		return this.delete(id);
	}

	// === Specialized User Methods ===

	findActiveUsers(): PersistedUser[] {
		const sql = "SELECT * FROM users WHERE is_active = 1 ORDER BY id";
		return selectQuery(
			sql,
			[],
			this.entitySchema,
			false,
			"Database",
		) as PersistedUser[];
	}

	activateUser(id: UserId): boolean {
		const sql = `
      UPDATE users 
      SET is_active = 1, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `;
		return this.executeStatusUpdate(sql, [id], "activate");
	}

	deactivateUser(id: UserId): boolean {
		const sql = `
      UPDATE users 
      SET is_active = 0, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `;
		return this.executeStatusUpdate(sql, [id], "deactivate");
	}

	getCurrentJobCount(userId: UserId): number {
		try {
			const { selectQuery } = require("./db-utils");
			const result = selectQuery(
				"SELECT COUNT(*) as count FROM jobs WHERE user_id = ? AND status IN ('waiting', 'running')",
				[userId],
				PersistedUserSchema.pick({ id: true }).extend({
					count: PersistedUserSchema.shape.id,
				}),
				true,
			) as { count: number } | null;

			return result?.count || 0;
		} catch (error) {
			const { handleDbError } = require("./db-utils");
			handleDbError(error, "get current job count", { userId });
			return 0;
		}
	}

	canCreateJob(userId: UserId): boolean {
		try {
			const user = this.findUserById(userId);
			if (!user || !user.is_active) {
				return false;
			}

			const currentJobs = this.getCurrentJobCount(userId);
			return currentJobs < user.max_concurrent_jobs;
		} catch (error) {
			const { handleDbError } = require("./db-utils");
			handleDbError(error, "check can create job", { userId });
			return false;
		}
	}

	// === Hook Method Implementations ===

	protected afterCreate(id: UserId, _data: CreateUser): void {
		const createdUser = this.findUserById(id);
		if (createdUser) {
			emitUserCreated(this.userToEventData(createdUser));
		}
	}

	protected afterUpdate(id: UserId, _data: Omit<UpdateUser, "id">): void {
		const updatedUser = this.findUserById(id);
		if (updatedUser) {
			emitUserUpdated(this.userToEventData(updatedUser));
		}
	}

	protected beforeDelete(id: UserId): PersistedUser | null {
		return this.findUserById(id);
	}

	protected afterDelete(_id: UserId, deletedUser: PersistedUser | null): void {
		if (deletedUser) {
			emitUserDeleted(this.userToEventData(deletedUser));
		}
	}

	protected extractLogData(
		data: CreateUser | Omit<UpdateUser, "id">,
	): Record<string, any> {
		if ("display_name" in data) {
			return { displayName: data.display_name };
		}
		return {};
	}

	// === Private Helper Methods ===

	private findByCondition(sql: string, params: any[]): PersistedUser[] {
		return safeDbOperation(
			() =>
				selectQuery(
					sql,
					params,
					this.entitySchema,
					false,
					"Database",
				) as PersistedUser[],
			`find users by condition`,
			[],
		);
	}

	private executeStatusUpdate(
		sql: string,
		params: any[],
		operation: string,
	): boolean {
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
			userName: user.id,
			maxConcurrentJobs: user.max_concurrent_jobs,
			isActive: user.is_active,
		};
	}
}

// Singleton instance
export const userRepository = new UserRepository();
