import { beforeEach, describe, expect, it, mock } from "bun:test";
import { executeAbaqus } from "../abaqus-executor";
import type {
	AbaqusExecutionContext,
	AbaqusExecutionHooks,
	AbaqusExecutionOptions,
	AbaqusExecutionResult,
	AbaqusProgress,
	NodeConnection,
} from "../types";

// テストユーティリティ
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// remote-pwsh executor のモック
const mockExecutor = {
	invokeAsync: mock(() =>
		Promise.resolve({
			returnCode: 0,
			stdout: "Abaqus analysis completed successfully",
			stderr: "",
		}),
	),
	on: mock((event: string, callback: Function) => {
		// イベント登録のモック（必要に応じて後で実装）
	}),
};

const mockCreateRemotePwshExecutor = mock(() => mockExecutor);

// モジュールのモック
mock.module("~/server/lib/remote-pwsh/executor", () => ({
	createRemotePwshExecutor: mockCreateRemotePwshExecutor,
}));

describe("AbaqusExecutor Functions", () => {
	let abaqusOptions: AbaqusExecutionOptions;
	let nodeConnection: NodeConnection;
	let executionOrder: string[];
	let mockHooks: AbaqusExecutionHooks;

	beforeEach(() => {
		executionOrder = [];

		abaqusOptions = {
			workingDirectory: "/tmp/abaqus_test",
			inputFileName: "test.inp",
			jobName: "test_job",
			cpuCores: 4,
			additionalArgs: ["interactive"],
		};

		nodeConnection = {
			hostname: "abaqus-node",
			username: "abaqus-user",
			port: 22,
		};

		mockHooks = {
			onStart: mock((context: AbaqusExecutionContext) => {
				executionOrder.push(`onStart-${context.jobName}`);
			}),
			onProgress: mock((progress: AbaqusProgress) => {
				executionOrder.push(`onProgress-${progress.percentage}%`);
			}),
			onStdout: mock((line: string) => {
				executionOrder.push(`onStdout-${line.trim()}`);
			}),
			onStderr: mock((line: string) => {
				executionOrder.push(`onStderr-${line.trim()}`);
			}),
			onFinish: mock((result: AbaqusExecutionResult) => {
				executionOrder.push(`onComplete-${result.success}`);
			}),
			onError: mock((error) => {
				executionOrder.push(`onError-${error.message}`);
			}),
		};

		// モックをリセット
		mockExecutor.invokeAsync.mockClear();
		mockExecutor.on.mockClear();
		mockCreateRemotePwshExecutor.mockClear();
		(mockHooks.onStart as any)?.mockClear?.();
		(mockHooks.onProgress as any)?.mockClear?.();
		(mockHooks.onStdout as any)?.mockClear?.();
		(mockHooks.onStderr as any)?.mockClear?.();
		(mockHooks.onFinish as any)?.mockClear?.();
		(mockHooks.onError as any)?.mockClear?.();
	});

	describe("executeAbaqus function", () => {
		it("executes Abaqus successfully", async () => {
			mockExecutor.invokeAsync.mockImplementation(async () => {
				await delay(1); // 最小実行時間を確保
				return {
					returnCode: 0,
					stdout: "Abaqus analysis completed successfully",
					stderr: "",
				};
			});

			const result = await executeAbaqus(
				abaqusOptions,
				nodeConnection,
				mockHooks,
			);

			expect(result.success).toBe(true);
			expect(result.exitCode).toBe(0);
			expect(result.executionTimeMs).toBeGreaterThan(0);
			expect(result.outputFiles).toContain("test_job.odb");

			expect(mockHooks.onStart).toHaveBeenCalledWith(
				expect.objectContaining({
					jobName: "test_job",
					workingDirectory: "/tmp/abaqus_test",
				}),
			);
			expect(mockHooks.onFinish).toHaveBeenCalledWith(result);
			expect(mockHooks.onError).not.toHaveBeenCalled();
		});

		it("calls PowerShell executor with correct parameters", async () => {
			mockExecutor.invokeAsync.mockResolvedValueOnce({
				returnCode: 0,
				stdout: "Abaqus completed",
				stderr: "",
			});

			await executeAbaqus(abaqusOptions, nodeConnection);

			expect(mockCreateRemotePwshExecutor).toHaveBeenCalledWith({
				host: "abaqus-node",
				user: "abaqus-user",
				scriptPath: expect.stringContaining("executeAbaqus.ps1"),
				parameters: [
					"test_job", // jobName
					"/tmp/abaqus_test", // workingDirectory
					"test.inp", // inputFileName
					"cpus=4", // cpuCores
					"interactive", // additionalArgs
				],
			});
		});

		it("handles execution without CPU cores specified", async () => {
			const optionsWithoutCpus = { ...abaqusOptions };
			delete optionsWithoutCpus.cpuCores;

			await executeAbaqus(optionsWithoutCpus, nodeConnection);

			expect(mockCreateRemotePwshExecutor).toHaveBeenCalledWith({
				host: "abaqus-node",
				user: "abaqus-user",
				scriptPath: expect.stringContaining("executeAbaqus.ps1"),
				parameters: [
					"test_job",
					"/tmp/abaqus_test",
					"test.inp",
					"interactive", // no cpus parameter
				],
			});
		});

		it("handles execution without additional args", async () => {
			const optionsWithoutArgs = { ...abaqusOptions };
			delete optionsWithoutArgs.additionalArgs;

			await executeAbaqus(optionsWithoutArgs, nodeConnection);

			expect(mockCreateRemotePwshExecutor).toHaveBeenCalledWith({
				host: "abaqus-node",
				user: "abaqus-user",
				scriptPath: expect.stringContaining("executeAbaqus.ps1"),
				parameters: [
					"test_job",
					"/tmp/abaqus_test",
					"test.inp",
					"cpus=4", // no additional args
				],
			});
		});
	});

	describe("Input validation", () => {
		it("validates working directory", async () => {
			const invalidOptions = { ...abaqusOptions, workingDirectory: "" };

			await expect(
				executeAbaqus(invalidOptions, nodeConnection, mockHooks),
			).rejects.toThrow("Working directory is required");

			expect(mockHooks.onError).toHaveBeenCalledWith({
				message: "Working directory is required",
				phase: "execution",
			});
		});

		it("validates input file name", async () => {
			const invalidOptions = { ...abaqusOptions, inputFileName: "" };

			await expect(
				executeAbaqus(invalidOptions, nodeConnection, mockHooks),
			).rejects.toThrow("Input file name is required");
		});

		it("validates job name", async () => {
			const invalidOptions = { ...abaqusOptions, jobName: "" };

			await expect(
				executeAbaqus(invalidOptions, nodeConnection, mockHooks),
			).rejects.toThrow("Job name is required");
		});

		it("validates CPU cores range", async () => {
			const invalidOptions = { ...abaqusOptions, cpuCores: -1 };

			await expect(
				executeAbaqus(invalidOptions, nodeConnection, mockHooks),
			).rejects.toThrow("CPU cores must be between 1 and 1000");
		});

		it("validates CPU cores upper limit", async () => {
			const invalidOptions = { ...abaqusOptions, cpuCores: 1001 };

			await expect(
				executeAbaqus(invalidOptions, nodeConnection, mockHooks),
			).rejects.toThrow("CPU cores must be between 1 and 1000");
		});
	});

	describe("Error handling", () => {
		it("handles PowerShell execution failure", async () => {
			mockExecutor.invokeAsync.mockResolvedValueOnce({
				returnCode: 1,
				stdout: "",
				stderr: "Abaqus license error",
			});

			const result = await executeAbaqus(
				abaqusOptions,
				nodeConnection,
				mockHooks,
			);

			expect(result.success).toBe(false);
			expect(result.exitCode).toBe(1);
			expect(result.stderr).toBe("Abaqus license error");
			expect(mockHooks.onFinish).toHaveBeenCalledWith(result);
		});

		it("handles PowerShell executor exceptions", async () => {
			const executorError = new Error("SSH connection failed");
			mockExecutor.invokeAsync.mockRejectedValueOnce(executorError);

			const result = await executeAbaqus(
				abaqusOptions,
				nodeConnection,
				mockHooks,
			);

			expect(result.success).toBe(false);
			expect(result.exitCode).toBe(-1);
			expect(result.stderr).toContain("SSH connection failed");
		});

		it("handles validation errors with hooks", async () => {
			const invalidOptions = { ...abaqusOptions, jobName: "" };

			await expect(
				executeAbaqus(invalidOptions, nodeConnection, mockHooks),
			).rejects.toThrow("Job name is required");

			expect(mockHooks.onError).toHaveBeenCalledWith({
				message: "Job name is required",
				phase: "execution",
			});
		});
	});

	describe("Output file detection", () => {
		it("finds expected Abaqus output files", async () => {
			mockExecutor.invokeAsync.mockResolvedValueOnce({
				returnCode: 0,
				stdout: "Abaqus analysis completed",
				stderr: "",
			});

			const result = await executeAbaqus(abaqusOptions, nodeConnection);

			// 期待される出力ファイル形式
			expect(result.outputFiles).toContain("test_job.odb");
			expect(result.outputFiles).toContain("test_job.dat");
			expect(result.outputFiles).toContain("test_job.msg");
			expect(result.outputFiles).toContain("test_job.sta");
			expect(result.outputFiles).toContain("test_job.log");
			expect(result.outputFiles).toContain("test_job.fil");
		});

		it("handles different job names for output files", async () => {
			const customOptions = { ...abaqusOptions, jobName: "custom_analysis" };

			mockExecutor.invokeAsync.mockResolvedValueOnce({
				returnCode: 0,
				stdout: "Abaqus analysis completed",
				stderr: "",
			});

			const result = await executeAbaqus(customOptions, nodeConnection);

			expect(result.outputFiles).toContain("custom_analysis.odb");
			expect(result.outputFiles).toContain("custom_analysis.dat");
		});
	});

	describe("Function-based design verification", () => {
		it("works as pure function without class instantiation", async () => {
			mockExecutor.invokeAsync.mockResolvedValueOnce({
				returnCode: 0,
				stdout: "Success",
				stderr: "",
			});

			const result = await executeAbaqus(abaqusOptions, nodeConnection);

			expect(result.success).toBe(true);
			expect(typeof executeAbaqus).toBe("function");
		});

		it("produces consistent results with same inputs", async () => {
			mockExecutor.invokeAsync.mockResolvedValue({
				returnCode: 0,
				stdout: "Consistent output",
				stderr: "",
			});

			const result1 = await executeAbaqus(abaqusOptions, nodeConnection);
			const result2 = await executeAbaqus(abaqusOptions, nodeConnection);

			expect(result1.success).toBe(result2.success);
			expect(result1.exitCode).toBe(result2.exitCode);
		});
	});

	describe("Edge cases", () => {
		it("handles execution result with timing information", async () => {
			mockExecutor.invokeAsync.mockImplementation(async () => {
				await delay(10); // 実行時間をシミュレート
				return { returnCode: 0, stdout: "Success", stderr: "" };
			});

			const result = await executeAbaqus(abaqusOptions, nodeConnection);

			expect(result.success).toBe(true);
			expect(result.executionTimeMs).toBeGreaterThan(5);
		});

		it("handles empty stdout and stderr", async () => {
			mockExecutor.invokeAsync.mockResolvedValueOnce({
				returnCode: 0,
				stdout: "",
				stderr: "",
			});

			const result = await executeAbaqus(abaqusOptions, nodeConnection);

			expect(result.success).toBe(true);
			expect(result.stdout).toBe("");
			expect(result.stderr).toBe("");
		});

		it("handles very long additional arguments", async () => {
			const longArgsOptions = {
				...abaqusOptions,
				additionalArgs: [
					"memory=64GB",
					"scratch=/tmp/very/long/path/to/scratch/directory",
					"user=/path/to/user/subroutines/user_subroutines.for",
					"interactive",
					"ask_delete=OFF",
				],
			};

			await executeAbaqus(longArgsOptions, nodeConnection);

			expect(mockCreateRemotePwshExecutor).toHaveBeenCalledWith(
				expect.objectContaining({
					parameters: expect.arrayContaining([
						"memory=64GB",
						"scratch=/tmp/very/long/path/to/scratch/directory",
						"user=/path/to/user/subroutines/user_subroutines.for",
						"interactive",
						"ask_delete=OFF",
					]),
				}),
			);
		});
	});

	describe("Parameter passing verification", () => {
		it("passes correct parameters with CPU cores", async () => {
			const options = {
				...abaqusOptions,
				jobName: "parametric_study",
				workingDirectory: "/tmp/abaqus_jobs/456",
				inputFileName: "parametric.inp",
				cpuCores: 16,
				additionalArgs: ["memory=32GB", "interactive"],
			};

			await executeAbaqus(options, nodeConnection);

			expect(mockCreateRemotePwshExecutor).toHaveBeenCalledWith({
				host: "abaqus-node",
				user: "abaqus-user",
				scriptPath: expect.stringContaining("executeAbaqus.ps1"),
				parameters: [
					"parametric_study", // jobName
					"/tmp/abaqus_jobs/456", // workingDirectory
					"parametric.inp", // inputFileName
					"cpus=16", // cpuCores
					"memory=32GB", // additionalArgs[0]
					"interactive", // additionalArgs[1]
				],
			});
		});

		it("passes minimal parameters correctly", async () => {
			const minimalOptions = {
				workingDirectory: "/tmp/minimal",
				inputFileName: "minimal.inp",
				jobName: "minimal_job",
			};

			await executeAbaqus(minimalOptions, nodeConnection);

			expect(mockCreateRemotePwshExecutor).toHaveBeenCalledWith({
				host: "abaqus-node",
				user: "abaqus-user",
				scriptPath: expect.stringContaining("executeAbaqus.ps1"),
				parameters: [
					"minimal_job",
					"/tmp/minimal",
					"minimal.inp",
					// no cpus or additional args
				],
			});
		});
	});
});
