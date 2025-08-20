/**
 * Node Capability Domain Service (Functional)
 *
 * ノードの実行能力とジョブとの適合性を管理するドメインサービス
 * - Resource Matching: リソース適合性チェック
 * - Capability Assessment: ノード能力評価
 * - Job-Node Compatibility: ジョブ-ノード互換性検証
 */

// === Types ===

import {
	type AbaqusJobCpuCoreOption,
	getRecommendedJobCpuCores,
	isValidJobCpuCoreCount,
} from "../constants/abaqus-job";
import {
	canJobRunOnNode,
	DEFAULT_NODE_CPU_CORES_LIMIT,
	DEFAULT_SSH_PORT,
	isValidNodeCpuCoresLimit,
	isValidSshPort,
	MAX_NODE_CPU_CORES_LIMIT,
	MIN_NODE_CPU_CORES_LIMIT,
} from "../constants/node-hardware";

import { LicenseCalculation } from "./license-calculation";

/**
 * ノードの基本情報
 */
export type NodeBasicInfo = {
	readonly id: number;
	readonly name: string;
	readonly hostname: string;
	readonly ssh_port: number;
	readonly cpu_cores_limit: number;
	readonly is_available: boolean;
	readonly is_active?: boolean; // Optional for compatibility
};

/**
 * ジョブの基本要求リソース
 */
export type JobResourceRequirement = {
	readonly cpu_cores: number;
	readonly estimated_duration?: number; // 時間（分）
};

/**
 * ノード能力評価結果
 */
export type NodeCapabilityAssessment = {
	readonly nodeId: number;
	readonly nodeName: string;
	readonly canExecute: boolean;
	readonly cpuCapacity: number;
	readonly cpuUtilization: number; // 0-100%
	readonly recommendedCpuCores: AbaqusJobCpuCoreOption;
	readonly maxLicenseTokens: number;
	readonly estimatedQueueTime?: number; // 分
	readonly issues: readonly string[];
};

/**
 * ジョブ-ノード互換性チェック結果
 */
export type JobNodeCompatibilityResult = {
	readonly compatible: boolean;
	readonly nodeCapability: NodeCapabilityAssessment;
	readonly requiredResources: JobResourceRequirement;
	readonly licenseTokensRequired: number;
	readonly reasons: readonly string[];
};

/**
 * リソース競合情報
 */
export type ResourceConflict = {
	readonly type: "cpu" | "license" | "availability";
	readonly current: number;
	readonly required: number;
	readonly message: string;
};

// === Constants ===

/**
 * CPU使用率の閾値（警告レベル）
 */
const CPU_UTILIZATION_WARNING_THRESHOLD = 80 as const;

/**
 * CPU使用率の閾値（危険レベル）
 */
const CPU_UTILIZATION_CRITICAL_THRESHOLD = 95 as const;

/**
 * 推定キュー時間（分）の基本値
 */
const BASE_QUEUE_TIME_MINUTES = 5 as const;

// === Pure Functions ===

/**
 * ノードの基本妥当性をチェックする純粋関数
 */
const validateNodeConfiguration = (node: NodeBasicInfo): readonly string[] => {
	const issues: string[] = [];

	if (!isValidNodeCpuCoresLimit(node.cpu_cores_limit)) {
		issues.push(
			`Invalid CPU cores limit: ${node.cpu_cores_limit} (must be ${MIN_NODE_CPU_CORES_LIMIT}-${MAX_NODE_CPU_CORES_LIMIT})`,
		);
	}

	if (!isValidSshPort(node.ssh_port)) {
		issues.push(`Invalid SSH port: ${node.ssh_port}`);
	}

	if (!node.hostname.trim()) {
		issues.push("Hostname cannot be empty");
	}

	if (!node.name.trim()) {
		issues.push("Node name cannot be empty");
	}

	return issues as readonly string[];
};

/**
 * ジョブリソース要求の妥当性をチェックする純粋関数
 */
const validateJobRequirement = (
	requirement: JobResourceRequirement,
): readonly string[] => {
	const issues: string[] = [];

	if (!isValidJobCpuCoreCount(requirement.cpu_cores)) {
		issues.push(`Invalid CPU cores requirement: ${requirement.cpu_cores}`);
	}

	if (
		requirement.estimated_duration !== undefined &&
		requirement.estimated_duration <= 0
	) {
		issues.push(
			`Invalid estimated duration: ${requirement.estimated_duration} (must be positive)`,
		);
	}

	return issues as readonly string[];
};

/**
 * ノードの能力を評価する純粋関数
 */
const assessNodeCapability = (
	node: NodeBasicInfo,
	currentRunningJobs: readonly JobResourceRequirement[] = [],
): NodeCapabilityAssessment => {
	const issues = validateNodeConfiguration(node);

	// 現在のCPU使用量を計算
	const currentCpuUsage = currentRunningJobs.reduce(
		(sum, job) => sum + job.cpu_cores,
		0,
	);
	const cpuUtilization =
		node.cpu_cores_limit > 0
			? (currentCpuUsage / node.cpu_cores_limit) * 100
			: 0;

	// 実行可能かチェック
	const canExecute =
		node.is_available &&
		issues.length === 0 &&
		cpuUtilization < CPU_UTILIZATION_CRITICAL_THRESHOLD;

	// 推奨CPUコア数を取得
	const recommendedCpuCores = getRecommendedJobCpuCores(node.cpu_cores_limit);

	// 最大ライセンストークン数を計算
	const maxLicenseTokens = LicenseCalculation.calculateTokens(
		node.cpu_cores_limit,
	);

	// 推定キュー時間を計算
	const estimatedQueueTime =
		cpuUtilization > CPU_UTILIZATION_WARNING_THRESHOLD
			? BASE_QUEUE_TIME_MINUTES * (cpuUtilization / 100)
			: undefined;

	// CPU使用率に基づく追加の警告（mutableなissuesを使用）
	const mutableIssues = [...issues];
	if (cpuUtilization > CPU_UTILIZATION_WARNING_THRESHOLD) {
		mutableIssues.push(`High CPU utilization: ${cpuUtilization.toFixed(1)}%`);
	}

	if (!node.is_available) {
		mutableIssues.push("Node is not available");
	}

	return {
		nodeId: node.id,
		nodeName: node.name,
		canExecute,
		cpuCapacity: node.cpu_cores_limit,
		cpuUtilization,
		recommendedCpuCores,
		maxLicenseTokens,
		estimatedQueueTime,
		issues: mutableIssues as readonly string[],
	};
};

/**
 * ジョブとノードの互換性をチェックする純粋関数
 */
const checkJobNodeCompatibility = (
	job: JobResourceRequirement,
	node: NodeBasicInfo,
	currentRunningJobs: readonly JobResourceRequirement[] = [],
): JobNodeCompatibilityResult => {
	const jobIssues = validateJobRequirement(job);
	const nodeCapability = assessNodeCapability(node, currentRunningJobs);

	const reasons: string[] = [...jobIssues, ...nodeCapability.issues];

	// リソース競合をチェック
	const conflicts = findResourceConflicts(job, node, currentRunningJobs);
	conflicts.forEach((conflict) => reasons.push(conflict.message));

	// 基本的な互換性チェック
	const basicCompatibility = canJobRunOnNode(
		job.cpu_cores,
		node.cpu_cores_limit,
	);
	if (!basicCompatibility) {
		reasons.push(
			`Job requires ${job.cpu_cores} CPU cores but node has limit of ${node.cpu_cores_limit}`,
		);
	}

	// 利用可能性チェック
	if (!node.is_available) {
		reasons.push("Node is not available");
	}

	// ライセンストークン計算
	const licenseTokensRequired = LicenseCalculation.calculateTokens(
		job.cpu_cores,
	);

	const compatible =
		reasons.length === 0 &&
		basicCompatibility &&
		node.is_available &&
		nodeCapability.canExecute;

	return {
		compatible,
		nodeCapability,
		requiredResources: job,
		licenseTokensRequired,
		reasons,
	};
};

/**
 * リソース競合を検出する純粋関数
 */
const findResourceConflicts = (
	job: JobResourceRequirement,
	node: NodeBasicInfo,
	currentRunningJobs: readonly JobResourceRequirement[],
): readonly ResourceConflict[] => {
	const conflicts: ResourceConflict[] = [];

	// CPU競合チェック
	const currentCpuUsage = currentRunningJobs.reduce(
		(sum, j) => sum + j.cpu_cores,
		0,
	);
	const totalCpuAfterJob = currentCpuUsage + job.cpu_cores;

	if (totalCpuAfterJob > node.cpu_cores_limit) {
		conflicts.push({
			type: "cpu",
			current: currentCpuUsage,
			required: job.cpu_cores,
			message: `CPU cores conflict: current usage ${currentCpuUsage} + required ${job.cpu_cores} > limit ${node.cpu_cores_limit}`,
		});
	}

	// 利用可能性チェック
	if (!node.is_available) {
		conflicts.push({
			type: "availability",
			current: 0,
			required: 1,
			message: "Node is not available for job execution",
		});
	}

	return conflicts;
};

/**
 * 最適なノードを選択する純粋関数
 */
const selectOptimalNode = (
	job: JobResourceRequirement,
	nodes: readonly NodeBasicInfo[],
	currentJobsPerNode: Record<number, readonly JobResourceRequirement[]> = {},
): NodeCapabilityAssessment | null => {
	const compatibleNodes = nodes
		.map((node) => {
			const currentJobs = currentJobsPerNode[node.id] || [];
			const compatibility = checkJobNodeCompatibility(job, node, currentJobs);
			return compatibility.compatible ? compatibility.nodeCapability : null;
		})
		.filter(
			(capability): capability is NodeCapabilityAssessment =>
				capability !== null,
		);

	if (compatibleNodes.length === 0) {
		return null;
	}

	// 最適ノード選択アルゴリズム：
	// 1. CPU使用率が低い順
	// 2. CPU容量が大きい順
	// 3. 推定キュー時間が短い順
	return compatibleNodes.sort((a, b) => {
		// CPU使用率で比較（低い方が優先）
		if (a.cpuUtilization !== b.cpuUtilization) {
			return a.cpuUtilization - b.cpuUtilization;
		}

		// CPU容量で比較（大きい方が優先）
		if (a.cpuCapacity !== b.cpuCapacity) {
			return b.cpuCapacity - a.cpuCapacity;
		}

		// 推定キュー時間で比較（短い方が優先）
		const aQueue = a.estimatedQueueTime || 0;
		const bQueue = b.estimatedQueueTime || 0;
		return aQueue - bQueue;
	})[0];
};

// === Public API (関数型インターフェース) ===

/**
 * Node Capability Domain Service
 *
 * 関数型ドメインモデリングによるノード能力管理API
 * すべての関数は純粋関数として実装
 */
export const NodeCapability = {
	/**
	 * ノード能力評価
	 */
	assess: (
		node: NodeBasicInfo,
		currentJobs?: readonly JobResourceRequirement[],
	): NodeCapabilityAssessment => assessNodeCapability(node, currentJobs),

	/**
	 * ジョブ-ノード互換性チェック
	 */
	checkCompatibility: (
		job: JobResourceRequirement,
		node: NodeBasicInfo,
		currentJobs?: readonly JobResourceRequirement[],
	): JobNodeCompatibilityResult =>
		checkJobNodeCompatibility(job, node, currentJobs),

	/**
	 * 最適ノード選択
	 */
	selectOptimal: (
		job: JobResourceRequirement,
		nodes: readonly NodeBasicInfo[],
		currentJobsPerNode?: Record<number, readonly JobResourceRequirement[]>,
	): NodeCapabilityAssessment | null =>
		selectOptimalNode(job, nodes, currentJobsPerNode),

	/**
	 * 検証関数群
	 */
	validate: {
		node: validateNodeConfiguration,
		jobRequirement: validateJobRequirement,
		canRunJob: canJobRunOnNode,
	},

	/**
	 * リソース管理
	 */
	resource: {
		findConflicts: findResourceConflicts,
		calculateCpuUtilization: (
			currentJobs: readonly JobResourceRequirement[],
			nodeCapacity: number,
		): number => {
			const usage = currentJobs.reduce((sum, job) => sum + job.cpu_cores, 0);
			return nodeCapacity > 0 ? (usage / nodeCapacity) * 100 : 0;
		},
		estimateQueueTime: (cpuUtilization: number): number =>
			cpuUtilization > CPU_UTILIZATION_WARNING_THRESHOLD
				? BASE_QUEUE_TIME_MINUTES * (cpuUtilization / 100)
				: 0,
	},

	/**
	 * 便利関数群
	 */
	utils: {
		getRecommendedCpuCores: (nodeLimit: number): AbaqusJobCpuCoreOption =>
			getRecommendedJobCpuCores(nodeLimit),
		calculateLicenseTokens: (cpuCores: number): number =>
			LicenseCalculation.calculateTokens(cpuCores),
		isHighUtilization: (utilization: number): boolean =>
			utilization > CPU_UTILIZATION_WARNING_THRESHOLD,
		isCriticalUtilization: (utilization: number): boolean =>
			utilization > CPU_UTILIZATION_CRITICAL_THRESHOLD,
	},

	/**
	 * 定数値へのアクセス
	 */
	constants: {
		CPU_UTILIZATION_WARNING_THRESHOLD,
		CPU_UTILIZATION_CRITICAL_THRESHOLD,
		BASE_QUEUE_TIME_MINUTES,
		MIN_NODE_CPU_CORES_LIMIT,
		MAX_NODE_CPU_CORES_LIMIT,
		DEFAULT_NODE_CPU_CORES_LIMIT,
		DEFAULT_SSH_PORT,
	},
} as const;
