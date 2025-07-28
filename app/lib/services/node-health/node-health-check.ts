/**
 * Simple Node Health Check Function
 * シンプルなSSH接続とヘルスチェック機能
 */

import { getLogger } from "~/lib/core/logger/logger.server";
import { createRemotePwshExecutor } from "~/server/lib/remote-pwsh/executor";

// Type definitions for backward compatibility with ssh-real.test.ts
export interface NodeConfig {
	hostname: string;
	ssh_port: number;
	username: string;
}

export interface HealthCheckConfig {
	testAbaqus?: boolean;
	timeout?: number;
}

export interface NodeHealthResult {
	success: boolean;
	hostname: string;
	connectionTime: number;
	tests: {
		sshConnection: {
			success: boolean;
			error?: string;
		};
		basicCommands?: {
			success: boolean;
			commands: string[];
			error?: string;
		};
		abaqusEnvironment?: {
			success: boolean;
			version?: string;
			error?: string;
		};
	};
	error?: string;
}

/**
 * Test SSH connection and node health
 * 既存のremote-pwshとnodeHealthCheck.ps1を使用したシンプルな実装
 */
export async function testNodeConnection(
	nodeConfig: NodeConfig,
	healthConfig: HealthCheckConfig = {},
): Promise<NodeHealthResult> {
	const logger = getLogger();
	const startTime = Date.now();

	logger.info("NodeHealthCheck: Testing node connection", {
		hostname: nodeConfig.hostname,
		username: nodeConfig.username,
		port: nodeConfig.ssh_port,
	});

	const result: NodeHealthResult = {
		success: false,
		hostname: nodeConfig.hostname,
		connectionTime: 0,
		tests: {
			sshConnection: {
				success: false,
			},
		},
	};

	try {
		// Validate port range
		if (nodeConfig.ssh_port < 1 || nodeConfig.ssh_port > 65535) {
			throw new Error("Port out of valid range (1-65535)");
		}

		// Create remote executor using the health check script
		const executor = createRemotePwshExecutor({
			host: nodeConfig.hostname,
			user: nodeConfig.username,
			scriptPath: "/app/resources/ps-scripts/nodeHealthCheck.ps1",
		});

		// Set up timeout
		const timeout = healthConfig.timeout || 30000;
		let timeoutHandle: Timer | undefined;
		const timeoutPromise = new Promise<never>((_, reject) => {
			timeoutHandle = setTimeout(() => {
				reject(new Error(`Connection timeout after ${timeout}ms`));
			}, timeout);
		});

		// Execute health check with timeout
		const executionPromise = executor.invokeAsync();
		const executionResult = await Promise.race([
			executionPromise,
			timeoutPromise,
		]);

		if (timeoutHandle) {
			clearTimeout(timeoutHandle);
		}

		result.connectionTime = Date.now() - startTime;

		// SSH connection succeeded
		result.tests.sshConnection.success = true;

		if (executionResult.returnCode !== 0) {
			throw new Error(
				`Health check script failed (exit code ${executionResult.returnCode}): ${executionResult.stderr}`,
			);
		}

		// Parse JSON output from PowerShell script
		let healthData: any;
		try {
			healthData = JSON.parse(executionResult.stdout);
		} catch (parseError) {
			throw new Error(
				`Failed to parse health check JSON: ${parseError instanceof Error ? parseError.message : "Unknown parse error"}`,
			);
		}

		// Parse basic commands result
		if (healthData.tests?.basicCommands) {
			result.tests.basicCommands = {
				success: healthData.tests.basicCommands.success || false,
				commands: healthData.tests.basicCommands.commands || [],
				error: healthData.tests.basicCommands.error,
			};
		}

		// Parse Abaqus environment result (if requested)
		if (healthConfig.testAbaqus && healthData.tests?.abaqus) {
			result.tests.abaqusEnvironment = {
				success: healthData.tests.abaqus.available || false,
				version: healthData.tests.abaqus.version,
				error: healthData.tests.abaqus.error,
			};
		}

		// Overall success
		result.success =
			result.tests.sshConnection.success &&
			result.tests.basicCommands?.success !== false &&
			healthData.success !== false;

		if (!result.success && healthData.error) {
			result.error = healthData.error;
		}

		logger.info("NodeHealthCheck: Node connection test completed", {
			hostname: nodeConfig.hostname,
			success: result.success,
			connectionTime: result.connectionTime,
			abaqusAvailable: result.tests.abaqusEnvironment?.success,
		});

		return result;
	} catch (error) {
		result.connectionTime = Date.now() - startTime;
		const errorMessage =
			error instanceof Error ? error.message : "Unknown error";

		logger.error("NodeHealthCheck: Node connection test failed", {
			hostname: nodeConfig.hostname,
			connectionTime: result.connectionTime,
			error: errorMessage,
		});

		result.tests.sshConnection.error = errorMessage;
		result.error = errorMessage;
		return result;
	}
}
