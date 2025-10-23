import { describe, it, expect } from 'vitest';
import { calculateAccuracy } from './forecastAccuracy';

describe('calculateAccuracy', () => {
  describe('Zero predictions edge cases', () => {
    it('should return 100% when both predicted and actual are zero (perfect match)', () => {
      const result = calculateAccuracy(0, 0);
      expect(result).toBe(100);
    });

    it('should return 0% when predicted is 0 but actual is non-zero (infinite variance)', () => {
      expect(calculateAccuracy(0, 5)).toBe(0);
      expect(calculateAccuracy(0, 100)).toBe(0);
      expect(calculateAccuracy(0, -10)).toBe(0);
    });
  });

  describe('Null and undefined values', () => {
    it('should return 0% when predicted is null', () => {
      const result = calculateAccuracy(null as any, 100);
      expect(result).toBe(0);
    });

    it('should return 0% when actual is null', () => {
      const result = calculateAccuracy(100, null as any);
      expect(result).toBe(0);
    });

    it('should return 0% when predicted is undefined', () => {
      const result = calculateAccuracy(undefined as any, 100);
      expect(result).toBe(0);
    });

    it('should return 0% when actual is undefined', () => {
      const result = calculateAccuracy(100, undefined as any);
      expect(result).toBe(0);
    });

    it('should return 0% when both are null', () => {
      const result = calculateAccuracy(null as any, null as any);
      expect(result).toBe(0);
    });

    it('should return 0% when both are undefined', () => {
      const result = calculateAccuracy(undefined as any, undefined as any);
      expect(result).toBe(0);
    });
  });

  describe('Extreme variances', () => {
    it('should return 0% when actual is 100x predicted (10000% variance)', () => {
      const result = calculateAccuracy(10, 1000);
      expect(result).toBe(0);
    });

    it('should return 1% when predicted is 100x actual (99% variance)', () => {
      const result = calculateAccuracy(1000, 10);
      expect(result).toBe(1);
    });

    it('should return 0% for extremely high variance (predicted=1, actual=10000)', () => {
      const result = calculateAccuracy(1, 10000);
      expect(result).toBe(0);
    });

    it('should return 0% for extremely low actual compared to predicted (predicted=5000, actual=1)', () => {
      const result = calculateAccuracy(5000, 1);
      // variance = |1-5000|/5000 * 100 = 99.98%
      // accuracy = 100 - 99.98 = 0.02, but should be clamped properly
      expect(result).toBeCloseTo(0.02, 1);
    });
  });

  describe('Perfect accuracy', () => {
    it('should return 100% when predicted equals actual (positive values)', () => {
      expect(calculateAccuracy(100, 100)).toBe(100);
      expect(calculateAccuracy(50, 50)).toBe(100);
      expect(calculateAccuracy(1000, 1000)).toBe(100);
      expect(calculateAccuracy(0.5, 0.5)).toBe(100);
    });

    it('should return 100% when predicted equals actual (negative values)', () => {
      expect(calculateAccuracy(-100, -100)).toBe(100);
      expect(calculateAccuracy(-50, -50)).toBe(100);
    });
  });

  describe('Small variances (near-100% accuracy)', () => {
    it('should return 99% for 1% variance (predicted=100, actual=99)', () => {
      const result = calculateAccuracy(100, 99);
      expect(result).toBe(99);
    });

    it('should return 99% for 1% variance (predicted=100, actual=101)', () => {
      const result = calculateAccuracy(100, 101);
      expect(result).toBe(99);
    });

    it('should return 95% for 5% variance (predicted=100, actual=95)', () => {
      const result = calculateAccuracy(100, 95);
      expect(result).toBe(95);
    });

    it('should return 95% for 5% variance (predicted=100, actual=105)', () => {
      const result = calculateAccuracy(100, 105);
      expect(result).toBe(95);
    });

    it('should return 90% for 10% variance (predicted=100, actual=90)', () => {
      const result = calculateAccuracy(100, 90);
      expect(result).toBe(90);
    });

    it('should return 99.5% for 0.5% variance (predicted=1000, actual=995)', () => {
      const result = calculateAccuracy(1000, 995);
      expect(result).toBe(99.5);
    });
  });

  describe('Negative numbers', () => {
    it('should handle negative predicted values correctly', () => {
      // variance = |-110 - (-100)| / -100 * 100 = 10/100 * 100 = 10%
      // But division by negative gives negative variance
      // This might be a bug - let's test current behavior
      const result = calculateAccuracy(-100, -110);
      // abs(-110 - (-100)) = abs(-10) = 10
      // 10 / -100 * 100 = -10
      // 100 - (-10) = 110
      // This shows a potential issue with negative predictions
      expect(result).toBe(90); // Expected: should work like positive values
    });

    it('should handle negative actual values correctly', () => {
      const result = calculateAccuracy(100, -100);
      // variance = |-100 - 100| / 100 * 100 = 200%
      // accuracy = 100 - 200 = -100, clamped to 0
      expect(result).toBe(0);
    });

    it('should handle both negative values (close match)', () => {
      const result = calculateAccuracy(-100, -95);
      // variance = |-95 - (-100)| / -100 * 100 = 5 / -100 * 100 = -5
      // accuracy = 100 - (-5) = 105 (This seems wrong)
      // Expected behavior: should treat like positive values
      expect(result).toBe(95); // Variance should be 5%, so accuracy = 95%
    });

    it('should handle mixed signs (predicted positive, actual negative)', () => {
      const result = calculateAccuracy(100, -50);
      // variance = |-50 - 100| / 100 * 100 = 150%
      // accuracy = max(0, 100 - 150) = 0
      expect(result).toBe(0);
    });

    it('should handle mixed signs (predicted negative, actual positive)', () => {
      const result = calculateAccuracy(-100, 50);
      // variance = |50 - (-100)| / -100 * 100 = 150 / -100 * 100 = -150
      // accuracy = 100 - (-150) = 250 (This is definitely wrong)
      // Should be 0 due to extreme variance
      expect(result).toBe(0); // This test will likely fail, revealing a bug
    });
  });

  describe('Decimal precision', () => {
    it('should handle decimal values correctly', () => {
      const result = calculateAccuracy(100.5, 100);
      // variance = |100 - 100.5| / 100.5 * 100 = 0.497...%
      // accuracy ≈ 99.5%
      expect(result).toBeCloseTo(99.5, 1);
    });

    it('should handle very small decimal variances', () => {
      const result = calculateAccuracy(1000, 1000.5);
      // variance = 0.5 / 1000 * 100 = 0.05%
      // accuracy = 99.95%
      expect(result).toBeCloseTo(99.95, 2);
    });
  });

  describe('Boundary conditions', () => {
    it('should return 0% when variance is exactly 100%', () => {
      const result = calculateAccuracy(100, 200);
      // variance = 100%, accuracy = 0%
      expect(result).toBe(0);
    });

    it('should return 50% when variance is exactly 50%', () => {
      const result = calculateAccuracy(100, 150);
      // variance = 50%, accuracy = 50%
      expect(result).toBe(50);
    });

    it('should handle very large numbers', () => {
      const result = calculateAccuracy(1000000, 1100000);
      // variance = 100000 / 1000000 * 100 = 10%
      // accuracy = 90%
      expect(result).toBe(90);
    });

    it('should handle very small numbers', () => {
      const result = calculateAccuracy(0.001, 0.0011);
      // variance = 0.0001 / 0.001 * 100 = 10%
      // accuracy = 90%
      expect(result).toBeCloseTo(90, 1);
    });
  });

  describe('Symmetry', () => {
    it('should be symmetric for equal absolute deviations', () => {
      const accuracy1 = calculateAccuracy(100, 110);
      const accuracy2 = calculateAccuracy(100, 90);
      // Both have 10% variance, should have same accuracy
      expect(accuracy1).toBe(accuracy2);
      expect(accuracy1).toBe(90);
    });

    it('should be symmetric for small deviations', () => {
      const accuracy1 = calculateAccuracy(1000, 1005);
      const accuracy2 = calculateAccuracy(1000, 995);
      // Both have 0.5% variance
      expect(accuracy1).toBe(accuracy2);
      expect(accuracy1).toBe(99.5);
    });
  });

  describe('Real-world forecast scenarios', () => {
    it('should handle typical TDL forecast (predicted=45, actual=47)', () => {
      const result = calculateAccuracy(45, 47);
      // variance = 2/45 * 100 ≈ 4.44%
      // accuracy ≈ 95.56%
      expect(result).toBeCloseTo(95.56, 1);
    });

    it('should handle typical DLO forecast (predicted=3, actual=2.5)', () => {
      const result = calculateAccuracy(3, 2.5);
      // variance = 0.5/3 * 100 ≈ 16.67%
      // accuracy ≈ 83.33%
      expect(result).toBeCloseTo(83.33, 1);
    });

    it('should handle perfect forecast', () => {
      const result = calculateAccuracy(42, 42);
      expect(result).toBe(100);
    });

    it('should handle major forecast miss (predicted=30, actual=60)', () => {
      const result = calculateAccuracy(30, 60);
      // variance = 30/30 * 100 = 100%
      // accuracy = 0%
      expect(result).toBe(0);
    });
  });
});
