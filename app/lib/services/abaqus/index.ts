/**
 * Abaqus Job Execution Engine
 *
 * Complete Abaqus job execution system with:
 * - Serial file transfer queue management
 * - Pure Abaqus execution with hook-based integration
 * - High-level job orchestration
 * - Type-safe interfaces
 */

// Type definitions
export type {
	// File Transfer Types
	NodeConnection,
	TransferOptions,
	TransferResult,
	TransferError,
	FileTransferHooks,
	// Abaqus Execution Types
	AbaqusExecutionOptions,
	AbaqusExecutionResult,
	AbaqusProgress,
	AbaqusExecutionContext,
	AbaqusExecutionError,
	AbaqusExecutionHooks,
	// Job Execution Types
	JobExecutionResult,
	JobExecutionHooks,
} from "./types";

// Core Components
export { SerialJobQueue } from "./serial-job-queue";
export {
	executeTransfer,
	sendDirectory,
	receiveDirectory,
	getFileTransferQueue,
} from "./file-transfer-service";
export { executeAbaqus } from "./abaqus-executor";
export { AbaqusJobExecutor } from "./abaqus-job-executor";

/**
 * 使用例:
 *
 * ```typescript
 * import {
 *   createAbaqusJobExecutor,
 *   getFileTransferService,
 *   getAbaqusExecutor
 * } from '~/lib/services/abaqus';
 *
 * // 高レベル実行 (推奨)
 * const executor = createAbaqusJobExecutor();
 * const result = await executor.executeJob(request, hooks);
 *
 * // 低レベル実行 (テスト・デバッグ用)
 * const fileService = getFileTransferService();
 * const taskId = await fileService.sendDirectory(options, 10, hooks);
 *
 * const abaqusExecutor = getAbaqusExecutor();
 * const result = await abaqusExecutor.execute(options, nodeConnection, hooks);
 * ```
 */
