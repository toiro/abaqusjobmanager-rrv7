/**
 * Abaqus Executor
 * Pure Abaqus execution engine with no side effects
 */

import { getLogger } from "~/shared/core/logger/logger.server";
import { assembleScriptPath } from "~/server/lib/remote-pwsh";
import type {
	AbaqusExecutionContext,
	AbaqusExecutionError,
	AbaqusExecutionHooks,
	AbaqusExecutionOptions,
	AbaqusExecutionResult,
	AbaqusProgress,
	NodeConnection,
} from "./types";

/**
 * Abaqus ジョブを実行
 */
export async function executeAbaqus(
	options: AbaqusExecutionOptions,
	nodeConnection: NodeConnection,
	hooks?: AbaqusExecutionHooks,
): Promise<AbaqusExecutionResult> {
	const logger = getLogger();

	logger.info("AbaqusExecutor: Starting Abaqus execution", {
		jobName: options.jobName,
		workingDirectory: options.workingDirectory,
		inputFileName: options.inputFileName,
		cpuCores: options.cpuCores,
		hostname: nodeConnection.hostname,
	});

	const startTime = Date.now();
	const context: AbaqusExecutionContext = {
		workingDirectory: options.workingDirectory,
		jobName: options.jobName,
		startTime: new Date(),
	};

	// 開始フックを呼び出し
	hooks?.onStart?.(context);

	try {
		// 入力オプションの検証
		validateExecutionOptions(options);

		// Abaqus実行
		const result = await performAbaqusExecution(options, nodeConnection, hooks);

		const executionTime = Date.now() - startTime;
		logger.info("AbaqusExecutor: Abaqus execution completed", {
			jobName: options.jobName,
			success: result.success,
			exitCode: result.exitCode,
			executionTime,
		});

		// 完了フックを呼び出し
		hooks?.onFinish?.(result);

		return result;
	} catch (error) {
		const executionTime = Date.now() - startTime;
		logger.error("AbaqusExecutor: Abaqus execution failed", {
			jobName: options.jobName,
			executionTime,
			error: error instanceof Error ? error.message : "Unknown error",
		});

		const executionError: AbaqusExecutionError = {
			message:
				error instanceof Error ? error.message : "Unknown execution error",
			phase: "execution",
		};

		// エラーフックを呼び出し
		hooks?.onError?.(executionError);

		throw error;
	}
}

/**
 * 実際のAbaqus実行処理
 */
async function performAbaqusExecution(
	options: AbaqusExecutionOptions,
	nodeConnection: NodeConnection,
	hooks?: AbaqusExecutionHooks,
): Promise<AbaqusExecutionResult> {
	const logger = getLogger();

	// Bun mock.module() でテスト容易性を上げるため。
	const { createRemotePwshExecutor } = await import(
		"~/server/lib/remote-pwsh/executor"
	);

	const scriptPath = assembleScriptPath("executeAbaqus.ps1");

	logger.debug("AbaqusExecutor: Creating Abaqus PowerShell executor", {
		host: nodeConnection.hostname,
		user: nodeConnection.username,
		scriptPath,
	});

	// TDD Phase 2: AbaqusパラメータをPowerShellスクリプトに渡す
	const abaqusParameters = [
		options.jobName, // $jobName パラメータ
		options.workingDirectory, // $workingDir パラメータ
		options.inputFileName, // $inputFile パラメータ
	];

	// CPU数を追加引数として追加
	if (options.cpuCores) {
		abaqusParameters.push(`cpus=${options.cpuCores}`);
	}

	// その他の追加引数を追加
	if (options.additionalArgs) {
		abaqusParameters.push(...options.additionalArgs);
	}

	const executor = createRemotePwshExecutor({
		host: nodeConnection.hostname,
		user: nodeConnection.username,
		scriptPath,
		parameters: abaqusParameters,
	});

	// stdout/stderr を監視
	let stdout = "";
	let lastStdout = "";
	let stderr = "";
	let lastProgress: AbaqusProgress | null = null;

	executor.on("stdout", (line) => {
		lastStdout = line;
		stdout += line;
		hooks?.onStdout?.(line);

		// 進捗情報を解析してフックを呼び出し
		const progress = parseProgress(line);
		if (progress && hasProgressChanged(progress, lastProgress)) {
			lastProgress = progress;
			hooks?.onProgress?.(progress);
		}
	});

	executor.on("stderr", (line) => {
		stderr += line;
		hooks?.onStderr?.(line);
		logger.debug("AbaqusExecutor: Abaqus stderr", { line: line.trim() });
	});

	const startTime = Date.now();

	// PowerShell実行
	const result = await executor.invokeAsync();
	const endTime = Date.now();

	logger.debug("AbaqusExecutor: Abaqus PowerShell execution completed", {
		returnCode: result.returnCode,
		executionTime: endTime - startTime,
	});

	// exitCode では判定できないので最終出力で判断。
	const success = Boolean(lastStdout.match(/Abaqus JOB [^ ]* COMPLETED/));

	// 結果を解析
	const executionResult: AbaqusExecutionResult = {
		success,
		exitCode: result.returnCode,
		stdout: result.stdout,
		stderr: result.stderr,
		lastStdout: result.lastOutput,
		executionTimeMs: endTime - startTime,
	};

	return executionResult;
}

/**
 * 実行オプションの検証
 */
function validateExecutionOptions(options: AbaqusExecutionOptions): void {
	if (!options.workingDirectory || options.workingDirectory.trim() === "") {
		throw new Error("Working directory is required");
	}

	if (!options.inputFileName || options.inputFileName.trim() === "") {
		throw new Error("Input file name is required");
	}

	if (!options.jobName || options.jobName.trim() === "") {
		throw new Error("Job name is required");
	}

	if (options.cpuCores && (options.cpuCores < 1 || options.cpuCores > 1000)) {
		throw new Error("CPU cores must be between 1 and 1000");
	}
}

/**
 * Abaqus出力から進捗情報を解析
 */
function parseProgress(line: string): AbaqusProgress | null {
	// Abaqusの標準出力から進捗を解析
	// 例: "Step 1, Increment 5 (25% complete)"

	const stepMatch = line.match(/Step\s+(\d+)/i);
	const incrementMatch = line.match(/Increment\s+(\d+)/i);
	const percentMatch = line.match(/(\d+(?:\.\d+)?)\s*%/);

	if (stepMatch || incrementMatch || percentMatch) {
		const currentStep = stepMatch ? parseInt(stepMatch[1], 10) : 1;
		const currentIncrement = incrementMatch
			? parseInt(incrementMatch[1], 10)
			: 1;
		const percentage = percentMatch ? parseFloat(percentMatch[1]) : 0;

		return {
			currentStep,
			totalSteps: currentStep, // 動的に更新
			currentIncrement,
			totalIncrements: currentIncrement, // 動的に更新
			percentage,
			estimatedTimeRemaining: undefined, // TODO: 実装
		};
	}

	return null;
}

/**
 * 進捗が変化したかチェック
 */
function hasProgressChanged(
	current: AbaqusProgress,
	previous: AbaqusProgress | null,
): boolean {
	if (!previous) return true;

	return (
		current.currentStep !== previous.currentStep ||
		current.currentIncrement !== previous.currentIncrement ||
		Math.abs(current.percentage - previous.percentage) >= 1 // 1%以上の変化
	);
}

/**
 * 出力ファイルを検索
 */
async function findOutputFiles(
	workingDirectory: string,
	jobName: string,
): Promise<string[]> {
	const logger = getLogger();

	// TODO: リモートディレクトリから出力ファイル一覧を取得
	// 現在は一般的なAbaqus出力ファイルを想定
	const expectedExtensions = [".odb", ".dat", ".msg", ".sta", ".log", ".fil"];
	const outputFiles: string[] = [];

	for (const ext of expectedExtensions) {
		const fileName = `${jobName}${ext}`;
		outputFiles.push(fileName);
	}

	logger.debug("AbaqusExecutor: Expected output files", {
		workingDirectory,
		jobName,
		outputFiles,
	});

	return outputFiles;
}

/**
 * Abaqusコマンドライン引数を構築
 */
function buildAbaqusArgs(options: AbaqusExecutionOptions): string[] {
	const args: string[] = [];

	// 基本引数
	args.push(`job=${options.jobName}`);
	args.push(`input=${options.inputFileName}`);

	// CPU数指定
	if (options.cpuCores) {
		args.push(`cpus=${options.cpuCores}`);
	}

	// 追加引数
	if (options.additionalArgs) {
		args.push(...options.additionalArgs);
	}

	return args;
}

/**
 * Abaqusエラーコードを解析
 */
function parseAbaqusError(
	stderr: string,
	exitCode: number,
): AbaqusExecutionError {
	// Abaqus固有のエラーパターンを解析
	const errorPatterns = [
		{ pattern: /ERROR.*?:\s*(.+)/i, type: "abaqus_error" },
		{ pattern: /FATAL.*?:\s*(.+)/i, type: "fatal_error" },
		{ pattern: /WARNING.*?:\s*(.+)/i, type: "warning" },
	];

	for (const { pattern, type } of errorPatterns) {
		const match = stderr.match(pattern);
		if (match) {
			return {
				message: match[1],
				exitCode,
				phase: "execution",
				abaqusError: {
					errorCode: type,
					description: match[1],
				},
			};
		}
	}

	// 一般的なエラー
	return {
		message: `Abaqus execution failed with exit code ${exitCode}`,
		exitCode,
		phase: "execution",
	};
}
