/**
 * Abaqusライセンストークン計算ユーティリティ
 */

/**
 * CPU数からAbaqusライセンストークン数を計算する関数
 * Abaqusの実際のライセンス消費パターンに基づく非線形関数
 * 
 * @param cpuCount CPU数 (2, 4, 8)
 * @returns 必要なライセンストークン数
 */
export function calculateLicenseTokens(cpuCount: number): number {
    // TODO: 実際のAbaqusライセンス消費関数に置き換える
    // 現在は例として非線形の関数を使用
    
    switch (cpuCount) {
        case 1:
            return 1;
        case 2:
            return 2;
        case 4:
            return 5;  // 非線形: 4CPUで5トークン
        case 8:
            return 12; // 非線形: 8CPUで12トークン
        default:
            // より多いCPU数の場合の計算式（要調整）
            if (cpuCount > 8) {
                return Math.ceil(cpuCount * 1.5 + 2);
            }
            throw new Error(`Unsupported CPU count: ${cpuCount}`);
    }
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