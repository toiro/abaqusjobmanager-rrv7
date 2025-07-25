/**
 * Modern Health Check Scheduler
 * Built on the new scheduler foundation with adaptive intervals
 */

import { createAdaptiveScheduler, type AdaptiveTaskResult } from './adaptive-scheduler';
import { nodeRepository } from "~/lib/core/database/server-operations";
import { testNodeConnection, updateNodeStatusAfterHealthCheck } from '../node-health/node-health-check';
import type { NodeConfig } from '../node-health/node-health-check';
import { getLogger } from '../../core/logger/logger.server';

export interface HealthCheckConfig {
  /** Normal check interval in minutes (default: 5) */
  normalIntervalMinutes?: number;
  /** Minimum check interval in seconds (default: 30) */
  minIntervalSeconds?: number;
  /** Maximum check interval in minutes (default: 30) */
  maxIntervalMinutes?: number;
  /** Enable Abaqus environment testing (default: true) */
  enableAbaqusTest?: boolean;
  /** Connection timeout in seconds (default: 30) */
  connectionTimeoutSeconds?: number;
  /** Max concurrent node checks (default: 5) */
  maxConcurrentChecks?: number;
}

/**
 * Create a modern health check scheduler using the new foundation
 */
export function createHealthCheckScheduler(intervalMs: number = 30000) {
  const config: HealthCheckConfig = {
    normalIntervalMinutes: Math.round(intervalMs / (60 * 1000)) // Convert ms to minutes
  };
  const finalConfig = {
    normalIntervalMinutes: config.normalIntervalMinutes ?? 5,
    minIntervalSeconds: config.minIntervalSeconds ?? 30,
    maxIntervalMinutes: config.maxIntervalMinutes ?? 30,
    enableAbaqusTest: config.enableAbaqusTest ?? true,
    connectionTimeoutSeconds: config.connectionTimeoutSeconds ?? 30,
    maxConcurrentChecks: config.maxConcurrentChecks ?? 5,
    ...config
  };

  // Track node states for adaptive scheduling
  const nodeStates = new Map<number, {
    consecutiveFailures: number;
    lastCheckTime?: Date;
    lastStatus?: string;
  }>();

  /**
   * Health check task function
   */
  const healthCheckTask = async (): Promise<AdaptiveTaskResult> => {
    try {
      // Get all active nodes
      const activeNodes = nodeRepository.findAllNodes().filter(node => node.is_active);
      
      if (activeNodes.length === 0) {
        getLogger().debug('No active nodes found for health check', 'HealthCheckScheduler');
        return {
          success: true,
          metadata: { nodeCount: 0, message: 'No active nodes' }
        };
      }

      getLogger().debug(`Starting health checks for ${activeNodes.length} nodes`, 'HealthCheckScheduler');

      // Process nodes in batches to avoid overwhelming the system
      const batches = [];
      for (let i = 0; i < activeNodes.length; i += finalConfig.maxConcurrentChecks) {
        batches.push(activeNodes.slice(i, i + finalConfig.maxConcurrentChecks));
      }

      let totalChecked = 0;
      let totalSuccessful = 0;
      let totalFailed = 0;
      let overallSuccess = true;
      let worstFailureCount = 0;

      // Process each batch
      for (const batch of batches) {
        const batchPromises = batch.map(node => checkSingleNode(node));
        const batchResults = await Promise.allSettled(batchPromises);

        // Process batch results
        batchResults.forEach((result, index) => {
          const node = batch[index];
          totalChecked++;

          if (result.status === 'fulfilled' && result.value.success) {
            totalSuccessful++;
            
            // Reset failure count on success
            const state = nodeStates.get(node.id!) || { consecutiveFailures: 0 };
            state.consecutiveFailures = 0;
            state.lastCheckTime = new Date();
            state.lastStatus = 'healthy';
            nodeStates.set(node.id!, state);

          } else {
            totalFailed++;
            overallSuccess = false;

            // Track failure count
            const state = nodeStates.get(node.id!) || { consecutiveFailures: 0 };
            state.consecutiveFailures++;
            state.lastCheckTime = new Date();
            state.lastStatus = 'failed';
            nodeStates.set(node.id!, state);

            worstFailureCount = Math.max(worstFailureCount, state.consecutiveFailures);
          }
        });
      }

      // Calculate suggested next interval based on results
      let suggestedInterval: number | undefined;
      
      if (overallSuccess) {
        // All nodes healthy - can use normal interval
        suggestedInterval = finalConfig.normalIntervalMinutes! * 60 * 1000;
      } else if (worstFailureCount >= 3) {
        // Multiple failures - check less frequently
        suggestedInterval = Math.min(
          finalConfig.maxIntervalMinutes! * 60 * 1000,
          finalConfig.normalIntervalMinutes! * 60 * 1000 * 2
        );
      } else {
        // Some failures - check more frequently
        suggestedInterval = Math.max(
          finalConfig.minIntervalSeconds! * 1000,
          finalConfig.normalIntervalMinutes! * 60 * 1000 * 0.5
        );
      }

      getLogger().debug('Health check cycle completed', 'HealthCheckScheduler', {
        totalChecked,
        totalSuccessful,
        totalFailed,
        worstFailureCount,
        suggestedIntervalMs: suggestedInterval
      });

      return {
        success: overallSuccess,
        suggestedNextInterval: suggestedInterval,
        metadata: {
          totalChecked,
          totalSuccessful,
          totalFailed,
          worstFailureCount,
          nodeStates: Array.from(nodeStates.entries())
        }
      };

    } catch (error) {
      getLogger().error('Health check cycle failed', 'HealthCheckScheduler', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        error: error instanceof Error ? error : new Error('Health check failed'),
        // On error, back off more aggressively
        suggestedNextInterval: finalConfig.normalIntervalMinutes! * 60 * 1000 * 3
      };
    }
  };

  /**
   * Check a single node's health
   */
  const checkSingleNode = async (node: any): Promise<{ success: boolean; error?: Error }> => {
    try {
      // Prepare node configuration
      const nodeConfig: NodeConfig = {
        hostname: node.hostname,
        ssh_port: node.ssh_port || 22,
        username: 'abaqus' // Default username
      };

      // Perform connection test
      const result = await testNodeConnection(nodeConfig, {
        testAbaqus: finalConfig.enableAbaqusTest,
        timeout: finalConfig.connectionTimeoutSeconds! * 1000
      });

      // Update node status in database
      const updateResult = updateNodeStatusAfterHealthCheck(node.id!, result);

      const success = result.success && updateResult.success;

      if (success) {
        getLogger().debug('Node health check succeeded', 'HealthCheckScheduler', {
          nodeId: node.id!,
          hostname: node.hostname,
          connectionTime: result.connectionTime
        });
      } else {
        getLogger().warn('Node health check failed', 'HealthCheckScheduler', {
          nodeId: node.id!,
          hostname: node.hostname,
          error: result.error
        });
      }

      return { success };

    } catch (error) {
      getLogger().error('Error checking node health', 'HealthCheckScheduler', {
        nodeId: node.id!,
        hostname: node.hostname,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return { 
        success: false, 
        error: error instanceof Error ? error : new Error('Node check failed') 
      };
    }
  };

  // Create the adaptive scheduler
  const scheduler = createAdaptiveScheduler(
    'node-health-check-scheduler',
    finalConfig.normalIntervalMinutes! * 60 * 1000,
    healthCheckTask,
    {
      minIntervalMs: finalConfig.minIntervalSeconds! * 1000,
      maxIntervalMs: finalConfig.maxIntervalMinutes! * 60 * 1000,
      executeImmediately: true,
      maxExecutionTime: 5 * 60 * 1000, // 5 minutes max
      autoStart: false // Manual start for controlled initialization
    }
  );

  return scheduler;
}

