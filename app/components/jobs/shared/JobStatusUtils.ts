/**
 * Job Status Utilities
 * Centralized status validation and formatting logic
 * Extracted to eliminate DRY violations across job components
 */

import type { Job } from "~/lib/core/types/database";

export type JobStatus = Job["status"];

// Status validation rules
export const JobStatusRules = {
	/**
	 * Check if a job can be cancelled
	 * Jobs in waiting, starting, or running state can be cancelled
	 */
	canCancel: (status: JobStatus): boolean => {
		return ["waiting", "starting", "running"].includes(status);
	},

	/**
	 * Check if a job can be deleted
	 * Only completed, failed, or missing jobs can be deleted
	 */
	canDelete: (status: JobStatus): boolean => {
		return ["completed", "failed", "missing"].includes(status);
	},

	/**
	 * Check if a job can be edited
	 * Only waiting jobs can be edited
	 */
	canEdit: (status: JobStatus): boolean => {
		return status === "waiting";
	},

	/**
	 * Check if a job is in an active state
	 * Active states include starting and running
	 */
	isActive: (status: JobStatus): boolean => {
		return ["starting", "running"].includes(status);
	},

	/**
	 * Check if a job is in a completed state (final state)
	 * Final states include completed, failed, and missing
	 */
	isCompleted: (status: JobStatus): boolean => {
		return ["completed", "failed", "missing"].includes(status);
	},
};

// Status display configuration
export const JobStatusConfig = {
	/**
	 * Get badge variant for status display
	 */
	getBadgeVariant: (
		status: JobStatus,
	):
		| "secondary"
		| "destructive"
		| "default"
		| "warning"
		| "waiting"
		| "running"
		| "success"
		| "outline" => {
		const variants: Record<
			JobStatus,
			| "secondary"
			| "destructive"
			| "default"
			| "warning"
			| "waiting"
			| "running"
			| "success"
			| "outline"
		> = {
			waiting: "waiting",
			starting: "warning",
			running: "running",
			completed: "success",
			failed: "destructive",
			missing: "outline",
		};
		return variants[status] || "outline";
	},

	/**
	 * Get human-readable status text
	 */
	getStatusText: (status: JobStatus): string => {
		const texts: Record<JobStatus, string> = {
			waiting: "Waiting",
			starting: "Starting",
			running: "Running",
			completed: "Completed",
			failed: "Failed",
			missing: "Missing",
		};
		return texts[status] || "Unknown";
	},

	/**
	 * Get status description for user information
	 */
	getStatusDescription: (status: JobStatus): string => {
		const descriptions: Record<JobStatus, string> = {
			waiting: "Job is queued and waiting to start",
			starting: "Job is being initialized",
			running: "Job is currently executing",
			completed: "Job finished successfully",
			failed: "Job encountered an error",
			missing: "Job files are missing or corrupted",
		};
		return descriptions[status] || "Unknown status";
	},
};

// Status groups for easy filtering and categorization
export const JobStatusGroups = {
	PENDING: ["waiting"] as const,
	ACTIVE: ["starting", "running"] as const,
	FINISHED: ["completed", "failed", "missing"] as const,
	CANCELABLE: ["waiting", "starting", "running"] as const,
	DELETABLE: ["completed", "failed", "missing"] as const,
	EDITABLE: ["waiting"] as const,
} as const;
