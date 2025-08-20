/**
 * License Constants (Domain)
 * 
 * Abaqusライセンス計算に関するドメイン定数
 * ビジネスルールとして確立された値
 */

/**
 * 単一コア実行に必要なライセンストークン数
 * Abaqus のライセンス体系に基づく
 */
export const SINGLE_CORE_LICENSE_TOKENS = 5 as const;

/**
 * ライセンス計算式の指数（Abaqus固有）
 * Formula: tokens = floor(singleCoreTokens × coreCount^EXPONENT)
 */
export const LICENSE_FORMULA_EXPONENT = 0.422 as const;

/**
 * デフォルトのライセンス制限値
 */
export const DEFAULT_LICENSE_TOKEN_LIMIT = 50 as const;

/**
 * 最小ライセンストークン数
 */
export const MIN_LICENSE_TOKENS = 1 as const;

/**
 * 最大ライセンストークン数（システム制限）
 */
export const MAX_LICENSE_TOKENS = 1000 as const;

/**
 * ライセンストークン数の妥当性チェック
 */
export const isValidLicenseTokenCount = (tokens: number): boolean =>
	tokens >= MIN_LICENSE_TOKENS && 
	tokens <= MAX_LICENSE_TOKENS && 
	Number.isInteger(tokens);