/**
 * User Repository Interface
 *
 * ユーザーアグリゲートの永続化を担うリポジトリのインターフェース
 * - CRUD Operations: 基本的な操作
 * - Query Methods: 検索・取得メソッド
 */

// === Imports ===

import type { User } from "./user";
import type { UserId } from "../../value-objects/entity-ids";

// === Repository Interface ===

/**
 * User Repository Interface
 *
 * ユーザーアグリゲートの永続化インターフェース
 * 実装は Infrastructure 層で行う
 */
/**
 * User Repository Interface（シンプル化）
 *
 * ユーザーの永続化を担うリポジトリのインターフェース
 */
/**
 * User Repository Interface (Functional DDD)
 *
 * 関数型ユーザーの永続化インターフェース
 */
export interface UserRepository {
	/**
	 * ユーザーを保存
	 */
	save(user: User): Promise<void>;

	/**
	 * IDでユーザーを検索
	 */
	findById(id: UserId): Promise<User | null>;

	/**
	 * アクティブなユーザーをすべて取得
	 */
	findActiveUsers(): Promise<User[]>;

	/**
	 * すべてのユーザーを取得
	 */
	findAllUsers(): Promise<User[]>;

	/**
	 * ユーザーの存在確認
	 */
	exists(id: UserId): Promise<boolean>;
}