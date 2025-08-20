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

// Domain service (client-safe)
export {
	LicenseCalculation,
	type CpuCoreOption,
	type CpuLicenseMapping,
} from "../../../domain/services/license-calculation";
