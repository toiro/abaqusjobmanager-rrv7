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

// Domain service exports
export {
	LicenseCalculation,
	type CpuCoreOption,
	type CpuLicenseMapping,
	type JobCpuInfo,
} from "../../../domain/services/license-calculation";
