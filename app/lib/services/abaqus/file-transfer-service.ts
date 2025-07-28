/**
 * File Transfer Service
 * High-level file transfer service with queue integration
 */

import { getLogger } from "~/lib/core/logger/logger.server";
import { SerialJobQueue } from "./serial-job-queue";
import type {
	TransferOptions,
	TransferResult,
	FileTransferHooks,
	TransferError,
} from "./types";
import { assembleScriptPath } from "~/server/lib/remote-pwsh";

let singletonQueueInstance: SerialJobQueue | null = null;

export function getFileTransferQueue(): SerialJobQueue {
	if (!singletonQueueInstance) {
		singletonQueueInstance = new SerialJobQueue();
	}
	return singletonQueueInstance;
}

/**
 * ファイル転送を実行
 */
export async function executeTransfer(
	options: TransferOptions,
	hooks?: FileTransferHooks,
): Promise<TransferResult> {
	const logger = getLogger();
	const transferQueue = getFileTransferQueue();

	logger.info("FileTransferService: Executing file transfer", {
		type: options.type,
		sourcePath: options.sourcePath,
		destinationPath: options.destinationPath,
		hostname: options.nodeConnection.hostname,
	});

	// SerialJobQueueを使用して直列実行
	return await transferQueue.push(async () => {
		const startTime = Date.now();
		hooks?.onStart?.(options);

		try {
			const result = await performTransfer(options, hooks);
			const executionTime = Date.now() - startTime;

			logger.info("FileTransferService: File transfer completed", {
				type: options.type,
				success: result.success,
				executionTime,
			});

			if (!result.success) {
				throw new Error(result.errorMessage || "Transfer failed");
			}

			hooks?.onComplete?.(result);
			return result;
		} catch (error) {
			const executionTime = Date.now() - startTime;
			logger.error("FileTransferService: File transfer failed", {
				type: options.type,
				executionTime,
				error: error instanceof Error ? error.message : "Unknown error",
			});

			const transferError: TransferError = {
				message:
					error instanceof Error ? error.message : "Unknown transfer error",
				phase: "transfer",
			};

			hooks?.onError?.(transferError);
			throw error;
		}
	});
}

/**
 * 実際の転送処理
 */
async function performTransfer(
	options: TransferOptions,
	hooks?: FileTransferHooks,
): Promise<TransferResult> {
	const logger = getLogger();

	// Bun mock.module() でテスト容易性を上げるため。
	const { createRemotePwshExecutor } = await import(
		"~/server/lib/remote-pwsh/executor"
	);

	// PowerShellスクリプトのパスを決定
	const scriptPath =
		options.type === "send"
			? assembleScriptPath("sendDirectory.ps1")
			: assembleScriptPath("receiveDirectory.ps1");

	logger.debug("FileTransferService: Creating PowerShell executor", {
		host: options.nodeConnection.hostname,
		user: options.nodeConnection.username,
		scriptPath,
	});

	// PowerShell実行設定
	const executor = createRemotePwshExecutor({
		host: options.nodeConnection.hostname,
		user: options.nodeConnection.username,
		scriptPath,
		parameters: [
			options.sourcePath, // $Source パラメータ
			options.destinationPath, // $Destination パラメータ
		],
	});

	const startTime = Date.now();

	try {
		// PowerShell実行
		const result = await executor.invokeAsync();
		const endTime = Date.now();

		logger.debug("FileTransferService: PowerShell execution completed", {
			returnCode: result.returnCode,
			executionTime: endTime - startTime,
		});

		// 結果を解析
		const transferResult: TransferResult = {
			success: result.returnCode === 0,
			transferTimeMs: endTime - startTime,
			errorMessage: result.returnCode !== 0 ? result.stderr : undefined,
		};

		return transferResult;
	} catch (error) {
		const endTime = Date.now();

		logger.error("PowerShell execution error", "FileTransferService", {
			error: error instanceof Error ? error.message : "Unknown error",
		});

		return {
			success: false,
			transferTimeMs: endTime - startTime,
			errorMessage:
				error instanceof Error ? error.message : "PowerShell execution failed",
		};
	}
}

/**
 * ディレクトリ送信 (便利関数)
 */
export async function sendDirectory(
	options: TransferOptions,
	hooks?: FileTransferHooks,
): Promise<TransferResult> {
	const sendOptions = { ...options, type: "send" as const };
	return await executeTransfer(sendOptions, hooks);
}

/**
 * ディレクトリ受信 (便利関数)
 */
export async function receiveDirectory(
	options: TransferOptions,
	hooks?: FileTransferHooks,
): Promise<TransferResult> {
	const receiveOptions = { ...options, type: "receive" as const };
	return await executeTransfer(receiveOptions, hooks);
}

/**
 * 転送パスの検証
 */
export function validateTransferOptions(options: TransferOptions): {
	valid: boolean;
	errors: string[];
} {
	const errors: string[] = [];

	if (!options.sourcePath || options.sourcePath.trim() === "") {
		errors.push("Source path is required");
	}

	if (!options.destinationPath || options.destinationPath.trim() === "") {
		errors.push("Destination path is required");
	}

	if (
		!options.nodeConnection.hostname ||
		options.nodeConnection.hostname.trim() === ""
	) {
		errors.push("Node hostname is required");
	}

	if (
		!options.nodeConnection.username ||
		options.nodeConnection.username.trim() === ""
	) {
		errors.push("Node username is required");
	}

	return {
		valid: errors.length === 0,
		errors,
	};
}
