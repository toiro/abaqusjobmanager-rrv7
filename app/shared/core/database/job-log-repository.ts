/**
 * JobLog Repository - BaseRepository継承による重複コード削除
 * Martin Fowler Template Method パターンの具体実装
 */

import { BaseRepository } from "./base-repository";
import {
	JobLogSchema,
	CreateJobLogSchema,
	PersistedJobLogSchema,
	type JobLog,
	type CreateJobLog,
	type PersistedJobLog,
} from "../types/database";
import type { JobLogId, JobId } from "../../../domain/value-objects/entity-ids";
import { executeQuery, selectQuery, safeDbOperation } from "./db-utils";

// JobLog doesn't have updates, so we use CreateJobLog as UpdateJobLog
type UpdateJobLogInput = CreateJobLog;

/**
 * JobLogRepository - Template Method Pattern 適用
 * Note: JobLogs are typically write-only (no updates), but we include update capability for completeness
 */
export class JobLogRepository extends BaseRepository<
	PersistedJobLog,
	CreateJobLog,
	UpdateJobLogInput,
	JobLogId
> {
	protected readonly tableName = "job_logs";
	protected readonly entitySchema = PersistedJobLogSchema;
	protected readonly createSchema = CreateJobLogSchema;
	protected readonly updateSchema = JobLogSchema.omit({
		id: true,
		created_at: true,
	}).partial();

	/**
	 * Number IDの場合はlastInsertRowidを返す
	 */
	protected getIdFromCreateResult(result: any, data: CreateJobLog): JobLogId {
		return result.lastInsertRowid as JobLogId;
	}

	// === Public API Methods ===

	createJobLog(data: CreateJobLog): JobLogId {
		return this.create(data);
	}

	findJobLogById(id: JobLogId): PersistedJobLog | null {
		return this.findById(id);
	}

	findAllJobLogs(): PersistedJobLog[] {
		return this.findAll("created_at ASC"); // JobLogs usually ordered chronologically
	}

	updateJobLog(data: CreateJobLog & { id: number }): boolean {
		const { id, ...updateData } = data;
		return this.update({ ...updateData, id } as UpdateJobLogInput & {
			id: number;
		});
	}

	deleteJobLog(id: number): boolean {
		return this.delete(id);
	}

	// === Specialized JobLog Methods ===

	findJobLogsByJobId(jobId: number): PersistedJobLog[] {
		const sql =
			"SELECT * FROM job_logs WHERE job_id = ? ORDER BY created_at ASC";
		return this.findByCondition(sql, [jobId]);
	}

	findJobLogsByLevel(
		jobId: number,
		level: JobLog["log_level"],
	): PersistedJobLog[] {
		const sql =
			"SELECT * FROM job_logs WHERE job_id = ? AND log_level = ? ORDER BY created_at ASC";
		return this.findByCondition(sql, [jobId, level]);
	}

	findRecentJobLogs(jobId: number, limit: number = 100): PersistedJobLog[] {
		const sql =
			"SELECT * FROM job_logs WHERE job_id = ? ORDER BY created_at DESC LIMIT ?";
		return this.findByCondition(sql, [jobId, limit]);
	}

	deleteJobLogs(jobId: number): boolean {
		try {
			const result = executeQuery("DELETE FROM job_logs WHERE job_id = ?", [
				jobId,
			]);

			if (result.success) {
				const { logDbSuccess } = require("./db-utils");
				logDbSuccess("Job logs deleted", {
					jobId,
					deletedCount: result.result.changes,
				});
				return true;
			}

			return false;
		} catch (error) {
			const { handleDbError } = require("./db-utils");
			handleDbError(error, "delete job logs", { jobId });
			return false;
		}
	}

	deleteOldJobLogs(daysOld: number = 30): number {
		try {
			const sql = `
        DELETE FROM job_logs 
        WHERE created_at < datetime('now', '-${daysOld} days')
      `;

			const result = executeQuery(sql, []);

			if (result.success) {
				const deletedCount = result.result.changes;
				const { logDbSuccess } = require("./db-utils");
				logDbSuccess("Old job logs deleted", { daysOld, deletedCount });
				return deletedCount;
			}

			return 0;
		} catch (error) {
			const { handleDbError } = require("./db-utils");
			handleDbError(error, "delete old job logs", { daysOld });
			return 0;
		}
	}

	countJobLogs(jobId: number): number {
		try {
			const { selectQuery } = require("./db-utils");
			const result = selectQuery(
				"SELECT COUNT(*) as count FROM job_logs WHERE job_id = ?",
				[jobId],
				JobLogSchema.pick({ id: true }).extend({
					count: JobLogSchema.shape.id,
				}),
				true,
				"Database",
			) as { count: number } | null;

			return result?.count || 0;
		} catch (error) {
			const { handleDbError } = require("./db-utils");
			handleDbError(error, "count job logs", { jobId });
			return 0;
		}
	}

	// === Hook Method Implementations ===

	protected afterCreate(id: number, data: CreateJobLog): void {
		// JobLogs typically don't emit SSE events for individual log entries
		// to avoid flooding the client. However, you could emit job-specific events here
		// if needed for real-time log monitoring

		// Optional: Emit SSE event for critical log levels
		if (data.log_level === "error") {
			// Could emit a job-specific error event here
			// emitJobLogError({ jobId: data.job_id, logId: id, message: data.message });
		}
	}

	protected afterUpdate(_id: number, _data: UpdateJobLogInput): void {
		// JobLogs are typically immutable after creation, so updates are rare
		// No SSE events needed for updates
	}

	protected beforeDelete(id: number): PersistedJobLog | null {
		return this.findJobLogById(id);
	}

	protected afterDelete(
		_id: number,
		_deletedJobLog?: PersistedJobLog | null,
	): void {
		// No SSE events needed for individual job log deletions
		// Bulk deletions are handled in the specialized methods above
	}

	protected extractLogData(
		data: CreateJobLog | UpdateJobLogInput,
	): Record<string, any> {
		if ("job_id" in data && "log_level" in data) {
			return {
				jobId: data.job_id,
				level: data.log_level,
				message: data.message?.substring(0, 100), // Truncate long messages for logs
			};
		}
		return {};
	}

	// === Private Helper Methods ===

	private findByCondition(sql: string, params: any[]): PersistedJobLog[] {
		return safeDbOperation(
			() =>
				selectQuery(
					sql,
					params,
					this.entitySchema,
					false,
					"Database",
				) as PersistedJobLog[],
			`find job logs by condition`,
			[],
		);
	}
}

// Singleton instance
export const jobLogRepository = new JobLogRepository();
