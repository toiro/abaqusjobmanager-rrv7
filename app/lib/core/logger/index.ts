/**
 * Unified Logger Entry Point
 * Single interface for all logging across server and client
 */

import type { LoggerInterface } from './types';

// Lazy singleton instance
let _logger: LoggerInterface;

/**
 * Get the appropriate logger for the current environment
 * - Server-side: Returns LogTape-based AppLogger with full features
 * - Client-side: Returns console-based ClientLogger with simplified features
 */
export function getLogger(): LoggerInterface {
  if (!_logger) {
    if (typeof window === 'undefined') {
      // Server-side: Use LogTape logger
      const { AppLogger } = require('./logger');
      _logger = new AppLogger();
    } else {
      // Client-side: Use console logger
      const { ClientLogger } = require('./client-logger');
      _logger = new ClientLogger();
    }
  }
  return _logger;
}

// Core logger classes (for advanced usage)
export { AppLogger } from './logger';
export { ClientLogger } from './client-logger';

// Configuration utilities
export { initializeLogger } from './config';

// Types
export type {
  LoggerInterface,
  LogContext
} from './types';