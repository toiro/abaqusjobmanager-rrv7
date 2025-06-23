import { EventEmitter } from "node:events";
import type { ChildProcess } from "node:child_process";
import * as iconv from "iconv-lite";
import type { RemotePwshEvents } from "./types.js";

export interface EventManager {
	emitter: EventEmitter;
	count: number;
	lastOutput: string;
}

export function createEventManager(): EventManager {
	return {
		emitter: new EventEmitter(),
		count: 0,
		lastOutput: "",
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
		eventManager.lastOutput = iconv.decode(data, encode);
		eventManager.emitter.emit(
			"stdout",
			eventManager.lastOutput,
			eventManager.count,
		);
		eventManager.count += 1;
	});

	powerShell.stderr?.on("data", (data: Buffer) => {
		eventManager.lastOutput = iconv.decode(data, encode);
		eventManager.emitter.emit("stderr", eventManager.lastOutput);
	});

	powerShell.on("error", (error: Error) => {
		eventManager.emitter.emit("error", error);
	});

	powerShell.on("close", (code: number | null) => {
		eventManager.emitter.emit("finish", code, eventManager.lastOutput);
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
