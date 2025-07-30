/**
 * Abaqus Job Execution Types
 * Type definitions for Abaqus execution engine components
 */

// ============================================================================
// File Transfer Types
// ============================================================================

export interface NodeConnection {
	hostname: string;
	username: string;
	port: number;
}

export interface TransferOptions {
	type: "send" | "receive";
	sourcePath: string; // 転送元パス (絶対パス)
	destinationPath: string; // 転送先パス (絶対パス)
	nodeConnection: NodeConnection;
}

export interface TransferResult {
	success: boolean; // 転送成功/失敗
	transferTimeMs: number; // 転送時間
	errorMessage?: string; // エラーメッセージ
}

export interface TransferError {
	message: string; // エラーメッセージ
	code?: string; // エラーコード
	phase: "connection" | "transfer" | "verification"; // エラー発生フェーズ
}

export interface FileTransferHooks {
	onStart?: (context: TransferOptions) => void;
	onComplete?: (result: TransferResult) => void;
	onError?: (error: TransferError) => void;
}

// ============================================================================
// File Transfer Queue Types
// ============================================================================

export interface FileTransferTask {
	id: string; // 転送タスクID
	type: "send" | "receive"; // 転送方向
	options: TransferOptions; // 転送オプション
	hooks?: FileTransferHooks; // 完了時フック
	priority: number; // 優先度 (高い数値が優先)
	createdAt: Date; // 作成時刻
}

export interface QueueStatus {
	queueLength: number; // 待機中タスク数
	isProcessing: boolean; // 処理中フラグ
	currentTask?: FileTransferTask; // 現在処理中タスク
}

// ============================================================================
// Abaqus Execution Types
// ============================================================================

export interface AbaqusExecutionOptions {
	workingDirectory: string; // 実行ディレクトリ (絶対パス)
	inputFileName: string; // INPファイル名
	jobName: string; // Abaqusジョブ名
	cpuCores?: number; // CPU数指定
	additionalArgs?: string[]; // 追加オプション
}

export interface AbaqusExecutionResult {
	success: boolean; // 実行成功/失敗
	exitCode: number; // 終了コード
	stdout: string; // 標準出力 (全体)
	stderr: string; // エラー出力 (全体)
	lastStdout: string;
	executionTimeMs: number; // 実行時間
}

export interface AbaqusProgress {
	currentStep: number; // 現在ステップ
	totalSteps: number; // 総ステップ数
	currentIncrement: number; // 現在インクリメント
	totalIncrements: number; // 総インクリメント数
	percentage: number; // 進捗率 (0-100)
	estimatedTimeRemaining?: number; // 残り時間推定(ms)
}

export interface AbaqusExecutionContext {
	workingDirectory: string; // 実行ディレクトリ
	jobName: string; // ジョブ名
	startTime: Date; // 開始時刻
}

export interface AbaqusExecutionError {
	message: string; // エラーメッセージ
	exitCode?: number; // 終了コード
	phase: "preparation" | "execution" | "completion"; // エラー発生フェーズ
	abaqusError?: {
		// Abaqus固有エラー
		errorCode: string;
		description: string;
	};
}

export interface AbaqusExecutionHooks {
	onStart?: (context: AbaqusExecutionContext) => void;
	onProgress?: (progress: AbaqusProgress) => void;
	onStdout?: (line: string) => void;
	onStderr?: (line: string) => void;
	onFinish?: (result: AbaqusExecutionResult) => void;
	onError?: (error: AbaqusExecutionError) => void;
}

// ============================================================================
// Job Execution Orchestrator Types
// ============================================================================

// TDD Refactor Phase: JobExecutionRequest は削除（エンティティベース設計では不要）
// AbaqusJobExecutor は PersistedJob, PersistedNode, PersistedFileRecord を直接受け取り、
// 内部で自動的にパス生成・設定変換を行う

export interface JobExecutionHooks {
	onStart?: (jobId: number) => void;
	onFileTransferStart?: (phase: "send" | "receive") => void;
	onFileTransferComplete?: (
		phase: "send" | "receive",
		result: TransferResult,
	) => void;
	onAbaqusStart?: (context: AbaqusExecutionContext) => void;
	onAbaqusProgress?: (progress: AbaqusProgress) => void;
	onAbaqusFinished?: (result: AbaqusExecutionResult) => void;
	onComplete?: (result: JobExecutionResult) => void;
	onError?: (error: string, phase: string) => void;
}

export interface JobExecutionResult {
	success: boolean; // 全体実行成功/失敗
	jobId: number; // ジョブID
	userId: string;
	phases: {
		// 各フェーズの結果
		fileTransferSend?: TransferResult;
		abaqusExecution?: AbaqusExecutionResult;
		fileTransferReceive?: TransferResult;
	};
	totalExecutionTimeMs: number; // 総実行時間
	errorMessage?: string; // エラーメッセージ
}

// ============================================================================
// Job Status Definitions
// ============================================================================

export const JobStatus = {
	WAITING: "waiting", // ジョブ投入済み、実行待ち
	STARTING: "starting", // ファイル転送キュー待ち ～ ファイル転送中
	RUNNING: "running", // Abaqus実行中 + 結果ファイル収集中
	COMPLETED: "completed", // 正常完了
	FAILED: "failed", // 失敗 (どの段階でも)
	MISSING: "missing", // ファイル不明等 (既存定義)
} as const;

export type JobStatusType = (typeof JobStatus)[keyof typeof JobStatus];
