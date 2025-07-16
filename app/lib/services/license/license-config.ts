/**
 * License configuration types and client-safe utilities
 * Client-side safe version - no database operations
 */

export interface LicenseConfig {
  serverName: string;
  totalTokens: number;
}

/**
 * Default license configuration values
 * Used for client-side calculations when server data is not available
 */
export const DEFAULT_LICENSE_CONFIG: LicenseConfig = {
  serverName: 'localhost',
  totalTokens: 50
};

/**
 * Client-side license calculation utilities
 * These functions work with provided data rather than accessing the database
 */

/**
 * Calculate available license tokens from given config and usage
 */
export function calculateAvailableLicenseTokens(config: LicenseConfig, currentUsage: number): number {
  return Math.max(0, config.totalTokens - currentUsage);
}

/**
 * Check if there are enough license tokens available
 */
export function checkAvailableLicenseTokens(config: LicenseConfig, currentUsage: number, requiredTokens: number): boolean {
  const available = calculateAvailableLicenseTokens(config, currentUsage);
  return available >= requiredTokens;
}

// Re-export validation functions from shared module
export { validateServerName, validateTokenCount } from './license-validation';