/**
 * LogTape configuration for Abaqus Job Manager
 * Supports both server-side and client-side logging with appropriate sinks
 */

import { 
  configure, 
  getLogger, 
  type LogLevel,
  getConsoleSink
} from "@logtape/logtape";

/**
 * Initialize LogTape with environment-appropriate configuration
 */
export async function initializeLogger(): Promise<void> {
  const isServer = typeof window === 'undefined';
  
  try {
    const sinks: Record<string, any> = {};
    
    // Console Sink (Server/Client共通)
    sinks.console = getConsoleSink();
    
    // File Sink (Server専用) - 現在のLogTapeバージョンではファイルsinkは手動で実装が必要
    if (isServer && process.env.LOG_FILE_ENABLED === 'true') {
      const fs = await import('fs');
      const path = await import('path');
      
      const logPath = process.env.LOG_FILE_PATH || "./logs/abaqus-job-manager.log";
      const logDir = path.dirname(logPath);
      
      // ログディレクトリを作成
      await fs.promises.mkdir(logDir, { recursive: true });
      
      sinks.file = (record: any) => {
        try {
          const logEntry = JSON.stringify({
            timestamp: new Date().toISOString(),
            level: record.level,
            category: record.category.join('.'),
            message: record.message,
            extra: record.extra
          }) + '\n';
          
          fs.appendFileSync(logPath, logEntry);
        } catch (error) {
          console.error('File logging error:', error);
        }
      };
    }
    
    await configure({
      sinks,
      loggers: [
        // ルートロガー
        {
          category: "abaqus-job-manager",
          lowestLevel: getLogLevel(),
          sinks: Object.keys(sinks)
        },
        
        // データベース専用ロガー
        {
          category: "abaqus-job-manager.database",
          lowestLevel: "debug",
          sinks: Object.keys(sinks)
        },
        
        // SSE専用ロガー
        {
          category: "abaqus-job-manager.sse",
          lowestLevel: "info", 
          sinks: Object.keys(sinks)
        },
        
        // ジョブ実行専用ロガー
        {
          category: "abaqus-job-manager.job-execution",
          lowestLevel: "info",
          sinks: Object.keys(sinks)
        },
        
        // API Route専用ロガー
        {
          category: "abaqus-job-manager.routes",
          lowestLevel: "info",
          sinks: Object.keys(sinks)
        }
      ]
    });

    const rootLogger = getLogger("abaqus-job-manager");
    rootLogger.info("LogTape initialized successfully", {
      environment: isServer ? "server" : "client",
      fileLogging: isServer && process.env.LOG_FILE_ENABLED === 'true',
      logLevel: getLogLevel(),
      sinks: Object.keys(sinks)
    });

  } catch (error) {
    console.error("Failed to initialize LogTape:", error);
    // フォールバック: コンソールログを使用
    console.warn("Falling back to console logging only");
  }
}

/**
 * Get log level from environment variable with fallback
 */
function getLogLevel(): LogLevel {
  const envLevel = process.env.LOG_LEVEL?.toLowerCase();
  switch (envLevel) {
    case 'error': return 'error';
    case 'warn': return 'warning';
    case 'info': return 'info';
    case 'debug': return 'debug';
    default:
      return process.env.NODE_ENV === 'production' ? 'info' : 'debug';
  }
}

/**
 * Get logger for specific category
 */
export function getCategoryLogger(category: string) {
  return getLogger(`abaqus-job-manager.${category}`);
}