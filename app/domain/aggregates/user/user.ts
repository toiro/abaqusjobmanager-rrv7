/**
 * User Class
 *
 * ユーザーのシンプルな管理クラス
 * - Identity: string ID による識別  
 * - Business Logic: 同時実行ジョブ数制限の管理
 * - State: アクティブ/非アクティブ状態の管理
 */

// === Imports ===

import type { UserId } from "../../value-objects/entity-ids";
import { createUserId, isUserId } from "../../value-objects/entity-ids";

// === Types ===

/**
 * ユーザー作成データ（シンプル化）
 */
export type UserCreationData = {
	readonly id: string;
	readonly maxConcurrentJobs?: number;
};

/**
 * ユーザー再構成データ（シンプル化）
 */
export type UserData = {
	readonly id: UserId;
	readonly maxConcurrentJobs: number;
	readonly isActive: boolean;
};

// === User Class ===

/**
 * User Class
 *
 * ユーザーのシンプルな管理クラス
 */
/**
 * User (Functional DDD)
 *
 * 関数型ドメインモデリングによるユーザー管理
 * - Immutable State: 不変データ構造
 * - Pure Functions: 副作用なしの純粋関数
 * - Simple API: シンプルな関数インターフェース
 */

// === User State (Immutable) ===

/**
 * ユーザー状態（不変オブジェクト）
 */
export type User = {
	readonly id: UserId;
	readonly maxConcurrentJobs: number;
	readonly isActive: boolean;
};

// === Pure Functions ===

/**
 * ユーザー作成（純粋関数）
 */
const createUser = (id: string, maxConcurrentJobs: number = 1): User => {
	if (!isUserId(id)) {
		throw new Error(`Invalid User ID: ${id}`);
	}
	if (maxConcurrentJobs < 1 || maxConcurrentJobs > 5) {
		throw new Error(`Invalid concurrent job limit: ${maxConcurrentJobs}`);
	}
	
	return {
		id: createUserId(id),
		maxConcurrentJobs,
		isActive: true,
	};
};

/**
 * 既存データからユーザー再構成（純粋関数）
 */
const fromData = (data: UserData): User => {
	// data.idは既にUserIdなので、型チェックのみ実行
	if (!isUserId(data.id)) {
		throw new Error(`Invalid User ID: ${data.id}`);
	}
	if (data.maxConcurrentJobs < 1 || data.maxConcurrentJobs > 5) {
		throw new Error(`Invalid concurrent job limit: ${data.maxConcurrentJobs}`);
	}
	
	return {
		id: data.id, // 既にUserId型
		maxConcurrentJobs: data.maxConcurrentJobs,
		isActive: data.isActive,
	};
};

/**
 * 同時実行ジョブ制限変更（純粋関数）
 */
const changeMaxConcurrentJobs = (user: User, newLimit: number): User => {
	if (!user.isActive) {
		throw new Error("Cannot change job limit for inactive user");
	}
	if (newLimit < 1 || newLimit > 5) {
		throw new Error(`Invalid concurrent job limit: ${newLimit}`);
	}
	
	return { ...user, maxConcurrentJobs: newLimit };
};

/**
 * ユーザーアクティベート（純粋関数）
 */
const activate = (user: User): User => {
	return { ...user, isActive: true };
};

/**
 * ユーザー非アクティベート（純粋関数）
 */
const deactivate = (user: User): User => {
	return { ...user, isActive: false };
};

/**
 * 同時実行ジョブ実行可能性チェック（純粋関数）
 */
const canRunConcurrentJobs = (user: User, currentJobCount: number): boolean => {
	if (!user.isActive) return false;
	return currentJobCount < user.maxConcurrentJobs;
};

// === Public API (関数型インターフェース) ===

/**
 * User Functions (Functional DDD API)
 *
 * 関数型ドメインモデリングによるユーザー管理API
 * すべての関数は純粋関数として実装
 */
export const UserFunctions = {
	/**
	 * ユーザー作成・再構成
	 */
	create: createUser,
	fromData: fromData,

	/**
	 * 状態変更操作（新しいUserオブジェクトを返す）
	 */
	changeMaxConcurrentJobs: changeMaxConcurrentJobs,
	activate: activate,
	deactivate: deactivate,

	/**
	 * クエリ操作（副作用なし）
	 */
	canRunConcurrentJobs: canRunConcurrentJobs,
	
	/**
	 * ヘルパー関数
	 */
	helpers: {
		isActive: (user: User): boolean => user.isActive,
		getId: (user: User): UserId => user.id,
		getMaxConcurrentJobs: (user: User): number => user.maxConcurrentJobs,
	},
} as const;