/**
 * Simple LogTape-based logging for Abaqus Job Manager
 * Clean, focused design without backward compatibility
 */

import { getLogger, type Logger as LogTapeLogger } from "@logtape/logtape";

// Re-export LogTape initialization
export { initializeLogger } from './config';

/**
 * Log context types for structured logging
 * 
 * Recommended contexts:
 * - 'Database', 'SSE', 'JobExecution', 'Routes', 'Auth', 'FileOps', 'HealthCheck', 'RemotePwsh'
 * - Dynamic patterns: 'useSSE:${channel}', 'SSE:${channel}', etc.
 */
export type LogContext = string;

/**
 * Simplified logger with structured context support
 */
export class AppLogger {
  private logger: LogTapeLogger;

  constructor() {
    this.logger = getLogger("abaqus-job-manager");
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

// Single global logger instance
export const logger = new AppLogger();