/**
 * Real SSH Integration Tests
 * 
 * これらのテストは実際のSSH接続を行います。
 * デフォルトでラボサーバー (10.9.88.17, user: lab) を使用します。
 * 
 * 環境変数でオーバーライド可能：
 * TEST_SSH_HOST=hostname (default: 10.9.88.17)
 * TEST_SSH_PORT=port (default: 22)
 * TEST_SSH_USER=username (default: lab)
 * TEST_SSH_PASSWORD=password (optional)
 * TEST_SSH_TIMEOUT=30000 (optional, default: 30000ms)
 * 
 * 実行例:
 * bun test tests/integration/ssh-real.test.ts  # デフォルト値使用
 * TEST_SSH_HOST=192.168.1.100 TEST_SSH_USER=abaqus bun test tests/integration/ssh-real.test.ts  # カスタム値
 */

import { describe, test, expect, beforeAll } from 'bun:test';
import { testNodeConnection, type NodeConfig, type HealthCheckConfig } from '../../app/server/services/node-health/node-health-check';

// Test configuration from environment variables
interface TestSSHConfig {
  hostname: string;
  port: number;
  username: string;
  password?: string;
  timeout: number;
}

function getTestConfig(): TestSSHConfig {
  // デフォルト値として成功したラボサーバーの設定を使用
  const hostname = process.env.TEST_SSH_HOST || '10.9.88.17';
  const username = process.env.TEST_SSH_USER || 'lab';
  
  return {
    hostname,
    port: parseInt(process.env.TEST_SSH_PORT || '22'),
    username,
    password: process.env.TEST_SSH_PASSWORD,
    timeout: parseInt(process.env.TEST_SSH_TIMEOUT || '30000')
  };
}

describe('Real SSH Integration Tests', () => {
  // テスト設定を事前に取得
  const testConfig = getTestConfig();
  
  beforeAll(() => {
    console.log(`Running SSH tests against: ${testConfig.username}@${testConfig.hostname}:${testConfig.port}`);
    
    // 環境変数が使用されているかデフォルト値かを表示
    const usingDefaults = !process.env.TEST_SSH_HOST && !process.env.TEST_SSH_USER;
    if (usingDefaults) {
      console.log('Using default lab server configuration (10.9.88.17, user: lab)');
      console.log('Override with environment variables if needed: TEST_SSH_HOST, TEST_SSH_USER');
    } else {
      console.log('Using custom configuration from environment variables');
    }
  });

  describe('SSH Connection Tests', () => {
    test('should successfully connect and execute basic commands', async () => {

      const nodeConfig: NodeConfig = {
        hostname: testConfig.hostname,
        ssh_port: testConfig.port,
        username: testConfig.username
      };

      const healthConfig: HealthCheckConfig = {
        testAbaqus: false,
        timeout: testConfig.timeout
      };

      console.log(`🔗 Testing SSH connection to ${nodeConfig.username}@${nodeConfig.hostname}:${nodeConfig.ssh_port}...`);
      
      const result = await testNodeConnection(nodeConfig, healthConfig);
      
      console.log(`📊 Connection result:`, {
        success: result.success,
        connectionTime: result.connectionTime,
        hostname: result.hostname,
        error: result.error
      });
      
      expect(result.success).toBe(true);
      expect(result.tests.sshConnection.success).toBe(true);
      expect(result.tests.basicCommands?.success).toBe(true);
      expect(result.connectionTime).toBeGreaterThan(0);
      
      // Verify basic commands were executed
      if (result.tests.basicCommands) {
        expect(result.tests.basicCommands.commands).toContain('whoami');
        expect(result.tests.basicCommands.commands).toContain('Get-Location');
      }
    }, testConfig.timeout);

    test('should test Abaqus environment detection', async () => {

      const nodeConfig: NodeConfig = {
        hostname: testConfig.hostname,
        ssh_port: testConfig.port,
        username: testConfig.username
      };

      const healthConfig: HealthCheckConfig = {
        testAbaqus: true,
        timeout: testConfig.timeout
      };

      console.log(`🔍 Testing Abaqus environment detection...`);
      
      const result = await testNodeConnection(nodeConfig, healthConfig);
      
      expect(result.success).toBe(true);
      expect(result.tests.abaqusEnvironment).toBeDefined();
      
      if (result.tests.abaqusEnvironment) {
        console.log(`📋 Abaqus test result:`, {
          available: result.tests.abaqusEnvironment.success,
          version: result.tests.abaqusEnvironment.version,
          error: result.tests.abaqusEnvironment.error
        });
        
        expect(typeof result.tests.abaqusEnvironment.success).toBe('boolean');
        
        if (result.tests.abaqusEnvironment.success) {
          expect(result.tests.abaqusEnvironment.version).toBeDefined();
          console.log(`✅ Abaqus detected: version ${result.tests.abaqusEnvironment.version}`);
        } else {
          console.log(`❌ Abaqus not detected: ${result.tests.abaqusEnvironment.error}`);
        }
      }
    }, testConfig.timeout);

    test('should handle PowerShell script execution and JSON parsing', async () => {

      const nodeConfig: NodeConfig = {
        hostname: testConfig.hostname,
        ssh_port: testConfig.port,
        username: testConfig.username
      };

      console.log(`📜 Testing PowerShell script execution and JSON parsing...`);
      
      const result = await testNodeConnection(nodeConfig, { testAbaqus: true });
      
      // Verify structured JSON response was parsed correctly
      expect(result).toHaveProperty('hostname');
      expect(result).toHaveProperty('connectionTime');
      expect(result).toHaveProperty('tests');
      
      expect(result.tests).toHaveProperty('sshConnection');
      expect(result.tests).toHaveProperty('basicCommands');
      
      console.log(`📄 PowerShell execution details:`, {
        hostname: result.hostname,
        basicCommandsSuccess: result.tests.basicCommands?.success,
        commands: result.tests.basicCommands?.commands,
        abaqusChecked: !!result.tests.abaqusEnvironment
      });
      
      // Verify basic commands structure
      if (result.tests.basicCommands) {
        expect(Array.isArray(result.tests.basicCommands.commands)).toBe(true);
        expect(result.tests.basicCommands.commands.length).toBeGreaterThan(0);
      }
    }, testConfig.timeout);
  });

  describe('Error Handling Tests', () => {
    test('should handle invalid port gracefully', async () => {

      const nodeConfig: NodeConfig = {
        hostname: testConfig.hostname,
        ssh_port: 99999, // Invalid port
        username: testConfig.username
      };

      console.log(`❌ Testing invalid port handling...`);
      
      const result = await testNodeConnection(nodeConfig, { timeout: 5000 });
      
      expect(result.success).toBe(false);
      expect(result.tests.sshConnection.success).toBe(false);
      expect(result.tests.sshConnection.error).toContain('Port out of valid range');
      
      console.log(`✅ Invalid port correctly rejected: ${result.tests.sshConnection.error}`);
    });

    test('should handle connection timeout', async () => {

      // Use a non-routable IP address (TEST-NET-1)
      const nodeConfig: NodeConfig = {
        hostname: '192.0.2.1',
        ssh_port: 22,
        username: testConfig.username
      };

      console.log(`⏱️  Testing connection timeout handling...`);
      
      const startTime = Date.now();
      const result = await testNodeConnection(nodeConfig, { timeout: 3000 });
      const elapsed = Date.now() - startTime;
      
      expect(result.success).toBe(false);
      expect(elapsed).toBeLessThan(5000); // Should timeout within reasonable time
      expect(result.error).toBeDefined();
      
      console.log(`✅ Timeout handled correctly after ${elapsed}ms: ${result.error}`);
    }, 8000);
  });
});

export function createTestConfig(hostname: string, username: string, port: number = 22): NodeConfig {
  return { hostname, ssh_port: port, username };
}

export { testNodeConnection } from '../../app/server/services/node-health/node-health-check';