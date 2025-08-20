/**
 * Validation Result Value Objects (Domain)
 * 
 * バリデーション結果に関する値オブジェクト群
 * - ValidationResult: バリデーション結果の表現
 * - ValidationIssue: バリデーション問題の詳細
 * - Type Safety: 厳密な型定義による安全性保証
 */

// === Types ===

/**
 * バリデーション結果の重要度
 */
export type ValidationSeverity = "error" | "warning" | "info";

/**
 * バリデーション問題の詳細
 */
export type ValidationIssue = {
	readonly field: string;
	readonly message: string;
	readonly severity: ValidationSeverity;
	readonly code?: string;
};

/**
 * バリデーション結果
 */
export type ValidationResult = {
	readonly valid: boolean;
	readonly issues: readonly ValidationIssue[];
};

// === Constants ===

/**
 * バリデーション重要度の定数
 */
export const VALIDATION_SEVERITIES: readonly ValidationSeverity[] = [
	"error",
	"warning", 
	"info"
] as const;

/**
 * 共通バリデーションエラーコード
 */
export const VALIDATION_CODES = {
	REQUIRED_FIELD: "REQUIRED_FIELD",
	INVALID_FORMAT: "INVALID_FORMAT",
	OUT_OF_RANGE: "OUT_OF_RANGE",
	DUPLICATE_VALUE: "DUPLICATE_VALUE",
	RESOURCE_CONFLICT: "RESOURCE_CONFLICT",
	BUSINESS_RULE_VIOLATION: "BUSINESS_RULE_VIOLATION",
	DEPENDENCY_NOT_FOUND: "DEPENDENCY_NOT_FOUND",
	SECURITY_VIOLATION: "SECURITY_VIOLATION",
} as const;

/**
 * バリデーションコードの型
 */
export type ValidationCode = typeof VALIDATION_CODES[keyof typeof VALIDATION_CODES];

// === Type Guards ===

/**
 * ValidationSeverity 型ガード
 */
export const isValidationSeverity = (value: unknown): value is ValidationSeverity =>
	typeof value === "string" && VALIDATION_SEVERITIES.includes(value as ValidationSeverity);

/**
 * ValidationIssue 型ガード
 */
export const isValidationIssue = (value: unknown): value is ValidationIssue => {
	if (typeof value !== "object" || value === null) return false;
	
	const issue = value as Record<string, unknown>;
	
	return (
		typeof issue.field === "string" &&
		typeof issue.message === "string" &&
		isValidationSeverity(issue.severity) &&
		(issue.code === undefined || typeof issue.code === "string")
	);
};

/**
 * ValidationResult 型ガード
 */
export const isValidationResult = (value: unknown): value is ValidationResult => {
	if (typeof value !== "object" || value === null) return false;
	
	const result = value as Record<string, unknown>;
	
	return (
		typeof result.valid === "boolean" &&
		Array.isArray(result.issues) &&
		result.issues.every(isValidationIssue)
	);
};

// === Value Object Constructors ===

/**
 * ValidationIssue作成関数
 */
export const createValidationIssue = (
	field: string,
	message: string,
	severity: ValidationSeverity = "error",
	code?: ValidationCode
): ValidationIssue => {
	if (!field.trim()) {
		throw new Error("Field name cannot be empty");
	}
	
	if (!message.trim()) {
		throw new Error("Message cannot be empty");
	}
	
	return {
		field: field.trim(),
		message: message.trim(),
		severity,
		code,
	} as const;
};

/**
 * ValidationResult作成関数
 */
export const createValidationResult = (
	issues: readonly ValidationIssue[]
): ValidationResult => {
	const errors = issues.filter(issue => issue.severity === "error");
	
	return {
		valid: errors.length === 0,
		issues,
	} as const;
};

// === Value Object Utilities ===

/**
 * バリデーション結果にエラーがあるかチェック
 */
export const hasErrors = (result: ValidationResult): boolean =>
	result.issues.some(issue => issue.severity === "error");

/**
 * バリデーション結果に警告があるかチェック
 */
export const hasWarnings = (result: ValidationResult): boolean =>
	result.issues.some(issue => issue.severity === "warning");

/**
 * バリデーション結果に情報があるかチェック
 */
export const hasInfo = (result: ValidationResult): boolean =>
	result.issues.some(issue => issue.severity === "info");

/**
 * エラーメッセージのみを取得
 */
export const getErrorMessages = (result: ValidationResult): readonly string[] =>
	result.issues
		.filter(issue => issue.severity === "error")
		.map(issue => issue.message);

/**
 * 警告メッセージのみを取得
 */
export const getWarningMessages = (result: ValidationResult): readonly string[] =>
	result.issues
		.filter(issue => issue.severity === "warning")
		.map(issue => issue.message);

/**
 * 情報メッセージのみを取得
 */
export const getInfoMessages = (result: ValidationResult): readonly string[] =>
	result.issues
		.filter(issue => issue.severity === "info")
		.map(issue => issue.message);

/**
 * 全メッセージを取得
 */
export const getAllMessages = (result: ValidationResult): readonly string[] =>
	result.issues.map(issue => issue.message);

/**
 * 重要度別の問題数を取得
 */
export const getIssueCounts = (result: ValidationResult) => {
	const counts = { error: 0, warning: 0, info: 0 };
	
	result.issues.forEach(issue => {
		counts[issue.severity]++;
	});
	
	return counts;
};

/**
 * 特定のフィールドの問題のみを取得
 */
export const getIssuesForField = (
	result: ValidationResult, 
	field: string
): readonly ValidationIssue[] =>
	result.issues.filter(issue => issue.field === field);

/**
 * 特定のコードの問題のみを取得
 */
export const getIssuesWithCode = (
	result: ValidationResult, 
	code: ValidationCode
): readonly ValidationIssue[] =>
	result.issues.filter(issue => issue.code === code);