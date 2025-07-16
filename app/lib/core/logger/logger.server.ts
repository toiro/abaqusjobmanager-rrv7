/**
 * Server-only logger implementation
 * This file will NOT be included in client bundles
 */

import type { LoggerInterface } from './types';
import { AppLogger } from './logger';

// Singleton instance for server-side
let _loggerInstance: AppLogger | null = null;

/**
 * Get the server-side logger instance
 */
export function getLogger(): LoggerInterface {
  if (!_loggerInstance) {
    _loggerInstance = new AppLogger();
  }
  return _loggerInstance;
}

// Re-export types and utilities
export type { LoggerInterface, LogContext } from './types';
export { initializeLogger } from './config';