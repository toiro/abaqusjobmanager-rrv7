/**
 * Simple, direct job log database operations
 */

import { JobLogSchema, type JobLog } from "../types/database";
import { validateData, selectQuery, executeQuery, handleDbError, logDbSuccess } from "./dbUtils";

export type CreateJobLogInput = Omit<JobLog, 'id' | 'created_at'>;

/**
 * Create a new job log entry
 */
export function createJobLog(data: CreateJobLogInput): number {
  try {
    const validated = validateData(
      JobLogSchema.omit({ id: true, created_at: true }), 
      data
    );
    
    const sql = `
      INSERT INTO job_logs (job_id, log_level, message, details)
      VALUES (?, ?, ?, ?)
    `;
    
    const params = [
      validated.job_id,
      validated.log_level,
      validated.message,
      validated.details || null
    ];
    
    const result = executeQuery(sql, params);
    if (!result.success) {
      throw new Error(result.error || 'Failed to create job log');
    }
    
    const logId = result.result.lastInsertRowid as number;
    logDbSuccess('Job log created', { 
      logId, 
      jobId: validated.job_id,
      level: validated.log_level 
    });
    return logId;
  } catch (error) {
    handleDbError(error, 'create job log', { data });
  }
}

/**
 * Find job log by ID
 */
export function findJobLogById(id: number): JobLog | null {
  try {
    return selectQuery(
      "SELECT * FROM job_logs WHERE id = ?",
      [id],
      JobLogSchema,
      true,
      'Database'
    ) as JobLog | null;
  } catch (error) {
    handleDbError(error, 'find job log by id', { id });
  }
}

/**
 * Find all logs for a job
 */
export function findJobLogsByJobId(jobId: number): JobLog[] {
  try {
    return selectQuery(
      "SELECT * FROM job_logs WHERE job_id = ? ORDER BY created_at ASC",
      [jobId],
      JobLogSchema,
      false,
      'Database'
    ) as JobLog[];
  } catch (error) {
    handleDbError(error, 'find job logs by job id', { jobId });
  }
}

/**
 * Find logs by level for a job
 */
export function findJobLogsByLevel(jobId: number, level: JobLog['log_level']): JobLog[] {
  try {
    return selectQuery(
      "SELECT * FROM job_logs WHERE job_id = ? AND log_level = ? ORDER BY created_at ASC",
      [jobId, level],
      JobLogSchema,
      false,
      'Database'
    ) as JobLog[];
  } catch (error) {
    handleDbError(error, 'find job logs by level', { jobId, level });
  }
}

/**
 * Find recent logs for a job (last N entries)
 */
export function findRecentJobLogs(jobId: number, limit: number = 100): JobLog[] {
  try {
    return selectQuery(
      "SELECT * FROM job_logs WHERE job_id = ? ORDER BY created_at DESC LIMIT ?",
      [jobId, limit],
      JobLogSchema,
      false,
      'Database'
    ) as JobLog[];
  } catch (error) {
    handleDbError(error, 'find recent job logs', { jobId, limit });
  }
}

/**
 * Delete logs for a job
 */
export function deleteJobLogs(jobId: number): boolean {
  try {
    const result = executeQuery("DELETE FROM job_logs WHERE job_id = ?", [jobId]);
    
    if (result.success) {
      logDbSuccess('Job logs deleted', { jobId, deletedCount: result.result.changes });
      return true;
    }
    
    return false;
  } catch (error) {
    handleDbError(error, 'delete job logs', { jobId });
  }
}

/**
 * Delete old logs (older than specified days)
 */
export function deleteOldJobLogs(daysOld: number = 30): number {
  try {
    const sql = `
      DELETE FROM job_logs 
      WHERE created_at < datetime('now', '-${daysOld} days')
    `;
    
    const result = executeQuery(sql, []);
    
    if (result.success) {
      const deletedCount = result.result.changes;
      logDbSuccess('Old job logs deleted', { daysOld, deletedCount });
      return deletedCount;
    }
    
    return 0;
  } catch (error) {
    handleDbError(error, 'delete old job logs', { daysOld });
  }
}

/**
 * Count logs for a job
 */
export function countJobLogs(jobId: number): number {
  try {
    const result = selectQuery(
      "SELECT COUNT(*) as count FROM job_logs WHERE job_id = ?",
      [jobId],
      JobLogSchema.pick({ id: true }).extend({ count: JobLogSchema.shape.id }),
      true,
      'Database'
    ) as { count: number } | null;
    
    return result?.count || 0;
  } catch (error) {
    handleDbError(error, 'count job logs', { jobId });
  }
}