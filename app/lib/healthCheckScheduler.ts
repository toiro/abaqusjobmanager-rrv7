/**
 * Health Check Scheduler System
 * 定期的なノードヘルスチェックとステータス更新を管理
 */

import { findAllNodes, updateNodeStatus } from "./db/nodeOperations";
import { testNodeConnection, updateNodeStatusAfterHealthCheck } from "./nodeHealthCheck";
import type { NodeConfig } from "./nodeHealthCheck";
import { logger } from "./logger/logger";

// Scheduler configuration interface
export interface SchedulerConfig {
  normalInterval?: number;     // Normal check interval (ms) - default 5 minutes
  failureInterval?: number;    // Check interval after failure (ms) - default 1 minute  
  recoveryInterval?: number;   // Check interval during recovery (ms) - default 30 seconds
  maxRetries?: number;         // Max retries before marking as failed - default 3
  enableAbaqusTest?: boolean;  // Whether to test Abaqus environment - default true
}

// Scheduler statistics interface
export interface SchedulerStats {
  isRunning: boolean;
  totalChecks: number;
  successfulChecks: number; 
  failedChecks: number;
  lastCheckTime?: Date;
  nextCheckTime?: Date;
}

// Node check state tracking
interface NodeCheckState {
  nodeId: number;
  consecutiveFailures: number;
  lastCheckTime?: Date;
  currentInterval: number;
}

/**
 * Health Check Scheduler Class
 * Manages periodic health checks for all active nodes
 */
export class HealthCheckScheduler {
  private static instances: HealthCheckScheduler[] = [];
  
  private config: Required<SchedulerConfig>;
  private isActive: boolean = false;
  private timeoutId?: NodeJS.Timeout;
  private stats: SchedulerStats;
  private nodeStates: Map<number, NodeCheckState> = new Map();
  
  constructor(config: SchedulerConfig = {}) {
    // Set default configuration
    this.config = {
      normalInterval: config.normalInterval ?? 5 * 60 * 1000,      // 5 minutes
      failureInterval: config.failureInterval ?? 60 * 1000,        // 1 minute
      recoveryInterval: config.recoveryInterval ?? 30 * 1000,      // 30 seconds
      maxRetries: config.maxRetries ?? 3,
      enableAbaqusTest: config.enableAbaqusTest ?? true
    };
    
    // Initialize statistics
    this.stats = {
      isRunning: false,
      totalChecks: 0,
      successfulChecks: 0,
      failedChecks: 0
    };
    
    // Register this instance
    HealthCheckScheduler.instances.push(this);
    
    logger.info('Health check scheduler created', 'HealthCheck', {
      config: this.config
    });
  }
  
  /**
   * Start the scheduler
   */
  start(): void {
    if (this.isActive) {
      logger.warn('Scheduler already running', 'HealthCheck');
      return;
    }
    
    this.isActive = true;
    this.stats.isRunning = true;
    
    logger.info('Health check scheduler started', 'HealthCheck');
    
    // Start the check cycle
    this.scheduleNextCheck();
  }
  
  /**
   * Stop the scheduler
   */
  stop(): void {
    if (!this.isActive) {
      return;
    }
    
    this.isActive = false;
    this.stats.isRunning = false;
    
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = undefined;
    }
    
    logger.info('Health check scheduler stopped', 'HealthCheck');
  }
  
  /**
   * Check if scheduler is running
   */
  isRunning(): boolean {
    return this.isActive;
  }
  
  /**
   * Get scheduler statistics
   */
  getStats(): SchedulerStats {
    return { ...this.stats };
  }
  
  /**
   * Stop all scheduler instances
   */
  static stopAll(): void {
    HealthCheckScheduler.instances.forEach(scheduler => scheduler.stop());
    logger.info('All health check schedulers stopped', 'HealthCheck');
  }
  
  /**
   * Schedule the next health check cycle
   */
  private scheduleNextCheck(): void {
    if (!this.isActive) {
      return;
    }
    
    // Calculate next check interval based on current state
    const nextInterval = this.calculateNextInterval();
    
    this.stats.nextCheckTime = new Date(Date.now() + nextInterval);
    
    this.timeoutId = setTimeout(() => {
      this.performHealthChecks();
    }, nextInterval);
  }
  
  /**
   * Calculate the next check interval based on node states
   */
  private calculateNextInterval(): number {
    if (this.nodeStates.size === 0) {
      return this.config.normalInterval;
    }
    
    // Find the minimum interval needed based on node states
    let minInterval = this.config.normalInterval;
    
    for (const state of this.nodeStates.values()) {
      if (state.consecutiveFailures > 0) {
        if (state.consecutiveFailures >= this.config.maxRetries) {
          minInterval = Math.min(minInterval, this.config.failureInterval);
        } else {
          minInterval = Math.min(minInterval, this.config.recoveryInterval);
        }
      }
    }
    
    return minInterval;
  }
  
  /**
   * Perform health checks for all active nodes
   */
  private async performHealthChecks(): Promise<void> {
    if (!this.isActive) {
      return;
    }
    
    try {
      this.stats.lastCheckTime = new Date();
      
      // Get all active nodes
      const activeNodes = findAllNodes().filter(node => node.is_active);
      
      if (activeNodes.length === 0) {
        logger.debug('No active nodes found for health check', 'HealthCheck');
        this.scheduleNextCheck();
        return;
      }
      
      logger.debug(`Starting health checks for ${activeNodes.length} nodes`, 'HealthCheck');
      
      // Process nodes in parallel
      const checkPromises = activeNodes.map(node => this.checkNode(node));
      await Promise.allSettled(checkPromises);
      
      logger.debug('Health check cycle completed', 'HealthCheck', {
        totalChecks: this.stats.totalChecks,
        successfulChecks: this.stats.successfulChecks,
        failedChecks: this.stats.failedChecks
      });
      
    } catch (error) {
      logger.error('Error during health check cycle', 'HealthCheck', { error });
      this.stats.failedChecks++;
    } finally {
      // Schedule next check
      this.scheduleNextCheck();
    }
  }
  
  /**
   * Perform health check for a single node
   */
  private async checkNode(node: any): Promise<void> {
    try {
      this.stats.totalChecks++;
      
      // Get or create node state
      let nodeState = this.nodeStates.get(node.id);
      if (!nodeState) {
        nodeState = {
          nodeId: node.id,
          consecutiveFailures: 0,
          currentInterval: this.config.normalInterval
        };
        this.nodeStates.set(node.id, nodeState);
      }
      
      // Prepare node configuration
      const nodeConfig: NodeConfig = {
        hostname: node.hostname,
        ssh_port: node.ssh_port || 22,
        username: 'abaqus' // Default username
      };
      
      // Perform connection test
      const result = await testNodeConnection(nodeConfig, {
        testAbaqus: this.config.enableAbaqusTest,
        timeout: 30000 // 30 second timeout
      });
      
      // Update node status in database
      const updateResult = updateNodeStatusAfterHealthCheck(node.id, result);
      
      if (result.success && updateResult.success) {
        // Success - reset failure count
        nodeState.consecutiveFailures = 0;
        nodeState.currentInterval = this.config.normalInterval;
        this.stats.successfulChecks++;
        
        logger.debug('Node health check succeeded', 'HealthCheck', {
          nodeId: node.id,
          hostname: node.hostname,
          connectionTime: result.connectionTime
        });
      } else {
        // Failure - increment failure count
        nodeState.consecutiveFailures++;
        
        if (nodeState.consecutiveFailures >= this.config.maxRetries) {
          nodeState.currentInterval = this.config.failureInterval;
        } else {
          nodeState.currentInterval = this.config.recoveryInterval;
        }
        
        this.stats.failedChecks++;
        
        logger.warn('Node health check failed', 'HealthCheck', {
          nodeId: node.id,
          hostname: node.hostname,
          consecutiveFailures: nodeState.consecutiveFailures,
          error: result.error
        });
      }
      
      nodeState.lastCheckTime = new Date();
      
    } catch (error) {
      this.stats.failedChecks++;
      
      logger.error('Error checking node health', 'HealthCheck', {
        nodeId: node.id,
        hostname: node.hostname,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}