export function preparePowerShellEnvironment(): void {
	// delete env.PSModulePath to avoid this issue (https://github.com/PowerShell/PowerShell/issues/18530)
	// biome-ignore lint/performance/noDelete: <バグ回避コードのため、変更には検証が必要>
	delete process.env.PSModulePath;
}