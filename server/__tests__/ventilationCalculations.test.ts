/**
 * Ventilation Testing - Comprehensive Unit Tests
 * 
 * CRITICAL LEGAL LIABILITY TEST SUITE
 * Tests all calculation functions for ASHRAE 62.2 ventilation compliance
 * Ensures Minnesota 2020 Energy Code calculations are accurate
 * 
 * Coverage Requirements:
 * - 50+ test cases minimum
 * - 100% code coverage for all calculation functions
 * - All edge cases and error conditions tested
 * - Realistic field inspection values
 * 
 * ASHRAE 62.2 Requirements:
 * - Whole-House Ventilation: Qtotal = 0.03 × floor_area + 7.5 × (bedrooms + 1)
 * - Kitchen Exhaust: ≥100 cfm (intermittent) OR ≥25 cfm (continuous)
 * - Bathroom Exhaust: ≥50 cfm (intermittent) OR ≥20 cfm (continuous)
 */

import { describe, it, expect } from 'vitest';
import {
  calculateRequiredVentilationRate,
  calculateRequiredContinuousRate,
  checkKitchenCompliance,
  checkBathroomCompliance,
  calculateTotalVentilationProvided,
  calculateVentilationRequirements,
  type VentilationTestData,
  type VentilationRequirements,
} from '../ventilationTests';

describe('Ventilation Testing - ASHRAE 62.2 Calculations', () => {
  
  describe('ASHRAE 62.2 Required Ventilation Rate', () => {
    it('calculates CFM for typical 2000 sq ft house with 3 bedrooms', () => {
      // Formula: Qtotal = 0.03 × 2000 + 7.5 × (3 + 1)
      // = 60 + 30 = 90 CFM
      const result = calculateRequiredVentilationRate(2000, 3);
      expect(result).toBe(90);
    });

    it('calculates CFM for small apartment (1000 sq ft, 2 bedrooms)', () => {
      // Qtotal = 0.03 × 1000 + 7.5 × (2 + 1)
      // = 30 + 22.5 = 52.5 CFM
      const result = calculateRequiredVentilationRate(1000, 2);
      expect(result).toBe(52.5);
    });

    it('calculates CFM for large house (4000 sq ft, 5 bedrooms)', () => {
      // Qtotal = 0.03 × 4000 + 7.5 × (5 + 1)
      // = 120 + 45 = 165 CFM
      const result = calculateRequiredVentilationRate(4000, 5);
      expect(result).toBe(165);
    });

    it('calculates CFM for studio apartment (500 sq ft, 1 bedroom)', () => {
      // Qtotal = 0.03 × 500 + 7.5 × (1 + 1)
      // = 15 + 15 = 30 CFM
      const result = calculateRequiredVentilationRate(500, 1);
      expect(result).toBe(30);
    });

    it('calculates CFM for 0 bedrooms (treated as 1)', () => {
      // For 1200 sq ft with 0 bedrooms
      // Qtotal = 0.03 × 1200 + 7.5 × (0 + 1)
      // = 36 + 7.5 = 43.5 CFM
      const result = calculateRequiredVentilationRate(1200, 0);
      expect(result).toBe(43.5);
    });

    it('calculates CFM for very small house (800 sq ft, 1 bedroom)', () => {
      // Qtotal = 0.03 × 800 + 7.5 × (1 + 1)
      // = 24 + 15 = 39 CFM
      const result = calculateRequiredVentilationRate(800, 1);
      expect(result).toBe(39);
    });

    it('calculates CFM for typical Minnesota new construction (1800 sq ft, 3 bedrooms)', () => {
      // Qtotal = 0.03 × 1800 + 7.5 × (3 + 1)
      // = 54 + 30 = 84 CFM
      const result = calculateRequiredVentilationRate(1800, 3);
      expect(result).toBe(84);
    });

    it('calculates CFM for luxury home (5000 sq ft, 6 bedrooms)', () => {
      // Qtotal = 0.03 × 5000 + 7.5 × (6 + 1)
      // = 150 + 52.5 = 202.5 CFM
      const result = calculateRequiredVentilationRate(5000, 6);
      expect(result).toBe(202.5);
    });

    it('calculates CFM for townhouse (1500 sq ft, 2 bedrooms)', () => {
      // Qtotal = 0.03 × 1500 + 7.5 × (2 + 1)
      // = 45 + 22.5 = 67.5 CFM
      const result = calculateRequiredVentilationRate(1500, 2);
      expect(result).toBe(67.5);
    });

    it('calculates CFM for mansion (10000 sq ft, 8 bedrooms)', () => {
      // Qtotal = 0.03 × 10000 + 7.5 × (8 + 1)
      // = 300 + 67.5 = 367.5 CFM
      const result = calculateRequiredVentilationRate(10000, 8);
      expect(result).toBe(367.5);
    });

    it('handles exact ASHRAE example (2500 sq ft, 4 bedrooms)', () => {
      // Qtotal = 0.03 × 2500 + 7.5 × (4 + 1)
      // = 75 + 37.5 = 112.5 CFM
      const result = calculateRequiredVentilationRate(2500, 4);
      expect(result).toBe(112.5);
    });

    it('calculates CFM for 1 bedroom condo (900 sq ft)', () => {
      // Qtotal = 0.03 × 900 + 7.5 × (1 + 1)
      // = 27 + 15 = 42 CFM
      const result = calculateRequiredVentilationRate(900, 1);
      expect(result).toBe(42);
    });

    it('returns positive CFM for very small space (400 sq ft, 0 bedrooms)', () => {
      // Qtotal = 0.03 × 400 + 7.5 × (0 + 1)
      // = 12 + 7.5 = 19.5 CFM
      const result = calculateRequiredVentilationRate(400, 0);
      expect(result).toBe(19.5);
      expect(result).toBeGreaterThan(0);
    });

    it('calculates CFM for passive house (1600 sq ft, 3 bedrooms)', () => {
      // Qtotal = 0.03 × 1600 + 7.5 × (3 + 1)
      // = 48 + 30 = 78 CFM
      const result = calculateRequiredVentilationRate(1600, 3);
      expect(result).toBe(78);
    });

    it('scales correctly with floor area (linear relationship)', () => {
      const result1000 = calculateRequiredVentilationRate(1000, 3);
      const result2000 = calculateRequiredVentilationRate(2000, 3);
      // Difference should be 0.03 × 1000 = 30 CFM
      expect(result2000 - result1000).toBe(30);
    });

    it('scales correctly with bedrooms (linear relationship)', () => {
      const result2BR = calculateRequiredVentilationRate(2000, 2);
      const result3BR = calculateRequiredVentilationRate(2000, 3);
      // Difference should be 7.5 CFM
      expect(result3BR - result2BR).toBe(7.5);
    });
  });

  describe('Required Continuous Rate', () => {
    it('matches required ventilation rate for typical house', () => {
      const required = calculateRequiredVentilationRate(2000, 3);
      const continuous = calculateRequiredContinuousRate(2000, 3);
      expect(continuous).toBe(required);
    });

    it('calculates same as required rate (no adjustment for continuous)', () => {
      const result = calculateRequiredContinuousRate(1800, 3);
      expect(result).toBe(84);
    });
  });

  describe('Kitchen Exhaust Compliance', () => {
    describe('Intermittent Operation (≥100 CFM)', () => {
      it('passes with 100 CFM (exactly at threshold)', () => {
        const result = checkKitchenCompliance('intermittent', 100);
        expect(result).toBe(true);
      });

      it('passes with 120 CFM (above threshold)', () => {
        const result = checkKitchenCompliance('intermittent', 120);
        expect(result).toBe(true);
      });

      it('passes with 150 CFM (well above threshold)', () => {
        const result = checkKitchenCompliance('intermittent', 150);
        expect(result).toBe(true);
      });

      it('passes with 200 CFM (high-power range hood)', () => {
        const result = checkKitchenCompliance('intermittent', 200);
        expect(result).toBe(true);
      });

      it('fails with 99 CFM (just below threshold)', () => {
        const result = checkKitchenCompliance('intermittent', 99);
        expect(result).toBe(false);
      });

      it('fails with 80 CFM (significantly below threshold)', () => {
        const result = checkKitchenCompliance('intermittent', 80);
        expect(result).toBe(false);
      });

      it('fails with 50 CFM (bathroom-level exhaust)', () => {
        const result = checkKitchenCompliance('intermittent', 50);
        expect(result).toBe(false);
      });

      it('fails with 0 CFM (no exhaust)', () => {
        const result = checkKitchenCompliance('intermittent', 0);
        expect(result).toBe(false);
      });
    });

    describe('Continuous Operation (≥25 CFM)', () => {
      it('passes with 25 CFM (exactly at threshold)', () => {
        const result = checkKitchenCompliance('continuous', 25);
        expect(result).toBe(true);
      });

      it('passes with 30 CFM (above threshold)', () => {
        const result = checkKitchenCompliance('continuous', 30);
        expect(result).toBe(true);
      });

      it('passes with 50 CFM (well above threshold)', () => {
        const result = checkKitchenCompliance('continuous', 50);
        expect(result).toBe(true);
      });

      it('fails with 24 CFM (just below threshold)', () => {
        const result = checkKitchenCompliance('continuous', 24);
        expect(result).toBe(false);
      });

      it('fails with 20 CFM (bathroom continuous level)', () => {
        const result = checkKitchenCompliance('continuous', 20);
        expect(result).toBe(false);
      });

      it('fails with 10 CFM (inadequate)', () => {
        const result = checkKitchenCompliance('continuous', 10);
        expect(result).toBe(false);
      });
    });

    describe('No Exhaust', () => {
      it('fails when type is none', () => {
        const result = checkKitchenCompliance('none', 100);
        expect(result).toBe(false);
      });

      it('fails when type is undefined', () => {
        const result = checkKitchenCompliance(undefined, 100);
        expect(result).toBe(false);
      });

      it('fails when CFM is undefined', () => {
        const result = checkKitchenCompliance('intermittent', undefined);
        expect(result).toBe(false);
      });

      it('fails when both type and CFM are undefined', () => {
        const result = checkKitchenCompliance(undefined, undefined);
        expect(result).toBe(false);
      });
    });
  });

  describe('Bathroom Exhaust Compliance', () => {
    describe('Intermittent Operation (≥50 CFM)', () => {
      it('passes with 50 CFM (exactly at threshold)', () => {
        const result = checkBathroomCompliance('intermittent', 50);
        expect(result).toBe(true);
      });

      it('passes with 60 CFM (above threshold)', () => {
        const result = checkBathroomCompliance('intermittent', 60);
        expect(result).toBe(true);
      });

      it('passes with 80 CFM (well above threshold)', () => {
        const result = checkBathroomCompliance('intermittent', 80);
        expect(result).toBe(true);
      });

      it('passes with 110 CFM (high-power bathroom fan)', () => {
        const result = checkBathroomCompliance('intermittent', 110);
        expect(result).toBe(true);
      });

      it('fails with 49 CFM (just below threshold)', () => {
        const result = checkBathroomCompliance('intermittent', 49);
        expect(result).toBe(false);
      });

      it('fails with 40 CFM (significantly below threshold)', () => {
        const result = checkBathroomCompliance('intermittent', 40);
        expect(result).toBe(false);
      });

      it('fails with 30 CFM (inadequate)', () => {
        const result = checkBathroomCompliance('intermittent', 30);
        expect(result).toBe(false);
      });

      it('fails with 0 CFM (no exhaust)', () => {
        const result = checkBathroomCompliance('intermittent', 0);
        expect(result).toBe(false);
      });
    });

    describe('Continuous Operation (≥20 CFM)', () => {
      it('passes with 20 CFM (exactly at threshold)', () => {
        const result = checkBathroomCompliance('continuous', 20);
        expect(result).toBe(true);
      });

      it('passes with 25 CFM (above threshold)', () => {
        const result = checkBathroomCompliance('continuous', 25);
        expect(result).toBe(true);
      });

      it('passes with 30 CFM (well above threshold)', () => {
        const result = checkBathroomCompliance('continuous', 30);
        expect(result).toBe(true);
      });

      it('fails with 19 CFM (just below threshold)', () => {
        const result = checkBathroomCompliance('continuous', 19);
        expect(result).toBe(false);
      });

      it('fails with 15 CFM (significantly below threshold)', () => {
        const result = checkBathroomCompliance('continuous', 15);
        expect(result).toBe(false);
      });

      it('fails with 10 CFM (inadequate)', () => {
        const result = checkBathroomCompliance('continuous', 10);
        expect(result).toBe(false);
      });
    });

    describe('No Exhaust', () => {
      it('fails when type is none', () => {
        const result = checkBathroomCompliance('none', 50);
        expect(result).toBe(false);
      });

      it('fails when type is undefined', () => {
        const result = checkBathroomCompliance(undefined, 50);
        expect(result).toBe(false);
      });

      it('fails when CFM is undefined', () => {
        const result = checkBathroomCompliance('intermittent', undefined);
        expect(result).toBe(false);
      });

      it('fails when both type and CFM are undefined', () => {
        const result = checkBathroomCompliance(undefined, undefined);
        expect(result).toBe(false);
      });
    });
  });

  describe('Total Ventilation Provided Calculation', () => {
    it('calculates total from kitchen only', () => {
      const data: VentilationTestData = {
        floorArea: 2000,
        bedrooms: 3,
        kitchenExhaustType: 'intermittent',
        kitchenMeasuredCFM: 120,
      };
      const result = calculateTotalVentilationProvided(data);
      expect(result).toBe(120);
    });

    it('calculates total from kitchen + 1 bathroom', () => {
      const data: VentilationTestData = {
        floorArea: 2000,
        bedrooms: 3,
        kitchenExhaustType: 'intermittent',
        kitchenMeasuredCFM: 100,
        bathroom1Type: 'intermittent',
        bathroom1MeasuredCFM: 50,
      };
      const result = calculateTotalVentilationProvided(data);
      expect(result).toBe(150);
    });

    it('calculates total from kitchen + 2 bathrooms', () => {
      const data: VentilationTestData = {
        floorArea: 2000,
        bedrooms: 3,
        kitchenExhaustType: 'intermittent',
        kitchenMeasuredCFM: 100,
        bathroom1Type: 'intermittent',
        bathroom1MeasuredCFM: 50,
        bathroom2Type: 'intermittent',
        bathroom2MeasuredCFM: 50,
      };
      const result = calculateTotalVentilationProvided(data);
      expect(result).toBe(200);
    });

    it('calculates total from kitchen + 3 bathrooms', () => {
      const data: VentilationTestData = {
        floorArea: 2000,
        bedrooms: 3,
        kitchenExhaustType: 'intermittent',
        kitchenMeasuredCFM: 100,
        bathroom1Type: 'intermittent',
        bathroom1MeasuredCFM: 50,
        bathroom2Type: 'intermittent',
        bathroom2MeasuredCFM: 50,
        bathroom3Type: 'continuous',
        bathroom3MeasuredCFM: 20,
      };
      const result = calculateTotalVentilationProvided(data);
      expect(result).toBe(220);
    });

    it('calculates total from all sources (4 bathrooms + kitchen)', () => {
      const data: VentilationTestData = {
        floorArea: 2000,
        bedrooms: 3,
        kitchenExhaustType: 'intermittent',
        kitchenMeasuredCFM: 120,
        bathroom1Type: 'intermittent',
        bathroom1MeasuredCFM: 60,
        bathroom2Type: 'intermittent',
        bathroom2MeasuredCFM: 50,
        bathroom3Type: 'intermittent',
        bathroom3MeasuredCFM: 50,
        bathroom4Type: 'continuous',
        bathroom4MeasuredCFM: 20,
      };
      const result = calculateTotalVentilationProvided(data);
      expect(result).toBe(300);
    });

    it('includes mechanical ventilation (supply-only)', () => {
      const data: VentilationTestData = {
        floorArea: 2000,
        bedrooms: 3,
        kitchenExhaustType: 'intermittent',
        kitchenMeasuredCFM: 100,
        mechanicalVentilationType: 'supply_only',
        mechanicalMeasuredSupplyCFM: 60,
      };
      const result = calculateTotalVentilationProvided(data);
      expect(result).toBe(160);
    });

    it('includes mechanical ventilation (exhaust-only)', () => {
      const data: VentilationTestData = {
        floorArea: 2000,
        bedrooms: 3,
        kitchenExhaustType: 'intermittent',
        kitchenMeasuredCFM: 100,
        mechanicalVentilationType: 'exhaust_only',
        mechanicalMeasuredExhaustCFM: 70,
      };
      const result = calculateTotalVentilationProvided(data);
      expect(result).toBe(170);
    });

    it('includes mechanical ventilation (HRV - uses max of supply/exhaust)', () => {
      const data: VentilationTestData = {
        floorArea: 2000,
        bedrooms: 3,
        kitchenExhaustType: 'intermittent',
        kitchenMeasuredCFM: 100,
        mechanicalVentilationType: 'balanced_hrv',
        mechanicalMeasuredSupplyCFM: 80,
        mechanicalMeasuredExhaustCFM: 75,
      };
      const result = calculateTotalVentilationProvided(data);
      // Should use max(80, 75) = 80
      expect(result).toBe(180);
    });

    it('includes mechanical ventilation (ERV - uses max of supply/exhaust)', () => {
      const data: VentilationTestData = {
        floorArea: 2000,
        bedrooms: 3,
        kitchenExhaustType: 'intermittent',
        kitchenMeasuredCFM: 100,
        mechanicalVentilationType: 'balanced_erv',
        mechanicalMeasuredSupplyCFM: 90,
        mechanicalMeasuredExhaustCFM: 95,
      };
      const result = calculateTotalVentilationProvided(data);
      // Should use max(90, 95) = 95
      expect(result).toBe(195);
    });

    it('excludes exhaust marked as none', () => {
      const data: VentilationTestData = {
        floorArea: 2000,
        bedrooms: 3,
        kitchenExhaustType: 'none',
        kitchenMeasuredCFM: 100,
        bathroom1Type: 'intermittent',
        bathroom1MeasuredCFM: 50,
      };
      const result = calculateTotalVentilationProvided(data);
      expect(result).toBe(50); // Only bathroom counted
    });

    it('handles all exhaust sources in typical Minnesota home', () => {
      const data: VentilationTestData = {
        floorArea: 1800,
        bedrooms: 3,
        kitchenExhaustType: 'intermittent',
        kitchenMeasuredCFM: 120,
        bathroom1Type: 'intermittent',
        bathroom1MeasuredCFM: 60,
        bathroom2Type: 'intermittent',
        bathroom2MeasuredCFM: 50,
        mechanicalVentilationType: 'balanced_hrv',
        mechanicalMeasuredSupplyCFM: 85,
        mechanicalMeasuredExhaustCFM: 85,
      };
      const result = calculateTotalVentilationProvided(data);
      // Kitchen 120 + Bath1 60 + Bath2 50 + HRV 85 = 315 CFM
      expect(result).toBe(315);
    });

    it('returns 0 when no ventilation provided', () => {
      const data: VentilationTestData = {
        floorArea: 2000,
        bedrooms: 3,
      };
      const result = calculateTotalVentilationProvided(data);
      expect(result).toBe(0);
    });
  });

  describe('Complete Ventilation Requirements Calculation', () => {
    it('calculates complete requirements for typical compliant house', () => {
      const data: VentilationTestData = {
        floorArea: 1800,
        bedrooms: 3,
        kitchenExhaustType: 'intermittent',
        kitchenMeasuredCFM: 120,
        bathroom1Type: 'intermittent',
        bathroom1MeasuredCFM: 60,
        bathroom2Type: 'intermittent',
        bathroom2MeasuredCFM: 50,
        mechanicalVentilationType: 'balanced_hrv',
        mechanicalMeasuredSupplyCFM: 85,
        mechanicalMeasuredExhaustCFM: 85,
      };

      const result = calculateVentilationRequirements(data);

      // Required: 0.03 × 1800 + 7.5 × 4 = 54 + 30 = 84 CFM
      expect(result.requiredVentilationRate).toBe(84);
      expect(result.requiredContinuousRate).toBe(84);
      expect(result.adjustedRequiredRate).toBe(84);
      
      // Total provided: 120 + 60 + 50 + 85 = 315 CFM
      expect(result.totalVentilationProvided).toBe(315);
      
      // All compliance checks
      expect(result.kitchenMeetsCode).toBe(true);
      expect(result.meetsVentilationRequirement).toBe(true);
      expect(result.overallCompliant).toBe(true);
      expect(result.nonComplianceReasons).toHaveLength(0);
    });

    it('identifies non-compliant kitchen (80 CFM intermittent)', () => {
      const data: VentilationTestData = {
        floorArea: 2000,
        bedrooms: 3,
        kitchenExhaustType: 'intermittent',
        kitchenMeasuredCFM: 80, // Fails: needs ≥100 CFM
        bathroom1Type: 'intermittent',
        bathroom1MeasuredCFM: 50,
        mechanicalVentilationType: 'balanced_hrv',
        mechanicalMeasuredSupplyCFM: 90,
        mechanicalMeasuredExhaustCFM: 90,
      };

      const result = calculateVentilationRequirements(data);

      expect(result.kitchenMeetsCode).toBe(false);
      expect(result.overallCompliant).toBe(false);
      expect(result.nonComplianceReasons).toContain('Kitchen exhaust does not meet code requirements');
    });

    it('identifies non-compliant bathroom (40 CFM intermittent)', () => {
      const data: VentilationTestData = {
        floorArea: 2000,
        bedrooms: 3,
        kitchenExhaustType: 'intermittent',
        kitchenMeasuredCFM: 120,
        bathroom1Type: 'intermittent',
        bathroom1MeasuredCFM: 40, // Fails: needs ≥50 CFM
        mechanicalVentilationType: 'balanced_hrv',
        mechanicalMeasuredSupplyCFM: 90,
        mechanicalMeasuredExhaustCFM: 90,
      };

      const result = calculateVentilationRequirements(data);

      expect(result.overallCompliant).toBe(false);
      expect(result.nonComplianceReasons).toContain('Bathroom 1 exhaust does not meet code requirements');
    });

    it('identifies insufficient total ventilation', () => {
      const data: VentilationTestData = {
        floorArea: 2000,
        bedrooms: 3,
        kitchenExhaustType: 'continuous',
        kitchenMeasuredCFM: 25, // Meets kitchen requirement
        bathroom1Type: 'continuous',
        bathroom1MeasuredCFM: 20, // Meets bathroom requirement
        // No mechanical ventilation
        // Total = 45 CFM, Required = 90 CFM
      };

      const result = calculateVentilationRequirements(data);

      expect(result.requiredVentilationRate).toBe(90);
      expect(result.totalVentilationProvided).toBe(45);
      expect(result.meetsVentilationRequirement).toBe(false);
      expect(result.overallCompliant).toBe(false);
      expect(result.nonComplianceReasons).toContain('Total ventilation provided (45.0 cfm) is less than required (90.0 cfm)');
    });

    it('applies infiltration credit correctly', () => {
      const data: VentilationTestData = {
        floorArea: 2000,
        bedrooms: 3,
        infiltrationCredit: 20, // 20 CFM credit from tight house
        kitchenExhaustType: 'intermittent',
        kitchenMeasuredCFM: 120,
        bathroom1Type: 'intermittent',
        bathroom1MeasuredCFM: 50,
        mechanicalVentilationType: 'supply_only',
        mechanicalMeasuredSupplyCFM: 50,
      };

      const result = calculateVentilationRequirements(data);

      // Required: 90 CFM
      // After infiltration credit: 90 - 20 = 70 CFM
      expect(result.requiredVentilationRate).toBe(90);
      expect(result.adjustedRequiredRate).toBe(70);
      
      // Total provided: 120 + 50 + 50 = 220 CFM
      expect(result.totalVentilationProvided).toBe(220);
      expect(result.meetsVentilationRequirement).toBe(true);
    });

    it('handles large infiltration credit (cannot go below 0)', () => {
      const data: VentilationTestData = {
        floorArea: 2000,
        bedrooms: 3,
        infiltrationCredit: 150, // Excessive credit (very leaky house)
        kitchenExhaustType: 'intermittent',
        kitchenMeasuredCFM: 120,
        bathroom1Type: 'intermittent',
        bathroom1MeasuredCFM: 50,
      };

      const result = calculateVentilationRequirements(data);

      // Required: 90 CFM
      // After credit: max(0, 90 - 150) = 0 CFM
      expect(result.requiredVentilationRate).toBe(90);
      expect(result.adjustedRequiredRate).toBe(0);
    });

    it('handles small house with minimal ventilation (800 sq ft, 1 BR)', () => {
      const data: VentilationTestData = {
        floorArea: 800,
        bedrooms: 1,
        kitchenExhaustType: 'continuous',
        kitchenMeasuredCFM: 30,
        bathroom1Type: 'continuous',
        bathroom1MeasuredCFM: 25,
      };

      const result = calculateVentilationRequirements(data);

      // Required: 0.03 × 800 + 7.5 × 2 = 24 + 15 = 39 CFM
      expect(result.requiredVentilationRate).toBe(39);
      
      // Total: 30 + 25 = 55 CFM
      expect(result.totalVentilationProvided).toBe(55);
      expect(result.meetsVentilationRequirement).toBe(true);
      expect(result.overallCompliant).toBe(true);
    });

    it('handles large house with ERV (5000 sq ft, 6 BR)', () => {
      const data: VentilationTestData = {
        floorArea: 5000,
        bedrooms: 6,
        kitchenExhaustType: 'intermittent',
        kitchenMeasuredCFM: 200,
        bathroom1Type: 'intermittent',
        bathroom1MeasuredCFM: 80,
        bathroom2Type: 'intermittent',
        bathroom2MeasuredCFM: 60,
        bathroom3Type: 'intermittent',
        bathroom3MeasuredCFM: 60,
        mechanicalVentilationType: 'balanced_erv',
        mechanicalMeasuredSupplyCFM: 150,
        mechanicalMeasuredExhaustCFM: 150,
      };

      const result = calculateVentilationRequirements(data);

      // Required: 0.03 × 5000 + 7.5 × 7 = 150 + 52.5 = 202.5 CFM
      expect(result.requiredVentilationRate).toBe(202.5);
      
      // Total: 200 + 80 + 60 + 60 + 150 = 550 CFM
      expect(result.totalVentilationProvided).toBe(550);
      expect(result.overallCompliant).toBe(true);
    });

    it('validates kitchen requirement thresholds', () => {
      const result = calculateVentilationRequirements({
        floorArea: 2000,
        bedrooms: 3,
      });

      expect(result.kitchenRequirement.intermittent).toBe(100);
      expect(result.kitchenRequirement.continuous).toBe(25);
    });

    it('validates bathroom requirement thresholds', () => {
      const result = calculateVentilationRequirements({
        floorArea: 2000,
        bedrooms: 3,
      });

      expect(result.bathroomRequirement.intermittent).toBe(50);
      expect(result.bathroomRequirement.continuous).toBe(20);
    });

    it('handles multiple non-compliance reasons', () => {
      const data: VentilationTestData = {
        floorArea: 2000,
        bedrooms: 3,
        kitchenExhaustType: 'intermittent',
        kitchenMeasuredCFM: 80, // Fail
        bathroom1Type: 'intermittent',
        bathroom1MeasuredCFM: 40, // Fail
        bathroom2Type: 'intermittent',
        bathroom2MeasuredCFM: 30, // Fail
        // No mechanical - total insufficient
      };

      const result = calculateVentilationRequirements(data);

      expect(result.overallCompliant).toBe(false);
      expect(result.nonComplianceReasons.length).toBeGreaterThan(1);
      expect(result.nonComplianceReasons).toContain('Kitchen exhaust does not meet code requirements');
      expect(result.nonComplianceReasons).toContain('Bathroom 1 exhaust does not meet code requirements');
      expect(result.nonComplianceReasons).toContain('Bathroom 2 exhaust does not meet code requirements');
    });

    it('handles optional bathrooms correctly (bathroom 2-4 are optional)', () => {
      const data: VentilationTestData = {
        floorArea: 1500,
        bedrooms: 2,
        kitchenExhaustType: 'intermittent',
        kitchenMeasuredCFM: 120,
        bathroom1Type: 'intermittent',
        bathroom1MeasuredCFM: 60,
        // No bathroom2, bathroom3, bathroom4 - should still be compliant
        mechanicalVentilationType: 'balanced_hrv',
        mechanicalMeasuredSupplyCFM: 70,
        mechanicalMeasuredExhaustCFM: 70,
      };

      const result = calculateVentilationRequirements(data);

      // Required: 0.03 × 1500 + 7.5 × 3 = 45 + 22.5 = 67.5 CFM
      expect(result.requiredVentilationRate).toBe(67.5);
      
      // Total: 120 + 60 + 70 = 250 CFM
      expect(result.totalVentilationProvided).toBe(250);
      expect(result.overallCompliant).toBe(true);
    });
  });
});
