/**
 * License Calculation Domain Service (Functional)
 *
 * 関数型ドメインモデリングに基づく純粋関数の集合
 * - Immutability: 不変データ構造
 * - Pure Functions: 副作用なし、同じ入力→同じ出力
 * - Composability: 関数合成可能
 * - Type Safety: 厳密な型定義
 */

// === Types ===

import {
	ABAQUS_JOB_CPU_CORE_OPTIONS,
	type AbaqusJobCpuCoreOption,
	getRecommendedJobCpuCores,
	isAbaqusJobCpuCoreOption,
} from "../constants/abaqus-job";
import {
	LICENSE_FORMULA_EXPONENT,
	SINGLE_CORE_LICENSE_TOKENS,
} from "../constants/license";

/**
 * CPU とライセンストークンのマッピング
 */
export type CpuLicenseMapping = {
	readonly cpu: AbaqusJobCpuCoreOption;
	readonly tokens: number;
	readonly description: string;
};

/**
 * ライセンス計算のパラメータ
 */
export type LicenseCalculationParams = {
	readonly coreCount: number;
	readonly singleCoreTokens?: number;
};

// === Constants (ドメイン定数から取得) ===

// === Pure Functions ===

/**
 * CPUコア数に基づいてライセンストークンを計算する純粋関数
 * Formula: tokens = floor(singleCoreTokens × coreCount^0.422)
 */
const calculateTokensForCores = (params: LicenseCalculationParams): number => {
	const { coreCount, singleCoreTokens = SINGLE_CORE_LICENSE_TOKENS } = params;

	if (coreCount < 1) {
		throw new Error("Core count must be positive");
	}

	return Math.floor(singleCoreTokens * coreCount ** LICENSE_FORMULA_EXPONENT);
};

/**
 * CPUとライセンスのマッピングを生成する純粋関数
 */
const generateCpuLicenseMapping = (): readonly CpuLicenseMapping[] =>
	ABAQUS_JOB_CPU_CORE_OPTIONS.map(
		(cpu): CpuLicenseMapping => ({
			cpu,
			tokens: calculateTokensForCores({ coreCount: cpu }),
			description: `${cpu} core analysis`,
		}),
	);

/**
 * ノード制限に基づく推奨Abaqusジョブ用CPUコア数を取得
 */
const getRecommendedCpuOption = (maxCores: number): AbaqusJobCpuCoreOption =>
	getRecommendedJobCpuCores(maxCores);

// === Public API (関数型インターフェース) ===

/**
 * License Calculation Domain Service
 *
 * 関数型ドメインモデリングによる公開API
 * すべての関数は純粋関数として実装
 */
export const LicenseCalculation = {
	/**
	 * CPUコア数からライセンストークンを計算
	 */
	calculateTokens: (coreCount: number, singleCoreTokens?: number): number =>
		calculateTokensForCores({ coreCount, singleCoreTokens }),

	/**
	 * CPUとライセンスのマッピングを取得
	 */
	getCpuLicenseMapping: generateCpuLicenseMapping,

	/**
	 * Abaqusジョブ用CPUコア数の妥当性チェック
	 */
	isValidCpuOption: isAbaqusJobCpuCoreOption,

	/**
	 * 推奨CPUオプションを取得
	 */
	getRecommendedOption: getRecommendedCpuOption,

	/**
	 * 定数値へのアクセス（ドメイン定数から参照）
	 */
	constants: {
		SINGLE_CORE_TOKENS: SINGLE_CORE_LICENSE_TOKENS,
		FORMULA_EXPONENT: LICENSE_FORMULA_EXPONENT,
		CPU_OPTIONS: ABAQUS_JOB_CPU_CORE_OPTIONS,
	},
} as const;
