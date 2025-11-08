import { describe, it, expect } from 'vitest';
import {
  safeToFixed,
  safeParseFloat,
  safeParseInt,
  safeDivide,
  toNumber,
  toDecimalString,
  calculatePercentage,
} from '../../shared/numberUtils';

describe('numberUtils', () => {
  describe('safeToFixed', () => {
    it('formats valid numbers with default decimals', () => {
      expect(safeToFixed(3.14159)).toBe('3.14');
      expect(safeToFixed('2.71828')).toBe('2.72');
    });

    it('returns zeros for null/undefined', () => {
      expect(safeToFixed(null)).toBe('0.00');
      expect(safeToFixed(undefined)).toBe('0.00');
    });

    it('respects decimals=0 edge case', () => {
      expect(safeToFixed(5, 0)).toBe('5');
      expect(safeToFixed(null, 0)).toBe('0');
      expect(safeToFixed(undefined, 0)).toBe('0');
    });
  });

  describe('safeParseFloat', () => {
    it('parses valid floats', () => {
      expect(safeParseFloat('3.14')).toBeCloseTo(3.14);
      expect(safeParseFloat(2.5)).toBeCloseTo(2.5);
    });

    it('returns default for invalid values', () => {
      expect(safeParseFloat('abc')).toBe(0);
      expect(safeParseFloat(null)).toBe(0);
      expect(safeParseFloat(undefined, 10)).toBe(10);
    });
  });

  describe('safeParseInt', () => {
    it('parses valid integers and truncates decimals', () => {
      expect(safeParseInt('42')).toBe(42);
      expect(safeParseInt('3.14')).toBe(3);
    });

    it('returns default for invalid values', () => {
      expect(safeParseInt('abc')).toBe(0);
      expect(safeParseInt(null, 7)).toBe(7);
    });
  });

  describe('safeDivide', () => {
    it('divides valid numbers', () => {
      expect(safeDivide(10, 2)).toBe(5);
    });

    it('returns fallback for denominator=0 or invalid inputs', () => {
      expect(safeDivide(10, 0)).toBe(0);
      expect(safeDivide(10, 0, null)).toBeNull();
      expect(safeDivide(10, 0, Infinity)).toBe(Infinity);
      expect(safeDivide(NaN as any, 2)).toBe(0);
      expect(safeDivide(10, Infinity)).toBe(0);
    });
  });

  describe('toNumber', () => {
    it('converts decimal strings safely', () => {
      expect(toNumber('3.50')).toBeCloseTo(3.5);
      expect(toNumber(2)).toBe(2);
    });

    it('uses default for nullish or invalid', () => {
      expect(toNumber(null, 1)).toBe(1);
      expect(toNumber(undefined, 2)).toBe(2);
      expect(toNumber('abc', 4)).toBe(4);
    });
  });

  describe('toDecimalString', () => {
    it('formats to fixed precision with correct rounding', () => {
      expect(toDecimalString(3.5)).toBe('3.50');
      expect(toDecimalString('1.2345', 3)).toBe('1.235'); // round half up
      expect(toDecimalString('1.2344', 3)).toBe('1.234'); // below rounding threshold
      expect(toDecimalString('2.9999', 2)).toBe('3.00'); // carry over rounding
    });

    it('returns null for null/undefined', () => {
      expect(toDecimalString(null)).toBeNull();
      expect(toDecimalString(undefined)).toBeNull();
    });
  });

  describe('calculatePercentage', () => {
    it('calculates percentage for numeric inputs', () => {
      expect(calculatePercentage(45, 100)).toBeCloseTo(45.0);
    });

    it('calculates percentage for string inputs', () => {
      expect(calculatePercentage('7', '50', 2)).toBeCloseTo(14.0);
    });

    it('returns 0 when denominator is 0', () => {
      expect(calculatePercentage(10, 0)).toBe(0);
    });
  });
});
