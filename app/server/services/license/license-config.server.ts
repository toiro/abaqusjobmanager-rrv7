/**
 * Server-only license configuration management
 * This file will NOT be included in client bundles
 */

import {
	getMainSettings,
	updateMainSettings,
} from "~/shared/core/database/settings-operations";
import { LicenseCalculation } from "../../../domain/services/license-calculation";
import { jobRepository } from "../../../shared/core/database/index.server";
import { validateServerName, validateTokenCount } from "./license-validation";

export interface LicenseConfig {
	serverName: string;
	totalTokens: number;
}

/**
 * Get current license configuration
 */
export function getLicenseConfig(): LicenseConfig {
	const settings = getMainSettings();

	return {
		serverName: settings.LICENSE_SERVER || "localhost",
		totalTokens: settings.AVAILABLE_LICENCE_TOKEN || 50,
	};
}

/**
 * Update license server name
 */
export function setLicenseServerName(serverName: string): void {
	validateServerName(serverName);
	updateMainSettings({ LICENSE_SERVER: serverName });
}

/**
 * Update total license tokens
 */
export function setTotalLicenseTokens(tokens: number): void {
	validateTokenCount(tokens);
	updateMainSettings({ AVAILABLE_LICENCE_TOKEN: tokens });
}

/**
 * Update both license configuration values
 */
export function updateLicenseConfig(config: LicenseConfig): void {
	validateServerName(config.serverName);
	validateTokenCount(config.totalTokens);

	updateMainSettings({
		LICENSE_SERVER: config.serverName,
		AVAILABLE_LICENCE_TOKEN: config.totalTokens,
	});
}

/**
 * Get current license usage across all running jobs
 * Calculates total license tokens used by jobs with status 'starting' or 'running'
 */
export function getCurrentLicenseUsage(): number {
	try {
		const runningJobs = jobRepository.findJobsByStatuses([
			"starting",
			"running",
		]);
		return runningJobs.reduce((total, job) => {
			return total + LicenseCalculation.calculateTokens(job.cpu_cores);
		}, 0);
	} catch (error) {
		throw new Error(
			`Failed to calculate current license usage: ${error instanceof Error ? error.message : "Unknown error"}`,
		);
	}
}

/**
 * Get available license tokens
 */
export function getAvailableLicenseTokens(): number {
	const config = getLicenseConfig();
	const currentUsage = getCurrentLicenseUsage();
	return Math.max(0, config.totalTokens - currentUsage);
}

/**
 * Check if there are enough license tokens available for a job
 */
export function hasAvailableLicenseTokens(requiredTokens: number): boolean {
	const available = getAvailableLicenseTokens();
	return available >= requiredTokens;
}
