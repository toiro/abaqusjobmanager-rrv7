/**
 * License validation utilities
 * Shared validation functions for license configuration
 */

/**
 * Validate license server name
 * @param serverName - The server name to validate
 * @throws Error if validation fails
 */
export function validateServerName(serverName: string): void {
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

/**
 * Validate license token count
 * @param tokens - The token count to validate
 * @throws Error if validation fails
 */
export function validateTokenCount(tokens: number): void {
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