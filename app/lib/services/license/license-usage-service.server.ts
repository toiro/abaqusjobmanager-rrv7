/**
 * License Usage Service (Server-only)
 * Handles real-time license usage calculation and SSE event emission
 */

import { getLicenseConfig, getCurrentLicenseUsage } from './license-config.server';
import { calculateLicenseTokens } from './license-calculator';
import { type LicenseUsageData, EVENT_TYPES, SSE_CHANNELS } from '../sse/sse-schemas';
import { emitSSE } from '../sse/sse.server';
import { getDatabase } from '../../core/database/connection.server';
import { getLogger } from '../../core/logger/logger.server';

/**
 * Get current license usage data for SSE events
 */
export function getLicenseUsageData(): LicenseUsageData {
  try {
    const config = getLicenseConfig();
    const usedTokens = getCurrentLicenseUsage();
    const availableTokens = config.totalTokens - usedTokens;

    // Get running jobs for detailed breakdown
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT id, name, cpu_cores 
      FROM jobs 
      WHERE status IN ('starting', 'running')
    `);
    const runningJobs = stmt.all() as Array<{ id: number; name: string; cpu_cores: number }>;

    const jobsWithTokens = runningJobs.map(job => ({
      ...job,
      tokens: calculateLicenseTokens(job.cpu_cores)
    }));

    return {
      totalTokens: config.totalTokens,
      usedTokens,
      availableTokens,
      runningJobs: jobsWithTokens
    };
  } catch (error) {
    getLogger().error('Failed to get license usage data', 'LicenseUsageService', { error });
    throw new Error(`Failed to get license usage data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Emit license usage update event via SSE
 */
export function emitLicenseUsageUpdate(): void {
  try {
    const usageData = getLicenseUsageData();
    
    emitSSE(SSE_CHANNELS.SYSTEM, EVENT_TYPES.LICENSE_USAGE_UPDATED, usageData);
    
    getLogger().info('License usage update event emitted', 'LicenseUsageService', {
      totalTokens: usageData.totalTokens,
      usedTokens: usageData.usedTokens,
      availableTokens: usageData.availableTokens,
      runningJobsCount: usageData.runningJobs.length
    });
  } catch (error) {
    getLogger().error('Failed to emit license usage update', 'LicenseUsageService', { error });
  }
}

/**
 * Hook function to be called when job status changes
 * Should be integrated into job status update operations
 */
export function onJobStatusChanged(jobId: number, oldStatus: string, newStatus: string): void {
  // Check if status change affects license usage
  const licensAffectingStatuses = ['starting', 'running', 'completed', 'failed', 'cancelled'];
  
  if (licensAffectingStatuses.includes(oldStatus) || licensAffectingStatuses.includes(newStatus)) {
    getLogger().debug('Job status change affects license usage, emitting update', 'LicenseUsageService', {
      jobId,
      oldStatus,
      newStatus
    });
    
    // Small delay to ensure database is updated
    setTimeout(() => {
      emitLicenseUsageUpdate();
    }, 100);
  }
}

/**
 * Hook function to be called when job is created
 */
export function onJobCreated(jobId: number): void {
  getLogger().debug('Job created, emitting license usage update', 'LicenseUsageService', { jobId });
  
  // Small delay to ensure database is updated
  setTimeout(() => {
    emitLicenseUsageUpdate();
  }, 100);
}

/**
 * Hook function to be called when job is deleted
 */
export function onJobDeleted(jobId: number): void {
  getLogger().debug('Job deleted, emitting license usage update', 'LicenseUsageService', { jobId });
  
  // Small delay to ensure database is updated
  setTimeout(() => {
    emitLicenseUsageUpdate();
  }, 100);
}