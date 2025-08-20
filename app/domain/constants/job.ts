/**
 * Job Constants (Domain)
 *
 * ジョブに関するドメイン定数とビジネスルール
 */

/**
 * デフォルトジョブ優先度
 */
export const DEFAULT_JOB_PRIORITY = "normal" as const;

/**
 * ユーザーあたりの最大同時実行ジョブ数
 */
export const MAX_CONCURRENT_JOBS_PER_USER = 10 as const;

/**
 * ジョブ名の最小文字数
 */
export const MIN_JOB_NAME_LENGTH = 3 as const;

/**
 * ジョブ名の最大文字数
 */
export const MAX_JOB_NAME_LENGTH = 100 as const;

/**
 * ジョブタイムアウト（ミリ秒）
 */
export const DEFAULT_JOB_TIMEOUT_MS = 3600000 as const; // 1時間

/**
 * ジョブ実行履歴の保持期間（日数）
 */
export const JOB_HISTORY_RETENTION_DAYS = 30 as const;

/**
 * ジョブ名の妥当性チェック
 */
export const isValidJobName = (name: string): boolean =>
	name.length >= MIN_JOB_NAME_LENGTH &&
	name.length <= MAX_JOB_NAME_LENGTH &&
	name.trim().length > 0;

/**
 * 同時実行ジョブ数の妥当性チェック
 */
export const isValidConcurrentJobCount = (count: number): boolean =>
	count >= 1 &&
	count <= MAX_CONCURRENT_JOBS_PER_USER &&
	Number.isInteger(count);
