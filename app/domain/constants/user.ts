/**
 * User Domain Constants
 *
 * ユーザードメインに関する定数とビジネスルール
 * - Concurrent Jobs: 同時実行ジョブ数の制限
 * - Validation Rules: ユーザー関連の検証ルール
 */

// === Constants ===

/**
 * 最小同時実行ジョブ数
 */
export const MIN_CONCURRENT_JOBS = 1 as const;

/**
 * 最大同時実行ジョブ数（ユーザーあたり）
 */
export const MAX_CONCURRENT_JOBS_PER_USER = 5 as const;

/**
 * デフォルト同時実行ジョブ数
 */
export const DEFAULT_MAX_CONCURRENT_JOBS = 1 as const;

// === Validation Functions ===

/**
 * 同時実行ジョブ数の妥当性チェック
 */
export const isValidMaxConcurrentJobs = (count: number): boolean =>
	count >= MIN_CONCURRENT_JOBS &&
	count <= MAX_CONCURRENT_JOBS_PER_USER &&
	Number.isInteger(count);

/**
 * 現在のジョブ数が制限内かチェック
 */
export const isWithinConcurrentJobLimit = (
	currentJobCount: number,
	maxConcurrentJobs: number,
): boolean => currentJobCount < maxConcurrentJobs;