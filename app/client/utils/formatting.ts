/**
 * Formatting utilities with readability-first approach
 * Abstracts low-level processing to improve intent clarity
 */

/**
 * Format ISO date string to human-readable format
 * Hides low-level string manipulation (replace, substring)
 */
export const formatISOToReadable = (dateString?: string): string => {
	if (!dateString) return "-";
	try {
		return new Date(dateString)
			.toISOString()
			.replace("T", " ")
			.substring(0, 19);
	} catch {
		return dateString;
	}
};

/**
 * Format job ID with zero-padded prefix
 * Hides low-level number formatting (toString, padStart)
 */
export const formatJobIdWithPrefix = (id?: number): string => {
	return id ? `#${id.toString().padStart(4, "0")}` : "-";
};

/**
 * Convert bytes to human-readable file size
 * Hides complex mathematical operations (Math.log, Math.pow, parseFloat)
 */
export const formatBytesToHumanReadable = (bytes: number): string => {
	if (bytes === 0) return "0 Bytes";
	const k = 1024;
	const sizes = ["Bytes", "KB", "MB", "GB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return parseFloat((bytes / k ** i).toFixed(2)) + " " + sizes[i];
};

/**
 * Extract file extension from filename
 * Hides low-level string manipulation (split, pop, toLowerCase)
 */
export const extractFileExtension = (filename: string): string => {
	return "." + filename.split(".").pop()?.toLowerCase();
};

/**
 * Remove file extension from filename
 * Hides regex pattern for extension removal
 */
export const removeFileExtension = (filename: string): string => {
	return filename.replace(/\.[^/.]+$/, "");
};

/**
 * Convert user ID to string for form values
 * Hides low-level type conversion
 */
export const convertUserIdToString = (id?: number): string => {
	return id?.toString() || "";
};

/**
 * Format CPU cores validation error message
 * Hides string template processing
 */
export const formatCpuCoresError = (maxCores: number): string => {
	// Note: This assumes ERROR_MESSAGES.INVALID_CPU_CORES exists with {max} placeholder
	return `CPU cores must be between 1 and ${maxCores}`;
};
