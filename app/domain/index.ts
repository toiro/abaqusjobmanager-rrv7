/**
 * Domain Layer Public API
 *
 * ドメイン層の公開インターフェース
 * - Value Objects: エンティティID、ドメイン値オブジェクト
 * - Constants: ドメイン定数とビジネスルール
 * - Services: ドメインサービス（関数型実装）
 */

// === Value Objects ===
export {
	createFileRecordId,
	createJobId,
	createJobLogId,
	createNodeId,
	createUserId,
	FileRecordId,
	JobId,
	JobLogId,
	NodeId,
	UserId,
	type BrandedId,
} from "./value-objects/entity-ids";

export {
	type ValidationResult,
	type ValidationIssue,
	type ValidationSeverity,
	type ValidationCode,
	VALIDATION_CODES,
	VALIDATION_SEVERITIES,
	createValidationIssue,
	createValidationResult,
	hasErrors,
	hasWarnings,
	hasInfo,
	getErrorMessages,
	getWarningMessages,
	getInfoMessages,
	getAllMessages,
	getIssueCounts,
	getIssuesForField,
	getIssuesWithCode,
} from "./value-objects/validation-result";

// === Utils ===
export {
	ValidationHelpers,
	createIssue,
	createResult,
	mergeResults,
	combineResults,
	validateConditions,
	validateField,
	mergeAsyncResults,
	getResultSummary,
	groupIssuesByField,
	groupIssuesBySeverity,
	groupIssuesByCode,
	filterBySeverity,
	filterByField,
	filterByCode,
	getErrorsOnly,
	getWarningsOnly,
	getInfoOnly,
	upgradeToErrors,
	downgradeToWarnings,
	addFieldPrefix,
} from "./utils/validation-helpers";

export {
	FilenameSafety,
	getFileExtension,
	getBaseName,
	isExtensionSafe,
	DANGEROUS_EXTENSIONS,
	MAX_FILENAME_LENGTH,
	type FileOperationResult,
} from "./utils/filename-safety";

// === Aggregates ===

// User (Functional DDD)
export {
	type User,
	UserFunctions,
	type UserCreationData,
	type UserData,
} from "./aggregates/user/user";

export {
	type UserRepository,
} from "./aggregates/user/user-repository";

// === Domain Constants ===

// User Constants
export {
	MIN_CONCURRENT_JOBS,
	DEFAULT_MAX_CONCURRENT_JOBS,
	isValidMaxConcurrentJobs,
	isWithinConcurrentJobLimit,
} from "./constants/user";

// Abaqus Job Constants
export {
	ABAQUS_JOB_CPU_CORE_OPTIONS,
	type AbaqusJobCpuCoreOption,
	DEFAULT_JOB_CPU_CORES,
	getRecommendedJobCpuCores,
	isAbaqusJobCpuCoreOption,
	isValidJobCpuCoreCount,
	MIN_JOB_CPU_CORES,
} from "./constants/abaqus-job";
// Job Constants
export {
	DEFAULT_JOB_PRIORITY,
	DEFAULT_JOB_TIMEOUT_MS,
	isValidConcurrentJobCount,
	isValidJobName,
	JOB_HISTORY_RETENTION_DAYS,
	MAX_CONCURRENT_JOBS_PER_USER,
	MAX_JOB_NAME_LENGTH,
	MIN_JOB_NAME_LENGTH,
} from "./constants/job";
// License Constants
export {
	DEFAULT_LICENSE_TOKEN_LIMIT,
	isValidLicenseTokenCount,
	LICENSE_FORMULA_EXPONENT,
	MAX_LICENSE_TOKENS,
	MIN_LICENSE_TOKENS,
	SINGLE_CORE_LICENSE_TOKENS,
} from "./constants/license";
// Node Hardware Constants
export {
	canJobRunOnNode,
	DEFAULT_NODE_CPU_CORES_LIMIT,
	DEFAULT_SSH_PORT,
	isValidNodeCpuCoresLimit,
	isValidSshPort,
	MAX_NODE_CPU_CORES_LIMIT,
	MAX_SSH_PORT,
	MIN_NODE_CPU_CORES_LIMIT,
	MIN_SSH_PORT,
} from "./constants/node-hardware";

// === Domain Services ===

// Input File Validation Service
export {
	InputFileValidation,
	type FileUploadInfo,
	type InputFileValidationResult,
	type ValidatedInputFileInfo,
} from "./services/input-file-validation";

// Job State Machine Service
export {
	type JobStateInfo,
	JobStateMachine,
} from "./services/job-state-machine";
// License Calculation Service
export {
	type CpuLicenseMapping,
	LicenseCalculation,
	type LicenseCalculationParams,
} from "./services/license-calculation";
// Node Capability Service
export {
	type JobNodeCompatibilityResult,
	type JobResourceRequirement,
	type NodeBasicInfo,
	NodeCapability,
	type NodeCapabilityAssessment,
	type ResourceConflict,
} from "./services/node-capability";

// Validation Service
export {
	type JobCreationData,
	type JobExecutionContext,
	type NodeCreationData,
	Validation,
} from "./services/validation";

// === Domain Layer Summary ===

/**
 * Domain Layer Architecture Overview
 *
 * このドメイン層は関数型ドメインモデリングに基づいて実装されています：
 *
 * ## 設計原則
 * - **Pure Functions**: 副作用なし、同じ入力→同じ出力
 * - **Immutability**: 不変データ構造の使用
 * - **Type Safety**: 厳密な型定義とBranded Types
 * - **Composability**: 関数合成可能な設計
 * - **Single Responsibility**: 各サービスは単一責任
 *
 * ## 構造
 * - `value-objects/`: エンティティID、ドメイン値オブジェクト
 * - `constants/`: ドメイン定数とビジネスルール
 * - `services/`: ドメインサービス（純粋関数の集合）
 * - `utils/`: ドメイン横断的なユーティリティ関数
 *
 * ## 利用方法
 * ```typescript
 * import {
 *   JobStateMachine,
 *   LicenseCalculation,
 *   NodeCapability,
 *   Validation,
 *   createJobId
 * } from "~/domain";
 *
 * // ジョブ状態遷移
 * const result = JobStateMachine.transition('pending', 'queued');
 *
 * // ライセンス計算
 * const tokens = LicenseCalculation.calculateTokens(4);
 *
 * // ノード能力評価
 * const assessment = NodeCapability.assess(node, currentJobs);
 *
 * // バリデーション
 * const validation = Validation.creation.job(jobData);
 *
 * // エンティティID作成
 * const jobId = createJobId(123);
 * 
 * // バリデーションユーティリティ
 * const result = ValidationHelpers.mergeResults([validation1, validation2]);
 * const errors = ValidationHelpers.getErrorsOnly(result);
 * ```
 *
 * ## 型安全性の特徴
 * - Branded Types による ID 型安全性
 * - discriminated union による排他的型チェック
 * - const assertions による定数の型保証
 * - 関数型パターンによる合成可能性
 */
