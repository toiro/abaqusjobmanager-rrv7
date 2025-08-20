/**
 * Entity IDs Value Objects (Domain)
 * 
 * Branded Types による型安全なエンティティID体系
 * - Type Safety: 異なるエンティティIDの混同を防ぐ
 * - Domain Rules: IDの構造とビジネスルールを定義
 * - Infrastructure Independence: 技術実装に依存しない純粋なドメイン表現
 */

// === Branded Types Foundation ===

/**
 * Branded Type基盤 - 型レベルでの識別子追加
 */
export type BrandedId<K, T extends symbol> = K & { [K in T]: true };
type Brand<K, T extends symbol> = BrandedId<K, T>;

// === Entity ID Type Definitions ===

/**
 * ジョブ識別子 (数値型)
 */
export type JobId = Brand<number, symbol>;

/**
 * ノード識別子 (数値型)
 */
export type NodeId = Brand<number, symbol>;

/**
 * ユーザー識別子 (文字列型)
 */
export type UserId = Brand<string, symbol>;

/**
 * ファイルレコード識別子 (数値型)
 */
export type FileRecordId = Brand<number, symbol>;

/**
 * ジョブログ識別子 (数値型)
 */
export type JobLogId = Brand<number, symbol>;

// === Type-Safe Constructor Functions ===

/**
 * JobId Constructor - 型安全なJobID生成
 */
export const JobId = (value: number): JobId => value as JobId;

/**
 * NodeId Constructor - 型安全なNodeID生成
 */
export const NodeId = (value: number): NodeId => value as NodeId;

/**
 * UserId Constructor - 型安全なUserID生成
 */
export const UserId = (value: string): UserId => value as UserId;

/**
 * FileRecordId Constructor - 型安全なFileRecordID生成
 */
export const FileRecordId = (value: number): FileRecordId => value as FileRecordId;

/**
 * JobLogId Constructor - 型安全なJobLogID生成
 */
export const JobLogId = (value: number): JobLogId => value as JobLogId;

// === Alternative Constructor Functions (for API compatibility) ===

/**
 * createJobId - 関数名でのJobID生成
 */
export const createJobId = (value: number): JobId => {
	if (!isJobId(value)) {
		throw new Error(`Invalid JobId: ${value}`);
	}
	return JobId(value);
};

/**
 * createNodeId - 関数名でのNodeID生成
 */
export const createNodeId = (value: number): NodeId => {
	if (!isNodeId(value)) {
		throw new Error(`Invalid NodeId: ${value}`);
	}
	return NodeId(value);
};

/**
 * createUserId - 関数名でのUserID生成
 */
export const createUserId = (value: string): UserId => {
	if (!isUserId(value)) {
		throw new Error(`Invalid UserId: ${value}`);
	}
	return UserId(value);
};

/**
 * createFileRecordId - 関数名でのFileRecordID生成
 */
export const createFileRecordId = (value: number): FileRecordId => {
	if (!isFileRecordId(value)) {
		throw new Error(`Invalid FileRecordId: ${value}`);
	}
	return FileRecordId(value);
};

/**
 * createJobLogId - 関数名でのJobLogID生成
 */
export const createJobLogId = (value: number): JobLogId => {
	if (!isJobLogId(value)) {
		throw new Error(`Invalid JobLogId: ${value}`);
	}
	return JobLogId(value);
};

// === Domain Rule Validators (Type Guards) ===

/**
 * JobId妥当性チェック - ドメインルールに基づく検証
 */
export const isJobId = (value: any): value is JobId => 
	typeof value === 'number' && Number.isInteger(value) && value > 0;

/**
 * NodeId妥当性チェック - ドメインルールに基づく検証
 */
export const isNodeId = (value: any): value is NodeId => 
	typeof value === 'number' && Number.isInteger(value) && value > 0;

/**
 * UserId妥当性チェック - ドメインルールに基づく検証
 */
export const isUserId = (value: any): value is UserId => 
	typeof value === 'string' && value.length >= 2 && value.trim().length > 0;

/**
 * FileRecordId妥当性チェック - ドメインルールに基づく検証
 */
export const isFileRecordId = (value: any): value is FileRecordId => 
	typeof value === 'number' && Number.isInteger(value) && value > 0;

/**
 * JobLogId妥当性チェック - ドメインルールに基づく検証
 */
export const isJobLogId = (value: any): value is JobLogId => 
	typeof value === 'number' && Number.isInteger(value) && value > 0;

// === Utility Types ===

/**
 * 全エンティティIDの Union Type
 */
export type EntityId = JobId | NodeId | UserId | FileRecordId | JobLogId;

/**
 * 数値型エンティティIDの Union Type
 */
export type NumericEntityId = JobId | NodeId | FileRecordId | JobLogId;

/**
 * 文字列型エンティティIDの Union Type
 */
export type StringEntityId = UserId;

// === Domain Constants ===

/**
 * ID関連のドメイン定数
 */
export const ENTITY_ID_CONSTRAINTS = {
	/**
	 * ユーザーIDの最小文字数
	 */
	MIN_USER_ID_LENGTH: 2,
	
	/**
	 * ユーザーIDの最大文字数
	 */
	MAX_USER_ID_LENGTH: 50,
	
	/**
	 * 数値IDの最小値
	 */
	MIN_NUMERIC_ID: 1,
	
	/**
	 * 数値IDの最大値（システム制限）
	 */
	MAX_NUMERIC_ID: Number.MAX_SAFE_INTEGER,
} as const;