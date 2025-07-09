/**
 * Shared Logger Interface
 * Common interface for both server-side and client-side loggers
 */

export type LogContext = string;

export interface LoggerInterface {
  /** Log debug message */
  debug(message: string, context?: LogContext, data?: any): void;
  
  /** Log info message */
  info(message: string, context?: LogContext, data?: any): void;
  
  /** Log warning message */
  warn(message: string, context?: LogContext, data?: any): void;
  
  /** Log error message */
  error(message: string, context?: LogContext, data?: any): void;
  
  /** Log with error object - automatically extracts error details */
  errorWithException(message: string, error: Error, context?: LogContext, data?: any): void;
  
  /** Log performance metrics */
  performance(message: string, durationMs: number, context?: LogContext, data?: any): void;
  
  /** Log security events */
  security(message: string, level?: 'info' | 'warn' | 'error', context?: LogContext, data?: any): void;
}