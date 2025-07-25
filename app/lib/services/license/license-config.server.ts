/**
 * Server-only license configuration management
 * This file will NOT be included in client bundles
 */

import { jobRepository } from "../../core/database/server-operations";
import { getSystemConfig, setSystemConfig } from "~/lib/core/database/config-operations";
import { validateServerName, validateTokenCount } from './license-validation';
import { calculateLicenseTokens } from './license-calculator';

export interface LicenseConfig {
  serverName: string;
  totalTokens: number;
}


/**
 * Get current license configuration
 */
export function getLicenseConfig(): LicenseConfig {
  const serverName = getSystemConfig('license_server_name') || 'localhost';
  const totalTokens = parseInt(getSystemConfig('total_license_tokens') || '50');
  
  return {
    serverName,
    totalTokens
  };
}

/**
 * Update license server name
 */
export function setLicenseServerName(serverName: string): void {
  validateServerName(serverName);
  setSystemConfig('license_server_name', serverName);
}

/**
 * Update total license tokens
 */
export function setTotalLicenseTokens(tokens: number): void {
  validateTokenCount(tokens);
  setSystemConfig('total_license_tokens', tokens.toString());
}

/**
 * Update both license configuration values
 */
export function updateLicenseConfig(config: LicenseConfig): void {
  validateServerName(config.serverName);
  validateTokenCount(config.totalTokens);
  
  setSystemConfig('license_server_name', config.serverName);
  setSystemConfig('total_license_tokens', config.totalTokens.toString());
}

/**
 * Get current license usage across all running jobs
 * Calculates total license tokens used by jobs with status 'starting' or 'running'
 */
export function getCurrentLicenseUsage(): number {
  try {
    const runningJobs = jobRepository.findJobsByStatuses(['starting', 'running'])
    return runningJobs.reduce((total, job) => {
      return total + calculateLicenseTokens(job.cpu_cores);
    }, 0);
  } catch (error) {
    throw new Error(`Failed to calculate current license usage: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get available license tokens
 */
export function getAvailableLicenseTokens(): number {
  const config = getLicenseConfig();
  const currentUsage = getCurrentLicenseUsage();
  return Math.max(0, config.totalTokens - currentUsage);
}

/**
 * Check if there are enough license tokens available for a job
 */
export function hasAvailableLicenseTokens(requiredTokens: number): boolean {
  const available = getAvailableLicenseTokens();
  return available >= requiredTokens;
}

