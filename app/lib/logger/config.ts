/**
 * Simple LogTape configuration for Abaqus Job Manager
 * Unified single logger approach
 */

import { 
  configure, 
  getLogger, 
  type LogLevel,
  getConsoleSink
} from "@logtape/logtape";

/**
 * Initialize LogTape with simplified configuration
 */
export async function initializeLogger(): Promise<void> {
  const isServer = typeof window === 'undefined';
  
  try {
    const sinks: Record<string, any> = {
      console: getConsoleSink()
    };
    
    // Optional file logging for server
    if (isServer && process.env.LOG_FILE_ENABLED === 'true') {
      const fs = await import('fs');
      const path = await import('path');
      
      const logPath = process.env.LOG_FILE_PATH || "./logs/abaqus-job-manager.log";
      const logDir = path.dirname(logPath);
      
      await fs.promises.mkdir(logDir, { recursive: true });
      
      sinks.file = (record: any) => {
        try {
          const logEntry = JSON.stringify({
            timestamp: new Date().toISOString(),
            level: record.level,
            message: record.message,
            ...record.extra
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
        {
          category: "abaqus-job-manager",
          lowestLevel: getLogLevel(),
          sinks: Object.keys(sinks)
        }
      ]
    });

    const rootLogger = getLogger("abaqus-job-manager");
    rootLogger.info("Logger initialized", {
      environment: isServer ? "server" : "client",
      fileLogging: isServer && process.env.LOG_FILE_ENABLED === 'true',
      logLevel: getLogLevel()
    });

  } catch (error) {
    console.error("Failed to initialize LogTape:", error);
    console.warn("Falling back to console logging only");
  }
}

/**
 * Get log level from environment with fallback
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