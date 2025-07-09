/**
 * Client-side Console Logger
 * Simplified logging for browser environment
 */

import type { LoggerInterface, LogContext } from './types';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export class ClientLogger implements LoggerInterface {
  private _isDevelopment?: boolean;

  private get isDevelopment(): boolean {
    if (this._isDevelopment === undefined) {
      this._isDevelopment = typeof window !== 'undefined' && 
        (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    }
    return this._isDevelopment;
  }

  private shouldLog(level: LogLevel): boolean {
    if (!this.isDevelopment) {
      // In production, only log warnings and errors
      return level === 'warn' || level === 'error';
    }
    return true;
  }

  private formatMessage(level: LogLevel, message: string, context?: string, data?: any): string {
    const timestamp = new Date().toLocaleTimeString();
    const contextStr = context ? ` [${context}]` : '';
    const dataStr = data ? ` ${JSON.stringify(data)}` : '';
    return `${timestamp} ${level.toUpperCase()}${contextStr} ${message}${dataStr}`;
  }

  debug(message: string, context?: LogContext, data?: any): void {
    if (this.shouldLog('debug')) {
      console.debug(this.formatMessage('debug', message, context, data));
    }
  }

  info(message: string, context?: LogContext, data?: any): void {
    if (this.shouldLog('info')) {
      console.info(this.formatMessage('info', message, context, data));
    }
  }

  warn(message: string, context?: LogContext, data?: any): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message, context, data));
    }
  }

  error(message: string, context?: LogContext, data?: any): void {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage('error', message, context, data));
    }
  }

  /**
   * Log with error object - simplified for client-side
   */
  errorWithException(message: string, error: Error, context?: LogContext, data?: any): void {
    this.error(`${message}: ${error.message}`, context, { 
      ...data, 
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      }
    });
  }

  /**
   * Log performance metrics - simplified for client-side
   */
  performance(message: string, durationMs: number, context?: LogContext, data?: any): void {
    this.info(message, context, { 
      ...data, 
      durationMs, 
      type: 'PERFORMANCE' 
    });
  }

  /**
   * Log security events - simplified for client-side
   */
  security(message: string, level: 'info' | 'warn' | 'error' = 'warn', context?: LogContext, data?: any): void {
    this[level](message, context, { 
      ...data, 
      type: 'SECURITY' 
    });
  }
}

// Export class for use by unified logger
// No singleton here - let index.ts handle instantiation