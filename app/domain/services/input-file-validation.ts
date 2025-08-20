/**
 * Input File Validation Domain Service (Functional)
 *
 * Abaqus .inp ファイルのアップロード検証を行うドメインサービス
 * - Input File Validation: .inp ファイル形式・サイズ検証
 * - Business Logic: ドメイン固有の検証ルール
 */

// === Imports ===

import {
	FilenameSafety,
	type FileOperationResult,
} from "../utils/filename-safety";

// === Types ===

/**
 * ファイル検証結果
 */
export type InputFileValidationResult =
	| { readonly valid: true; readonly fileInfo: ValidatedInputFileInfo }
	| { readonly valid: false; readonly errors: readonly string[] };

/**
 * 検証済み入力ファイル情報
 */
export type ValidatedInputFileInfo = {
	readonly name: string;
	readonly size: number;
	readonly extension: ".inp";
	readonly mimeType?: string;
	readonly uploadedAt: Date;
};

/**
 * ファイルアップロード情報
 */
export type FileUploadInfo = {
	readonly name: string;
	readonly size: number;
	readonly type?: string; // MIME type
	readonly lastModified?: number;
	readonly content?: ArrayBuffer | Uint8Array;
};

// === Constants ===

/**
 * 入力ファイル拡張子
 */
const INPUT_FILE_EXTENSION = ".inp";

/**
 * 最大ファイルサイズ（1GB）
 */
const MAX_INPUT_FILE_SIZE = 1024 * 1024 * 1024;



// === Pure Functions ===

/**
 * ファイルが .inp ファイルかチェックする純粋関数
 */
const isInputFile = (filename: string): boolean => {
	return FilenameSafety.parse.extension(filename) === INPUT_FILE_EXTENSION;
};

/**
 * ファイルサイズの妥当性をチェックする純粋関数
 */
const validateFileSize = (size: number): readonly string[] => {
	const issues: string[] = [];

	if (size > MAX_INPUT_FILE_SIZE) {
		const maxSizeMB = Math.round(MAX_INPUT_FILE_SIZE / (1024 * 1024));
		const actualSizeMB = Math.round(size / (1024 * 1024));
		issues.push(
			`File too large: ${actualSizeMB}MB (max: ${maxSizeMB}MB for .inp files)`,
		);
	}

	return issues;
};

/**
 * MIME typeの妥当性をチェックする純粋関数
 */
const isValidMimeType = (mimeType: string): boolean => {
	// .inp ファイルは基本的にテキストファイル
	const validMimeTypes = ["text/plain", "application/octet-stream"];
	return validMimeTypes.includes(mimeType) || mimeType.startsWith("text/");
};

/**
 * 入力ファイルをバリデーションする純粋関数
 */
const validateInputFile = (file: FileUploadInfo): InputFileValidationResult => {
	const errors: string[] = [];

	// ファイル名安全性チェック（utils使用）
	errors.push(...FilenameSafety.validate(file.name));

	// .inp ファイルチェック
	if (!isInputFile(file.name)) {
		errors.push(`Invalid file type: only .inp files are allowed`);
		return { valid: false, errors };
	}

	// ファイルサイズチェック
	errors.push(...validateFileSize(file.size));

	// MIME type チェック（可能な場合）
	if (file.type && !isValidMimeType(file.type)) {
		errors.push(`Invalid MIME type: ${file.type} for .inp file`);
	}

	if (errors.length > 0) {
		return { valid: false, errors };
	}

	// 検証成功
	const validatedInfo: ValidatedInputFileInfo = {
		name: file.name,
		size: file.size,
		extension: ".inp",
		mimeType: file.type,
		uploadedAt: new Date(),
	};

	return { valid: true, fileInfo: validatedInfo };
};

/**
 * ファイルサイズを人間が読みやすい形式に変換する純粋関数
 */
const formatFileSize = (bytes: number): string => {
	const units = ["B", "KB", "MB", "GB", "TB"];
	let size = bytes;
	let unitIndex = 0;

	while (size >= 1024 && unitIndex < units.length - 1) {
		size /= 1024;
		unitIndex++;
	}

	return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
};

// === Public API (関数型インターフェース) ===

/**
 * Input File Validation Domain Service
 *
 * Abaqus .inp ファイルアップロード専用のバリデーションAPI
 * すべての関数は純粋関数として実装
 */
export const InputFileValidation = {
	/**
	 * .inp ファイル検証（メイン機能）
	 */
	validate: (file: FileUploadInfo): InputFileValidationResult =>
		validateInputFile(file),

	/**
	 * 安全なファイルパス生成（utils委譲）
	 */
	generateSafePath: (
		filename: string,
		baseDirectory: string,
		subdirectory?: string,
	): FileOperationResult<string> =>
		FilenameSafety.generateSafePath(filename, baseDirectory, subdirectory),

	/**
	 * ファイルサイズフォーマット
	 */
	formatSize: (bytes: number): string => formatFileSize(bytes),

	/**
	 * ユーティリティ関数
	 */
	utils: {
		isInputFile: (filename: string): boolean => isInputFile(filename),
		getMaxFileSize: (): number => MAX_INPUT_FILE_SIZE,
		getMaxFileSizeFormatted: (): string => formatFileSize(MAX_INPUT_FILE_SIZE),
		getSupportedExtension: (): string => INPUT_FILE_EXTENSION,
	},

	/**
	 * 定数値へのアクセス
	 */
	constants: {
		INPUT_FILE_EXTENSION,
		MAX_INPUT_FILE_SIZE,
	},
} as const;
