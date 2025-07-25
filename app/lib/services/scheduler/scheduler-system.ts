/**
 * Scheduler System - 統一スケジューラー管理システム
 * 
 * 全スケジューラーの初期化・開始・停止を一元管理
 * Martin Fowler Service Locator パターンとFactory Method適用
 */

import { getLogger } from "../../core/logger/logger.server";
import type { BaseScheduler } from "./base-scheduler";
import { 
  loadSchedulerConfigFromEnvironment, 
  validateSchedulerConfig
} from "./scheduler-config";

// Import scheduler factory functions
import { createHealthCheckScheduler } from "./health-check-scheduler";
import { createSSECleanupScheduler } from "../sse/sse-cleanup-scheduler";
import { createJobExecutionScheduler } from "../abaqus/job-execution-scheduler.server";

export interface SchedulerSystemConfig {
  healthCheck: {
    enabled: boolean;
    intervalMs: number;
  };
  sseCleanup: {
    enabled: boolean;
    intervalMs: number;
  };
  jobExecution: {
    enabled: boolean;
    intervalMs: number;
  };
}

/**
 * スケジューラーシステム - Factory Method + Service Locator パターン
 */
export class SchedulerSystem {
  private readonly logger = getLogger();
  private readonly schedulers = new Map<string, BaseScheduler>();
  private isInitialized = false;
  private isStarted = false;
  private shutdownHandlerInstalled = false;

  /**
   * システム初期化 - 全スケジューラーを作成（未開始状態）
   */
  async initialize(config: SchedulerSystemConfig): Promise<void> {
    if (this.isInitialized) {
      this.logger.warn('Scheduler system already initialized', 'SchedulerSystem');
      return;
    }

    this.logger.info('Initializing scheduler system...', 'SchedulerSystem');

    try {
      // Health Check Scheduler
      if (config.healthCheck.enabled) {
        const healthCheckScheduler = createHealthCheckScheduler(config.healthCheck.intervalMs);
        this.schedulers.set('healthCheck', healthCheckScheduler);
      }

      // SSE Cleanup Scheduler  
      if (config.sseCleanup.enabled) {
        const sseCleanupScheduler = createSSECleanupScheduler(config.sseCleanup.intervalMs);
        this.schedulers.set('sseCleanup', sseCleanupScheduler);
      }

      // Job Execution Scheduler
      if (config.jobExecution.enabled) {
        const jobExecutionScheduler = createJobExecutionScheduler(config.jobExecution.intervalMs);
        this.schedulers.set('jobExecution', jobExecutionScheduler);
      }

      this.isInitialized = true;
      this.logger.info(`Scheduler system initialized with ${this.schedulers.size} schedulers`, 'SchedulerSystem');

    } catch (error) {
      this.logger.error('Failed to initialize scheduler system', 'SchedulerSystem', { error });
      throw error;
    }
  }

  /**
   * 全スケジューラー開始
   */
  async start(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Scheduler system must be initialized before starting');
    }

    if (this.isStarted) {
      this.logger.warn('Scheduler system already started', 'SchedulerSystem');
      return;
    }

    this.logger.info('Starting all schedulers...', 'SchedulerSystem');

    try {
      // Install shutdown handler once
      this.installShutdownHandler();

      // Start all schedulers
      for (const [name, scheduler] of this.schedulers.entries()) {
        try {
          scheduler.start();
          this.logger.info(`Started scheduler: ${name}`, 'SchedulerSystem');
        } catch (error) {
          this.logger.error(`Failed to start scheduler: ${name}`, 'SchedulerSystem', { error });
          throw error;
        }
      }

      this.isStarted = true;
      this.logger.info('All schedulers started successfully', 'SchedulerSystem');

    } catch (error) {
      this.logger.error('Failed to start scheduler system', 'SchedulerSystem', { error });
      // Try to stop any started schedulers
      await this.stop();
      throw error;
    }
  }

  /**
   * 全スケジューラー停止
   */
  async stop(): Promise<void> {
    if (!this.isStarted) {
      this.logger.debug('Scheduler system not started, nothing to stop', 'SchedulerSystem');
      return;
    }

    this.logger.info('Stopping all schedulers...', 'SchedulerSystem');

    const stopPromises = Array.from(this.schedulers.entries()).map(async ([name, scheduler]) => {
      try {
        await scheduler.stop();
        this.logger.info(`Stopped scheduler: ${name}`, 'SchedulerSystem');
      } catch (error) {
        this.logger.error(`Failed to stop scheduler: ${name}`, 'SchedulerSystem', { error });
      }
    });

    await Promise.all(stopPromises);
    this.isStarted = false;
    this.logger.info('All schedulers stopped', 'SchedulerSystem');
  }

  /**
   * 特定スケジューラー取得 - Service Locator パターン
   */
  getScheduler<T extends BaseScheduler>(name: string): T | null {
    return (this.schedulers.get(name) as T) || null;
  }

  /**
   * システム状態取得
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      started: this.isStarted,
      schedulerCount: this.schedulers.size,
      schedulers: Array.from(this.schedulers.entries()).map(([name, scheduler]) => ({
        name,
        status: scheduler.isRunning() ? 'running' : 'stopped'
      }))
    };
  }

  /**
   * Graceful shutdown handler installation - 一回のみ
   */
  private installShutdownHandler(): void {
    if (this.shutdownHandlerInstalled) {
      return;
    }

    const gracefulShutdown = async (signal: string) => {
      this.logger.info(`Received ${signal}, shutting down schedulers...`, 'SchedulerSystem');
      
      try {
        await this.stop();
        this.logger.info('Scheduler system shutdown complete', 'SchedulerSystem');
        process.exit(0);
      } catch (error) {
        this.logger.error('Error during scheduler shutdown', 'SchedulerSystem', { error });
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
    this.shutdownHandlerInstalled = true;
    this.logger.debug('Shutdown handlers installed', 'SchedulerSystem');
  }
}

// Singleton instance
let schedulerSystemInstance: SchedulerSystem | null = null;

/**
 * グローバルスケジューラーシステムインスタンス取得
 */
export function getSchedulerSystem(): SchedulerSystem {
  if (!schedulerSystemInstance) {
    schedulerSystemInstance = new SchedulerSystem();
  }
  return schedulerSystemInstance;
}

/**
 * デフォルト設定
 */
export function getDefaultSchedulerConfig(): SchedulerSystemConfig {
  return {
    healthCheck: {
      enabled: true,
      intervalMs: 30000 // 30秒
    },
    sseCleanup: {
      enabled: true,
      intervalMs: 300000 // 5分
    },
    jobExecution: {
      enabled: true,
      intervalMs: 5000 // 5秒
    }
  };
}

/**
 * 便利関数: システム初期化と開始（手動設定）
 */
export async function initializeAndStartSchedulers(config?: Partial<SchedulerSystemConfig>): Promise<SchedulerSystem> {
  const system = getSchedulerSystem();
  const fullConfig = { ...getDefaultSchedulerConfig(), ...config };
  
  await system.initialize(fullConfig);
  await system.start();
  
  return system;
}

/**
 * 環境変数から設定を読み込んでシステム初期化と開始
 */
export async function initializeAndStartSchedulersFromEnvironment(): Promise<SchedulerSystem> {
  const envConfig = loadSchedulerConfigFromEnvironment();
  const validation = validateSchedulerConfig(envConfig);
  
  if (!validation.valid) {
    throw new Error(`Invalid scheduler configuration: ${validation.errors.join(', ')}`);
  }

  // Convert environment config to system config
  const systemConfig: SchedulerSystemConfig = {
    healthCheck: {
      enabled: envConfig.healthCheck.enabled,
      intervalMs: envConfig.healthCheck.intervalMs
    },
    sseCleanup: {
      enabled: envConfig.sseCleanup.enabled,
      intervalMs: envConfig.sseCleanup.intervalMs
    },
    jobExecution: {
      enabled: envConfig.jobExecution.enabled,
      intervalMs: envConfig.jobExecution.intervalMs
    }
  };

  const system = getSchedulerSystem();
  await system.initialize(systemConfig);
  
  // Only start if any scheduler is enabled
  const hasEnabledSchedulers = Object.values(systemConfig).some(config => config.enabled);
  if (hasEnabledSchedulers) {
    await system.start();
  } else {
    getLogger().info('No schedulers enabled, system initialized but not started', 'SchedulerSystem', {
      config: envConfig
    });
  }
  
  return system;
}