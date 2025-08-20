/**
 * Filename Safety Utilities (Domain Utils)
 *
 * ファイル名の安全性チェックと処理を行うユーティリティ関数群
 * - Security Validation: 危険な文字・拡張子のチェック
 * - Path Generation: 安全なパス生成
 * - Cross-cutting Concern: ドメイン横断的な関心事
 */

// === Types ===

/**
 * ファイル操作結果
 */
export type FileOperationResult<T = void> = 
	| { readonly success: true; readonly data: T }
	| { readonly success: false; readonly error: string };

// === Constants ===

/**
 * 危険な拡張子（セキュリティ）
 */
export const DANGEROUS_EXTENSIONS = [
	'.exe', '.bat', '.cmd', '.com', '.scr', '.pif', '.vbs', '.js', '.jar',
	'.sh', '.ps1', '.psm1', '.psd1', '.msi', '.dll', '.so', '.dylib'
] as const;

/**
 * 最大ファイル名長
 */
export const MAX_FILENAME_LENGTH = 255 as const;

/**
 * Windows予約名
 */
const WINDOWS_RESERVED_NAMES = [
	'CON', 'PRN', 'AUX', 'NUL', 
	'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
	'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'
] as const;

// === Pure Functions ===

/**
 * ファイル拡張子を取得する純粋関数
 */
export const getFileExtension = (filename: string): string => {
	const lastDot = filename.lastIndexOf('.');
	return lastDot === -1 ? '' : filename.slice(lastDot).toLowerCase();
};

/**
 * ファイル名（拡張子なし）を取得する純粋関数
 */
export const getBaseName = (filename: string): string => {
	const lastDot = filename.lastIndexOf('.');
	return lastDot === -1 ? filename : filename.slice(0, lastDot);
};

/**
 * 拡張子が安全かチェックする純粋関数
 */
export const isExtensionSafe = (extension: string): boolean => {
	const normalizedExt = extension.toLowerCase();
	return !DANGEROUS_EXTENSIONS.includes(normalizedExt as any);
};

/**
 * ファイル名の安全性をバリデーションする純粋関数
 */
const validateFilename = (filename: string): readonly string[] => {
	const issues: string[] = [];

	// 空ファイル名チェック
	if (!filename.trim()) {
		issues.push('Filename cannot be empty');
		return issues;
	}

	// 長さチェック
	if (filename.length > MAX_FILENAME_LENGTH) {
		issues.push(`Filename too long: ${filename.length} characters (max: ${MAX_FILENAME_LENGTH})`);
	}

	// 危険な文字チェック
	const dangerousChars = /[<>:"|?*\x00-\x1f]/;
	if (dangerousChars.test(filename)) {
		issues.push('Filename contains dangerous characters');
	}

	// 危険な拡張子チェック
	const extension = getFileExtension(filename);
	if (!isExtensionSafe(extension)) {
		issues.push(`Dangerous file extension: ${extension}`);
	}

	// 予約名チェック（Windows）
	const baseName = getBaseName(filename).toUpperCase();
	if (WINDOWS_RESERVED_NAMES.includes(baseName as any)) {
		issues.push(`Reserved filename: ${baseName}`);
	}

	return issues;
};

/**
 * ファイル名をサニタイズする純粋関数
 */
const sanitizeFilename = (filename: string): string => {
	return filename
		// 危険な文字を除去
		.replace(/[<>:"|?*\x00-\x1f]/g, '')
		// 連続するドットを単一に
		.replace(/\.{2,}/g, '.')
		// 先頭末尾の空白・ドットを除去
		.replace(/^[\s.]+|[\s.]+$/g, '')
		// 最大長制限
		.slice(0, MAX_FILENAME_LENGTH);
};

/**
 * 安全なファイルパスを生成する純粋関数
 */
const generateSafeFilePath = (
	filename: string, 
	baseDirectory: string, 
	subdirectory?: string
): FileOperationResult<string> => {
	// ファイル名安全性チェック
	const safetyIssues = validateFilename(filename);
	if (safetyIssues.length > 0) {
		return { 
			success: false, 
			error: `Unsafe filename: ${safetyIssues.join(', ')}` 
		};
	}

	// パス構築
	const pathParts = [baseDirectory];
	if (subdirectory) {
		pathParts.push(subdirectory);
	}
	pathParts.push(filename);

	const fullPath = pathParts.join('/').replace(/\/+/g, '/');

	// パストラバーサル攻撃防止
	const normalizedPath = fullPath.replace(/\.\./g, '');
	if (normalizedPath !== fullPath) {
		return { 
			success: false, 
			error: 'Path traversal detected' 
		};
	}

	return { success: true, data: normalizedPath };
};

// === Public API ===

/**
 * Filename Safety Utilities
 *
 * ファイル名の安全性チェックと処理を行うユーティリティ関数群
 * ドメイン横断的な関心事として実装
 */
export const FilenameSafety = {
	/**
	 * ファイル名の安全性をバリデーション
	 */
	validate: (filename: string): readonly string[] =>
		validateFilename(filename),

	/**
	 * 拡張子の安全性チェック
	 */
	isExtensionSafe: (extension: string): boolean =>
		isExtensionSafe(extension),

	/**
	 * ファイル名をサニタイズ
	 */
	sanitize: (filename: string): string =>
		sanitizeFilename(filename),

	/**
	 * 安全なファイルパス生成
	 */
	generateSafePath: (
		filename: string, 
		baseDirectory: string, 
		subdirectory?: string
	): FileOperationResult<string> =>
		generateSafeFilePath(filename, baseDirectory, subdirectory),

	/**
	 * ファイル名解析ユーティリティ
	 */
	parse: {
		extension: getFileExtension,
		baseName: getBaseName,
	},

	/**
	 * 定数値へのアクセス
	 */
	constants: {
		DANGEROUS_EXTENSIONS,
		MAX_FILENAME_LENGTH,
		WINDOWS_RESERVED_NAMES,
	},
} as const;