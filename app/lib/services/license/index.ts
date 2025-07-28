/**
 * License Service
 * Exports for license configuration and calculation functionality
 */

// Client-safe exports
export {
	calculateAvailableLicenseTokens,
	checkAvailableLicenseTokens,
	validateServerName,
	validateTokenCount,
	DEFAULT_LICENSE_CONFIG,
} from "./license-config";

export type { LicenseConfig } from "./license-config";

export {
	calculateLicenseTokens,
	AVAILABLE_CPU_OPTIONS,
	CPU_LICENSE_MAPPING,
} from "./license-calculator";

export type { CpuOption } from "./license-calculator";
