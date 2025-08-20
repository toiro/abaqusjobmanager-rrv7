/**
 * Abaqus Job Constants (Domain)
 * 
 * Abaqusジョブ実行に関するドメイン定数
 * ジョブが使用するCPUコア数の選択肢と制約
 */

/**
 * Abaqusジョブ実行用の推奨CPUコア数オプション
 * UI でユーザーが選択可能な標準的な値
 */
export const ABAQUS_JOB_CPU_CORE_OPTIONS = [2, 4, 8] as const;

/**
 * Abaqusジョブ用CPUコア数オプションの型
 */
export type AbaqusJobCpuCoreOption = typeof ABAQUS_JOB_CPU_CORE_OPTIONS[number];

/**
 * デフォルトのジョブCPUコア数
 */
export const DEFAULT_JOB_CPU_CORES = 2 as const;

/**
 * ジョブが使用できる最小CPUコア数
 */
export const MIN_JOB_CPU_CORES = 1 as const;

/**
 * ジョブCPUコア数の妥当性チェック
 * ノード制限は別途チェックが必要
 */
export const isValidJobCpuCoreCount = (cores: number): boolean => 
	cores >= MIN_JOB_CPU_CORES && Number.isInteger(cores);

/**
 * Abaqus推奨CPUコアオプションの妥当性チェック
 */
export const isAbaqusJobCpuCoreOption = (cores: number): cores is AbaqusJobCpuCoreOption =>
	ABAQUS_JOB_CPU_CORE_OPTIONS.includes(cores as AbaqusJobCpuCoreOption);

/**
 * 指定されたノード上限内での推奨CPUコア数を取得
 */
export const getRecommendedJobCpuCores = (nodeCpuLimit: number): AbaqusJobCpuCoreOption => {
	const validOptions = ABAQUS_JOB_CPU_CORE_OPTIONS.filter(option => option <= nodeCpuLimit);
	return validOptions.length > 0 ? validOptions[validOptions.length - 1] : ABAQUS_JOB_CPU_CORE_OPTIONS[0];
};