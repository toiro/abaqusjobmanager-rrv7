/**
 * Simple LogTape configuration for Abaqus Job Manager
 * Unified single logger approach
 */

import { 
  configure, 
  getLogger, 
  type LogLevel
} from "@logtape/logtape";

/**
 * Initialize LogTape with simplified configuration
 */
export async function initializeLogger(): Promise<void> {
  const isServer = typeof window === 'undefined';
  
  // Only initialize LogTape on server side
  if (!isServer) {
    console.warn('LogTape initialization skipped on client side');
    return;
  }
  
  try {
    const sinks: Record<string, any> = {
      console: (record: any) => {
        const timestamp = new Date(record.timestamp).toLocaleTimeString();
        const level = record.level.toUpperCase().padEnd(4);
        const category = record.category;
        const message = Array.isArray(record.message) 
          ? record.message.join(' ') 
          : record.message;
        
        let output = `${timestamp} ${level} ${category} ${message}`;
        
        // For error level, show additional context if available
        // LogTape passes additional data directly in the record, not in extra
        const additionalData = { ...record };
        delete additionalData.timestamp;
        delete additionalData.level;
        delete additionalData.category; 
        delete additionalData.message;
        
        if (record.level === 'error' && Object.keys(additionalData).length > 0) {
          const contextStr = JSON.stringify(additionalData, null, 2);
          output += `\nContext: ${contextStr}`;
        }
        
        console.log(output);
      }
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

/**
 * Logger configuration constants
 */
export const config = {
  categoryName: 'abaqus-job-manager' as const,
  logLevel: getLogLevel(),
  isServer: typeof window === 'undefined'
};