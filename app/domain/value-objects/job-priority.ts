/**
 * Job Priority Value Object (DDD)
 * ジョブの優先度を表現する値オブジェクト
 *
 * Domain-Driven Design における Value Object として実装
 * - 優先度に関するビジネスルールをカプセル化
 * - 比較・ソート機能を提供
 * - 型安全性を確保
 */

export const JOB_PRIORITIES = ["low", "normal", "high"] as const;

export type JobPriority = (typeof JOB_PRIORITIES)[number];

/**
 * Job Priority Value Object のヘルパー関数
 * 優先度に関するビジネスロジックをカプセル化
 */
export const JobPriorityVO = {
	/**
	 * 優先度の重み値を取得（数値が大きいほど高優先度）
	 */
	getWeight: (priority: JobPriority): number => {
		const weights: Record<JobPriority, number> = {
			low: 1,
			normal: 2,
			high: 3,
		};
		return weights[priority];
	},

	/**
	 * 2つの優先度を比較（a > b なら正数、a < b なら負数、a === b なら0）
	 */
	compare: (a: JobPriority, b: JobPriority): number => {
		return JobPriorityVO.getWeight(a) - JobPriorityVO.getWeight(b);
	},

	/**
	 * 優先度が高いかどうかを判定（high）
	 */
	isHigh: (priority: JobPriority): boolean => priority === "high",

	/**
	 * デフォルト優先度を取得
	 */
	getDefault: (): JobPriority => "normal",

	/**
	 * 優先度の一覧を重み順（昇順）で取得
	 */
	getAllSorted: (): JobPriority[] =>
		[...JOB_PRIORITIES].sort((a, b) => JobPriorityVO.compare(a, b)),

	/**
	 * 優先度の一覧を重み順（降順）で取得
	 */
	getAllSortedDesc: (): JobPriority[] =>
		[...JOB_PRIORITIES].sort((a, b) => JobPriorityVO.compare(b, a)),

	/**
	 * 表示用ラベルを取得
	 */
	getDisplayLabel: (priority: JobPriority): string => {
		const labels: Record<JobPriority, string> = {
			low: "Low Priority",
			normal: "Normal Priority",
			high: "High Priority",
		};
		return labels[priority];
	},
} as const;
