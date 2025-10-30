/**
 * Duct Leakage Testing - Comprehensive Unit Tests
 * 
 * CRITICAL LEGAL LIABILITY TEST SUITE
 * Tests all calculation functions for RESNET-certified duct leakage testing
 * Ensures Minnesota 2020 Energy Code compliance calculations are accurate
 * 
 * Coverage Requirements:
 * - 50+ test cases minimum
 * - 100% code coverage for all calculation functions
 * - All edge cases and error conditions tested
 * - Realistic field inspection values
 * 
 * Minnesota 2020 Energy Code Requirements:
 * - Total Duct Leakage (TDL) ≤ 4.0 CFM25 per 100 sq ft
 * - Duct Leakage to Outside (DLO) ≤ 3.0 CFM25 per 100 sq ft
 */

import { describe, it, expect } from 'vitest';
import {
  calculateTDL,
  calculateDLO,
  validateDuctLeakage,
  averageCFM25Measurements,
  checkMinnesotaDuctCompliance,
  convertPressure,
  calculatePercentOfSystemAirflow,
  type DuctComplianceResult,
  type CFM25Result,
} from '../ductLeakageService';

describe('Duct Leakage Testing - TDL/DLO Calculations', () => {
  describe('Total Duct Leakage (TDL)', () => {
    it('calculates TDL for normal house at threshold', () => {
      // Formula: TDL = (CFM25 / Floor Area) × 100
      // (80 / 2000) × 100 = 0.04 × 100 = 4.0
      const result = calculateTDL(80, 2000);
      expect(result).toBe(4.0);
    });

    it('calculates TDL for tight ducts that pass', () => {
      // (60 / 2000) × 100 = 0.03 × 100 = 3.0
      const result = calculateTDL(60, 2000);
      expect(result).toBe(3.0);
      expect(result).toBeLessThan(4.0); // Minnesota 2020 Energy Code threshold
    });

    it('calculates TDL for leaky ducts that fail', () => {
      // (100 / 2000) × 100 = 0.05 × 100 = 5.0
      const result = calculateTDL(100, 2000);
      expect(result).toBe(5.0);
      expect(result).toBeGreaterThan(4.0); // Fails Minnesota code
    });

    it('calculates TDL for small house at threshold', () => {
      // (40 / 1000) × 100 = 0.04 × 100 = 4.0
      const result = calculateTDL(40, 1000);
      expect(result).toBe(4.0);
    });

    it('calculates TDL for large house at threshold', () => {
      // (160 / 4000) × 100 = 0.04 × 100 = 4.0
      const result = calculateTDL(160, 4000);
      expect(result).toBe(4.0);
    });

    it('calculates TDL for very tight ducts (passive house quality)', () => {
      // (30 / 2000) × 100 = 0.015 × 100 = 1.5
      const result = calculateTDL(30, 2000);
      expect(result).toBe(1.5);
      expect(result).toBeLessThan(2.0); // Exceptional performance
    });

    it('calculates TDL for very leaky ducts', () => {
      // (200 / 2000) × 100 = 0.10 × 100 = 10.0
      const result = calculateTDL(200, 2000);
      expect(result).toBe(10.0);
      expect(result).toBeGreaterThan(4.0); // Severely fails code
    });

    it('handles zero CFM25 (perfect seal)', () => {
      // (0 / 2000) × 100 = 0
      const result = calculateTDL(0, 2000);
      expect(result).toBe(0.0);
    });

    it('calculates TDL for tiny house', () => {
      // (25 / 800) × 100 = 0.03125 × 100 = 3.125 → 3.13
      const result = calculateTDL(25, 800);
      expect(result).toBeCloseTo(3.13, 2);
    });

    it('calculates TDL for mansion', () => {
      // (250 / 6000) × 100 = 0.04167 × 100 = 4.167 → 4.17
      const result = calculateTDL(250, 6000);
      expect(result).toBeCloseTo(4.17, 2);
    });

    it('calculates TDL exactly at 4.0 boundary (pass)', () => {
      // (80 / 2000) × 100 = 4.0 exactly
      const result = calculateTDL(80, 2000);
      expect(result).toBe(4.0);
      expect(result).toBeLessThanOrEqual(4.0); // Should pass (≤ not <)
    });

    it('calculates TDL just above 4.0 boundary (fail)', () => {
      // (81 / 2000) × 100 = 4.05
      const result = calculateTDL(81, 2000);
      expect(result).toBe(4.05);
      expect(result).toBeGreaterThan(4.0); // Should fail
    });

    it('calculates TDL just below 4.0 boundary (pass)', () => {
      // (79 / 2000) × 100 = 3.95
      const result = calculateTDL(79, 2000);
      expect(result).toBe(3.95);
      expect(result).toBeLessThan(4.0); // Should pass
    });

    it('rounds to 2 decimal places', () => {
      // (66.666 / 2000) × 100 = 3.3333 → 3.33
      const result = calculateTDL(66.666, 2000);
      expect(result).toBe(3.33);
    });

    it('calculates TDL for typical Minnesota new construction', () => {
      // Typical: 70 CFM25 / 1800 sq ft
      // (70 / 1800) × 100 = 3.89
      const result = calculateTDL(70, 1800);
      expect(result).toBeCloseTo(3.89, 2);
      expect(result).toBeLessThan(4.0);
    });

    it('calculates TDL for typical Minnesota existing home', () => {
      // Existing homes often higher: 120 CFM25 / 2200 sq ft
      // (120 / 2200) × 100 = 5.45
      const result = calculateTDL(120, 2200);
      expect(result).toBeCloseTo(5.45, 2);
      expect(result).toBeGreaterThan(4.0); // Common failure
    });

    it('throws error for zero floor area', () => {
      expect(() => calculateTDL(80, 0)).toThrow('Floor area must be greater than zero');
    });

    it('throws error for negative floor area', () => {
      expect(() => calculateTDL(80, -1000)).toThrow('Floor area must be greater than zero');
    });

    it('throws error for negative CFM25', () => {
      expect(() => calculateTDL(-50, 2000)).toThrow('CFM25 cannot be negative');
    });

    it('throws error for infinite CFM25', () => {
      expect(() => calculateTDL(Infinity, 2000)).toThrow('CFM25 and floor area must be finite numbers');
    });

    it('throws error for infinite floor area', () => {
      expect(() => calculateTDL(80, Infinity)).toThrow('CFM25 and floor area must be finite numbers');
    });

    it('throws error for NaN CFM25', () => {
      expect(() => calculateTDL(NaN, 2000)).toThrow('CFM25 and floor area must be finite numbers');
    });

    it('throws error for NaN floor area', () => {
      expect(() => calculateTDL(80, NaN)).toThrow('CFM25 and floor area must be finite numbers');
    });
  });

  describe('Duct Leakage to Outside (DLO)', () => {
    it('calculates DLO for normal house at threshold', () => {
      // Formula: DLO = (CFM25_outside / Floor Area) × 100
      // (60 / 2000) × 100 = 0.03 × 100 = 3.0
      const result = calculateDLO(60, 2000);
      expect(result).toBe(3.0);
    });

    it('calculates DLO for tight ducts that pass', () => {
      // (40 / 2000) × 100 = 0.02 × 100 = 2.0
      const result = calculateDLO(40, 2000);
      expect(result).toBe(2.0);
      expect(result).toBeLessThan(3.0); // Minnesota 2020 Energy Code threshold
    });

    it('calculates DLO for leaky ducts that fail', () => {
      // (80 / 2000) × 100 = 0.04 × 100 = 4.0
      const result = calculateDLO(80, 2000);
      expect(result).toBe(4.0);
      expect(result).toBeGreaterThan(3.0); // Fails Minnesota code
    });

    it('handles zero CFM25 outside (all leakage to inside)', () => {
      // (0 / 2000) × 100 = 0
      const result = calculateDLO(0, 2000);
      expect(result).toBe(0.0);
      expect(result).toBeLessThan(3.0); // Passes - ideal scenario
    });

    it('calculates DLO for small house at threshold', () => {
      // (30 / 1000) × 100 = 0.03 × 100 = 3.0
      const result = calculateDLO(30, 1000);
      expect(result).toBe(3.0);
    });

    it('calculates DLO for large house at threshold', () => {
      // (120 / 4000) × 100 = 0.03 × 100 = 3.0
      const result = calculateDLO(120, 4000);
      expect(result).toBe(3.0);
    });

    it('calculates DLO for very tight ducts', () => {
      // (20 / 2000) × 100 = 0.01 × 100 = 1.0
      const result = calculateDLO(20, 2000);
      expect(result).toBe(1.0);
      expect(result).toBeLessThan(3.0); // Excellent performance
    });

    it('calculates DLO for severely leaky ducts', () => {
      // (150 / 2000) × 100 = 0.075 × 100 = 7.5
      const result = calculateDLO(150, 2000);
      expect(result).toBe(7.5);
      expect(result).toBeGreaterThan(3.0); // Major failure
    });

    it('calculates DLO exactly at 3.0 boundary (pass)', () => {
      // (60 / 2000) × 100 = 3.0 exactly
      const result = calculateDLO(60, 2000);
      expect(result).toBe(3.0);
      expect(result).toBeLessThanOrEqual(3.0); // Should pass (≤ not <)
    });

    it('calculates DLO just above 3.0 boundary (fail)', () => {
      // (61 / 2000) × 100 = 3.05
      const result = calculateDLO(61, 2000);
      expect(result).toBe(3.05);
      expect(result).toBeGreaterThan(3.0); // Should fail
    });

    it('calculates DLO just below 3.0 boundary (pass)', () => {
      // (59 / 2000) × 100 = 2.95
      const result = calculateDLO(59, 2000);
      expect(result).toBe(2.95);
      expect(result).toBeLessThan(3.0); // Should pass
    });

    it('rounds to 2 decimal places', () => {
      // (55.555 / 2000) × 100 = 2.7778 → 2.78
      const result = calculateDLO(55.555, 2000);
      expect(result).toBe(2.78);
    });

    it('calculates DLO for typical Minnesota new construction', () => {
      // Typical: 50 CFM25 / 1800 sq ft
      // (50 / 1800) × 100 = 2.78
      const result = calculateDLO(50, 1800);
      expect(result).toBeCloseTo(2.78, 2);
      expect(result).toBeLessThan(3.0);
    });

    it('calculates DLO when most leakage is to inside', () => {
      // Only 10% leaks outside: 8 CFM25 / 2000 sq ft
      // (8 / 2000) × 100 = 0.4
      const result = calculateDLO(8, 2000);
      expect(result).toBe(0.4);
      expect(result).toBeLessThan(3.0); // Excellent - ducts in conditioned space
    });

    it('calculates DLO when all ducts in unconditioned attic', () => {
      // Nearly all leakage outside: 75 CFM25 / 2000 sq ft
      // (75 / 2000) × 100 = 3.75
      const result = calculateDLO(75, 2000);
      expect(result).toBe(3.75);
      expect(result).toBeGreaterThan(3.0); // Common Minnesota failure - attic ducts
    });

    it('throws error for zero floor area', () => {
      expect(() => calculateDLO(60, 0)).toThrow('Floor area must be greater than zero');
    });

    it('throws error for negative floor area', () => {
      expect(() => calculateDLO(60, -1000)).toThrow('Floor area must be greater than zero');
    });

    it('throws error for negative CFM25 outside', () => {
      expect(() => calculateDLO(-50, 2000)).toThrow('CFM25 to outside cannot be negative');
    });

    it('throws error for infinite CFM25 outside', () => {
      expect(() => calculateDLO(Infinity, 2000)).toThrow('CFM25 and floor area must be finite numbers');
    });

    it('throws error for infinite floor area', () => {
      expect(() => calculateDLO(60, Infinity)).toThrow('CFM25 and floor area must be finite numbers');
    });

    it('throws error for NaN CFM25 outside', () => {
      expect(() => calculateDLO(NaN, 2000)).toThrow('CFM25 and floor area must be finite numbers');
    });

    it('throws error for NaN floor area', () => {
      expect(() => calculateDLO(60, NaN)).toThrow('CFM25 and floor area must be finite numbers');
    });
  });

  describe('Validate Duct Leakage (TDL vs DLO consistency)', () => {
    it('validates normal case where DLO < TDL', () => {
      // Total: 80 CFM25, Outside: 60 CFM25 (75% to outside, 25% to inside)
      const result = validateDuctLeakage(80, 60, 2000);
      expect(result.valid).toBe(true);
      expect(result.tdl).toBe(4.0);
      expect(result.dlo).toBe(3.0);
    });

    it('validates edge case where DLO = TDL (all leakage to outside)', () => {
      // All leakage to outside: Total = Outside = 80 CFM25
      const result = validateDuctLeakage(80, 80, 2000);
      expect(result.valid).toBe(true);
      expect(result.tdl).toBe(4.0);
      expect(result.dlo).toBe(4.0);
    });

    it('validates when very little leakage is to outside', () => {
      // Total: 80 CFM25, Outside: 10 CFM25 (12.5% to outside)
      const result = validateDuctLeakage(80, 10, 2000);
      expect(result.valid).toBe(true);
      expect(result.tdl).toBe(4.0);
      expect(result.dlo).toBe(0.5);
    });

    it('validates when no leakage is to outside', () => {
      // Total: 80 CFM25, Outside: 0 CFM25 (ducts in conditioned space)
      const result = validateDuctLeakage(80, 0, 2000);
      expect(result.valid).toBe(true);
      expect(result.tdl).toBe(4.0);
      expect(result.dlo).toBe(0.0);
    });

    it('throws error when DLO exceeds TDL (physically impossible)', () => {
      // IMPOSSIBLE: Outside leakage > Total leakage
      expect(() => validateDuctLeakage(60, 80, 2000)).toThrow(
        'DLO cannot exceed TDL: CFM25 to outside (80) > Total CFM25 (60). Check measurements.'
      );
    });

    it('throws error when DLO slightly exceeds TDL (measurement error)', () => {
      // Small measurement error: Outside = 80.5, Total = 80
      expect(() => validateDuctLeakage(80, 80.5, 2000)).toThrow(
        'DLO cannot exceed TDL'
      );
    });

    it('validates typical Minnesota field test', () => {
      // Real-world: Total 72 CFM25, Outside 54 CFM25 (75% to outside)
      const result = validateDuctLeakage(72, 54, 1850);
      expect(result.valid).toBe(true);
      expect(result.tdl).toBeCloseTo(3.89, 2);
      expect(result.dlo).toBeCloseTo(2.92, 2);
    });
  });

  describe('Average CFM25 Measurements', () => {
    it('averages multiple consistent measurements', () => {
      const readings = [75, 78, 76, 77];
      const result = averageCFM25Measurements(readings);
      // Average = (75 + 78 + 76 + 77) / 4 = 306 / 4 = 76.5
      expect(result.average).toBe(76.5);
      expect(result.hasOutliers).toBe(false);
    });

    it('averages single measurement', () => {
      const readings = [80];
      const result = averageCFM25Measurements(readings);
      expect(result.average).toBe(80);
      expect(result.hasOutliers).toBe(false);
    });

    it('detects outliers in measurements', () => {
      const readings = [75, 78, 76, 150]; // 150 is clearly an outlier
      const result = averageCFM25Measurements(readings);
      // Average = (75 + 78 + 76 + 150) / 4 = 94.75
      expect(result.average).toBeCloseTo(94.75, 2);
      expect(result.hasOutliers).toBe(true);
      expect(result.outliers).toContain(150);
    });

    it('detects multiple outliers', () => {
      const readings = [75, 78, 76, 150, 5]; // Both 150 and 5 are outliers
      const result = averageCFM25Measurements(readings);
      expect(result.hasOutliers).toBe(true);
      expect(result.outliers?.length).toBeGreaterThan(0);
    });

    it('does not detect outliers when all readings are consistent', () => {
      const readings = [75, 76, 77, 78, 79]; // All within ~5% of each other
      const result = averageCFM25Measurements(readings);
      expect(result.hasOutliers).toBe(false);
    });

    it('does not detect outliers with only 2 readings', () => {
      const readings = [75, 150]; // Insufficient data for outlier detection
      const result = averageCFM25Measurements(readings);
      expect(result.hasOutliers).toBe(false); // Not enough data points
    });

    it('disables outlier detection when requested', () => {
      const readings = [75, 78, 150];
      const result = averageCFM25Measurements(readings, false);
      expect(result.hasOutliers).toBe(false);
      expect(result.outliers).toBeUndefined();
    });

    it('rounds average to 2 decimal places', () => {
      const readings = [75.333, 76.666, 77.111];
      const result = averageCFM25Measurements(readings);
      // Average = 229.11 / 3 = 76.37
      expect(result.average).toBeCloseTo(76.37, 2);
    });

    it('handles zero readings (perfect seal scenario)', () => {
      const readings = [0, 0, 0];
      const result = averageCFM25Measurements(readings);
      expect(result.average).toBe(0);
      expect(result.hasOutliers).toBe(false);
    });

    it('averages typical field measurements', () => {
      // Real inspector workflow: 5 tests to verify consistency
      const readings = [72, 74, 73, 75, 71];
      const result = averageCFM25Measurements(readings);
      // Average = 365 / 5 = 73
      expect(result.average).toBe(73);
      expect(result.hasOutliers).toBe(false);
    });

    it('throws error for empty array', () => {
      expect(() => averageCFM25Measurements([])).toThrow('Cannot average empty array of CFM25 readings');
    });

    it('throws error for negative readings', () => {
      expect(() => averageCFM25Measurements([75, -10, 78])).toThrow('CFM25 readings cannot be negative');
    });

    it('throws error for infinite readings', () => {
      expect(() => averageCFM25Measurements([75, Infinity, 78])).toThrow('All CFM25 readings must be finite numbers');
    });

    it('throws error for NaN readings', () => {
      expect(() => averageCFM25Measurements([75, NaN, 78])).toThrow('All CFM25 readings must be finite numbers');
    });
  });

  describe('Minnesota 2020 Energy Code Compliance', () => {
    it('passes when both TDL and DLO are under thresholds', () => {
      const result = checkMinnesotaDuctCompliance(3.5, 2.5);
      expect(result.tdlCompliant).toBe(true);
      expect(result.dloCompliant).toBe(true);
      expect(result.overallCompliant).toBe(true);
      expect(result.tdlMargin).toBe(0.5); // 4.0 - 3.5 = 0.5
      expect(result.dloMargin).toBe(0.5); // 3.0 - 2.5 = 0.5
    });

    it('fails when TDL exceeds 4.0 threshold', () => {
      const result = checkMinnesotaDuctCompliance(4.5, 2.5);
      expect(result.tdlCompliant).toBe(false);
      expect(result.dloCompliant).toBe(true);
      expect(result.overallCompliant).toBe(false);
      expect(result.tdlMargin).toBe(-0.5); // 4.0 - 4.5 = -0.5 (over limit)
      expect(result.dloMargin).toBe(0.5);
    });

    it('fails when DLO exceeds 3.0 threshold', () => {
      const result = checkMinnesotaDuctCompliance(3.5, 3.5);
      expect(result.tdlCompliant).toBe(true);
      expect(result.dloCompliant).toBe(false);
      expect(result.overallCompliant).toBe(false);
      expect(result.tdlMargin).toBe(0.5);
      expect(result.dloMargin).toBe(-0.5); // 3.0 - 3.5 = -0.5 (over limit)
    });

    it('fails when both TDL and DLO exceed thresholds', () => {
      const result = checkMinnesotaDuctCompliance(5.0, 4.0);
      expect(result.tdlCompliant).toBe(false);
      expect(result.dloCompliant).toBe(false);
      expect(result.overallCompliant).toBe(false);
      expect(result.tdlMargin).toBe(-1.0); // 4.0 - 5.0 = -1.0
      expect(result.dloMargin).toBe(-1.0); // 3.0 - 4.0 = -1.0
    });

    it('passes when TDL exactly at 4.0 threshold', () => {
      const result = checkMinnesotaDuctCompliance(4.0, 2.5);
      expect(result.tdlCompliant).toBe(true);
      expect(result.overallCompliant).toBe(true);
      expect(result.tdlMargin).toBe(0.0);
    });

    it('passes when DLO exactly at 3.0 threshold', () => {
      const result = checkMinnesotaDuctCompliance(3.5, 3.0);
      expect(result.dloCompliant).toBe(true);
      expect(result.overallCompliant).toBe(true);
      expect(result.dloMargin).toBe(0.0);
    });

    it('passes when both exactly at thresholds', () => {
      const result = checkMinnesotaDuctCompliance(4.0, 3.0);
      expect(result.tdlCompliant).toBe(true);
      expect(result.dloCompliant).toBe(true);
      expect(result.overallCompliant).toBe(true);
      expect(result.tdlMargin).toBe(0.0);
      expect(result.dloMargin).toBe(0.0);
    });

    it('fails when TDL just over threshold', () => {
      const result = checkMinnesotaDuctCompliance(4.01, 2.5);
      expect(result.tdlCompliant).toBe(false);
      expect(result.overallCompliant).toBe(false);
      expect(result.tdlMargin).toBeCloseTo(-0.01, 2);
    });

    it('fails when DLO just over threshold', () => {
      const result = checkMinnesotaDuctCompliance(3.5, 3.01);
      expect(result.dloCompliant).toBe(false);
      expect(result.overallCompliant).toBe(false);
      expect(result.dloMargin).toBeCloseTo(-0.01, 2);
    });

    it('passes with excellent performance (both well under)', () => {
      const result = checkMinnesotaDuctCompliance(2.0, 1.0);
      expect(result.tdlCompliant).toBe(true);
      expect(result.dloCompliant).toBe(true);
      expect(result.overallCompliant).toBe(true);
      expect(result.tdlMargin).toBe(2.0); // 4.0 - 2.0 = 2.0 under
      expect(result.dloMargin).toBe(2.0); // 3.0 - 1.0 = 2.0 under
    });

    it('includes correct code limits in result', () => {
      const result = checkMinnesotaDuctCompliance(3.5, 2.5);
      expect(result.tdlLimit).toBe(4.0);
      expect(result.dloLimit).toBe(3.0);
      expect(result.codeYear).toBe('2020');
    });

    it('returns input values in result', () => {
      const result = checkMinnesotaDuctCompliance(3.5, 2.5);
      expect(result.tdl).toBe(3.5);
      expect(result.dlo).toBe(2.5);
    });

    it('handles typical passing Minnesota new construction', () => {
      const result = checkMinnesotaDuctCompliance(3.8, 2.7);
      expect(result.overallCompliant).toBe(true);
      expect(result.tdlMargin).toBe(0.2); // Close to limit but passing
      expect(result.dloMargin).toBe(0.3);
    });

    it('handles typical failing Minnesota existing home', () => {
      const result = checkMinnesotaDuctCompliance(5.5, 4.2);
      expect(result.overallCompliant).toBe(false);
      expect(result.tdlMargin).toBeCloseTo(-1.5, 1);
      expect(result.dloMargin).toBeCloseTo(-1.2, 1);
    });

    it('throws error for negative TDL', () => {
      expect(() => checkMinnesotaDuctCompliance(-1, 2.5)).toThrow('TDL cannot be negative');
    });

    it('throws error for negative DLO', () => {
      expect(() => checkMinnesotaDuctCompliance(3.5, -1)).toThrow('DLO cannot be negative');
    });

    it('throws error for infinite TDL', () => {
      expect(() => checkMinnesotaDuctCompliance(Infinity, 2.5)).toThrow('TDL and DLO must be finite numbers');
    });

    it('throws error for infinite DLO', () => {
      expect(() => checkMinnesotaDuctCompliance(3.5, Infinity)).toThrow('TDL and DLO must be finite numbers');
    });

    it('throws error for NaN TDL', () => {
      expect(() => checkMinnesotaDuctCompliance(NaN, 2.5)).toThrow('TDL and DLO must be finite numbers');
    });

    it('throws error for NaN DLO', () => {
      expect(() => checkMinnesotaDuctCompliance(3.5, NaN)).toThrow('TDL and DLO must be finite numbers');
    });
  });

  describe('Pressure Conversion', () => {
    it('converts CFM50 to CFM25', () => {
      // CFM2 = CFM1 × (P2/P1)^0.6
      // CFM25 = 120 × (25/50)^0.6
      // = 120 × 0.5^0.6 = 120 × 0.659754 ≈ 79.17
      const result = convertPressure(120, 50, 25);
      expect(result).toBeCloseTo(79.17, 1);
    });

    it('converts CFM10 to CFM25', () => {
      // CFM25 = 40 × (25/10)^0.6
      // = 40 × 2.5^0.6 = 40 × 1.7321 ≈ 69.28
      const result = convertPressure(40, 10, 25);
      expect(result).toBeCloseTo(69.28, 1);
    });

    it('converts CFM25 to CFM50', () => {
      // CFM50 = 80 × (50/25)^0.6
      // = 80 × 2^0.6 = 80 × 1.5157 ≈ 121.26
      const result = convertPressure(80, 25, 50);
      expect(result).toBeCloseTo(121.26, 1);
    });

    it('returns same value when pressures are equal', () => {
      const result = convertPressure(80, 25, 25);
      expect(result).toBe(80);
    });

    it('handles zero CFM (perfect seal)', () => {
      const result = convertPressure(0, 50, 25);
      expect(result).toBe(0);
    });

    it('converts very low pressure to standard (CFM5 to CFM25)', () => {
      // CFM25 = 20 × (25/5)^0.6
      // = 20 × 5^0.6 = 20 × 2.626 ≈ 52.52
      const result = convertPressure(20, 5, 25);
      expect(result).toBeCloseTo(52.52, 1);
    });

    it('converts high pressure to standard (CFM75 to CFM25)', () => {
      // CFM25 = 150 × (25/75)^0.6
      // = 150 × (1/3)^0.6 = 150 × 0.5173 ≈ 77.59
      const result = convertPressure(150, 75, 25);
      expect(result).toBeCloseTo(77.59, 1);
    });

    it('rounds to 2 decimal places', () => {
      const result = convertPressure(100, 50, 25);
      const resultStr = result.toString();
      const decimals = resultStr.split('.')[1];
      expect(decimals?.length || 0).toBeLessThanOrEqual(2);
    });

    it('throws error for negative CFM', () => {
      expect(() => convertPressure(-80, 50, 25)).toThrow('CFM cannot be negative');
    });

    it('throws error for zero source pressure', () => {
      expect(() => convertPressure(80, 0, 25)).toThrow('Pressure differentials must be greater than zero');
    });

    it('throws error for zero target pressure', () => {
      expect(() => convertPressure(80, 50, 0)).toThrow('Pressure differentials must be greater than zero');
    });

    it('throws error for negative source pressure', () => {
      expect(() => convertPressure(80, -50, 25)).toThrow('Pressure differentials must be greater than zero');
    });

    it('throws error for negative target pressure', () => {
      expect(() => convertPressure(80, 50, -25)).toThrow('Pressure differentials must be greater than zero');
    });

    it('throws error for infinite CFM', () => {
      expect(() => convertPressure(Infinity, 50, 25)).toThrow('All parameters must be finite numbers');
    });

    it('throws error for infinite source pressure', () => {
      expect(() => convertPressure(80, Infinity, 25)).toThrow('All parameters must be finite numbers');
    });

    it('throws error for infinite target pressure', () => {
      expect(() => convertPressure(80, 50, Infinity)).toThrow('All parameters must be finite numbers');
    });
  });

  describe('Percent of System Airflow', () => {
    it('calculates leakage as percentage of system airflow', () => {
      // 80 CFM25 leakage / 1200 CFM system airflow
      // (80 / 1200) × 100 = 6.67%
      const result = calculatePercentOfSystemAirflow(80, 1200);
      expect(result).toBeCloseTo(6.67, 2);
    });

    it('calculates good system performance (< 10%)', () => {
      // 100 CFM25 / 1400 CFM = 7.14%
      const result = calculatePercentOfSystemAirflow(100, 1400);
      expect(result).toBeCloseTo(7.14, 2);
      expect(result).toBeLessThan(10); // Good performance threshold
    });

    it('calculates acceptable system performance (< 15%)', () => {
      // 180 CFM25 / 1400 CFM = 12.86%
      const result = calculatePercentOfSystemAirflow(180, 1400);
      expect(result).toBeCloseTo(12.86, 2);
      expect(result).toBeLessThan(15); // Acceptable threshold
    });

    it('calculates poor system performance (> 15%)', () => {
      // 240 CFM25 / 1400 CFM = 17.14%
      const result = calculatePercentOfSystemAirflow(240, 1400);
      expect(result).toBeCloseTo(17.14, 2);
      expect(result).toBeGreaterThan(15); // Poor - needs remediation
    });

    it('handles zero leakage (perfect seal)', () => {
      const result = calculatePercentOfSystemAirflow(0, 1400);
      expect(result).toBe(0);
    });

    it('calculates very high leakage percentage', () => {
      // 500 CFM25 / 1200 CFM = 41.67%
      const result = calculatePercentOfSystemAirflow(500, 1200);
      expect(result).toBeCloseTo(41.67, 2);
      expect(result).toBeGreaterThan(30); // Severe problem
    });

    it('rounds to 2 decimal places', () => {
      const result = calculatePercentOfSystemAirflow(77.777, 1234.567);
      expect(result).toBeCloseTo(6.30, 2);
    });

    it('throws error for zero system airflow', () => {
      expect(() => calculatePercentOfSystemAirflow(80, 0)).toThrow('System airflow must be greater than zero');
    });

    it('throws error for negative system airflow', () => {
      expect(() => calculatePercentOfSystemAirflow(80, -1200)).toThrow('System airflow must be greater than zero');
    });

    it('throws error for negative CFM25', () => {
      expect(() => calculatePercentOfSystemAirflow(-80, 1200)).toThrow('CFM25 cannot be negative');
    });

    it('throws error for infinite CFM25', () => {
      expect(() => calculatePercentOfSystemAirflow(Infinity, 1200)).toThrow('CFM25 and system airflow must be finite numbers');
    });

    it('throws error for infinite system airflow', () => {
      expect(() => calculatePercentOfSystemAirflow(80, Infinity)).toThrow('CFM25 and system airflow must be finite numbers');
    });
  });
});
