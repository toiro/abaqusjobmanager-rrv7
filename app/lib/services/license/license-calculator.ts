/**
 * Abaqus License Token Calculation Utility
 */

/**
 * License tokens required for single core execution
 */
const SINGLE_CORE_LICENSE_TOKENS = 5

/**
 * Calculate license tokens based on CPU count
 * Formula: tokens = floor(singleCoreTokens × coreCount^0.422)
 * @param coreCount Number of CPU cores (or CPU+GPU count)
 * @param singleCoreTokens License tokens required for single core execution
 */
export function calculateLicenseTokens(coreCount: number, singleCoreTokens: number = SINGLE_CORE_LICENSE_TOKENS) {
  return Math.floor(singleCoreTokens * coreCount ** 0.422);
}

/**
 * Available CPU core options for analysis
 */
export const AVAILABLE_CPU_OPTIONS = [2, 4, 8] as const;
export type CpuOption = typeof AVAILABLE_CPU_OPTIONS[number];

/**
 * CPU options mapped to license tokens and descriptions
 */
export const CPU_LICENSE_MAPPING = AVAILABLE_CPU_OPTIONS.map(cpu => ({
    cpu,
    tokens: calculateLicenseTokens(cpu),
    description: getCpuDescription(cpu)
}));

function getCpuDescription(cpu: number): string {
    switch (cpu) {
        case 2: return 'Light analysis';
        case 4: return 'Medium analysis';
        case 8: return 'Heavy analysis';
        default: return `${cpu} core analysis`;
    }
}

/**
 * Validate CPU count against available options
 */
export function isValidCpuCount(cpu: number): cpu is CpuOption {
    return AVAILABLE_CPU_OPTIONS.includes(cpu as CpuOption);
}

/**
 * License calculation information type
 */
export interface LicenseCalculationInfo {
    cpuCount: number;
    licenseTokens: number;
    description: string;
    efficiency: number;
}

/**
 * Get detailed license calculation information
 */
export function getLicenseCalculationInfo(cpuCount: number): LicenseCalculationInfo {
    if (!isValidCpuCount(cpuCount)) {
        throw new Error(`Invalid CPU count: ${cpuCount}`);
    }

    return {
        cpuCount,
        licenseTokens: calculateLicenseTokens(cpuCount),
        description: getCpuDescription(cpuCount),
        efficiency: cpuCount / calculateLicenseTokens(cpuCount) // CPU efficiency ratio
    };
}