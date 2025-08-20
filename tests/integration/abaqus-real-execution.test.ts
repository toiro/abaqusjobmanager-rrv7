/**
 * Real Abaqus Execution Integration Tests
 * 
 * 実際のAbaqus実行を行うintegration test
 * 2Dtest.inp を使用して完全なワークフローをテストします。
 * 
 * 環境変数でオーバーライド可能：
 * TEST_SSH_HOST=hostname (default: 10.9.88.17)
 * TEST_SSH_PORT=port (default: 22)
 * TEST_SSH_USER=username (default: lab)
 * TEST_SSH_PASSWORD=password (optional)
 * 
 * 実行例:
 * bun test tests/integration/abaqus-real-execution.test.ts
 */

import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { AbaqusExecutionResult, AbaqusJobExecutor, type JobExecutionHooks, type JobExecutionResult } from '../../app/server/services/abaqus';
import type { PersistedJob, PersistedNode, PersistedFileRecord } from '../../app/shared/core/types/database';
import { join } from 'path';
import { existsSync, mkdirSync, copyFileSync, rmSync } from 'fs';

// Test configuration from environment variables
interface TestConfig {
  hostname: string;
  port: number;
  username: string;
  password?: string;
}

function getTestConfig(): TestConfig {
  // デフォルト値として成功したラボサーバーの設定を使用
  const hostname = process.env.TEST_SSH_HOST || '10.9.88.17';
  const username = process.env.TEST_SSH_USER || 'lab';
  
  return {
    hostname,
    port: parseInt(process.env.TEST_SSH_PORT || '22'),
    username,
    password: process.env.TEST_SSH_PASSWORD
  };
}

describe('Real Abaqus Execution Integration Tests', () => {
  const testConfig = getTestConfig();
  const testJobId = Math.floor(Math.random() * 1000000); // ユニークなジョブID
  
  // テスト用パス
  const testSourceDir = join(__dirname, `tmp/abaqus-integration-test/test-${testJobId}`);
  const testResultDir = join(__dirname, `tmp/abaqus-integration-results/test-${testJobId}`);
  const inputFilePath = join(__dirname, 'resources/2Dtest.inp');
  
  beforeAll(() => {
    console.log(`🚀 Running Abaqus execution tests against: ${testConfig.username}@${testConfig.hostname}:${testConfig.port}`);
    console.log(`📁 Test job ID: ${testJobId}`);
    
    // テスト用ディレクトリ作成
    if (!existsSync(testSourceDir)) {
      mkdirSync(testSourceDir, { recursive: true });
    }
    
    // 2Dtest.inp をテスト用ディレクトリにコピー
    const testInputFile = join(testSourceDir, '2Dtest.inp');
    copyFileSync(inputFilePath, testInputFile);
    console.log(`📋 Prepared test input file: ${testInputFile}`);
  });
  
  afterAll(() => {
    // テスト用ディレクトリクリーンアップ
    try {
      if (existsSync(testSourceDir)) {
        rmSync(testSourceDir, { recursive: true, force: true });
        console.log(`🧹 Cleaned up test source directory: ${testSourceDir}`);
      }
      if (existsSync(testResultDir)) {
        rmSync(testResultDir, { recursive: true, force: true });
        console.log(`🧹 Cleaned up test result directory: ${testResultDir}`);
      }
    } catch (error) {
      console.warn(`⚠️ Cleanup warning: ${error}`);
    }
  });

  describe('Complete Abaqus Workflow', () => {
    test('should execute complete Abaqus workflow successfully', async () => {
      // Phase 1: エンティティベース設計でテストデータ作成
      const job: PersistedJob = {
        id: testJobId,
        name: '2Dtest',
        status: 'waiting',
        node_id: 1,
        user_id: 'testuser',
        cpu_cores: 1,
        file_id: 1,
        priority: 'normal',
        start_time: null,
        end_time: null,
        error_message: null,
        output_file_path: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      const node: PersistedNode = {
        id: 1,
        name: 'Lab Server',
        hostname: testConfig.hostname,
        ssh_username: testConfig.username,
        ssh_port: testConfig.port,
        status: 'available',
        license_token_limit: 10,
        cpu_cores_limit: 16,
        abaqus_execution_dir: 'c:/temp',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      const file: PersistedFileRecord = {
        id: 1,
        original_name: '2Dtest.inp',
        stored_name: '2Dtest.inp',
        file_path: join(testSourceDir, '2Dtest.inp'),
        mime_type: 'text/plain',
        file_size: 1234,
        checksum: null,
        uploaded_by: 'test',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Phase 2: AbaqusJobExecutor による実際の実行
      const executor = new AbaqusJobExecutor();
      
      // 実行進捗追跡用の変数
      let fileTransferStarted = false;
      let abaqusStarted = false;
      let resultReceived = false;
      
      const hooks: JobExecutionHooks = {
        onStart: (jobId) => {
          console.log(`🎬 Job execution started: ${jobId}`);
        },
        onFileTransferStart: (phase) => {
          console.log(`📤 File transfer started: ${phase}`);
          if (phase === 'send') fileTransferStarted = true;
        },
        onFileTransferComplete: (phase, result) => {
          console.log(`✅ File transfer completed: ${phase}`, {
            transferTime: result.transferTimeMs
          });
          if (phase === 'receive') resultReceived = true;
        },
        onAbaqusStart: (context) => {
          console.log(`⚙️ Abaqus execution started:`, context);
          abaqusStarted = true;
        },
        onAbaqusProgress: (progress) => {
          console.log(`📊 Abaqus progress: ${progress.percentage}%`);
        },
        onAbaqusFinished: (result: AbaqusExecutionResult) => {
          console.log(`🎯 Abaqus execution completed:`, {
            success: result.success,
            executionTime: result.executionTimeMs,
          });
        },
        onComplete: (result) => {
          console.log(`🏁 Job execution completed:`, {
            success: result.success,
            totalTime: result.totalExecutionTimeMs
          });
        },
        onError: (error, phase) => {
          console.error(`❌ Error in ${phase}: ${error}`);
        }
      };

      // Phase 3: 実際の実行
      console.log(`🔥 Starting real Abaqus execution...`);
      const startTime = Date.now();
      
      const result: JobExecutionResult = await executor.executeJob(job, node, file, hooks);
      
      const totalTime = Date.now() - startTime;
      console.log(`⏱️ Total execution time: ${totalTime}ms`);

      // Phase 4: 結果検証
      expect(result.success).toBe(true);
      expect(result.jobId).toBe(testJobId);
      expect(result.totalExecutionTimeMs).toBeGreaterThan(0);
      
      // フェーズ完了確認
      expect(fileTransferStarted).toBe(true);
      expect(abaqusStarted).toBe(true);
      expect(resultReceived).toBe(true);
      
      // 各フェーズの結果確認
      expect(result.phases.fileTransferSend).toBeDefined();
      expect(result.phases.fileTransferSend?.success).toBe(true);
      
      expect(result.phases.abaqusExecution).toBeDefined();
      expect(result.phases.abaqusExecution?.success).toBe(true);
      // expect(result.phases.abaqusExecution?.exitCode).toBe(0);
      
      expect(result.phases.fileTransferReceive).toBeDefined();
      expect(result.phases.fileTransferReceive?.success).toBe(true);
      
      console.log(`🎉 Real Abaqus execution test completed successfully!`);
      
    }, 7 * 60 * 1000); // 7分タイムアウト (転送1分 + 実行5分 + 結果1分 + バッファ)
  });
});