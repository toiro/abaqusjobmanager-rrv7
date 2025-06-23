/**
 * Abaqusライセンストークン計算ユーティリティ
 */

/**
 * 1コアで実行する時に使用する計算トークン数
 */
const NONE = 5

/**
 * CPU数に対する使用計算トークン数
 * トークン数 = Int(None×Ncore^0.422)
 * @param { Number } none 1コアで実行する時に使用する計算トークン数
 * @param { Number } ncore コア数、または（CPU+GPU）数
 */
export function calculateLicenseTokens(ncore: number,none: number = NONE) {
  return Math.floor(none * ncore ** 0.422);
}

/**
 * 利用可能なCPU選択肢を取得
 */
export const AVAILABLE_CPU_OPTIONS = [2, 4, 8] as const;
export type CpuOption = typeof AVAILABLE_CPU_OPTIONS[number];

/**
 * CPU選択肢とライセンストークンのマッピング
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
 * CPU数の妥当性をチェック
 */
export function isValidCpuCount(cpu: number): cpu is CpuOption {
    return AVAILABLE_CPU_OPTIONS.includes(cpu as CpuOption);
}

/**
 * ライセンストークン計算の詳細情報を取得
 */
export function getLicenseCalculationInfo(cpuCount: number) {
    if (!isValidCpuCount(cpuCount)) {
        throw new Error(`Invalid CPU count: ${cpuCount}`);
    }

    return {
        cpuCount,
        licenseTokens: calculateLicenseTokens(cpuCount),
        description: getCpuDescription(cpuCount),
        efficiency: cpuCount / calculateLicenseTokens(cpuCount) // CPU効率（参考値）
    };
}