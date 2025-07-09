import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import {
  HealthCheckScheduler
} from '../services/scheduler/health-check-scheduler';
import { findAllNodes, createNode, findNodeById, updateNodeStatus } from "../core/database/node-operations";
import { getDatabase } from '../core/database/connection';
import { initializeTestDatabase } from '../core/database/test-setup';

// Mock the entire nodeHealthCheck module
const mockTestNodeConnection = mock((nodeConfig: any, config?: any) => Promise.resolve({
  success: true,
  hostname: nodeConfig?.hostname || 'localhost',
  connectionTime: 50,
  tests: { sshConnection: { success: true } }
}));
const mockPerformInitialHealthCheck = mock(() => Promise.resolve({
  success: true,
  nodeId: 1,
  previousStatus: 'unavailable',
  newStatus: 'available'
}));

// Mock the module
mock.module('../services/node-health/node-health-check', () => ({
  testNodeConnection: mockTestNodeConnection,
  performInitialHealthCheck: mockPerformInitialHealthCheck,
  updateNodeStatusAfterHealthCheck: mock((nodeId: number, result: any) => {
    // Actually update the node status in the database for testing
    const newStatus = result.success ? 'available' : 'unavailable';
    const updateSuccess = updateNodeStatus(nodeId, newStatus);
    return {
      success: updateSuccess,
      nodeId,
      previousStatus: 'unavailable',
      newStatus
    };
  })
}));

beforeEach(() => {
  // Clean up any existing database connections
  process.env.DATABASE_PATH = ":memory:";
  
  // Initialize database tables
  initializeTestDatabase();
  
  // Reset mocks
  mockTestNodeConnection.mockClear();
  mockPerformInitialHealthCheck.mockClear();
});

afterEach(() => {
  // Clean up any running schedulers
  HealthCheckScheduler.stopAll();
});

describe('Health Check Scheduler System', () => {
  describe('HealthCheckScheduler', () => {
    it('should create scheduler with default config', () => {
      const scheduler = new HealthCheckScheduler();
      
      expect(scheduler).toBeDefined();
      expect(scheduler.isRunning()).toBe(false);
      
      const stats = scheduler.getStats();
      expect(stats.isRunning).toBe(false);
      expect(stats.totalExecutions).toBe(0);
      expect(stats.successfulExecutions).toBe(0);
      expect(stats.failedExecutions).toBe(0);
    });

    it('should create scheduler with custom config', () => {
      const config = {
        normalInterval: 60000,      // 1 minute
        failureInterval: 15000,     // 15 seconds
        recoveryInterval: 5000,     // 5 seconds
        maxRetries: 5,
        enableAbaqusTest: true
      };
      
      const scheduler = new HealthCheckScheduler(config);
      expect(scheduler).toBeDefined();
    });

    it('should start and stop scheduler', async () => {
      const scheduler = new HealthCheckScheduler({
        normalInterval: 100,        // Fast for testing
        failureInterval: 50,
        recoveryInterval: 25
      });
      
      expect(scheduler.isRunning()).toBe(false);
      
      scheduler.start();
      expect(scheduler.isRunning()).toBe(true);
      
      // Wait a bit for any initial processing
      await new Promise(resolve => setTimeout(resolve, 10));
      
      scheduler.stop();
      expect(scheduler.isRunning()).toBe(false);
    });

    it('should perform health checks for all nodes', async () => {
      // Create test nodes
      const node1Id = createNode({
        name: 'test-node-1',
        hostname: 'localhost',
        ssh_port: 22,
        max_cpu_cores: 4,
        is_active: true
      });
      
      const node2Id = createNode({
        name: 'test-node-2', 
        hostname: 'invalid-host.invalid',
        ssh_port: 22,
        max_cpu_cores: 8,
        is_active: true
      });
      
      // Mock health check responses
      mockTestNodeConnection.mockImplementation(async (nodeConfig, config) => {
        if (nodeConfig.hostname === 'localhost') {
          return {
            success: true,
            hostname: nodeConfig.hostname,
            connectionTime: 50,
            tests: {
              sshConnection: { success: true }
            }
          };
        } else {
          return {
            success: false,
            hostname: nodeConfig.hostname,
            connectionTime: 100,
            error: 'Connection failed',
            tests: {
              sshConnection: { success: false, error: 'Connection refused' }
            }
          };
        }
      });
      
      const scheduler = new HealthCheckScheduler({
        normalInterval: 50,
        failureInterval: 25
      });
      
      scheduler.start();
      
      // Wait for multiple check cycles and ensure processing completes
      await new Promise(resolve => setTimeout(resolve, 200));
      
      scheduler.stop();
      
      // Give some time for final processing
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const stats = scheduler.getStats();
      expect(stats.totalExecutions).toBeGreaterThan(0);
      
      // Verify that nodes were checked
      const node1 = findNodeById(node1Id);
      const node2 = findNodeById(node2Id);
      
      expect(node1?.status).toBe('available');
      expect(node2?.status).toBe('unavailable');
    });

    it('should handle scheduler errors gracefully', async () => {
      // Mock an error in health check
      mockTestNodeConnection.mockImplementation(async () => {
        throw new Error('Scheduler test error');
      });
      
      const nodeId = createNode({
        name: 'error-test-node',
        hostname: 'localhost',
        ssh_port: 22,
        max_cpu_cores: 4,
        is_active: true
      });
      
      const scheduler = new HealthCheckScheduler({
        normalInterval: 50,
        failureInterval: 25
      });
      
      scheduler.start();
      
      // Wait for error handling with sufficient time
      await new Promise(resolve => setTimeout(resolve, 200));
      
      scheduler.stop();
      
      // Give some time for final processing
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const stats = scheduler.getStats();
      expect(stats.totalExecutions).toBeGreaterThan(0);
      
      // Node should remain unavailable on error
      const node = findNodeById(nodeId);
      expect(node?.status).toBe('unavailable');
    });

    it('should track statistics correctly', async () => {
      const node1Id = createNode({
        name: 'stats-test-success',
        hostname: 'localhost',
        ssh_port: 22,
        max_cpu_cores: 4,
        is_active: true
      });
      
      const node2Id = createNode({
        name: 'stats-test-failure',
        hostname: 'invalid.invalid',
        ssh_port: 22,
        max_cpu_cores: 4,
        is_active: true
      });
      
      // Mock responses for statistics tracking
      mockTestNodeConnection.mockImplementation(async (nodeConfig, config) => {
        if (nodeConfig.hostname === 'localhost') {
          return {
            success: true,
            hostname: nodeConfig.hostname,
            connectionTime: 30,
            tests: {
              sshConnection: { success: true }
            }
          };
        } else {
          return {
            success: false,
            hostname: nodeConfig.hostname,
            connectionTime: 100,
            error: 'Failed',
            tests: {
              sshConnection: { success: false, error: 'Failed' }
            }
          };
        }
      });
      
      const scheduler = new HealthCheckScheduler({
        normalInterval: 30,
        failureInterval: 15
      });
      
      scheduler.start();
      
      // Wait for multiple check cycles with sufficient time
      await new Promise(resolve => setTimeout(resolve, 250));
      
      scheduler.stop();
      
      // Give some time for final processing
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const stats = scheduler.getStats();
      expect(stats.totalExecutions).toBeGreaterThan(0);
      expect(stats.successfulExecutions).toBeGreaterThan(0);
      expect(stats.lastExecutionTime).toBeDefined();
    });

    it('should support multiple scheduler instances', () => {
      const scheduler1 = new HealthCheckScheduler({ normalInterval: 100 });
      const scheduler2 = new HealthCheckScheduler({ normalInterval: 200 });
      
      scheduler1.start();
      scheduler2.start();
      
      expect(scheduler1.isRunning()).toBe(true);
      expect(scheduler2.isRunning()).toBe(true);
      
      scheduler1.stop();
      expect(scheduler1.isRunning()).toBe(false);
      expect(scheduler2.isRunning()).toBe(true);
      
      scheduler2.stop();
      expect(scheduler2.isRunning()).toBe(false);
    });

    it('should stop all schedulers with stopAll', () => {
      const scheduler1 = new HealthCheckScheduler({ normalInterval: 100 });
      const scheduler2 = new HealthCheckScheduler({ normalInterval: 200 });
      
      scheduler1.start();
      scheduler2.start();
      
      expect(scheduler1.isRunning()).toBe(true);
      expect(scheduler2.isRunning()).toBe(true);
      
      HealthCheckScheduler.stopAll();
      
      expect(scheduler1.isRunning()).toBe(false);
      expect(scheduler2.isRunning()).toBe(false);
    });
  });
});