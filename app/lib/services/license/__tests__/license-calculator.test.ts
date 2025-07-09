import { describe, it, expect } from 'bun:test';
import { 
  AVAILABLE_CPU_OPTIONS, 
  CPU_LICENSE_MAPPING, 
  isValidCpuCount, 
  getLicenseCalculationInfo 
} from '../license-calculator';

describe('License Calculator', () => {
  describe('AVAILABLE_CPU_OPTIONS', () => {
    it('should contain valid CPU options', () => {
      expect(AVAILABLE_CPU_OPTIONS).toEqual([2, 4, 8]);
    });
  });

  describe('CPU_LICENSE_MAPPING', () => {
    it('should calculate correct license tokens for each CPU option', () => {
      const expectedMappings = [
        { cpu: 2, tokens: 6, description: 'Light analysis' },
        { cpu: 4, tokens: 8, description: 'Medium analysis' },
        { cpu: 8, tokens: 12, description: 'Heavy analysis' }
      ];

      CPU_LICENSE_MAPPING.forEach((mapping, index) => {
        expect(mapping.cpu).toBe(expectedMappings[index].cpu as 2 | 4 | 8);
        expect(mapping.tokens).toBe(expectedMappings[index].tokens);
        expect(mapping.description).toBe(expectedMappings[index].description);
      });
    });
  });

  describe('isValidCpuCount', () => {
    it('should return true for valid CPU counts', () => {
      expect(isValidCpuCount(2)).toBe(true);
      expect(isValidCpuCount(4)).toBe(true);
      expect(isValidCpuCount(8)).toBe(true);
    });

    it('should return false for invalid CPU counts', () => {
      expect(isValidCpuCount(1)).toBe(false);
      expect(isValidCpuCount(3)).toBe(false);
      expect(isValidCpuCount(16)).toBe(false);
    });
  });

  describe('getLicenseCalculationInfo', () => {
    it('should return correct calculation info for valid CPU counts', () => {
      const info2 = getLicenseCalculationInfo(2);
      expect(info2.cpuCount).toBe(2);
      expect(info2.licenseTokens).toBe(6);
      expect(info2.description).toBe('Light analysis');
      expect(info2.efficiency).toBeCloseTo(2/6, 3);

      const info4 = getLicenseCalculationInfo(4);
      expect(info4.cpuCount).toBe(4);
      expect(info4.licenseTokens).toBe(8);
      expect(info4.description).toBe('Medium analysis');
      expect(info4.efficiency).toBe(0.5);

      const info8 = getLicenseCalculationInfo(8);
      expect(info8.cpuCount).toBe(8);
      expect(info8.licenseTokens).toBe(12);
      expect(info8.description).toBe('Heavy analysis');
      expect(info8.efficiency).toBeCloseTo(8/12, 3);
    });

    it('should throw error for invalid CPU counts', () => {
      expect(() => getLicenseCalculationInfo(1)).toThrow('Invalid CPU count: 1');
      expect(() => getLicenseCalculationInfo(16)).toThrow('Invalid CPU count: 16');
    });
  });
});