/**
 * License status utilities with readability-first approach
 * Abstracts business logic calculations and magic numbers
 */

// License usage thresholds as named constants (instead of magic numbers)
const CRITICAL_USAGE_THRESHOLD = 0.9;
const WARNING_USAGE_THRESHOLD = 0.7;

/**
 * Check if license usage is at critical level (≥90%)
 * Hides mathematical calculation and magic number
 */
export const isLicenseAtCriticalLevel = (used: number, total: number): boolean => {
  return (used / total) >= CRITICAL_USAGE_THRESHOLD;
};

/**
 * Check if license usage is at warning level (≥70%)
 * Hides mathematical calculation and magic number
 */
export const isLicenseAtWarningLevel = (used: number, total: number): boolean => {
  return (used / total) >= WARNING_USAGE_THRESHOLD;
};

/**
 * Get license usage ratio
 * Abstracts basic calculation for clarity
 */
export const calculateLicenseUsageRatio = (used: number, total: number): number => {
  if (total === 0) return 0;
  return used / total;
};

/**
 * Get license status configuration based on usage
 * Abstracts complex conditional logic
 */
export const getLicenseStatusConfig = (used: number, total: number) => {
  if (isLicenseAtCriticalLevel(used, total)) {
    return {
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      text: 'License limit reached',
      urgent: true
    };
  }
  
  if (isLicenseAtWarningLevel(used, total)) {
    return {
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      text: 'License usage high',
      urgent: false
    };
  }
  
  return {
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    text: 'License usage normal',
    urgent: false
  };
};