/**
 * Server-side LogTape-based Logger
 * Full-featured logger for server-side use
 */

import { getLogger as getLogTapeLogger, type Logger as LogTapeLogger } from "@logtape/logtape";
import type { LoggerInterface, LogContext } from './types';

// Re-export LogTape initialization
export { initializeLogger } from './config';
export type { LogContext } from './types';

// Dynamic config import interface
interface LoggerConfig {
  categoryName: string;
  logLevel: string;
  isServer: boolean;
}

/**
 * Server-side logger with LogTape integration and full features
 */
export class AppLogger implements LoggerInterface {
  private logger!: LogTapeLogger; // Definite assignment assertion
  private config: LoggerConfig | null = null;

  constructor() {
    // Dynamically import config to avoid client-side process.env access
    this.initializeWithConfig();
  }

  private initializeWithConfig(): void {
    try {
      // Use dynamic import to avoid module-level evaluation on client side
      const configModule = require('./config');
      this.config = configModule.config;
      this.logger = getLogTapeLogger(this.config?.categoryName || 'abaqus-job-manager');
    } catch (error) {
      // Fallback if config import fails
      console.warn('Failed to load logger config, using defaults:', error);
      this.config = null;
      this.logger = getLogTapeLogger('abaqus-job-manager');
    }
  }

  error(message: string, context?: LogContext, data?: any): void {
    const logData = this.addContext(context, data);
    if (logData) {
      this.logger.error(message, logData);
    } else {
      this.logger.error(message);
    }
  }

  warn(message: string, context?: LogContext, data?: any): void {
    const logData = this.addContext(context, data);
    if (logData) {
      this.logger.warn(message, logData);
    } else {
      this.logger.warn(message);
    }
  }

  info(message: string, context?: LogContext, data?: any): void {
    const logData = this.addContext(context, data);
    if (logData) {
      this.logger.info(message, logData);
    } else {
      this.logger.info(message);
    }
  }

  debug(message: string, context?: LogContext, data?: any): void {
    const logData = this.addContext(context, data);
    if (logData) {
      this.logger.debug(message, logData);
    } else {
      this.logger.debug(message);
    }
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
    
    // Flatten the data structure for LogTape
    const result: any = {};
    
    if (context) {
      result.context = context;
    }
    
    if (data && typeof data === 'object') {
      Object.assign(result, data);
    }
    
    return Object.keys(result).length > 0 ? result : undefined;
  }
}

// Export class for use by unified logger
// No singleton here - let index.ts handle instantiation

// Export class for use by logger.server.ts
// Singleton management is handled in logger.server.ts