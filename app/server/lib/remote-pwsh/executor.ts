import {
	addTypedListener,
	createEventManager,
	setupEventHandlers,
} from "./events.js";
import { spawnPowerShellProcess } from "./process.js";
import type { RemotePwshOptions, RemotePwshResult } from "./types.js";
import { preparePowerShellEnvironment } from "./util.js";

export function createRemotePwshExecutor(options: RemotePwshOptions) {
	const { host, user, scriptPath, parameters, encode = "utf8" } = options;
	const eventManager = createEventManager();

	const executor = {
		get lastOutput(): string {
			return eventManager.lastStdout;
		},

		on<K extends keyof import("./types.js").RemotePwshEvents>(
			event: K,
			listener: import("./types.js").RemotePwshEvents[K],
		) {
			addTypedListener(eventManager, event, listener);
			return executor;
		},

		invoke(): void {
			preparePowerShellEnvironment();
			const powerShell = spawnPowerShellProcess(
				host,
				user,
				scriptPath,
				parameters,
			);
			setupEventHandlers(powerShell, eventManager, encode);
		},

		async invokeAsync(): Promise<RemotePwshResult> {
			return new Promise<RemotePwshResult>((resolve, reject) => {
				const startAt = Date.now();
				let stdout = "";
				let stderr = "";

				const cleanupListeners = () => {
					eventManager.emitter.removeAllListeners("stdout");
					eventManager.emitter.removeAllListeners("stderr");
					eventManager.emitter.removeAllListeners("error");
					eventManager.emitter.removeAllListeners("finish");
				};

				eventManager.emitter
					.on("stdout", (line: string) => {
						stdout += line;
					})
					.on("stderr", (line: string) => {
						stderr += line;
					})
					.on("error", (error: Error) => {
						cleanupListeners();
						reject(error);
					})
					.on("finish", (code: number | null, lastOutput: string) => {
						cleanupListeners();
						if (code === null) {
							reject(new Error("Exit code is null"));
							return;
						}

						const finishAt = Date.now();
						resolve({
							host,
							user,
							scriptPath,
							startAt,
							finishAt,
							stdout,
							stderr,
							returnCode: code,
							lastOutput,
						});
					});

				executor.invoke();
			});
		},
	};

	return executor;
}
