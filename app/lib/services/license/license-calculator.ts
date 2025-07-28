/**
 * Abaqus License Token Calculation Utility
 */

import { JobActionDialog } from "~/components/jobs/shared/JobActionDialog";
import { type Job } from "~/lib/core/types/database";

/**
 * License tokens required for single core execution
 */
const SINGLE_CORE_LICENSE_TOKENS = 5;

/**
 * Calculate license tokens based on CPU count
 * Formula: tokens = floor(singleCoreTokens × coreCount^0.422)
 * @param coreCount Number of CPU cores (or CPU+GPU count)
 * @param singleCoreTokens License tokens required for single core execution
 */
export function calculateLicenseTokens(
	coreCount: number,
	singleCoreTokens: number = SINGLE_CORE_LICENSE_TOKENS,
) {
	return Math.floor(singleCoreTokens * coreCount ** 0.422);
}

/**
 * Calculate license tokens based on CPU count on the job
 */
export function calculateLicenseTokensOnJob(job: Job) {
	return calculateLicenseTokens(job.cpu_cores);
}

/**
 * Available CPU core options for analysis
 */
export const AVAILABLE_CPU_OPTIONS = [2, 4, 8] as const;
export type CpuOption = (typeof AVAILABLE_CPU_OPTIONS)[number];

/**
 * CPU options mapped to license tokens and descriptions
 */
export const CPU_LICENSE_MAPPING = AVAILABLE_CPU_OPTIONS.map((cpu) => ({
	cpu,
	tokens: calculateLicenseTokens(cpu),
	description: `${cpu} core analysis`,
}));
