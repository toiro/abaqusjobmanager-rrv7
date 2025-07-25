/**
 * Scheduler Configuration System
 * 
 * 環境変数とデフォルト値を統一管理
 * Martin Fowler Configuration パターンの実装
 */

import { getLogger } from "../../core/logger/logger.server";

export interface SchedulerEnvironmentConfig {
  /** NODE_ENV */
  nodeEnv: string;
  /** 開発環境でのscheduler有効化フラグ */
  enableInDevelopment: boolean;
  /** Job execution scheduler設定 */
  jobExecution: {
    enabled: boolean;
    intervalMs: number;
    maxConcurrentJobs: number;
  };
  /** Health check scheduler設定 */
  healthCheck: {
    enabled: boolean;
    intervalMs: number;
    connectionTimeoutMs: number;
    maxConcurrentChecks: number;
  };
  /** SSE cleanup scheduler設定 */
  sseCleanup: {
    enabled: boolean;
    intervalMs: number;
  };
}

/**
 * 環境変数から設定を読み込み
 */
export function loadSchedulerConfigFromEnvironment(): SchedulerEnvironmentConfig {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const isProduction = nodeEnv === 'production';
  
  // Development環境でのscheduler有効化
  const enableInDevelopment = process.env.ENABLE_SCHEDULERS_IN_DEV === 'true';
  const shouldEnable = isProduction || enableInDevelopment;

  const config: SchedulerEnvironmentConfig = {
    nodeEnv,
    enableInDevelopment,
    
    jobExecution: {
      enabled: shouldEnable && (process.env.ENABLE_JOB_EXECUTION !== 'false'),
      intervalMs: parseInt(process.env.JOB_EXECUTION_INTERVAL_MS || '30000'),
      maxConcurrentJobs: parseInt(process.env.MAX_CONCURRENT_JOBS || '3')
    },
    
    healthCheck: {
      enabled: shouldEnable && (process.env.ENABLE_HEALTH_CHECK !== 'false'),
      intervalMs: parseInt(process.env.HEALTH_CHECK_INTERVAL_MS || '300000'), // 5 minutes
      connectionTimeoutMs: parseInt(process.env.HEALTH_CHECK_TIMEOUT_MS || '30000'),
      maxConcurrentChecks: parseInt(process.env.MAX_CONCURRENT_HEALTH_CHECKS || '5')
    },
    
    sseCleanup: {
      enabled: shouldEnable && (process.env.ENABLE_SSE_CLEANUP !== 'false'),
      intervalMs: parseInt(process.env.SSE_CLEANUP_INTERVAL_MS || '300000') // 5 minutes
    }
  };

  // Log configuration in development
  if (nodeEnv === 'development') {
    getLogger().info('Scheduler configuration loaded from environment', 'SchedulerConfig', {
      config,
      enableHint: enableInDevelopment 
        ? 'Schedulers enabled via ENABLE_SCHEDULERS_IN_DEV=true'
        : 'Set ENABLE_SCHEDULERS_IN_DEV=true to enable schedulers in development'
    });
  }

  return config;
}

/**
 * デフォルト設定
 */
export function getDefaultSchedulerEnvironmentConfig(): SchedulerEnvironmentConfig {
  return {
    nodeEnv: 'development',
    enableInDevelopment: false,
    
    jobExecution: {
      enabled: false,
      intervalMs: 30000, // 30 seconds
      maxConcurrentJobs: 3
    },
    
    healthCheck: {
      enabled: false,
      intervalMs: 300000, // 5 minutes
      connectionTimeoutMs: 30000, // 30 seconds
      maxConcurrentChecks: 5
    },
    
    sseCleanup: {
      enabled: false,
      intervalMs: 300000 // 5 minutes
    }
  };
}

/**
 * 設定の検証
 */
export function validateSchedulerConfig(config: SchedulerEnvironmentConfig): { 
  valid: boolean; 
  errors: string[]; 
} {
  const errors: string[] = [];

  // Interval validation
  if (config.jobExecution.intervalMs < 1000) {
    errors.push('Job execution interval must be at least 1000ms');
  }
  
  if (config.healthCheck.intervalMs < 30000) {
    errors.push('Health check interval must be at least 30000ms (30s)');
  }
  
  if (config.sseCleanup.intervalMs < 60000) {
    errors.push('SSE cleanup interval must be at least 60000ms (1min)');
  }

  // Concurrency validation
  if (config.jobExecution.maxConcurrentJobs < 1 || config.jobExecution.maxConcurrentJobs > 10) {
    errors.push('Max concurrent jobs must be between 1 and 10');
  }
  
  if (config.healthCheck.maxConcurrentChecks < 1 || config.healthCheck.maxConcurrentChecks > 20) {
    errors.push('Max concurrent health checks must be between 1 and 20');
  }

  // Timeout validation
  if (config.healthCheck.connectionTimeoutMs < 5000 || config.healthCheck.connectionTimeoutMs > 120000) {
    errors.push('Health check timeout must be between 5000ms and 120000ms');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * 環境変数のドキュメント生成
 */
export function generateEnvironmentVariableDocumentation(): string {
  return `
# Scheduler Environment Variables

## General
- NODE_ENV: Environment (development|production)
- ENABLE_SCHEDULERS_IN_DEV: Enable schedulers in development (true|false)

## Job Execution
- ENABLE_JOB_EXECUTION: Enable job execution scheduler (true|false)
- JOB_EXECUTION_INTERVAL_MS: Check interval in milliseconds (default: 30000)
- MAX_CONCURRENT_JOBS: Maximum concurrent jobs (default: 3)

## Health Check
- ENABLE_HEALTH_CHECK: Enable health check scheduler (true|false)
- HEALTH_CHECK_INTERVAL_MS: Check interval in milliseconds (default: 300000)
- HEALTH_CHECK_TIMEOUT_MS: Connection timeout in milliseconds (default: 30000)
- MAX_CONCURRENT_HEALTH_CHECKS: Maximum concurrent checks (default: 5)

## SSE Cleanup
- ENABLE_SSE_CLEANUP: Enable SSE cleanup scheduler (true|false)
- SSE_CLEANUP_INTERVAL_MS: Cleanup interval in milliseconds (default: 300000)

## Example Development Configuration
\`\`\`bash
export ENABLE_SCHEDULERS_IN_DEV=true
export JOB_EXECUTION_INTERVAL_MS=10000
export HEALTH_CHECK_INTERVAL_MS=60000
\`\`\`
`.trim();
}