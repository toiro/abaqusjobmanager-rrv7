/**
 * License Service
 * Exports for license configuration and calculation functionality
 */

export {
  getLicenseConfig,
  setLicenseServerName,
  setTotalLicenseTokens,
  updateLicenseConfig,
  getCurrentLicenseUsage,
  getAvailableLicenseTokens,
  hasAvailableLicenseTokens
} from './license-config';

export type {
  LicenseConfig
} from './license-config';

export {
  calculateLicenseTokens,
  isValidCpuCount,
  getLicenseCalculationInfo,
  AVAILABLE_CPU_OPTIONS,
  CPU_LICENSE_MAPPING
} from './license-calculator';

export type {
  CpuOption,
  LicenseCalculationInfo
} from './license-calculator';