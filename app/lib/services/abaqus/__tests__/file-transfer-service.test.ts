import { describe, it, expect, beforeEach, mock } from "bun:test";
import {
	executeTransfer,
	sendDirectory,
	receiveDirectory,
	validateTransferOptions,
	getFileTransferQueue,
} from "../file-transfer-service";
import type {
	TransferOptions,
	TransferResult,
	FileTransferHooks,
} from "../types";

// テストユーティリティ
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// remote-pwsh executor のモック
const mockExecutor = {
	invokeAsync: mock(() =>
		Promise.resolve({
			returnCode: 0,
			stdout: "Transfer completed",
			stderr: "",
		}),
	),
};

const mockCreateRemotePwshExecutor = mock(() => mockExecutor);

// モジュールのモック
mock.module("~/server/lib/remote-pwsh/executor", () => ({
	createRemotePwshExecutor: mockCreateRemotePwshExecutor,
}));

describe("FileTransferService Functions", () => {
	let transferOptions: TransferOptions;
	let executionOrder: string[];
	let mockHooks: FileTransferHooks;

	beforeEach(() => {
		executionOrder = [];

		transferOptions = {
			type: "send",
			sourcePath: "/local/source/path",
			destinationPath: "/remote/dest/path",
			nodeConnection: {
				hostname: "test-node",
				username: "testuser",
				port: 22,
			},
		};

		mockHooks = {
			onStart: mock((options) => {
				executionOrder.push(`onStart-${options.type}`);
			}),
			onComplete: mock((result) => {
				executionOrder.push(`onComplete-${result.success}`);
			}),
			onError: mock((error) => {
				executionOrder.push(`onError-${error.message}`);
			}),
		};

		// モックをリセット
		mockExecutor.invokeAsync.mockClear();
		mockCreateRemotePwshExecutor.mockClear();
		(mockHooks.onStart as any)?.mockClear?.();
		(mockHooks.onComplete as any)?.mockClear?.();
		(mockHooks.onError as any)?.mockClear?.();
	});

	describe("executeTransfer", () => {
		it("executes single transfer successfully", async () => {
			mockExecutor.invokeAsync.mockImplementation(async () => {
				await delay(1); // 最小実行時間を確保
				return {
					returnCode: 0,
					stdout: "Transfer completed",
					stderr: "",
				};
			});

			const result = await executeTransfer(transferOptions, mockHooks);

			expect(result.success).toBe(true);
			expect(result.transferTimeMs).toBeGreaterThan(0);
			expect(result.errorMessage).toBeUndefined();

			expect(mockHooks.onStart).toHaveBeenCalledWith(transferOptions);
			expect(mockHooks.onComplete).toHaveBeenCalledWith(result);
			expect(mockHooks.onError).not.toHaveBeenCalled();
		});

		it("executes multiple transfers in serial order", async () => {
			mockExecutor.invokeAsync.mockResolvedValue({
				returnCode: 0,
				stdout: "Transfer completed",
				stderr: "",
			});

			const promises = [
				executeTransfer(
					{
						...transferOptions,
						sourcePath: "/path1",
					},
					{
						onStart: () => executionOrder.push("transfer1-start"),
						onComplete: () => executionOrder.push("transfer1-complete"),
					},
				),
				executeTransfer(
					{
						...transferOptions,
						sourcePath: "/path2",
					},
					{
						onStart: () => executionOrder.push("transfer2-start"),
						onComplete: () => executionOrder.push("transfer2-complete"),
					},
				),
				executeTransfer(
					{
						...transferOptions,
						sourcePath: "/path3",
					},
					{
						onStart: () => executionOrder.push("transfer3-start"),
						onComplete: () => executionOrder.push("transfer3-complete"),
					},
				),
			];

			const results = await Promise.all(promises);

			expect(results).toHaveLength(3);
			expect(results.every((r) => r.success)).toBe(true);

			// 直列実行順序の確認
			expect(executionOrder).toEqual([
				"transfer1-start",
				"transfer1-complete",
				"transfer2-start",
				"transfer2-complete",
				"transfer3-start",
				"transfer3-complete",
			]);
		});

		it("calls PowerShell executor with correct parameters", async () => {
			mockExecutor.invokeAsync.mockResolvedValueOnce({
				returnCode: 0,
				stdout: "Transfer completed",
				stderr: "",
			});

			await executeTransfer(transferOptions);

			expect(mockCreateRemotePwshExecutor).toHaveBeenCalledWith({
				host: "test-node",
				user: "testuser",
				scriptPath: expect.stringContaining("sendDirectory.ps1"),
				parameters: ["/local/source/path", "/remote/dest/path"],
			});
		});
	});

	describe("PowerShell script selection", () => {
		it("uses sendDirectory.ps1 for send operations", async () => {
			const sendOptions = { ...transferOptions, type: "send" as const };

			await executeTransfer(sendOptions);

			expect(mockCreateRemotePwshExecutor).toHaveBeenCalledWith(
				expect.objectContaining({
					scriptPath: expect.stringContaining("sendDirectory.ps1"),
				}),
			);
		});

		it("uses receiveDirectory.ps1 for receive operations", async () => {
			const receiveOptions = { ...transferOptions, type: "receive" as const };

			await executeTransfer(receiveOptions);

			expect(mockCreateRemotePwshExecutor).toHaveBeenCalledWith(
				expect.objectContaining({
					scriptPath: expect.stringContaining("receiveDirectory.ps1"),
				}),
			);
		});
	});

	describe("Error handling", () => {
		it("handles PowerShell execution failure", async () => {
			mockExecutor.invokeAsync.mockResolvedValueOnce({
				returnCode: 1,
				stdout: "",
				stderr: "Access denied",
			});

			await expect(executeTransfer(transferOptions, mockHooks)).rejects.toThrow(
				"Access denied",
			);

			expect(mockHooks.onStart).toHaveBeenCalled();
			expect(mockHooks.onError).toHaveBeenCalledWith({
				message: "Access denied",
				phase: "transfer",
			});
			expect(mockHooks.onComplete).not.toHaveBeenCalled();
		});

		it("handles PowerShell executor exceptions", async () => {
			const executorError = new Error("Connection failed");
			mockExecutor.invokeAsync.mockRejectedValueOnce(executorError);

			await expect(executeTransfer(transferOptions, mockHooks)).rejects.toThrow(
				"Connection failed",
			);

			expect(mockHooks.onError).toHaveBeenCalledWith({
				message: "Connection failed",
				phase: "transfer",
			});
		});

		it("continues execution after transfer failure", async () => {
			mockExecutor.invokeAsync
				.mockResolvedValueOnce({ returnCode: 1, stdout: "", stderr: "Error1" })
				.mockResolvedValueOnce({
					returnCode: 0,
					stdout: "Success",
					stderr: "",
				});

			const promises = [
				executeTransfer(transferOptions).catch(() => "failed"),
				executeTransfer(transferOptions),
			];

			const results = await Promise.all(promises);

			expect(results[0]).toBe("failed");
			expect((results[1] as TransferResult).success).toBe(true);
		});

		it("handles empty stderr correctly", async () => {
			mockExecutor.invokeAsync.mockResolvedValueOnce({
				returnCode: 1,
				stdout: "",
				stderr: "",
			});

			await expect(executeTransfer(transferOptions)).rejects.toThrow(
				"Transfer failed",
			);
		});
	});

	describe("sendDirectory function", () => {
		it("calls executeTransfer with send type", async () => {
			mockExecutor.invokeAsync.mockResolvedValueOnce({
				returnCode: 0,
				stdout: "Send completed",
				stderr: "",
			});

			const result = await sendDirectory(
				{ ...transferOptions, type: "receive" }, // type should be overridden
				mockHooks,
			);

			expect(result.success).toBe(true);
			expect(mockCreateRemotePwshExecutor).toHaveBeenCalledWith(
				expect.objectContaining({
					scriptPath: expect.stringContaining("sendDirectory.ps1"),
				}),
			);
		});
	});

	describe("receiveDirectory function", () => {
		it("calls executeTransfer with receive type", async () => {
			mockExecutor.invokeAsync.mockResolvedValueOnce({
				returnCode: 0,
				stdout: "Receive completed",
				stderr: "",
			});

			const result = await receiveDirectory(
				{ ...transferOptions, type: "send" }, // type should be overridden
				mockHooks,
			);

			expect(result.success).toBe(true);
			expect(mockCreateRemotePwshExecutor).toHaveBeenCalledWith(
				expect.objectContaining({
					scriptPath: expect.stringContaining("receiveDirectory.ps1"),
				}),
			);
		});
	});

	describe("validateTransferOptions function", () => {
		it("validates transfer options correctly", () => {
			const validOptions = {
				...transferOptions,
				sourcePath: "/valid/path",
				destinationPath: "/valid/dest",
				nodeConnection: {
					hostname: "valid-host",
					username: "valid-user",
					port: 22,
				},
			};

			const result = validateTransferOptions(validOptions);

			expect(result.valid).toBe(true);
			expect(result.errors).toEqual([]);
		});

		it("detects validation errors", () => {
			const invalidOptions = {
				...transferOptions,
				sourcePath: "",
				destinationPath: "   ",
				nodeConnection: {
					hostname: "",
					username: "   ",
					port: 22,
				},
			};

			const result = validateTransferOptions(invalidOptions);

			expect(result.valid).toBe(false);
			expect(result.errors).toContain("Source path is required");
			expect(result.errors).toContain("Destination path is required");
			expect(result.errors).toContain("Node hostname is required");
			expect(result.errors).toContain("Node username is required");
		});
	});

	describe("Queue functionality", () => {
		it("returns same queue instance from getFileTransferQueue", () => {
			const queue1 = getFileTransferQueue();
			const queue2 = getFileTransferQueue();

			expect(queue1).toBe(queue2);
		});
	});

	describe("Function-based design verification", () => {
		it("functions work without class instantiation", async () => {
			// 関数がクラスインスタンス生成なしで動作することを確認
			mockExecutor.invokeAsync.mockResolvedValueOnce({
				returnCode: 0,
				stdout: "Success",
				stderr: "",
			});

			const result = await executeTransfer(transferOptions);

			expect(result.success).toBe(true);
			expect(typeof executeTransfer).toBe("function");
			expect(typeof sendDirectory).toBe("function");
			expect(typeof receiveDirectory).toBe("function");
			expect(typeof validateTransferOptions).toBe("function");
		});

		it("functions do not duplicate logic", async () => {
			mockExecutor.invokeAsync.mockResolvedValue({
				returnCode: 0,
				stdout: "Success",
				stderr: "",
			});

			// sendDirectory と receiveDirectory が同じ基盤を使用することを確認
			await sendDirectory(transferOptions);
			await receiveDirectory(transferOptions);

			// 2回の呼び出しで2回のPowerShell実行
			expect(mockCreateRemotePwshExecutor).toHaveBeenCalledTimes(2);
		});
	});

	describe("Edge cases", () => {
		it("handles transfer result with timing information", async () => {
			mockExecutor.invokeAsync.mockImplementation(async () => {
				await delay(10); // 実行時間をシミュレート
				return { returnCode: 0, stdout: "Success", stderr: "" };
			});

			const result = await executeTransfer(transferOptions);

			expect(result.success).toBe(true);
			expect(result.transferTimeMs).toBeGreaterThan(5);
		});

		it("handles PowerShell executor throwing exception", async () => {
			const error = new Error("Network timeout");
			mockExecutor.invokeAsync.mockRejectedValueOnce(error);

			await expect(executeTransfer(transferOptions)).rejects.toThrow(
				"Network timeout",
			);
		});
	});

	describe("Parameter passing verification", () => {
		it("passes correct parameters to sendDirectory.ps1", async () => {
			const options = {
				...transferOptions,
				type: "send" as const,
				sourcePath: "/app/uploads/jobs/123",
				destinationPath: "/tmp/abaqus_jobs/123",
			};

			await executeTransfer(options);

			expect(mockCreateRemotePwshExecutor).toHaveBeenCalledWith({
				host: "test-node",
				user: "testuser",
				scriptPath: expect.stringContaining("sendDirectory.ps1"),
				parameters: ["/app/uploads/jobs/123", "/tmp/abaqus_jobs/123"],
			});
		});

		it("passes correct parameters to receiveDirectory.ps1", async () => {
			const options = {
				...transferOptions,
				type: "receive" as const,
				sourcePath: "/tmp/abaqus_jobs/456/results",
				destinationPath: "/app/results/jobs/456",
			};

			await executeTransfer(options);

			expect(mockCreateRemotePwshExecutor).toHaveBeenCalledWith({
				host: "test-node",
				user: "testuser",
				scriptPath: expect.stringContaining("receiveDirectory.ps1"),
				parameters: ["/tmp/abaqus_jobs/456/results", "/app/results/jobs/456"],
			});
		});
	});
});
