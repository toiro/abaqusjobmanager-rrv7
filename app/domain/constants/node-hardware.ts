/**
 * Node Hardware Constants (Domain)
 * 
 * ノードのハードウェア制約に関するドメイン定数
 * 物理的なハードウェア制限とシステム制約
 */

/**
 * ノードが持てる最小CPUコア数制限
 */
export const MIN_NODE_CPU_CORES_LIMIT = 1 as const;

/**
 * ノードが持てる最大CPUコア数制限（システム制約）
 */
export const MAX_NODE_CPU_CORES_LIMIT = 128 as const;

/**
 * デフォルトのノードCPUコア数制限
 */
export const DEFAULT_NODE_CPU_CORES_LIMIT = 4 as const;

/**
 * 最小SSH接続ポート番号
 */
export const MIN_SSH_PORT = 1 as const;

/**
 * 最大SSH接続ポート番号
 */
export const MAX_SSH_PORT = 65535 as const;

/**
 * デフォルトSSHポート
 */
export const DEFAULT_SSH_PORT = 22 as const;

/**
 * ノードCPUコア数制限の妥当性チェック
 */
export const isValidNodeCpuCoresLimit = (cores: number): boolean =>
	cores >= MIN_NODE_CPU_CORES_LIMIT && 
	cores <= MAX_NODE_CPU_CORES_LIMIT && 
	Number.isInteger(cores);

/**
 * SSHポート番号の妥当性チェック
 */
export const isValidSshPort = (port: number): boolean =>
	port >= MIN_SSH_PORT && 
	port <= MAX_SSH_PORT && 
	Number.isInteger(port);

/**
 * ジョブがノード上で実行可能かチェック（CPUコア数制約）
 */
export const canJobRunOnNode = (jobCpuCores: number, nodeCpuLimit: number): boolean =>
	jobCpuCores <= nodeCpuLimit;