import type { ChildProcess } from "node:child_process";
import { EventEmitter } from "node:events";
import * as iconv from "iconv-lite";
import type { RemotePwshEvents } from "./types.js";

export interface EventManager {
	emitter: EventEmitter;
	count: number;
	lastStdout: string;
}

export function createEventManager(): EventManager {
	return {
		emitter: new EventEmitter(),
		count: 0,
		lastStdout: "",
	};
}

export function setupEventHandlers(
	powerShell: ChildProcess,
	eventManager: EventManager,
	// biome-ignore lint: Default value
	encode: string = "utf8",
): void {
	eventManager.emitter.emit("start");

	powerShell.stdout?.on("data", (data: Buffer) => {
		eventManager.lastStdout = iconv.decode(data, encode);
		eventManager.emitter.emit(
			"stdout",
			eventManager.lastStdout,
			eventManager.count,
		);
		eventManager.count += 1;
	});

	powerShell.stderr?.on("data", (data: Buffer) => {
		eventManager.emitter.emit("stderr", iconv.decode(data, encode));
	});

	powerShell.on("error", (error: Error) => {
		eventManager.emitter.emit("error", error);
	});

	powerShell.on("close", (code: number | null) => {
		eventManager.emitter.emit("finish", code, eventManager.lastStdout);
	});
}

export function addTypedListener<K extends keyof RemotePwshEvents>(
	eventManager: EventManager,
	event: K,
	listener: RemotePwshEvents[K],
): void {
	eventManager.emitter.on(event, listener);
}

export function removeAllListeners(eventManager: EventManager): void {
	eventManager.emitter.removeAllListeners();
}
