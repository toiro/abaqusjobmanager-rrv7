/**
 * Server-only logger implementation
 * This file will NOT be included in client bundles
 */

import { getLogger as getLogTapeLogger } from "@logtape/logtape";

/**
 * Get the server-side logger instance
 * Only supports "app" and "http" categories
 */
export function getLogger(category: "app" | "http" = "app") {
	return getLogTapeLogger(category);
}

export { initializeLogger } from "./config";
