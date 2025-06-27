/**
 * LogTape-based logging for Abaqus Job Manager
 * Enhanced Logger wrapper with structured logging and backward compatibility
 */

import { getLogger, type Logger as LogTapeLogger } from "@logtape/logtape";

// Re-export LogTape initialization for convenience
export { initializeLogger } from './config';

export class AppLogger {
  private rootLogger: LogTapeLogger;
  private databaseLogger: LogTapeLogger;
  private sseLogger: LogTapeLogger;
  private jobExecutionLogger: LogTapeLogger;
  private routeLogger: LogTapeLogger;

  constructor() {
    this.rootLogger = getLogger("abaqus-job-manager");
    this.databaseLogger = getLogger("abaqus-job-manager.database");
    this.sseLogger = getLogger("abaqus-job-manager.sse");
    this.jobExecutionLogger = getLogger("abaqus-job-manager.job-execution");
    this.routeLogger = getLogger("abaqus-job-manager.routes");
  }

  // 基本ログメソッド (既存APIとの互換性維持)
  error(message: string, context?: string, data?: any): void {
    this.rootLogger.error(this.formatMessage(message, context), data);
  }

  warn(message: string, context?: string, data?: any): void {
    this.rootLogger.warn(this.formatMessage(message, context), data);
  }

  info(message: string, context?: string, data?: any): void {
    this.rootLogger.info(this.formatMessage(message, context), data);
  }

  debug(message: string, context?: string, data?: any): void {
    this.rootLogger.debug(this.formatMessage(message, context), data);
  }

  // 専門分野別ログメソッド
  database(message: string, data?: any): void {
    this.databaseLogger.debug(message, data);
  }

  sse(message: string, channel?: string, data?: any): void {
    this.sseLogger.info(message, { channel, ...data });
  }

  jobExecution(message: string, jobId?: number, data?: any): void {
    this.jobExecutionLogger.info(message, { jobId, ...data });
  }

  route(message: string, route: string, data?: any): void {
    this.routeLogger.debug(message, { route, ...data });
  }

  userAction(message: string, data?: any): void {
    this.rootLogger.info(message, { type: 'USER_ACTION', ...data });
  }

  // 構造化ログメソッド
  structuredLog(level: 'error' | 'warn' | 'info' | 'debug', message: string, fields: Record<string, any>): void {
    this.rootLogger[level](message, fields);
  }

  // エラーオブジェクト専用ログ
  logError(message: string, error: Error, context?: string): void {
    this.rootLogger.error(this.formatMessage(message, context), {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      }
    });
  }

  // パフォーマンス測定ログ
  performance(message: string, duration: number, context?: string, data?: any): void {
    this.rootLogger.info(this.formatMessage(message, context), {
      type: 'PERFORMANCE',
      duration,
      ...data
    });
  }

  // セキュリティ関連ログ
  security(message: string, level: 'info' | 'warn' | 'error' = 'warn', data?: any): void {
    this.rootLogger[level](message, {
      type: 'SECURITY',
      ...data
    });
  }

  private formatMessage(message: string, context?: string): string {
    return context ? `[${context}] ${message}` : message;
  }
}

// シングルトンインスタンス
export const logger = new AppLogger();

// 後方互換性のための便利関数
export const logError = (message: string, error?: any) => 
  logger.error(message, 'ERROR', error);

export const logInfo = (message: string, data?: any) => 
  logger.info(message, 'INFO', data);

export const logDebug = (message: string, data?: any) => 
  logger.debug(message, 'DEBUG', data);