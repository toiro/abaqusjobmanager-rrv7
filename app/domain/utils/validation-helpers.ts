/**
 * Validation Helper Utilities (Domain)
 *
 * バリデーション処理で使用する純粋なユーティリティ関数群
 * - Result Manipulation: バリデーション結果の操作
 * - Issue Creation: バリデーション問題の作成
 * - Result Analysis: バリデーション結果の分析
 */

// === Imports ===

import {
	createValidationIssue,
	createValidationResult,
	getAllMessages,
	getErrorMessages,
	getInfoMessages,
	getIssueCounts,
	getIssuesForField,
	getIssuesWithCode,
	getWarningMessages,
	hasErrors,
	hasInfo,
	hasWarnings,
	type ValidationCode,
	type ValidationIssue,
	type ValidationResult,
	type ValidationSeverity,
} from "../value-objects/validation-result";

// === Helper Functions ===

/**
 * バリデーション問題を作成するヘルパー関数
 */
export const createIssue = (
	field: string,
	message: string,
	severity: ValidationSeverity = "error",
	code?: ValidationCode,
): ValidationIssue => createValidationIssue(field, message, severity, code);

/**
 * バリデーション結果を作成するヘルパー関数
 */
export const createResult = (
	issues: readonly ValidationIssue[],
): ValidationResult => createValidationResult(issues);

/**
 * 複数のバリデーション結果をマージする関数
 */
export const mergeResults = (
	results: readonly ValidationResult[],
): ValidationResult => {
	const allIssues = results.flatMap((result) => result.issues);
	return createValidationResult(allIssues);
};

/**
 * バリデーション結果を結合する関数（順次実行）
 */
export const combineResults = (
	...results: ValidationResult[]
): ValidationResult => mergeResults(results);

/**
 * 条件付きでバリデーション問題を追加する関数
 */
export const addIssueIf =
	(condition: boolean, issue: ValidationIssue) =>
	(issues: ValidationIssue[]): ValidationIssue[] =>
		condition ? [...issues, issue] : issues;

/**
 * 複数の条件をチェックしてバリデーション結果を作成
 */
export const validateConditions = (
	conditions: Array<{
		condition: boolean;
		field: string;
		message: string;
		severity?: ValidationSeverity;
		code?: ValidationCode;
	}>,
): ValidationResult => {
	const issues = conditions
		.filter(({ condition }) => condition)
		.map(({ field, message, severity = "error", code }) =>
			createIssue(field, message, severity, code),
		);

	return createResult(issues);
};

/**
 * フィールド単位でのバリデーション結果作成
 */
export const validateField = <T>(
	value: T,
	field: string,
	validators: Array<{
		validate: (value: T) => boolean;
		message: string;
		severity?: ValidationSeverity;
		code?: ValidationCode;
	}>,
): ValidationResult => {
	const issues = validators
		.filter(({ validate }) => !validate(value))
		.map(({ message, severity = "error", code }) =>
			createIssue(field, message, severity, code),
		);

	return createResult(issues);
};

/**
 * 非同期バリデーション結果を統合
 */
export const mergeAsyncResults = async (
	resultPromises: readonly Promise<ValidationResult>[],
): Promise<ValidationResult> => {
	const results = await Promise.all(resultPromises);
	return mergeResults(results);
};

// === Analysis Functions ===

/**
 * バリデーション結果の概要を文字列で取得
 */
export const getResultSummary = (result: ValidationResult): string => {
	if (result.valid) {
		return "Validation passed";
	}

	const counts = getIssueCounts(result);
	const parts: string[] = [];

	if (counts.error > 0) {
		parts.push(`${counts.error} error${counts.error > 1 ? "s" : ""}`);
	}
	if (counts.warning > 0) {
		parts.push(`${counts.warning} warning${counts.warning > 1 ? "s" : ""}`);
	}
	if (counts.info > 0) {
		parts.push(`${counts.info} info${counts.info > 1 ? "s" : ""}`);
	}

	return `Validation failed: ${parts.join(", ")}`;
};

/**
 * フィールド別の問題マップを作成
 */
export const groupIssuesByField = (
	result: ValidationResult,
): Record<string, readonly ValidationIssue[]> => {
	const grouped: Record<string, ValidationIssue[]> = {};

	result.issues.forEach((issue) => {
		if (!grouped[issue.field]) {
			grouped[issue.field] = [];
		}
		grouped[issue.field].push(issue);
	});

	// 読み取り専用配列に変換
	return Object.fromEntries(
		Object.entries(grouped).map(([field, issues]) => [
			field,
			issues as readonly ValidationIssue[],
		]),
	);
};

/**
 * 重要度別の問題マップを作成
 */
export const groupIssuesBySeverity = (
	result: ValidationResult,
): Record<ValidationSeverity, readonly ValidationIssue[]> => {
	const grouped: Record<ValidationSeverity, ValidationIssue[]> = {
		error: [],
		warning: [],
		info: [],
	};

	result.issues.forEach((issue) => {
		grouped[issue.severity].push(issue);
	});

	return {
		error: grouped.error as readonly ValidationIssue[],
		warning: grouped.warning as readonly ValidationIssue[],
		info: grouped.info as readonly ValidationIssue[],
	};
};

/**
 * コード別の問題マップを作成
 */
export const groupIssuesByCode = (
	result: ValidationResult,
): Record<string, readonly ValidationIssue[]> => {
	const grouped: Record<string, ValidationIssue[]> = {};

	result.issues.forEach((issue) => {
		const code = issue.code || "UNKNOWN";
		if (!grouped[code]) {
			grouped[code] = [];
		}
		grouped[code].push(issue);
	});

	return Object.fromEntries(
		Object.entries(grouped).map(([code, issues]) => [
			code,
			issues as readonly ValidationIssue[],
		]),
	);
};

// === Filtering Functions ===

/**
 * 特定の重要度の問題のみを含む結果を作成
 */
export const filterBySeverity = (
	result: ValidationResult,
	severity: ValidationSeverity,
): ValidationResult => {
	const filteredIssues = result.issues.filter(
		(issue) => issue.severity === severity,
	);
	return createResult(filteredIssues);
};

/**
 * 特定のフィールドの問題のみを含む結果を作成
 */
export const filterByField = (
	result: ValidationResult,
	field: string,
): ValidationResult => {
	const filteredIssues = getIssuesForField(result, field);
	return createResult(filteredIssues);
};

/**
 * 特定のコードの問題のみを含む結果を作成
 */
export const filterByCode = (
	result: ValidationResult,
	code: ValidationCode,
): ValidationResult => {
	const filteredIssues = getIssuesWithCode(result, code);
	return createResult(filteredIssues);
};

/**
 * エラーのみを含む結果を作成
 */
export const getErrorsOnly = (result: ValidationResult): ValidationResult =>
	filterBySeverity(result, "error");

/**
 * 警告のみを含む結果を作成
 */
export const getWarningsOnly = (result: ValidationResult): ValidationResult =>
	filterBySeverity(result, "warning");

/**
 * 情報のみを含む結果を作成
 */
export const getInfoOnly = (result: ValidationResult): ValidationResult =>
	filterBySeverity(result, "info");

// === Transformation Functions ===

/**
 * バリデーション結果をエラー重要度にアップグレード
 */
export const upgradeToErrors = (result: ValidationResult): ValidationResult => {
	const upgradedIssues = result.issues.map((issue) => ({
		...issue,
		severity: "error" as const,
	}));

	return createResult(upgradedIssues);
};

/**
 * バリデーション結果を警告重要度にダウングレード
 */
export const downgradeToWarnings = (
	result: ValidationResult,
): ValidationResult => {
	const downgradedIssues = result.issues.map((issue) => ({
		...issue,
		severity: "warning" as const,
	}));

	return createResult(downgradedIssues);
};

/**
 * フィールドプレフィックスを追加
 */
export const addFieldPrefix = (
	result: ValidationResult,
	prefix: string,
): ValidationResult => {
	const prefixedIssues = result.issues.map((issue) => ({
		...issue,
		field: `${prefix}.${issue.field}`,
	}));

	return createResult(prefixedIssues);
};

// === Public API ===

/**
 * Validation Helper Utilities
 *
 * バリデーション処理で使用する純粋なユーティリティ関数の集合
 * すべての関数は副作用なしで実装
 */
export const ValidationHelpers = {
	// Core functions
	createIssue,
	createResult,
	mergeResults,
	combineResults,

	// Conditional validation
	addIssueIf,
	validateConditions,
	validateField,
	mergeAsyncResults,

	// Analysis functions
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
	getResultSummary,
	groupIssuesByField,
	groupIssuesBySeverity,
	groupIssuesByCode,

	// Filtering functions
	filterBySeverity,
	filterByField,
	filterByCode,
	getErrorsOnly,
	getWarningsOnly,
	getInfoOnly,

	// Transformation functions
	upgradeToErrors,
	downgradeToWarnings,
	addFieldPrefix,
} as const;
