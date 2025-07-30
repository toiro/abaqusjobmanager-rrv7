/**
 * Server-only License Service
 * Exports for server-side license operations
 */

// Server-only exports
export {
	getLicenseConfig,
	setLicenseServerName,
	setTotalLicenseTokens,
	updateLicenseConfig,
	getCurrentLicenseUsage,
	getAvailableLicenseTokens,
	hasAvailableLicenseTokens,
} from "./license-config.server";

export type { LicenseConfig } from "./license-config.server";

// Calculator (client-safe)
export {
	calculateLicenseTokens,
	AVAILABLE_CPU_OPTIONS,
	CPU_LICENSE_MAPPING,
} from "./license-calculator";

export type { CpuOption } from "./license-calculator";
