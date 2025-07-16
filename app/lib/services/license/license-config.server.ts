/**
 * Server-only license configuration management
 * This file will NOT be included in client bundles
 */

import { getDatabase } from "../../core/database/connection.server";
import { validateServerName, validateTokenCount } from './license-validation';

export interface LicenseConfig {
  serverName: string;
  totalTokens: number;
}

/**
 * Simple system configuration functions
 * Basic implementation for license management
 */
function getSystemConfig(key: string): string | null {
  try {
    const db = getDatabase();
    const stmt = db.prepare("SELECT value FROM system_config WHERE key = ?");
    const result = stmt.get(key) as { value: string } | undefined;
    return result?.value || null;
  } catch {
    return null;
  }
}

function setSystemConfig(key: string, value: string): void {
  try {
    const db = getDatabase();
    const stmt = db.prepare("INSERT OR REPLACE INTO system_config (key, value) VALUES (?, ?)");
    stmt.run(key, value);
  } catch {
    // Ignore errors for now
  }
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
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT cpu_cores FROM jobs 
      WHERE status IN ('starting', 'running')
    `);
    const runningJobs = stmt.all() as { cpu_cores: number }[];
    
    // Import license calculator to compute tokens for each job
    const { calculateLicenseTokens } = require('../license-calculator');
    
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

