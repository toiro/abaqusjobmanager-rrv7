/**
 * Test Utilities for Abaqus Execution Engine
 * Common test setup, mocks, and helper functions
 */

import type {
	AbaqusExecutionHooks,
	AbaqusExecutionOptions,
	AbaqusExecutionResult,
	FileTransferHooks,
	NodeConnection,
	TransferOptions,
	TransferResult,
} from "../types";

// ============================================================================
// Test Data Factories
// ============================================================================

export function createMockNodeConnection(): NodeConnection {
	return {
		hostname: "test-node.example.com",
		username: "abaqus",
		port: 22,
	};
}

export function createMockTransferOptions(): TransferOptions {
	return {
		type: "send",
		sourcePath: "/test/source",
		destinationPath: "/test/destination",
		nodeConnection: createMockNodeConnection(),
	};
}

export function createMockTransferResult(
	overrides: Partial<TransferResult> = {},
): TransferResult {
	return {
		success: true,
		transferTimeMs: 1000,
		...overrides,
	};
}

export function createMockAbaqusOptions(): AbaqusExecutionOptions {
	return {
		workingDirectory: "/tmp/abaqus_test",
		inputFileName: "test.inp",
		jobName: "test_job",
		cpuCores: 4,
	};
}

export function createMockAbaqusResult(
	overrides: Partial<AbaqusExecutionResult> = {},
): AbaqusExecutionResult {
	return {
		success: true,
		exitCode: 0,
		stdout: "Abaqus execution completed successfully",
		stderr: "",
		executionTimeMs: 5000,
		outputFiles: ["test_job.odb", "test_job.dat", "test_job.msg"],
		...overrides,
	};
}

// ============================================================================
// Mock Configuration Types
// ============================================================================

export interface MockExecutorConfig {
	shouldFail?: boolean;
	returnCode?: number;
	stdout?: string;
	stderr?: string;
	stdoutLines?: string[];
	stderrLines?: string[];
	executionDelay?: number;
	errorMessage?: string;
	host?: string;
	user?: string;
	scriptPath?: string;
}

export interface MockExecutionResult {
	host: string;
	user: string;
	scriptPath: string;
	startAt: number;
	finishAt: number;
	returnCode: number;
	stdout: string;
	stderr: string;
	lastOutput: string;
}

// ============================================================================
// Test Scenarios
// ============================================================================

export class TestScenarios {
	static successfulFileTransfer(): MockExecutorConfig {
		return {
			returnCode: 0,
			stdout: "Files transferred successfully",
			stdoutLines: [
				"Starting file transfer...",
				"Transfer progress: 25%",
				"Transfer progress: 50%",
				"Transfer progress: 75%",
				"Transfer completed successfully",
			],
			executionDelay: 200,
		};
	}

	static successfulAbaqusExecution(): MockExecutorConfig {
		return {
			returnCode: 0,
			stdout: "Abaqus analysis completed successfully",
			stdoutLines: [
				"Abaqus 2023 Standard",
				"Step 1, Increment 1 (10% complete)",
				"Step 1, Increment 5 (25% complete)",
				"Step 1, Increment 10 (50% complete)",
				"Step 1, Increment 15 (75% complete)",
				"Analysis completed",
			],
			executionDelay: 500,
		};
	}

	static fileTransferFailure(): MockExecutorConfig {
		return {
			shouldFail: true,
			errorMessage: "Network timeout during file transfer",
			returnCode: 64,
			stderr: "Connection refused",
			executionDelay: 100,
		};
	}

	static abaqusLicenseError(): MockExecutorConfig {
		return {
			returnCode: 1,
			stderr: "ERROR: License checkout failed",
			stdoutLines: [
				"Abaqus 2023 Standard",
				"ERROR: Unable to checkout Abaqus license",
			],
			executionDelay: 200,
		};
	}

	static abaqusComputationProgress(): MockExecutorConfig {
		return {
			returnCode: 0,
			stdout: "Abaqus computation completed with progress tracking",
			stdoutLines: [
				"Abaqus 2023 Standard",
				"Step 1 of 3 completed",
				"Step 2 of 3 completed",
				"Step 3 of 3 completed",
				"Analysis completed successfully",
			],
			executionDelay: 300,
		};
	}

	static networkConnectionError(): MockExecutorConfig {
		return {
			shouldFail: true,
			errorMessage: "Connection refused",
			returnCode: 255,
			stderr: "ssh: connect to host test-node port 22: Connection refused",
			executionDelay: 50,
		};
	}
}

// ============================================================================
// Enhanced Mock Implementation
// ============================================================================

/**
 * Enhanced Mock RemotePwshExecutor for testing
 */
export class MockRemotePwshExecutor {
	private static globalInstances: MockRemotePwshExecutor[] = [];
	private eventListeners: Map<string, Function[]> = new Map();
	private config: MockExecutorConfig;
	private capturedOptions: any = {}; // TDD: パラメータキャプチャ用

	constructor(config: MockExecutorConfig = {}) {
		this.config = {
			shouldFail: false,
			returnCode: 0,
			stdout: "Mock execution completed",
			stderr: "",
			executionDelay: 100,
			host: "mock-host",
			user: "mock-user",
			scriptPath: "mock-script.ps1",
			...config,
		};

		MockRemotePwshExecutor.globalInstances.push(this);
	}

	on(event: string, listener: Function): this {
		if (!this.eventListeners.has(event)) {
			this.eventListeners.set(event, []);
		}
		this.eventListeners.get(event)!.push(listener);
		return this;
	}

	emit(event: string, ...args: any[]): void {
		const listeners = this.eventListeners.get(event) || [];
		listeners.forEach((listener) => {
			try {
				listener(...args);
			} catch (error) {
				console.error(`Mock event listener error for ${event}:`, error);
			}
		});
	}

	async invokeAsync(): Promise<MockExecutionResult> {
		await this.simulateExecution();

		if (this.config.shouldFail) {
			const errorMessage = this.config.errorMessage || "Mock execution failed";
			this.emit("error", new Error(errorMessage));
			throw new Error(errorMessage);
		}

		this.emit("finish", this.config.returnCode, this.config.stdout);

		return {
			host: this.config.host!,
			user: this.config.user!,
			scriptPath: this.config.scriptPath!,
			startAt: Date.now() - (this.config.executionDelay || 100),
			finishAt: Date.now(),
			returnCode: this.config.returnCode!,
			stdout: this.config.stdout!,
			stderr: this.config.stderr!,
			lastOutput: this.config.stdout!,
		};
	}

	private async simulateExecution(): Promise<void> {
		const delay = this.config.executionDelay || 100;
		await new Promise((resolve) => setTimeout(resolve, delay));

		// Simulate stdout lines with timing
		if (this.config.stdoutLines) {
			for (const line of this.config.stdoutLines) {
				this.emit("stdout", line);
				await new Promise((resolve) => setTimeout(resolve, 10));
			}
		} else if (this.config.stdout) {
			this.emit("stdout", this.config.stdout);
		}

		// Simulate stderr lines with timing
		if (this.config.stderrLines) {
			for (const line of this.config.stderrLines) {
				this.emit("stderr", line);
				await new Promise((resolve) => setTimeout(resolve, 10));
			}
		} else if (this.config.stderr) {
			this.emit("stderr", this.config.stderr);
		}
	}

	// Global state management for testing
	static resetGlobalState(): void {
		MockRemotePwshExecutor.globalInstances.forEach((instance) => {
			instance.eventListeners.clear();
		});
		MockRemotePwshExecutor.globalInstances = [];
	}

	static getAllInstances(): MockRemotePwshExecutor[] {
		return [...MockRemotePwshExecutor.globalInstances];
	}

	static getInstanceCount(): number {
		return MockRemotePwshExecutor.globalInstances.length;
	}

	// Configuration access for testing
	getConfig(): MockExecutorConfig {
		return { ...this.config };
	}

	updateConfig(updates: Partial<MockExecutorConfig>): void {
		this.config = { ...this.config, ...updates };
	}

	// TDD: パラメータキャプチャ機能
	captureOptions(options: any): void {
		this.capturedOptions = { ...options };
	}

	getCapturedOptions(): any {
		return { ...this.capturedOptions };
	}

	getCapturedParameters(): (string | number)[] {
		return this.capturedOptions.parameters || [];
	}
}

/**
 * Smart Mock Factory - selects appropriate scenario based on script path
 */
export function createMockRemotePwshExecutor(
	options: any,
): MockRemotePwshExecutor {
	let executor: MockRemotePwshExecutor;

	// Determine appropriate scenario based on script path
	if (options?.scriptPath?.includes("sendDirectory")) {
		executor = new MockRemotePwshExecutor(
			TestScenarios.successfulFileTransfer(),
		);
	} else if (options?.scriptPath?.includes("receiveDirectory")) {
		executor = new MockRemotePwshExecutor(
			TestScenarios.successfulFileTransfer(),
		);
	} else if (options?.scriptPath?.includes("executeAbaqus")) {
		executor = new MockRemotePwshExecutor(
			TestScenarios.successfulAbaqusExecution(),
		);
	} else {
		// Default scenario
		executor = new MockRemotePwshExecutor({
			returnCode: 0,
			stdout: "Mock execution completed",
		});
	}

	// TDD: パラメータキャプチャ - オプションを保存
	executor.captureOptions(options);

	return executor;
}

/**
 * Custom Mock Factory - for specific test scenarios
 */
export function createCustomMockExecutor(
	scenario: MockExecutorConfig,
): MockRemotePwshExecutor {
	return new MockRemotePwshExecutor(scenario);
}

// ============================================================================
// Test Hook Collectors
// ============================================================================

export class TransferHookCollector {
	public startCalls: any[] = [];
	public progressCalls: any[] = [];
	public completeCalls: any[] = [];
	public errorCalls: any[] = [];

	getHooks(): FileTransferHooks {
		return {
			onStart: (context) => this.startCalls.push(context),
			onComplete: (result) => this.completeCalls.push(result),
			onError: (error) => this.errorCalls.push(error),
		};
	}

	reset() {
		this.startCalls = [];
		this.progressCalls = [];
		this.completeCalls = [];
		this.errorCalls = [];
	}
}

export class AbaqusHookCollector {
	public startCalls: any[] = [];
	public progressCalls: any[] = [];
	public stdoutCalls: any[] = [];
	public stderrCalls: any[] = [];
	public completeCalls: any[] = [];
	public errorCalls: any[] = [];

	getHooks(): AbaqusExecutionHooks {
		return {
			onStart: (context) => this.startCalls.push(context),
			onProgress: (progress) => this.progressCalls.push(progress),
			onStdout: (line) => this.stdoutCalls.push(line),
			onStderr: (line) => this.stderrCalls.push(line),
			onFinish: (result) => this.completeCalls.push(result),
			onError: (error) => this.errorCalls.push(error),
		};
	}

	reset() {
		this.startCalls = [];
		this.progressCalls = [];
		this.stdoutCalls = [];
		this.stderrCalls = [];
		this.completeCalls = [];
		this.errorCalls = [];
	}
}

// ============================================================================
// Mock Repository Classes
// ============================================================================

export class MockJobRepository {
	private jobs: Map<number, any> = new Map();
	private nextId = 1;

	findJobById(id: number) {
		return this.jobs.get(id) || null;
	}

	updateJobStatus(id: number, status: string, errorMessage?: string) {
		const job = this.jobs.get(id);
		if (job) {
			job.status = status;
			if (errorMessage) {
				job.error_message = errorMessage;
			}
		}
		return true;
	}

	updateStartTime(id: number, startTime: string) {
		const job = this.jobs.get(id);
		if (job) {
			job.start_time = startTime;
		}
		return true;
	}

	updateEndTime(id: number, endTime: string) {
		const job = this.jobs.get(id);
		if (job) {
			job.end_time = endTime;
		}
		return true;
	}

	// Test helper methods
	createTestJob(overrides: any = {}) {
		const job = {
			id: this.nextId++,
			name: "test_job",
			status: "waiting",
			node_id: 1,
			user_id: 1,
			cpu_cores: 4,
			file_id: 1,
			priority: "normal",
			...overrides,
		};
		this.jobs.set(job.id, job);
		return job;
	}

	clear() {
		this.jobs.clear();
		this.nextId = 1;
	}
}

export class MockNodeRepository {
	private nodes: Map<number, any> = new Map();

	findNodeById(id: number) {
		return this.nodes.get(id) || null;
	}

	// Test helper methods
	createTestNode(overrides: any = {}) {
		const node = {
			id: 1,
			name: "test-node",
			hostname: "test-node.example.com",
			ssh_username: "abaqus",
			ssh_port: 22,
			status: "available",
			...overrides,
		};
		this.nodes.set(node.id, node);
		return node;
	}

	clear() {
		this.nodes.clear();
	}
}

export class MockFileRepository {
	private files: Map<number, any> = new Map();

	findFileById(id: number) {
		return this.files.get(id) || null;
	}

	// Test helper methods
	createTestFile(overrides: any = {}) {
		const file = {
			id: 1,
			original_name: "test.inp",
			file_path: "/uploads/test.inp",
			file_size: 1024,
			...overrides,
		};
		this.files.set(file.id, file);
		return file;
	}

	clear() {
		this.files.clear();
	}
}

// ============================================================================
// Test Assertions
// ============================================================================

export function expectHookCalled(
	collector: TransferHookCollector | AbaqusHookCollector,
	hookName: string,
	times: number = 1,
) {
	const calls = (collector as any)[`${hookName}Calls`];
	if (calls.length !== times) {
		throw new Error(
			`Expected ${hookName} to be called ${times} times, but was called ${calls.length} times`,
		);
	}
}

export function expectTransferSuccess(result: TransferResult) {
	if (!result.success) {
		throw new Error(
			`Expected transfer to succeed, but failed: ${result.errorMessage}`,
		);
	}
}

export function expectAbaqusSuccess(result: AbaqusExecutionResult) {
	if (!result.success) {
		throw new Error(
			`Expected Abaqus execution to succeed, but failed with exit code: ${result.exitCode}`,
		);
	}
}

/**
 * TDD用: パラメータが正しく設定されているかをテスト
 */
export function expectParametersConfigured(
	scriptType: "sendDirectory" | "receiveDirectory" | "executeAbaqus",
	expectedParams: (string | number)[],
): void {
	const executor = getMockExecutorByScriptPath(scriptType);
	if (!executor) {
		throw new Error(`No mock executor found for script type: ${scriptType}`);
	}
	expectParametersPassedCorrectly(executor, expectedParams);
}

// ============================================================================
// Setup/Teardown Helpers
// ============================================================================

/**
 * Test Environment Setup (Legacy - use mock.module instead)
 * @deprecated Use bun:test mock.module for better reliability
 */
export function setupTestEnvironment() {
	console.warn("setupTestEnvironment is deprecated. Use mock.module instead.");

	// Reset mock state
	MockRemotePwshExecutor.resetGlobalState();

	return () => {
		// Cleanup
		MockRemotePwshExecutor.resetGlobalState();
	};
}

/**
 * Modern Test Environment Setup for Bun
 */
export function setupBunTestEnvironment() {
	// Reset mock state before each test
	MockRemotePwshExecutor.resetGlobalState();

	return () => {
		// Cleanup after each test
		MockRemotePwshExecutor.resetGlobalState();
	};
}

// ============================================================================
// TDD Parameter Testing Helpers
// ============================================================================

/**
 * TDD用パラメータ検証ヘルパー関数
 */
export function expectParametersPassedCorrectly(
	executor: MockRemotePwshExecutor,
	expectedParams: (string | number)[],
): void {
	const captured = executor.getCapturedParameters();
	if (captured.length !== expectedParams.length) {
		throw new Error(
			`Expected ${expectedParams.length} parameters, but got ${captured.length}`,
		);
	}

	for (let i = 0; i < expectedParams.length; i++) {
		if (captured[i] !== expectedParams[i]) {
			throw new Error(
				`Parameter ${i}: expected '${expectedParams[i]}', but got '${captured[i]}'`,
			);
		}
	}
}

/**
 * 最後に作成されたMockExecutorインスタンスを取得
 */
export function getLastMockExecutorInstance(): MockRemotePwshExecutor | null {
	const instances = MockRemotePwshExecutor.getAllInstances();
	return instances.length > 0 ? instances[instances.length - 1] : null;
}

/**
 * 特定のスクリプトパス用のMockExecutorインスタンスを取得
 */
export function getMockExecutorByScriptPath(
	scriptPath: string,
): MockRemotePwshExecutor | null {
	const instances = MockRemotePwshExecutor.getAllInstances();
	return (
		instances.find((instance) => {
			const options = instance.getCapturedOptions();
			return options.scriptPath?.includes(scriptPath);
		}) || null
	);
}
