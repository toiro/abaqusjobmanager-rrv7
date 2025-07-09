export interface RemotePwshResult {
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

export interface RemotePwshOptions {
	host: string;
	user: string;
	scriptPath: string;
	encode?: string;
}

export interface RemotePwshEvents {
	start: () => void;
	stdout: (line: string, count: number) => void;
	stderr: (line: string) => void;
	error: (error: Error) => void;
	finish: (code: number | null, lastOutput: string) => void;
}