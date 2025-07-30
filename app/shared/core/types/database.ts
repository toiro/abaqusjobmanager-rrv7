/**
 * Database Type Definitions - SINGLE SOURCE OF TRUTH
 * Core entity schemas and types for the application
 *
 * 🚨 IMPORTANT FOR CLAUDE: This file is the Single Source of Truth for all entity definitions.
 * DO NOT modify this file without explicit user permission.
 * All Job, Node, User, FileRecord, and JobLog type definitions MUST reference this file.
 * When encountering type errors, modify the consuming code to match these definitions,
 * NOT the other way around.
 */

import { z } from "zod";

// Schemas for runtime validation
export const JobSchema = z.object({
	id: z.number().optional(),
	name: z.string().min(1),
	status: z.enum([
		"waiting",
		"starting",
		"running",
		"completed",
		"failed",
		"missing",
	]),
	node_id: z.number(),
	user_id: z.string(),
	cpu_cores: z.number().min(1),
	file_id: z.number().optional(), // 1:1
	priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
	start_time: z.string().nullable().optional(),
	end_time: z.string().nullable().optional(),
	error_message: z.string().nullable().optional(),
	output_file_path: z.string().nullable().optional(),
	created_at: z.string().optional(),
	updated_at: z.string().optional(),
});

export const NodeSchema = z.object({
	id: z.number().optional(),
	name: z.string().min(1),
	hostname: z.string().min(1),
	ssh_username: z.string().min(1),
	ssh_port: z.number().min(1).max(65535).default(22),
	license_token_limit: z.number().min(1),
	cpu_cores_limit: z.number().min(1),
	abaqus_execution_dir: z.string(),
	status: z
		.enum(["available", "unavailable"])
		.default("unavailable")
		.optional(),
	is_active: z
		.union([z.boolean(), z.number().int()])
		.transform((val) => {
			if (typeof val === "number") {
				return val === 1;
			}
			return Boolean(val);
		})
		.default(true),
	created_at: z.string().optional(),
	updated_at: z.string().optional(),
});

export const UserSchema = z.object({
	id: z.string().min(2),
	max_concurrent_jobs: z.number().min(1).default(1),
	is_active: z
		.union([z.boolean(), z.number().int()])
		.transform((val) => {
			if (typeof val === "number") {
				return val === 1;
			}
			return Boolean(val);
		})
		.default(true),
	created_at: z.string().optional(),
	updated_at: z.string().optional(),
});

export const FileRecordSchema = z.object({
	id: z.number().optional(),
	original_name: z.string().min(1),
	stored_name: z.string().min(1),
	file_path: z.string().min(1),
	mime_type: z.string().nullable().optional(),
	file_size: z.number().min(0),
	checksum: z.string().nullable().optional(),
	uploaded_by: z.string().nullable().optional(),
	created_at: z.string().optional(),
	updated_at: z.string().optional(),
});

export const JobLogSchema = z.object({
	id: z.number().optional(),
	job_id: z.number(),
	log_level: z.enum(["info", "warning", "error", "debug"]),
	message: z.string().min(1),
	details: z.string().nullable().optional(),
	created_at: z.string().optional(),
});

// === Derived Schemas for different use cases ===

// Job schemas
export const CreateJobSchema = JobSchema.omit({
	id: true,
	created_at: true,
	updated_at: true,
});

export const PersistedJobSchema = JobSchema.required({
	id: true,
	created_at: true,
	updated_at: true,
});

export const UpdateJobSchema = JobSchema.omit({
	created_at: true,
	updated_at: true,
}) // タイムスタンプ除外
	.partial() // 全てオプション化
	.required({ id: true }); // idだけ必須に戻す

// Node schemas
export const CreateNodeSchema = NodeSchema.omit({
	id: true,
	created_at: true,
	updated_at: true,
	status: true,
});

export const PersistedNodeSchema = NodeSchema.required({
	id: true,
	status: true,
	created_at: true,
	updated_at: true,
});

export const UpdateNodeSchema = NodeSchema.omit({
	created_at: true,
	updated_at: true,
}) // タイムスタンプ除外
	.partial() // 全てオプション化
	.required({ id: true }); // idだけ必須に戻す

// User schemas
export const CreateUserSchema = UserSchema.omit({
	created_at: true,
	updated_at: true,
});

export const PersistedUserSchema = UserSchema.required({
	id: true,
	created_at: true,
	updated_at: true,
});

export const UpdateUserSchema = UserSchema.omit({
	created_at: true,
	updated_at: true,
}) // タイムスタンプ除外
	.partial() // 全てオプション化
	.required({ id: true }); // idだけ必須に戻す

// FileRecord schemas
export const CreateFileRecordSchema = FileRecordSchema.omit({
	id: true,
	created_at: true,
	updated_at: true,
});

export const PersistedFileRecordSchema = FileRecordSchema.required({
	id: true,
	created_at: true,
	updated_at: true,
});

export const UpdateFileRecordSchema = FileRecordSchema.omit({
	created_at: true,
	updated_at: true,
}) // タイムスタンプ除外
	.partial() // 全てオプション化
	.required({ id: true }); // idだけ必須に戻す

// JobLog schemas
export const CreateJobLogSchema = JobLogSchema.omit({
	id: true,
	created_at: true,
});

export const PersistedJobLogSchema = JobLogSchema.required({
	id: true,
	created_at: true,
});

// === Type Inference ===

// Base types (flexible API/UI contract types - handle optional fields like id, timestamps)
export type Job = z.infer<typeof JobSchema>;
export type Node = z.infer<typeof NodeSchema>;
export type User = z.infer<typeof UserSchema>;
export type FileRecord = z.infer<typeof FileRecordSchema>;
export type JobLog = z.infer<typeof JobLogSchema>;

// Create types (for database input)
export type CreateJob = z.infer<typeof CreateJobSchema>;
export type CreateNode = z.infer<typeof CreateNodeSchema>;
export type CreateUser = z.infer<typeof CreateUserSchema>;
export type CreateFileRecord = z.infer<typeof CreateFileRecordSchema>;
export type CreateJobLog = z.infer<typeof CreateJobLogSchema>;

// Persisted types (for database output - ID guaranteed)
export type PersistedJob = z.infer<typeof PersistedJobSchema>;
export type PersistedNode = z.infer<typeof PersistedNodeSchema>;
export type PersistedUser = z.infer<typeof PersistedUserSchema>;
export type PersistedFileRecord = z.infer<typeof PersistedFileRecordSchema>;
export type PersistedJobLog = z.infer<typeof PersistedJobLogSchema>;

// Update types (for partial updates)
export type UpdateJob = z.infer<typeof UpdateJobSchema>;
export type UpdateNode = z.infer<typeof UpdateNodeSchema>;
export type UpdateUser = z.infer<typeof UpdateUserSchema>;
export type UpdateFileRecord = z.infer<typeof UpdateFileRecordSchema>;
