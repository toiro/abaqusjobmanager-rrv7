/**
 * License configuration management
 * Provides type-safe access to license-related system configuration
 */

import { getDatabase } from "./db/connection";

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
 */
export function getCurrentLicenseUsage(): number {
  // This would be implemented by querying running jobs
  // For now, return 0 as placeholder
  return 0;
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

// Validation functions
function validateServerName(serverName: string): void {
  if (!serverName || serverName.trim().length === 0) {
    throw new Error('License server name cannot be empty');
  }
  
  if (serverName.length > 255) {
    throw new Error('License server name cannot exceed 255 characters');
  }
  
  // Basic hostname/IP validation
  const validPattern = /^[a-zA-Z0-9.-]+$/;
  if (!validPattern.test(serverName)) {
    throw new Error('License server name can only contain alphanumeric characters, dots, and hyphens');
  }
}

function validateTokenCount(tokens: number): void {
  if (!Number.isInteger(tokens)) {
    throw new Error('License token count must be an integer');
  }
  
  if (tokens < 1) {
    throw new Error('License token count must be at least 1');
  }
  
  if (tokens > 10000) {
    throw new Error('License token count cannot exceed 10,000');
  }
}