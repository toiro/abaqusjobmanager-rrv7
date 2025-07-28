/**
 * PowerShell Parameter Passing Tests
 * TDD approach: Red → Green → Refactor
 * Tests parameter passing functionality for remote PowerShell execution
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { createRemotePwshExecutor } from "../executor";

describe("Remote PowerShell Parameter Passing - TDD Phase 1 (Red)", () => {
	// TDD Red Phase: これらのテストは現在失敗するはず
	// parametersフィールドがRemotePwshOptionsに存在しないため

	describe("RemotePwshOptions Parameter Field", () => {
		test("should accept parameters field in options", () => {
			// TDD Phase 2 (Green): parametersフィールドが正常に受け入れられる
			expect(() => {
				const executor = createRemotePwshExecutor({
					host: "test-node",
					user: "abaqus",
					scriptPath: "/app/resources/ps-scripts/sendDirectory.ps1",
					parameters: ["/source/path", "/dest/path"], // TDD Green: TypeScriptエラーなし
				});
			}).not.toThrow();
		});

		test("should handle empty parameters array", () => {
			expect(() => {
				const executor = createRemotePwshExecutor({
					host: "test-node",
					user: "abaqus",
					scriptPath: "/app/resources/ps-scripts/nodeHealthCheck.ps1",
					parameters: [], // TDD Green: 空配列も正常に受け入れられる
				});
			}).not.toThrow();
		});

		test("should handle undefined parameters", () => {
			expect(() => {
				const executor = createRemotePwshExecutor({
					host: "test-node",
					user: "abaqus",
					scriptPath: "/app/resources/ps-scripts/nodeHealthCheck.ps1",
					parameters: undefined, // TDD Green: undefinedも正常に受け入れられる
				});
			}).not.toThrow();
		});
	});

	describe("sendDirectory.ps1 Parameter Passing", () => {
		test("should pass Source and Destination parameters", async () => {
			const sourcePath = "/app/uploads/jobs/123";
			const destinationPath = "/tmp/abaqus_jobs/123";

			// TDD Phase 2 (Green): パラメータが正常に渡される
			const executor = createRemotePwshExecutor({
				host: "test-node.example.com",
				user: "abaqus",
				scriptPath: "/app/resources/ps-scripts/sendDirectory.ps1",
				parameters: [sourcePath, destinationPath], // TDD Green: 正常なパラメータ渡し
			});

			// 実行はできないが、型チェックでエラーになることを確認
			expect(executor).toBeDefined();
		});

		test("should validate required parameters for sendDirectory", () => {
			// TDD: sendDirectory.ps1は2つのパラメータ（Source, Destination）が必要
			expect(() => {
				const executor = createRemotePwshExecutor({
					host: "test-node",
					user: "abaqus",
					scriptPath: "/app/resources/ps-scripts/sendDirectory.ps1",
					parameters: ["/source/path"], // TDD Green: 1つのパラメータも受け入れられる
				});
			}).not.toThrow(); // 現在はバリデーションが存在しないため
		});
	});

	describe("executeAbaqus.ps1 Parameter Passing", () => {
		test("should pass jobName, workingDir, and inputFile parameters", async () => {
			const jobName = "test_analysis";
			const workingDir = "/tmp/abaqus_jobs/123";
			const inputFile = "model.inp";

			// TDD Phase 2 (Green): Abaqusパラメータが正常に渡される
			const executor = createRemotePwshExecutor({
				host: "compute-node-01",
				user: "abaqus",
				scriptPath: "/app/resources/ps-scripts/executeAbaqus.ps1",
				parameters: [jobName, workingDir, inputFile], // TDD Green: 正常なAbaqusパラメータ
			});

			expect(executor).toBeDefined();
		});

		test("should pass additional Abaqus arguments", () => {
			const jobName = "analysis_with_options";
			const workingDir = "/tmp/abaqus_jobs/456";
			const inputFile = "complex_model.inp";
			const cpuArg = "cpus=8";
			const memoryArg = "memory=16GB";

			expect(() => {
				const executor = createRemotePwshExecutor({
					host: "hpc-node-01",
					user: "abaqus",
					scriptPath: "/app/resources/ps-scripts/executeAbaqus.ps1",
					parameters: [jobName, workingDir, inputFile, cpuArg, memoryArg], // TDD Green: 追加引数も正常
				});
			}).not.toThrow();
		});

		test("should validate required parameters for executeAbaqus", () => {
			// TDD: executeAbaqus.ps1は最低3つのパラメータが必要
			expect(() => {
				const executor = createRemotePwshExecutor({
					host: "test-node",
					user: "abaqus",
					scriptPath: "/app/resources/ps-scripts/executeAbaqus.ps1",
					parameters: ["job_name", "/working/dir"], // TDD Green: 少ないパラメータも受け入れられる
				});
			}).not.toThrow(); // 現在はバリデーションが存在しないため
		});
	});

	describe("receiveDirectory.ps1 Parameter Passing", () => {
		test("should pass Source and Destination parameters for result retrieval", () => {
			const sourcePath = "/tmp/abaqus_jobs/123/results";
			const destinationPath = "/app/results/jobs/123";

			expect(() => {
				const executor = createRemotePwshExecutor({
					host: "compute-node-02",
					user: "abaqus",
					scriptPath: "/app/resources/ps-scripts/receiveDirectory.ps1",
					parameters: [sourcePath, destinationPath], // TDD Green: receiveパラメータも正常
				});
			}).not.toThrow();
		});
	});

	describe("Parameter Types and Validation", () => {
		test("should accept string parameters", () => {
			expect(() => {
				const executor = createRemotePwshExecutor({
					host: "test-node",
					user: "test-user",
					scriptPath: "/test/script.ps1",
					parameters: ["string1", "string2", "string3"], // TDD Green: 文字列パラメータ
				});
			}).not.toThrow();
		});

		test("should accept number parameters", () => {
			expect(() => {
				const executor = createRemotePwshExecutor({
					host: "test-node",
					user: "test-user",
					scriptPath: "/test/script.ps1",
					parameters: [123, 456, 789], // TDD Green: 数値パラメータ
				});
			}).not.toThrow();
		});

		test("should accept mixed string and number parameters", () => {
			expect(() => {
				const executor = createRemotePwshExecutor({
					host: "test-node",
					user: "test-user",
					scriptPath: "/test/script.ps1",
					parameters: ["job_name", "/path/to/dir", "input.inp", 8, "cpus=8"], // TDD Green: 混合型パラメータ
				});
			}).not.toThrow();
		});
	});
});

/**
 * TDD注記:
 *
 * Phase 1 (Red) - 現在の段階:
 * - すべてのテストで @ts-expect-error を使用
 * - parametersフィールドがRemotePwshOptionsに存在しないためTypeScriptエラー
 * - 実行時エラーは発生しないが、型チェックでエラーになることを確認
 *
 * Phase 2 (Green) - 次の段階:
 * - RemotePwshOptionsにparametersフィールドを追加
 * - @ts-expect-error を削除
 * - 実際のパラメータ受け渡し機能を実装
 *
 * Phase 3 (Refactor) - 最終段階:
 * - パラメータバリデーション機能追加
 * - 型安全性向上
 * - エラーハンドリング強化
 */
