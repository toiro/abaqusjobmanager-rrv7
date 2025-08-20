/**
 * Job State Machine Domain Service (Functional)
 *
 * ジョブのステート管理とトランザクション検証を行うドメインサービス
 * - State Transitions: 状態遷移ルールの定義
 * - Business Rules: ビジネスルール検証
 * - Type Safety: 状態遷移の型安全性保証
 */

// === Types ===

import type { JobStatus } from "../../shared/core/types/database";



/**
 * ジョブ状態の情報
 */
export type JobStateInfo = {
	readonly id: number;
	readonly status: JobStatus;
	readonly name: string;
};

// === Constants ===

/**
 * 許可される状態遷移マップ
 * 各状態から遷移可能な状態のリスト
 */
const ALLOWED_TRANSITIONS: Record<JobStatus, readonly JobStatus[]> = {
	waiting: ["starting", "failed"], // waiting（キューイング待ち）
	starting: ["running", "failed", "missing"],
	running: ["completed", "failed", "missing"],
	completed: [], // 完了後は遷移不可
	failed: [], // 失敗後は遷移不可
	missing: [], // 失認後は遷移不可
} as const;

/**
 * ターミナル状態（これ以上遷移しない状態）
 */
const TERMINAL_STATES: readonly JobStatus[] = ["completed"] as const;

/**
 * エラー状態
 */
const ERROR_STATES: readonly JobStatus[] = ["failed", "missing"] as const;

/**
 * 実行中状態
 */
const ACTIVE_STATES: readonly JobStatus[] = ["starting", "running"] as const;

// === Pure Functions ===

/**
 * 状態遷移が許可されているかチェックする純粋関数
 */
const isTransitionAllowed = (from: JobStatus, to: JobStatus): boolean => {
	const allowedNext = ALLOWED_TRANSITIONS[from];
	return allowedNext.includes(to);
};

/**
 * ジョブが終了状態かチェックする純粋関数
 */
const isTerminalState = (status: JobStatus): boolean =>
	TERMINAL_STATES.includes(status);

/**
 * ジョブがエラー状態かチェックする純粋関数
 */
const isErrorState = (status: JobStatus): boolean =>
	ERROR_STATES.includes(status);

/**
 * ジョブが実行中状態かチェックする純粋関数
 */
const isActiveState = (status: JobStatus): boolean =>
	ACTIVE_STATES.includes(status);

/**
 * ジョブの実行を開始可能かチェックする純粋関数
 */
const canStart = (status: JobStatus): boolean => status === "waiting";

/**
 * ジョブをキャンセル可能かチェックする純粋関数
 */
const canCancel = (status: JobStatus): boolean =>
	["waiting", "starting", "running"].includes(status);



/**
 * 次に可能な状態遷移を取得する純粋関数
 */
const getNextPossibleStates = (status: JobStatus): readonly JobStatus[] =>
	ALLOWED_TRANSITIONS[status];

// === Public API (関数型インターフェース) ===

/**
 * Job State Machine Domain Service
 *
 * 関数型ドメインモデリングによる状態管理API
 * すべての関数は純粋関数として実装
 */
export const JobStateMachine = {
	/**
	 * 状態チェック関数群
	 */
	is: {
		terminal: isTerminalState,
		error: isErrorState,
		active: isActiveState,
	},

	/**
	 * アクション可能性チェック関数群
	 */
	can: {
		start: canStart,
		cancel: canCancel,
		transition: isTransitionAllowed,
	},

	/**
	 * ジョブ情報取得関数群
	 */
	get: {
		nextStates: getNextPossibleStates,
	},

	/**
	 * 定数値へのアクセス
	 */
	constants: {
		ALLOWED_TRANSITIONS,
		TERMINAL_STATES,
		ERROR_STATES,
		ACTIVE_STATES,
	},
} as const;
