/**
 * Centralized logging utility for the Abaqus Job Manager
 * Supports different log levels and environment-based configuration
 */

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3
}

interface LogEntry {
  level: LogLevel;
  message: string;
  context?: string;
  data?: any;
  timestamp: string;
}

class Logger {
  private currentLevel: LogLevel;

  constructor() {
    // Set log level based on environment
    const envLevel = process.env.LOG_LEVEL?.toLowerCase();
    switch (envLevel) {
      case 'error':
        this.currentLevel = LogLevel.ERROR;
        break;
      case 'warn':
        this.currentLevel = LogLevel.WARN;
        break;
      case 'info':
        this.currentLevel = LogLevel.INFO;
        break;
      case 'debug':
        this.currentLevel = LogLevel.DEBUG;
        break;
      default:
        this.currentLevel = process.env.NODE_ENV === 'production' 
          ? LogLevel.INFO 
          : LogLevel.DEBUG;
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return level <= this.currentLevel;
  }

  private formatLog(entry: LogEntry): string {
    const levelName = LogLevel[entry.level];
    const context = entry.context ? `[${entry.context}]` : '';
    return `${entry.timestamp} ${levelName} ${context} ${entry.message}`;
  }

  private log(level: LogLevel, message: string, context?: string, data?: any): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      level,
      message,
      context,
      data,
      timestamp: new Date().toISOString()
    };

    const formattedMessage = this.formatLog(entry);

    // Output to appropriate console method
    switch (level) {
      case LogLevel.ERROR:
        console.error(formattedMessage, data ? data : '');
        break;
      case LogLevel.WARN:
        console.warn(formattedMessage, data ? data : '');
        break;
      case LogLevel.INFO:
        console.info(formattedMessage, data ? data : '');
        break;
      case LogLevel.DEBUG:
        console.log(formattedMessage, data ? data : '');
        break;
    }
  }

  error(message: string, context?: string, data?: any): void {
    this.log(LogLevel.ERROR, message, context, data);
  }

  warn(message: string, context?: string, data?: any): void {
    this.log(LogLevel.WARN, message, context, data);
  }

  info(message: string, context?: string, data?: any): void {
    this.log(LogLevel.INFO, message, context, data);
  }

  debug(message: string, context?: string, data?: any): void {
    this.log(LogLevel.DEBUG, message, context, data);
  }

  // Database-specific logging
  database(message: string, data?: any): void {
    this.debug(message, 'DATABASE', data);
  }

  // Action/Loader specific logging
  route(message: string, route: string, data?: any): void {
    this.debug(message, `ROUTE:${route}`, data);
  }

  // File operation logging
  file(message: string, data?: any): void {
    this.debug(message, 'FILE', data);
  }

  // User action logging
  userAction(message: string, data?: any): void {
    this.info(message, 'USER_ACTION', data);
  }
}

// Export singleton instance
export const logger = new Logger();

// Export convenience functions for common use cases
export const logError = (message: string, error?: any) => 
  logger.error(message, 'ERROR', error);

export const logInfo = (message: string, data?: any) => 
  logger.info(message, 'INFO', data);

export const logDebug = (message: string, data?: any) => 
  logger.debug(message, 'DEBUG', data);