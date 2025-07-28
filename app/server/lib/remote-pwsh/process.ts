import { spawn, type ChildProcess } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SESSION_SCRIPT_PATH = join(
	__dirname,
	"../../../../resources/ps-scripts/sshRemoteSession.ps1",
);

export function spawnPowerShellProcess(
	host: string,
	user: string,
	scriptPath: string,
	parameters: (string | number)[] = [], // TDD Phase 2: パラメータ引数追加
): ChildProcess {
	// TDD Phase 2: パラメータをPowerShell呼び出しに追加
	const args = [SESSION_SCRIPT_PATH, host, user, scriptPath];
	if (parameters.length > 0) {
		// パラメータを文字列に変換して追加
		args.push(...parameters.map(String));
	}
	console.log(args);
	return spawn("pwsh", args);
}
