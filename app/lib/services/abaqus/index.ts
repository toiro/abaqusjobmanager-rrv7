/**
 * Abaqus Job Execution Services
 * 
 * Abaqusジョブ実行に関する統合サービス
 * 本物とMockを環境に応じて自動切り替え
 */

// メインジョブ実行クラス
export { AbaqusJobRunner } from './abaqus-job-runner.server';
export { MockAbaqusJobRunner } from './mock-abaqus-job-runner.server';
export type { JobExecutionResult } from './abaqus-job-runner.server';

// ファクトリー（推奨）
export { 
  AbaqusJobRunnerFactory,
  type IAbaqusJobRunner 
} from './abaqus-job-runner-factory.server';
export type { JobRunnerConfig } from './abaqus-job-runner-factory.server';

// ジョブ実行スケジューラー
export { 
  JobExecutionScheduler,
  createJobExecutionScheduler 
} from './job-execution-scheduler.server';
export type { JobExecutionSchedulerConfig } from './job-execution-scheduler.server';

/**
 * 使用例:
 * 
 * // 推奨: Factoryを使用（環境に応じて自動切り替え）
 * const runner = AbaqusJobRunnerFactory.getInstance();
 * const result = await runner.executeJob(job, node);
 * 
 * // 手動でMock指定
 * const mockRunner = AbaqusJobRunnerFactory.getInstance({
 *   forceMock: true,
 *   mockConfig: { errorRate: 0.1 }
 * });
 * 
 * // 自動スケジューラー（サーバー起動時）
 * const scheduler = createJobExecutionScheduler({
 *   checkIntervalSeconds: 30,
 *   maxConcurrentJobs: 3
 * });
 * 
 * // 環境変数での制御:
 * // ENABLE_JOB_EXECUTION=true  - ジョブ実行機能を有効化
 * // USE_MOCK_ABAQUS=true      - 強制的にMockを使用
 * // USE_MOCK_ABAQUS=false     - 強制的に本物を使用
 */