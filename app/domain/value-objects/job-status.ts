/**
 * Job Status Value Object (DDD)
 * ジョブの状態を表現する値オブジェクト
 *
 * Domain-Driven Design における Value Object として実装
 * - 不変性: 状態変更時は新しいインスタンスを生成
 * - ビジネスルール: 状態に関連するビジネスロジックを含む
 * - 型安全性: TypeScript の型システムを活用
 */

export const JOB_STATUSES = [
	"waiting",
	"starting",
	"running",
	"completed",
	"failed",
	"missing",
] as const;

export type JobStatus = (typeof JOB_STATUSES)[number];

/**
 * Job Status Value Object のヘルパー関数
 * ドメインロジックをカプセル化
 */
export const JobStatusVO = {
	/**
	 * アクティブな状態（実行中・実行予定）かどうかを判定
	 */
	isActive: (status: JobStatus): boolean =>
		["waiting", "starting", "running"].includes(status),

	/**
	 * 完了状態（成功・失敗問わず）かどうかを判定
	 */
	isCompleted: (status: JobStatus): boolean =>
		["completed", "failed"].includes(status),

	/**
	 * 実行中かどうかを判定
	 */
	isRunning: (status: JobStatus): boolean => status === "running",

	/**
	 * 実行可能な状態かどうかを判定（waiting状態のみ）
	 */
	canExecute: (status: JobStatus): boolean => status === "waiting",

	/**
	 * キャンセル可能な状態かどうかを判定
	 */
	canCancel: (status: JobStatus): boolean =>
		["waiting", "starting", "running"].includes(status),

	/**
	 * 状態の遷移が可能かどうかを判定
	 */
	canTransitionTo: (from: JobStatus, to: JobStatus): boolean => {
		const transitions: Record<JobStatus, JobStatus[]> = {
			waiting: ["starting", "failed"], // キャンセル時はfailed
			starting: ["running", "failed", "missing"],
			running: ["completed", "failed", "missing"],
			completed: [], // 完了後は遷移不可
			failed: [], // 失敗後は遷移不可
			missing: [], // 失認後は遷移不可
		};

		return transitions[from].includes(to);
	},
} as const;
