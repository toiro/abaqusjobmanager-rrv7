/**
 * Server-side LogTape-based Logger
 * Full-featured logger for server-side use
 */

import { getLogger as getLogTapeLogger, type Logger as LogTapeLogger } from "@logtape/logtape";
import type { LoggerInterface, LogContext } from './types';
import { config } from './config';

// Re-export LogTape initialization
export { initializeLogger } from './config';
export type { LogContext } from './types';

/**
 * Server-side logger with LogTape integration and full features
 */
export class AppLogger implements LoggerInterface {
  private logger: LogTapeLogger;

  constructor() {
    this.logger = getLogTapeLogger(config.categoryName);
  }

  error(message: string, context?: LogContext, data?: any): void {
    this.logger.error(message, this.addContext(context, data));
  }

  warn(message: string, context?: LogContext, data?: any): void {
    this.logger.warn(message, this.addContext(context, data));
  }

  info(message: string, context?: LogContext, data?: any): void {
    this.logger.info(message, this.addContext(context, data));
  }

  debug(message: string, context?: LogContext, data?: any): void {
    this.logger.debug(message, this.addContext(context, data));
  }

  /**
   * Log with error object - automatically extracts error details
   */
  errorWithException(message: string, error: Error, context?: LogContext, data?: any): void {
    this.logger.error(message, this.addContext(context, {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      ...data
    }));
  }

  /**
   * Log performance metrics
   */
  performance(message: string, durationMs: number, context?: LogContext, data?: any): void {
    this.logger.info(message, this.addContext(context, {
      type: 'PERFORMANCE',
      durationMs,
      ...data
    }));
  }

  /**
   * Log security events
   */
  security(message: string, level: 'info' | 'warn' | 'error' = 'warn', context?: LogContext, data?: any): void {
    this.logger[level](message, this.addContext(context, {
      type: 'SECURITY',
      ...data
    }));
  }

  private addContext(context?: LogContext, data?: any): any {
    if (!context && !data) return undefined;
    
    return {
      ...(context && { context }),
      ...data
    };
  }
}

// Export class for use by unified logger
// No singleton here - let index.ts handle instantiation

// Singleton instance for direct use (server-side)
let _loggerInstance: AppLogger | null = null;

export function getLogger(): LoggerInterface {
  if (!_loggerInstance) {
    _loggerInstance = new AppLogger();
  }
  return _loggerInstance;
}