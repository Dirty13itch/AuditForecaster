/**
 * Blower Door Testing - Comprehensive Unit Tests
 * 
 * CRITICAL LEGAL LIABILITY TEST SUITE
 * Tests all calculation functions for RESNET-certified blower door testing
 * Ensures Minnesota 2020 Energy Code compliance calculations are accurate
 * 
 * Coverage Requirements:
 * - 50+ test cases minimum
 * - 100% code coverage for all calculation functions
 * - All edge cases and error conditions tested
 * - Realistic field inspection values
 */

import { describe, it, expect } from 'vitest';
import {
  calculateACH50,
  applyWeatherCorrections,
  averageMultiPointTests,
  checkMinnesotaCompliance,
  calculateAltitudeCorrection,
  applyCorrectedCFM50,
  calculateELA,
  type WeatherConditions,
  type ComplianceResult,
} from '../blowerDoorService';

describe('Blower Door Testing - ACH50 Calculations', () => {
  describe('calculateACH50', () => {
    it('calculates ACH50 for normal house', () => {
      // Formula: ACH50 = (CFM50 × 60) / Volume
      // (1200 × 60) / 15000 = 72000 / 15000 = 4.8
      const result = calculateACH50(1200, 15000);
      expect(result).toBe(4.8);
    });

    it('calculates ACH50 for tight house that passes Minnesota code', () => {
      // (600 × 60) / 15000 = 36000 / 15000 = 2.4
      const result = calculateACH50(600, 15000);
      expect(result).toBe(2.4);
      expect(result).toBeLessThanOrEqual(3.0); // Minnesota 2020 Energy Code threshold
    });

    it('calculates ACH50 for leaky house that fails Minnesota code', () => {
      // (2000 × 60) / 15000 = 120000 / 15000 = 8.0
      const result = calculateACH50(2000, 15000);
      expect(result).toBe(8.0);
      expect(result).toBeGreaterThan(3.0); // Fails Minnesota code
    });

    it('calculates ACH50 for very small house', () => {
      // (300 × 60) / 5000 = 18000 / 5000 = 3.6
      const result = calculateACH50(300, 5000);
      expect(result).toBe(3.6);
    });

    it('calculates ACH50 for very large house', () => {
      // (3000 × 60) / 50000 = 180000 / 50000 = 3.6
      const result = calculateACH50(3000, 50000);
      expect(result).toBe(3.6);
    });

    it('calculates ACH50 at exactly 3.0 threshold (boundary case)', () => {
      // (750 × 60) / 15000 = 45000 / 15000 = 3.0
      const result = calculateACH50(750, 15000);
      expect(result).toBe(3.0);
    });

    it('calculates ACH50 for ultra-tight house (Passive House standard)', () => {
      // Passive House target: 0.6 ACH50
      // (150 × 60) / 15000 = 9000 / 15000 = 0.6
      const result = calculateACH50(150, 15000);
      expect(result).toBe(0.6);
    });

    it('calculates ACH50 for larger volume house', () => {
      // (1800 × 60) / 30000 = 108000 / 30000 = 3.6
      const result = calculateACH50(1800, 30000);
      expect(result).toBe(3.6);
    });

    it('handles zero CFM50 (theoretical perfect seal)', () => {
      const result = calculateACH50(0, 15000);
      expect(result).toBe(0);
    });

    it('calculates ACH50 for tiny house', () => {
      // (200 × 60) / 3000 = 12000 / 3000 = 4.0
      const result = calculateACH50(200, 3000);
      expect(result).toBe(4.0);
    });

    it('calculates ACH50 for mansion', () => {
      // (5000 × 60) / 100000 = 300000 / 100000 = 3.0
      const result = calculateACH50(5000, 100000);
      expect(result).toBe(3.0);
    });

    it('rounds to 2 decimal places', () => {
      // (333 × 60) / 10000 = 19980 / 10000 = 1.998 → 2.00
      const result = calculateACH50(333, 10000);
      expect(result).toBe(2.00);
      // Note: JavaScript drops trailing zeros, so 2.00 becomes "2"
      expect(typeof result).toBe('number');
    });

    it('throws error for zero volume', () => {
      expect(() => calculateACH50(1200, 0)).toThrow('Volume must be greater than zero');
    });

    it('throws error for negative volume', () => {
      expect(() => calculateACH50(1200, -1000)).toThrow('Volume must be greater than zero');
    });

    it('throws error for negative CFM50', () => {
      expect(() => calculateACH50(-100, 15000)).toThrow('CFM50 cannot be negative');
    });

    it('throws error for infinite CFM50', () => {
      expect(() => calculateACH50(Infinity, 15000)).toThrow('CFM50 and volume must be finite numbers');
    });

    it('throws error for infinite volume', () => {
      expect(() => calculateACH50(1200, Infinity)).toThrow('CFM50 and volume must be finite numbers');
    });

    it('throws error for NaN CFM50', () => {
      expect(() => calculateACH50(NaN, 15000)).toThrow('CFM50 and volume must be finite numbers');
    });

    it('throws error for NaN volume', () => {
      expect(() => calculateACH50(1200, NaN)).toThrow('CFM50 and volume must be finite numbers');
    });
  });

  describe('Weather Corrections', () => {
    it('applies no correction for standard conditions (70°F, 29.92 in Hg)', () => {
      const conditions: WeatherConditions = {
        indoorTemp: 70,
        outdoorTemp: 70,
        barometricPressure: 29.92,
      };
      const correctionFactor = applyWeatherCorrections(conditions);
      expect(correctionFactor).toBe(1.0);
    });

    it('applies correction for cold outdoor weather', () => {
      // Cold outdoor air is denser, so correction factor > 1.0
      const conditions: WeatherConditions = {
        indoorTemp: 70,
        outdoorTemp: 0,
        barometricPressure: 30.2, // High pressure in winter
      };
      const correctionFactor = applyWeatherCorrections(conditions);
      expect(correctionFactor).toBeGreaterThan(1.0);
      expect(correctionFactor).toBeLessThan(1.15); // Realistic range
    });

    it('applies correction for hot outdoor weather', () => {
      // Hot outdoor air is less dense, so correction factor < 1.0
      const conditions: WeatherConditions = {
        indoorTemp: 70,
        outdoorTemp: 95,
        barometricPressure: 29.5, // Lower pressure in summer
      };
      const correctionFactor = applyWeatherCorrections(conditions);
      expect(correctionFactor).toBeLessThan(1.0);
      expect(correctionFactor).toBeGreaterThan(0.85); // Realistic range
    });

    it('applies correction for high altitude (Denver - 25.0 in Hg)', () => {
      // Lower pressure at altitude reduces correction factor
      const conditions: WeatherConditions = {
        indoorTemp: 70,
        outdoorTemp: 70,
        barometricPressure: 25.0, // ~5000 ft elevation
      };
      const correctionFactor = applyWeatherCorrections(conditions);
      expect(correctionFactor).toBeLessThan(1.0);
      expect(correctionFactor).toBeCloseTo(0.916, 2); // √(25.0/29.92) ≈ 0.914
    });

    it('applies correction for sea level high pressure', () => {
      const conditions: WeatherConditions = {
        indoorTemp: 70,
        outdoorTemp: 70,
        barometricPressure: 31.0, // High pressure system
      };
      const correctionFactor = applyWeatherCorrections(conditions);
      expect(correctionFactor).toBeGreaterThan(1.0);
      expect(correctionFactor).toBeCloseTo(1.019, 2); // √(31.0/29.92) ≈ 1.018
    });

    it('handles extreme cold weather (-20°F)', () => {
      const conditions: WeatherConditions = {
        indoorTemp: 70,
        outdoorTemp: -20,
        barometricPressure: 30.5,
      };
      const correctionFactor = applyWeatherCorrections(conditions);
      expect(correctionFactor).toBeGreaterThan(1.0);
      expect(correctionFactor).toBeLessThan(1.2);
    });

    it('handles hot indoor conditions (no AC)', () => {
      const conditions: WeatherConditions = {
        indoorTemp: 85,
        outdoorTemp: 95,
        barometricPressure: 29.92,
      };
      const correctionFactor = applyWeatherCorrections(conditions);
      expect(correctionFactor).toBeLessThan(1.0);
      expect(correctionFactor).toBeGreaterThan(0.95);
    });

    it('calculates precise correction for typical winter day (Minnesota)', () => {
      const conditions: WeatherConditions = {
        indoorTemp: 68,
        outdoorTemp: 20,
        barometricPressure: 30.1,
      };
      const correctionFactor = applyWeatherCorrections(conditions);
      
      // Manual calculation for verification:
      // Temp: √((68+460)/(20+460)) = √(528/480) = √1.1 ≈ 1.049
      // Press: √(30.1/29.92) = √1.006 ≈ 1.003
      // Combined: 1.049 × 1.003 ≈ 1.052
      expect(correctionFactor).toBeCloseTo(1.052, 2);
    });

    it('throws error for temperature below absolute zero (indoor)', () => {
      const conditions: WeatherConditions = {
        indoorTemp: -500, // Below -459.67°F (absolute zero)
        outdoorTemp: 70,
        barometricPressure: 29.92,
      };
      expect(() => applyWeatherCorrections(conditions)).toThrow('Temperature below absolute zero');
    });

    it('throws error for temperature below absolute zero (outdoor)', () => {
      const conditions: WeatherConditions = {
        indoorTemp: 70,
        outdoorTemp: -500,
        barometricPressure: 29.92,
      };
      expect(() => applyWeatherCorrections(conditions)).toThrow('Temperature below absolute zero');
    });

    it('throws error for unrealistic low barometric pressure', () => {
      const conditions: WeatherConditions = {
        indoorTemp: 70,
        outdoorTemp: 70,
        barometricPressure: 15.0, // Unrealistically low
      };
      expect(() => applyWeatherCorrections(conditions)).toThrow('Barometric pressure out of realistic range');
    });

    it('throws error for unrealistic high barometric pressure', () => {
      const conditions: WeatherConditions = {
        indoorTemp: 70,
        outdoorTemp: 70,
        barometricPressure: 35.0, // Unrealistically high
      };
      expect(() => applyWeatherCorrections(conditions)).toThrow('Barometric pressure out of realistic range');
    });

    it('throws error for infinite temperature', () => {
      const conditions: WeatherConditions = {
        indoorTemp: Infinity,
        outdoorTemp: 70,
        barometricPressure: 29.92,
      };
      expect(() => applyWeatherCorrections(conditions)).toThrow('All weather parameters must be finite numbers');
    });

    it('throws error for NaN barometric pressure', () => {
      const conditions: WeatherConditions = {
        indoorTemp: 70,
        outdoorTemp: 70,
        barometricPressure: NaN,
      };
      expect(() => applyWeatherCorrections(conditions)).toThrow('All weather parameters must be finite numbers');
    });
  });

  describe('Multi-Point Test Averaging', () => {
    it('averages two test points', () => {
      const readings = [1200, 1250];
      const result = averageMultiPointTests(readings);
      expect(result.average).toBe(1225);
      expect(result.hasOutliers).toBe(false);
    });

    it('averages four test points', () => {
      const readings = [1200, 1250, 1220, 1240];
      const result = averageMultiPointTests(readings);
      expect(result.average).toBe(1227.5);
      expect(result.hasOutliers).toBe(false);
    });

    it('handles single test point', () => {
      const readings = [1200];
      const result = averageMultiPointTests(readings);
      expect(result.average).toBe(1200);
      expect(result.hasOutliers).toBe(false);
    });

    it('detects outlier in test readings', () => {
      // 5000 is >20% different from median (1225)
      const readings = [1200, 1250, 5000];
      const result = averageMultiPointTests(readings, true);
      expect(result.hasOutliers).toBe(true);
      expect(result.outliers).toBeDefined();
      expect(result.outliers).toContain(5000);
    });

    it('averages typical 7-point blower door test', () => {
      const readings = [1210, 1205, 1215, 1220, 1200, 1225, 1218];
      const result = averageMultiPointTests(readings);
      // (1210+1205+1215+1220+1200+1225+1218) / 7 ≈ 1213.29
      expect(result.average).toBeCloseTo(1213.29, 1);
      expect(result.hasOutliers).toBe(false);
    });

    it('detects multiple outliers', () => {
      const readings = [1200, 1210, 1205, 5000, 6000];
      const result = averageMultiPointTests(readings, true);
      expect(result.hasOutliers).toBe(true);
      expect(result.outliers?.length).toBeGreaterThan(0);
    });

    it('does not detect outliers when disabled', () => {
      const readings = [1200, 1250, 5000];
      const result = averageMultiPointTests(readings, false);
      expect(result.hasOutliers).toBe(false);
      expect(result.outliers).toBeUndefined();
    });

    it('handles all identical readings', () => {
      const readings = [1200, 1200, 1200, 1200];
      const result = averageMultiPointTests(readings);
      expect(result.average).toBe(1200);
      expect(result.hasOutliers).toBe(false);
    });

    it('rounds average to 2 decimal places', () => {
      const readings = [1200.33, 1250.67, 1225.99];
      const result = averageMultiPointTests(readings);
      expect(result.average.toString()).toMatch(/^\d+\.\d{1,2}$/);
    });

    it('throws error for empty array', () => {
      expect(() => averageMultiPointTests([])).toThrow('Cannot average empty array of readings');
    });

    it('throws error for negative CFM reading', () => {
      const readings = [1200, -500, 1250];
      expect(() => averageMultiPointTests(readings)).toThrow('CFM readings cannot be negative');
    });

    it('throws error for infinite reading', () => {
      const readings = [1200, Infinity, 1250];
      expect(() => averageMultiPointTests(readings)).toThrow('All CFM readings must be finite numbers');
    });

    it('throws error for NaN reading', () => {
      const readings = [1200, NaN, 1250];
      expect(() => averageMultiPointTests(readings)).toThrow('All CFM readings must be finite numbers');
    });
  });

  describe('Minnesota 2020 Energy Code Compliance', () => {
    it('passes compliance with ACH50 = 2.8 (under limit)', () => {
      const result = checkMinnesotaCompliance(2.8);
      expect(result.compliant).toBe(true);
      expect(result.margin).toBe(0.2); // 3.0 - 2.8 = 0.2
      expect(result.codeLimit).toBe(3.0);
      expect(result.codeYear).toBe('2020');
    });

    it('passes compliance with ACH50 = 3.0 (exactly at limit)', () => {
      const result = checkMinnesotaCompliance(3.0);
      expect(result.compliant).toBe(true);
      expect(result.margin).toBe(0.0);
      expect(result.codeLimit).toBe(3.0);
    });

    it('fails compliance with ACH50 = 3.1 (over limit)', () => {
      const result = checkMinnesotaCompliance(3.1);
      expect(result.compliant).toBe(false);
      expect(result.margin).toBe(-0.1); // Negative = over limit
      expect(result.codeLimit).toBe(3.0);
    });

    it('fails compliance with ACH50 = 5.5 (significantly over limit)', () => {
      const result = checkMinnesotaCompliance(5.5);
      expect(result.compliant).toBe(false);
      expect(result.margin).toBe(-2.5); // 3.0 - 5.5 = -2.5
    });

    it('passes compliance for Passive House (ACH50 = 0.6)', () => {
      const result = checkMinnesotaCompliance(0.6);
      expect(result.compliant).toBe(true);
      expect(result.margin).toBe(2.4); // 3.0 - 0.6 = 2.4 (excellent margin)
    });

    it('returns correct code year', () => {
      const result = checkMinnesotaCompliance(2.5, '2020');
      expect(result.codeYear).toBe('2020');
    });

    it('throws error for negative ACH50', () => {
      expect(() => checkMinnesotaCompliance(-1.5)).toThrow('ACH50 cannot be negative');
    });

    it('throws error for infinite ACH50', () => {
      expect(() => checkMinnesotaCompliance(Infinity)).toThrow('ACH50 must be a finite number');
    });

    it('throws error for NaN ACH50', () => {
      expect(() => checkMinnesotaCompliance(NaN)).toThrow('ACH50 must be a finite number');
    });
  });

  describe('Altitude Corrections', () => {
    it('applies no correction at sea level (0 ft)', () => {
      const correction = calculateAltitudeCorrection(0);
      expect(correction).toBe(1.0);
    });

    it('applies correction for Minneapolis (900 ft)', () => {
      const correction = calculateAltitudeCorrection(900);
      expect(correction).toBeLessThan(1.0);
      expect(correction).toBeCloseTo(0.984, 2); // Slight reduction
    });

    it('applies correction for Denver (5280 ft)', () => {
      const correction = calculateAltitudeCorrection(5280);
      expect(correction).toBeLessThan(1.0);
      expect(correction).toBeCloseTo(0.910, 2); // ~9% reduction at 5280 ft
    });

    it('applies correction for mountain town (8000 ft)', () => {
      const correction = calculateAltitudeCorrection(8000);
      expect(correction).toBeLessThan(1.0);
      expect(correction).toBeCloseTo(0.867, 2); // ~13% reduction at 8000 ft
    });

    it('applies correction for high altitude (10000 ft)', () => {
      const correction = calculateAltitudeCorrection(10000);
      expect(correction).toBeLessThan(1.0);
      expect(correction).toBeCloseTo(0.837, 2); // ~16% reduction at 10000 ft
    });

    it('throws error for negative altitude', () => {
      expect(() => calculateAltitudeCorrection(-100)).toThrow('Altitude cannot be negative');
    });

    it('throws error for infinite altitude', () => {
      expect(() => calculateAltitudeCorrection(Infinity)).toThrow('Altitude must be a finite number');
    });

    it('throws error for NaN altitude', () => {
      expect(() => calculateAltitudeCorrection(NaN)).toThrow('Altitude must be a finite number');
    });
  });

  describe('Combined Corrections (Weather + Altitude)', () => {
    it('applies combined corrections for cold weather in Denver', () => {
      const measuredCfm = 1200;
      const conditions: WeatherConditions = {
        indoorTemp: 68,
        outdoorTemp: 20,
        barometricPressure: 25.0, // Denver altitude
      };
      const altitudeFeet = 5280;

      const correctedCfm = applyCorrectedCFM50(measuredCfm, conditions, altitudeFeet);
      
      // Should be higher than measured due to cold weather
      // But lower overall due to altitude
      expect(correctedCfm).toBeGreaterThan(1000);
      expect(correctedCfm).toBeLessThan(1300);
    });

    it('applies no corrections for standard conditions at sea level', () => {
      const measuredCfm = 1200;
      const conditions: WeatherConditions = {
        indoorTemp: 70,
        outdoorTemp: 70,
        barometricPressure: 29.92,
      };
      const altitudeFeet = 0;

      const correctedCfm = applyCorrectedCFM50(measuredCfm, conditions, altitudeFeet);
      expect(correctedCfm).toBe(1200);
    });
  });

  describe('Effective Leakage Area (ELA)', () => {
    it('calculates ELA for typical house (CFM50 = 1200)', () => {
      const ela = calculateELA(1200);
      // ELA = 1200 / (2610 × √4) = 1200 / 5220 ≈ 0.23 sq in
      expect(ela).toBeCloseTo(0.23, 1);
    });

    it('calculates ELA for tight house (CFM50 = 600)', () => {
      const ela = calculateELA(600);
      expect(ela).toBeCloseTo(0.11, 1);
    });

    it('calculates ELA for leaky house (CFM50 = 2000)', () => {
      const ela = calculateELA(2000);
      expect(ela).toBeCloseTo(0.38, 1);
    });

    it('handles zero CFM50 (perfect seal)', () => {
      const ela = calculateELA(0);
      expect(ela).toBe(0);
    });

    it('throws error for negative CFM50', () => {
      expect(() => calculateELA(-100)).toThrow('CFM50 cannot be negative');
    });

    it('throws error for infinite CFM50', () => {
      expect(() => calculateELA(Infinity)).toThrow('CFM50 must be a finite number');
    });

    it('throws error for NaN CFM50', () => {
      expect(() => calculateELA(NaN)).toThrow('CFM50 must be a finite number');
    });
  });

  describe('Integration Tests - Real-World Scenarios', () => {
    it('complete workflow: tight house in Minnesota winter', () => {
      // Field measurements
      const readings = [580, 590, 585, 595, 575];
      const houseVolume = 15000; // cubic feet
      const conditions: WeatherConditions = {
        indoorTemp: 68,
        outdoorTemp: 10,
        barometricPressure: 30.1,
      };
      const altitude = 900; // Minneapolis

      // Step 1: Average multi-point tests
      const averaged = averageMultiPointTests(readings);
      expect(averaged.hasOutliers).toBe(false);

      // Step 2: Apply corrections
      const correctedCfm = applyCorrectedCFM50(averaged.average, conditions, altitude);

      // Step 3: Calculate ACH50
      const ach50 = calculateACH50(correctedCfm, houseVolume);

      // Step 4: Check compliance
      const compliance = checkMinnesotaCompliance(ach50);

      // Verify results
      expect(ach50).toBeLessThan(3.0); // Should pass
      expect(compliance.compliant).toBe(true);
      expect(compliance.margin).toBeGreaterThan(0);
    });

    it('complete workflow: borderline house in summer', () => {
      const readings = [730, 745, 740, 735];
      const houseVolume = 15000;
      const conditions: WeatherConditions = {
        indoorTemp: 72,
        outdoorTemp: 85,
        barometricPressure: 29.5,
      };

      const averaged = averageMultiPointTests(readings);
      const correctedCfm = applyCorrectedCFM50(averaged.average, conditions, 0);
      const ach50 = calculateACH50(correctedCfm, houseVolume);
      const compliance = checkMinnesotaCompliance(ach50);

      // Should be close to 3.0 threshold
      expect(ach50).toBeGreaterThan(2.5);
      expect(ach50).toBeLessThan(3.5);
    });

    it('complete workflow: failing house with outlier readings', () => {
      const readings = [1950, 2000, 1980, 5000]; // One bad reading
      const houseVolume = 15000;

      const averaged = averageMultiPointTests(readings, true);
      
      // Should detect outlier
      expect(averaged.hasOutliers).toBe(true);

      // Even with outlier, average should show failure
      const ach50 = calculateACH50(averaged.average, houseVolume);
      const compliance = checkMinnesotaCompliance(ach50);

      expect(compliance.compliant).toBe(false);
      expect(compliance.margin).toBeLessThan(0);
    });
  });
});
