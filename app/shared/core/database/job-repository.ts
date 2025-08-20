/**
 * Job Repository - BaseRepository継承による完全統一
 * Martin Fowler Template Method パターンの具体実装
 */

import { BaseRepository } from "./base-repository";
import { selectQuery, safeDbOperation } from "./db-utils";
import {
	JobSchema,
	PersistedJobSchema,
	UpdateJobSchema,
	type Job,
	type CreateJob,
	type PersistedJob,
	type UpdateJob,
} from "../types/database";
import type { JobId, NodeId, UserId } from "../../../domain/value-objects/entity-ids";
import {
	emitJobCreated,
	emitJobUpdated,
	emitJobDeleted,
	emitJobStatusChanged,
} from "../../../server/services/sse/sse.server";
import type { JobEventData } from "../../../server/services/sse/sse-schemas";
import { executeQuery } from "./db-utils";

/**
 * JobRepository - Template Method Pattern 適用
 */
export class JobRepository extends BaseRepository<
	PersistedJob,
	CreateJob,
	UpdateJob,
	JobId
> {
	protected readonly tableName = "jobs";
	protected readonly entitySchema = PersistedJobSchema;
	protected readonly createSchema = JobSchema.omit({
		id: true,
		created_at: true,
		updated_at: true,
	});
	protected readonly updateSchema = UpdateJobSchema;

	/**
	 * Number IDの場合はlastInsertRowidを返す
	 */
	protected getIdFromCreateResult(result: any, data: CreateJob): JobId {
		return result.lastInsertRowid as JobId;
	}

	// === Public API Methods ===

	createJob(data: CreateJob): JobId {
		return this.create(data);
	}

	findJobById(id: JobId): PersistedJob | null {
		return this.findById(id);
	}

	findAllJobs(): PersistedJob[] {
		return this.findAll();
	}

	updateJob(data: UpdateJob): boolean {
		return this.update(data);
	}

	deleteJob(id: JobId): boolean {
		return this.delete(id);
	}

	// === Specialized Job Methods ===

	findJobsByStatus(status: Job["status"]): PersistedJob[] {
		return this.findJobsByStatuses([status]);
	}

	findJobsByStatuses(statuses: Job["status"][]): PersistedJob[] {
		if (statuses.length === 0) return [];

		const placeholders = statuses.map(() => "?").join(", ");
		const sql = `SELECT * FROM jobs WHERE status IN (${placeholders}) ORDER BY created_at DESC`;
		return this.findByCondition(sql, statuses);
	}

	findJobsByUser(userId: UserId): PersistedJob[] {
		const sql = "SELECT * FROM jobs WHERE user_id = ? ORDER BY created_at DESC";
		return this.findByCondition(sql, [userId]);
	}

	findJobsByNode(nodeId: NodeId): PersistedJob[] {
		const sql = "SELECT * FROM jobs WHERE node_id = ? ORDER BY created_at DESC";
		return this.findByCondition(sql, [nodeId]);
	}

	findActiveJobs(): PersistedJob[] {
		const sql =
			"SELECT * FROM jobs WHERE status IN ('waiting', 'starting', 'running') ORDER BY created_at ASC";
		return this.findByCondition(sql, []);
	}

	findCompletedJobs(): PersistedJob[] {
		const sql =
			"SELECT * FROM jobs WHERE status IN ('completed', 'failed') ORDER BY created_at DESC";
		return this.findByCondition(sql, []);
	}

	updateJobStatus(
		id: JobId,
		status: Job["status"],
		errorMessage?: string,
	): boolean {
		try {
			// Get current job for comparison and SSE event
			const currentJob = this.findJobById(id);
			const previousStatus = currentJob?.status;

			const sql = `
        UPDATE jobs 
        SET status = ?, error_message = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;

			const result = executeQuery(sql, [status, errorMessage || null, id]);

			if (result.success && result.result.changes > 0) {
				const { logDbSuccess } = require("./db-utils");
				logDbSuccess("Job status updated", {
					id,
					previousStatus,
					newStatus: status,
					errorMessage,
				});

				// Emit SSE event for real-time status updates
				const updatedJob = this.findJobById(id);
				if (updatedJob) {
					emitJobStatusChanged(this.jobToEventData(updatedJob));
				}

				return true;
			}

			return false;
		} catch (error) {
			const { handleDbError } = require("./db-utils");
			handleDbError(error, "update job status", { id, status, errorMessage });
			return false;
		}
	}

	updateStartTime(id: JobId, startTime: string): boolean {
		try {
			const sql = `
        UPDATE jobs 
        SET start_time = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;

			const result = executeQuery(sql, [startTime, id]);

			if (result.success && result.result.changes > 0) {
				const { logDbSuccess } = require("./db-utils");
				logDbSuccess("Job start time updated", {
					id,
					startTime,
				});
				return true;
			}

			return false;
		} catch (error) {
			const { handleDbError } = require("./db-utils");
			handleDbError(error, "update job start time", { id, startTime });
			return false;
		}
	}

	updateEndTime(id: JobId, endTime: string): boolean {
		try {
			const sql = `
        UPDATE jobs 
        SET end_time = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;

			const result = executeQuery(sql, [endTime, id]);

			if (result.success && result.result.changes > 0) {
				const { logDbSuccess } = require("./db-utils");
				logDbSuccess("Job end time updated", {
					id,
					endTime,
				});
				return true;
			}

			return false;
		} catch (error) {
			const { handleDbError } = require("./db-utils");
			handleDbError(error, "update job end time", { id, endTime });
			return false;
		}
	}

	// === Hook Method Implementations ===

	protected afterCreate(id: JobId, _data: CreateJob): void {
		const createdJob = this.findJobById(id);
		if (createdJob) {
			emitJobCreated(this.jobToEventData(createdJob));

			// Trigger license usage update
			this.triggerLicenseUpdate(id);
		}
	}

	protected afterUpdate(id: JobId, _data: UpdateJob): void {
		const updatedJob = this.findJobById(id);
		if (updatedJob) {
			emitJobUpdated(this.jobToEventData(updatedJob));
		}
	}

	protected beforeDelete(id: JobId): PersistedJob | null {
		return this.findJobById(id);
	}

	protected afterDelete(_id: JobId, deletedJob?: PersistedJob | null): void {
		if (deletedJob) {
			emitJobDeleted(this.jobToEventData(deletedJob));
		}
	}

	protected extractLogData(data: CreateJob | UpdateJob): Record<string, any> {
		if ("name" in data) {
			return { name: data.name };
		}
		return {};
	}

	// === Private Helper Methods ===

	private findByCondition(sql: string, params: any[]): PersistedJob[] {
		return safeDbOperation(
			() =>
				selectQuery(
					sql,
					params,
					this.entitySchema,
					false,
					"Database",
				) as PersistedJob[],
			`find jobs by condition`,
			[],
		);
	}

	private jobToEventData(job: PersistedJob): JobEventData {
		return {
			jobId: job.id,
			jobName: job.name,
			status: job.status,
			nodeId: job.node_id || undefined,
			userId: job.user_id,
			cpuCores: job.cpu_cores,
			priority: job.priority,
			fileId: job.file_id,
			startTime: job.start_time || undefined,
			endTime: job.end_time || undefined,
			errorMessage: job.error_message || undefined,
		};
	}

	private async triggerLicenseUpdate(jobId: JobId): Promise<void> {
		try {
			const { onJobCreated } = await import(
				"../../../server/services/license/license-usage-service.server"
			);
			onJobCreated(jobId);
		} catch (error) {
			// License update is not critical, just log
			const { getLogger } = await import("../logger/logger.server");
			getLogger().warn("Failed to trigger license update", {
				context: "JobRepository",
				jobId,
			});
		}
	}
}

// Singleton instance
export const jobRepository = new JobRepository();
