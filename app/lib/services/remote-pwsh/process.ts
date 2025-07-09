import { spawn, type ChildProcess } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SESSION_SCRIPT_PATH = join(
	__dirname,
	"../../../resources/ps-scripts/sshRemoteSession.ps1",
);

export function spawnPowerShellProcess(
	host: string,
	user: string,
	scriptPath: string,
): ChildProcess {
	return spawn("pwsh", [SESSION_SCRIPT_PATH, host, user, scriptPath]);
}