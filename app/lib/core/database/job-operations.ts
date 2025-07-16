/**
 * Simple, direct job database operations
 * Replaces complex JobOperations class with straightforward functions
 */

import { JobSchema, type Job } from "../types/database";
import { validateData, selectQuery, executeQuery, buildUpdateSQL, handleDbError, logDbSuccess } from "./db-utils";
import { emitJobCreated, emitJobUpdated, emitJobDeleted, emitJobStatusChanged } from "../../services/sse/sse.server";
import type { JobEventData } from "../../services/sse/sse-schemas";
import { getLogger } from "../logger/logger.server";

// Type definitions for job operations
export type CreateJobInput = Omit<Job, 'id' | 'created_at' | 'updated_at'>;
export type UpdateJobInput = Partial<CreateJobInput>;

/**
 * Create a new job
 */
export function createJob(data: CreateJobInput): number {
  try {
    const validated = validateData(
      JobSchema.omit({ id: true, created_at: true, updated_at: true }), 
      data
    );
    
    const sql = `
      INSERT INTO jobs (name, status, node_id, file_id, user_id, cpu_cores, priority)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    
    const params = [
      validated.name,
      validated.status,
      validated.node_id || null,
      validated.file_id,
      validated.user_id,
      validated.cpu_cores,
      validated.priority || 'normal'
    ];
    
    const result = executeQuery(sql, params);
    if (!result.success) {
      throw new Error(result.error || 'Failed to create job');
    }
    
    const jobId = result.result.lastInsertRowid as number;
    logDbSuccess('Job created', { jobId, name: validated.name });
    
    // Emit SSE event for real-time updates
    const createdJob = findJobById(jobId);
    if (createdJob) {
      emitJobCreated({
        jobId: createdJob.id,
        jobName: createdJob.name,
        status: createdJob.status,
        nodeId: createdJob.node_id || undefined,
        userId: createdJob.user_id,
        cpuCores: createdJob.cpu_cores,
        priority: createdJob.priority,
        fileId: createdJob.file_id
      });
    }
    
    return jobId;
  } catch (error) {
    handleDbError(error, 'create job', { data });
  }
}

/**
 * Find job by ID
 */
export function findJobById(id: number): Job | null {
  try {
    return selectQuery(
      "SELECT * FROM jobs WHERE id = ?",
      [id],
      JobSchema,
      true,
      'Database'
    ) as Job | null;
  } catch (error) {
    handleDbError(error, 'find job by id', { id });
  }
}

/**
 * Find all jobs
 */
export function findAllJobs(): Job[] {
  try {
    return selectQuery(
      "SELECT * FROM jobs ORDER BY created_at DESC",
      [],
      JobSchema,
      false,
      'Database'
    ) as Job[];
  } catch (error) {
    handleDbError(error, 'find all jobs', {});
  }
}

/**
 * Find jobs by status
 */
export function findJobsByStatus(status: Job['status']): Job[] {
  try {
    return selectQuery(
      "SELECT * FROM jobs WHERE status = ? ORDER BY created_at DESC",
      [status],
      JobSchema,
      false,
      'Database'
    ) as Job[];
  } catch (error) {
    handleDbError(error, 'find jobs by status', { status });
  }
}

/**
 * Find jobs by user
 */
export function findJobsByUser(userId: number): Job[] {
  try {
    return selectQuery(
      "SELECT * FROM jobs WHERE user_id = ? ORDER BY created_at DESC",
      [userId],
      JobSchema,
      false,
      'Database'
    ) as Job[];
  } catch (error) {
    handleDbError(error, 'find jobs by user', { userId });
  }
}

/**
 * Find jobs by node
 */
export function findJobsByNode(nodeId: number): Job[] {
  try {
    return selectQuery(
      "SELECT * FROM jobs WHERE node_id = ? ORDER BY created_at DESC",
      [nodeId],
      JobSchema,
      false,
      'Database'
    ) as Job[];
  } catch (error) {
    handleDbError(error, 'find jobs by node', { nodeId });
  }
}

/**
 * Update job status
 */
export function updateJobStatus(id: number, status: Job['status'], errorMessage?: string): boolean {
  try {
    const sql = `
      UPDATE jobs 
      SET status = ?, error_message = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    
    const result = executeQuery(sql, [status, errorMessage || null, id]);
    
    if (result.success && result.result.changes > 0) {
      logDbSuccess('Job status updated', { id, status, errorMessage });
      
      // Emit SSE event for real-time updates
      const updatedJob = findJobById(id);
      if (updatedJob) {
        emitJobStatusChanged({
          jobId: updatedJob.id,
          jobName: updatedJob.name,
          status: updatedJob.status,
          nodeId: updatedJob.node_id || undefined,
          userId: updatedJob.user_id,
          cpuCores: updatedJob.cpu_cores,
          priority: updatedJob.priority,
          fileId: updatedJob.file_id
        });
        getLogger().info('Job status SSE event emitted', 'JobOperations', { 
          jobId: id, 
          newStatus: status 
        });
      }
      
      return true;
    }
    
    return false;
  } catch (error) {
    handleDbError(error, 'update job status', { id, status });
  }
}

/**
 * Update job
 */
export function updateJob(id: number, data: UpdateJobInput): boolean {
  try {
    const validated = validateData(
      JobSchema.omit({ id: true, created_at: true, updated_at: true }).partial(),
      data
    );
    
    const { sql, values } = buildUpdateSQL('jobs', validated);
    const result = executeQuery(sql, [...values, id]);
    
    if (result.success && result.result.changes > 0) {
      logDbSuccess('Job updated', { id, fields: Object.keys(validated) });
      
      // Emit SSE event for real-time updates
      const updatedJob = findJobById(id);
      if (updatedJob) {
        emitJobUpdated({
          jobId: updatedJob.id,
          jobName: updatedJob.name,
          status: updatedJob.status,
          nodeId: updatedJob.node_id || undefined,
          userId: updatedJob.user_id,
          cpuCores: updatedJob.cpu_cores,
          priority: updatedJob.priority,
          fileId: updatedJob.file_id
        });
        getLogger().info('Job update SSE event emitted', 'JobOperations', { 
          jobId: id, 
          updatedFields: Object.keys(validated) 
        });
      }
      
      return true;
    }
    
    return false;
  } catch (error) {
    handleDbError(error, 'update job', { id, data });
  }
}

/**
 * Delete job
 */
export function deleteJob(id: number): boolean {
  try {
    // Get job data before deletion for SSE event
    const jobToDelete = findJobById(id);
    
    const result = executeQuery("DELETE FROM jobs WHERE id = ?", [id]);
    
    if (result.success && result.result.changes > 0) {
      logDbSuccess('Job deleted', { id });
      
      // Emit SSE event for real-time updates
      if (jobToDelete) {
        emitJobDeleted({
          jobId: jobToDelete.id,
          jobName: jobToDelete.name,
          status: jobToDelete.status,
          nodeId: jobToDelete.node_id || undefined,
          userId: jobToDelete.user_id,
          cpuCores: jobToDelete.cpu_cores,
          priority: jobToDelete.priority,
          fileId: jobToDelete.file_id
        });
        getLogger().info('Job deletion SSE event emitted', 'JobOperations', { 
          jobId: id, 
          jobName: jobToDelete.name 
        });
      }
      
      return true;
    }
    
    return false;
  } catch (error) {
    handleDbError(error, 'delete job', { id });
  }
}

/**
 * Assign job to node
 */
export function assignJobToNode(jobId: number, nodeId: number): boolean {
  try {
    const sql = `
      UPDATE jobs 
      SET node_id = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `;
    
    const result = executeQuery(sql, [nodeId, jobId]);
    
    if (result.success && result.result.changes > 0) {
      logDbSuccess('Job assigned to node', { jobId, nodeId });
      return true;
    }
    
    return false;
  } catch (error) {
    handleDbError(error, 'assign job to node', { jobId, nodeId });
  }
}

/**
 * Count running jobs for user
 */
export function countUserRunningJobs(userId: number): number {
  try {
    const result = selectQuery(
      "SELECT COUNT(*) as count FROM jobs WHERE user_id = ? AND status IN ('waiting', 'running')",
      [userId],
      JobSchema.pick({ id: true }).extend({ count: JobSchema.shape.id }),
      true,
      'Database'
    ) as { count: number } | null;
    
    return result?.count || 0;
  } catch (error) {
    handleDbError(error, 'count user running jobs', { userId });
  }
}