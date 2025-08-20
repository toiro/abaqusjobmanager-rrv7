/**
 * Validation Domain Service (Functional)
 *
 * 統合的なバリデーションとビジネスルール検証を行うドメインサービス
 * - Entity Validation: エンティティ全体の検証
 * - Business Rules: ビジネスルールの統合検証
 * - Cross-Entity Validation: エンティティ間制約の検証
 */

// === Types ===

import type {
	FileRecord,
	Job,
	JobStatus,
	Node,
	User,
} from "../../shared/core/types/database";
import {
	isAbaqusJobCpuCoreOption,
	isValidJobCpuCoreCount,
} from "../constants/abaqus-job";

import {
	isValidConcurrentJobCount,
	isValidJobName,
	MAX_CONCURRENT_JOBS_PER_USER,
} from "../constants/job";
import { isValidLicenseTokenCount } from "../constants/license";
import {
	isValidNodeCpuCoresLimit,
	isValidSshPort,
} from "../constants/node-hardware";
import {
	type FileRecordId,
	type NodeId,
	type UserId,
} from "../value-objects/entity-ids";

// Import from separated components
import {
	type ValidationResult,
	type ValidationIssue,
	VALIDATION_CODES,
} from "../value-objects/validation-result";
import {
	createIssue,
	createResult,
} from "../utils/validation-helpers";

import { InputFileValidation, type FileUploadInfo } from "./input-file-validation";
import { JobStateMachine } from "./job-state-machine";
import { LicenseCalculation } from "./license-calculation";
import { type JobResourceRequirement, NodeCapability } from "./node-capability";

/**
 * ジョブ作成データ
 */
export type JobCreationData = {
	readonly name: string;
	readonly description?: string;
	readonly file_id: FileRecordId;
	readonly user_id: UserId;
	readonly node_id?: NodeId;
	readonly cpu_cores: number;
	readonly priority: "low" | "normal" | "high";
};

/**
 * ノード作成データ
 */
export type NodeCreationData = {
	readonly name: string;
	readonly hostname: string;
	readonly ssh_port: number;
	readonly username: string;
	readonly cpu_cores_limit: number;
	readonly description?: string;
};



/**
 * ジョブ実行コンテキスト
 */
export type JobExecutionContext = {
	readonly job: Job;
	readonly targetNode?: Node;
	readonly user: User;
	readonly file: FileRecord;
	readonly currentRunningJobs: readonly Job[];
};

// === Pure Functions ===

/**
 * ジョブ作成データをバリデーションする純粋関数
 */
const validateJobCreation = (data: JobCreationData): ValidationResult => {
	const issues: ValidationIssue[] = [];

	// 名前検証
	if (!data.name.trim()) {
		issues.push(
			createIssue(
				"name",
				"Job name is required",
				"error",
				VALIDATION_CODES.REQUIRED_FIELD,
			),
		);
	} else if (!isValidJobName(data.name)) {
		issues.push(
			createIssue(
				"name",
				"Job name must be 3-100 characters",
				"error",
				VALIDATION_CODES.INVALID_FORMAT,
			),
		);
	}

	// CPUコア数検証
	if (!isValidJobCpuCoreCount(data.cpu_cores)) {
		issues.push(
			createIssue(
				"cpu_cores",
				"Invalid CPU cores count",
				"error",
				VALIDATION_CODES.OUT_OF_RANGE,
			),
		);
	}

	// Abaqus推奨値のチェック（警告レベル）
	if (!isAbaqusJobCpuCoreOption(data.cpu_cores)) {
		issues.push(
			createIssue(
				"cpu_cores",
				`Non-standard CPU cores: ${data.cpu_cores}. Recommended: ${LicenseCalculation.constants.CPU_OPTIONS.join(", ")}`,
				"warning",
			),
		);
	}

	// ファイルID検証
	if (!data.file_id) {
		issues.push(
			createIssue(
				"file_id",
				"Input file is required",
				"error",
				VALIDATION_CODES.REQUIRED_FIELD,
			),
		);
	}

	// ユーザーID検証
	if (!data.user_id) {
		issues.push(
			createIssue(
				"user_id",
				"User ID is required",
				"error",
				VALIDATION_CODES.REQUIRED_FIELD,
			),
		);
	}

	// 優先度検証
	const validPriorities = ["low", "normal", "high"];
	if (!validPriorities.includes(data.priority)) {
		issues.push(
			createIssue(
				"priority",
				"Invalid priority level",
				"error",
				VALIDATION_CODES.INVALID_FORMAT,
			),
		);
	}

	return createResult(issues);
};

/**
 * ノード作成データをバリデーションする純粋関数
 */
const validateNodeCreation = (data: NodeCreationData): ValidationResult => {
	const issues: ValidationIssue[] = [];

	// 名前検証
	if (!data.name.trim()) {
		issues.push(
			createIssue(
				"name",
				"Node name is required",
				"error",
				VALIDATION_CODES.REQUIRED_FIELD,
			),
		);
	}

	// ホスト名検証
	if (!data.hostname.trim()) {
		issues.push(
			createIssue(
				"hostname",
				"Hostname is required",
				"error",
				VALIDATION_CODES.REQUIRED_FIELD,
			),
		);
	} else {
		// 基本的なホスト名形式チェック
		const hostnameRegex =
			/^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
		if (!hostnameRegex.test(data.hostname)) {
			issues.push(
				createIssue(
					"hostname",
					"Invalid hostname format",
					"error",
					VALIDATION_CODES.INVALID_FORMAT,
				),
			);
		}
	}

	// SSH ポート検証
	if (!isValidSshPort(data.ssh_port)) {
		issues.push(
			createIssue(
				"ssh_port",
				"Invalid SSH port (1-65535)",
				"error",
				VALIDATION_CODES.OUT_OF_RANGE,
			),
		);
	}

	// ユーザー名検証
	if (!data.username.trim()) {
		issues.push(
			createIssue(
				"username",
				"SSH username is required",
				"error",
				VALIDATION_CODES.REQUIRED_FIELD,
			),
		);
	}

	// CPUコア数制限検証
	if (!isValidNodeCpuCoresLimit(data.cpu_cores_limit)) {
		issues.push(
			createIssue(
				"cpu_cores_limit",
				"Invalid CPU cores limit",
				"error",
				VALIDATION_CODES.OUT_OF_RANGE,
			),
		);
	}

	return createResult(issues);
};

/**
 * ジョブ実行前の統合検証を行う純粋関数
 */
const validateJobExecution = (
	context: JobExecutionContext,
): ValidationResult => {
	const issues: ValidationIssue[] = [];
	const { job, targetNode, user, file, currentRunningJobs } = context;

	// ジョブ状態検証
	if (!JobStateMachine.can.start(job.status)) {
		issues.push(
			createIssue(
				"status",
				`Job cannot be started from status '${job.status}'`,
				"error",
				VALIDATION_CODES.BUSINESS_RULE_VIOLATION,
			),
		);
	}

	// ファイル存在確認
	if (!file) {
		issues.push(
			createIssue(
				"file_id",
				"Input file not found",
				"error",
				VALIDATION_CODES.DEPENDENCY_NOT_FOUND,
			),
		);
	} else {
		// ファイルタイプ検証
		const fileValidation = InputFileValidation.validate({
			name: file.original_name,
			size: file.file_size,
			type: file.mime_type || undefined,
		});

		if (!fileValidation.valid) {
			const errorResult = fileValidation as { valid: false; errors: readonly string[] };
			for (const error of errorResult.errors) {
				issues.push(
					createIssue("file", error, "error", VALIDATION_CODES.INVALID_FORMAT),
				);
			}
		}
	}

	// ノード能力検証
	if (targetNode) {
		const jobRequirement: JobResourceRequirement = {
			cpu_cores: job.cpu_cores,
		};

		// Nodeの型をNodeBasicInfoに変換
		const nodeBasic = {
			id: targetNode.id as number,
			name: targetNode.name,
			hostname: targetNode.hostname,
			ssh_port: targetNode.ssh_port,
			cpu_cores_limit: targetNode.cpu_cores_limit,
			is_available: targetNode.status === "available",
		};

		const currentJobs = currentRunningJobs.map((j) => ({
			cpu_cores: j.cpu_cores,
		}));
		const compatibility = NodeCapability.checkCompatibility(
			jobRequirement,
			nodeBasic,
			currentJobs,
		);

		if (!compatibility.compatible) {
			compatibility.reasons.forEach((reason) => {
				issues.push(
					createIssue(
						"node_id",
						reason,
						"error",
						VALIDATION_CODES.RESOURCE_CONFLICT,
					),
				);
			});
		}

		// 追加の警告
		if (compatibility.nodeCapability.cpuUtilization > 50) {
			issues.push(
				createIssue(
					"node_id",
					`High CPU utilization on node: ${compatibility.nodeCapability.cpuUtilization.toFixed(1)}%`,
					"warning",
				),
			);
		}
	}

	// ライセンス検証
	const licenseTokensRequired = LicenseCalculation.calculateTokens(
		job.cpu_cores,
	);
	if (!isValidLicenseTokenCount(licenseTokensRequired)) {
		issues.push(
			createIssue(
				"cpu_cores",
				`Invalid license token requirement: ${licenseTokensRequired}`,
				"error",
				VALIDATION_CODES.OUT_OF_RANGE,
			),
		);
	}

	// ユーザー権限検証
	if (!user) {
		issues.push(
			createIssue(
				"user_id",
				"User not found",
				"error",
				VALIDATION_CODES.DEPENDENCY_NOT_FOUND,
			),
		);
	}

	return createResult(issues);
};

/**
 * 同時実行ジョブ数の制限チェック
 */
const validateConcurrentJobLimit = (
	userId: UserId,
	currentRunningJobs: readonly Job[],
): ValidationResult => {
	const issues: ValidationIssue[] = [];

	const userRunningJobs = currentRunningJobs.filter(
		(job) => JobStateMachine.is.active(job.status) && job.user_id === userId,
	);

	if (!isValidConcurrentJobCount(userRunningJobs.length + 1)) {
		issues.push(
			createIssue(
				"user_id",
				`User has reached maximum concurrent job limit (${userRunningJobs.length} running)`,
				"error",
				VALIDATION_CODES.BUSINESS_RULE_VIOLATION,
			),
		);
	}

	return createResult(issues);
};

/**
 * エンティティの一意性チェック
 */
const validateUniqueness = <T extends { name: string }>(
	entity: T,
	existingEntities: readonly T[],
	fieldName: string = "name",
): ValidationResult => {
	const issues: ValidationIssue[] = [];

	const duplicate = existingEntities.find(
		(existing) => existing.name.toLowerCase() === entity.name.toLowerCase(),
	);

	if (duplicate) {
		issues.push(
			createIssue(
				fieldName,
				`${fieldName} already exists: ${entity.name}`,
				"error",
				VALIDATION_CODES.DUPLICATE_VALUE,
			),
		);
	}

	return createResult(issues);
};

// === Public API (関数型インターフェース) ===

/**
 * Validation Domain Service
 *
 * 関数型ドメインモデリングによる統合バリデーションAPI
 * すべての関数は純粋関数として実装
 */
export const Validation = {
	/**
	 * エンティティ作成バリデーション
	 */
	creation: {
		job: validateJobCreation,
		node: validateNodeCreation,
	},

	/**
	 * ビジネスルールバリデーション
	 */
	business: {
		jobExecution: validateJobExecution,
		concurrentJobLimit: validateConcurrentJobLimit,
		uniqueness: validateUniqueness,
	},

	/**
	 * ファイルバリデーション
	 */
	file: {
		upload: (file: FileUploadInfo): ValidationResult => {
			const result = InputFileValidation.validate(file);
			if (result.valid) {
				return createResult([]);
			} else {
				const errorResult = result as { valid: false; errors: readonly string[] };
				return createResult(
					errorResult.errors.map((error) => createIssue("file", error, "error"))
				);
			}
		},
	},

	/**
	 * 状態遷移バリデーション
	 */
	stateTransition: {
		job: (current: JobStatus, target: JobStatus): ValidationResult => {
			const canTransition = JobStateMachine.can.transition(current, target);
			return createResult(
				canTransition
					? []
					: [
							createIssue(
								"status",
								`Cannot transition from ${current} to ${target}`,
								"error",
							),
						],
			);
		},
	},

	/**
	 * リソース制約バリデーション
	 */
	resource: {
		nodeCapacity: (
			job: JobResourceRequirement,
			node: Node,
			currentJobs: readonly Job[] = [],
		): ValidationResult => {
			// Nodeの型をNodeBasicInfoに変換
			const nodeBasic = {
				id: node.id as number,
				name: node.name,
				hostname: node.hostname,
				ssh_port: node.ssh_port,
				cpu_cores_limit: node.cpu_cores_limit,
				is_available: node.status === "available",
			};

			const currentJobRequirements = currentJobs.map((j) => ({
				cpu_cores: j.cpu_cores,
			}));
			const compatibility = NodeCapability.checkCompatibility(
				job,
				nodeBasic,
				currentJobRequirements,
			);

			return createResult(
				compatibility.compatible
					? []
					: compatibility.reasons.map((reason) =>
							createIssue("resource", reason, "error"),
						),
			);
		},
	},

	/**
	 * 定数値へのアクセス
	 */
	constants: {
		VALIDATION_CODES,
		SEVERITIES: ["error", "warning", "info"] as const,
	},
} as const;