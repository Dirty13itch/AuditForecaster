import { safeDivide } from './numberUtils';

/**
 * Calculate forecast accuracy percentage by comparing predicted vs actual values
 * 
 * Formula: accuracy = 100 - (|actual - predicted| / predicted * 100)
 * 
 * @param predicted - The predicted value
 * @param actual - The actual value
 * @returns Accuracy percentage (0-100), where 100 = perfect match
 * 
 * Edge cases:
 * - If predicted = 0 and actual = 0: returns 100% (perfect match)
 * - If predicted = 0 and actual ≠ 0: returns 0% (infinite variance)
 * - If either value is null/undefined: returns 0%
 * - Negative accuracy values are clamped to 0%
 * 
 * @example
 * calculateAccuracy(100, 100) // 100 (perfect match)
 * calculateAccuracy(100, 110) // 90 (10% variance)
 * calculateAccuracy(0, 0) // 100 (both zero = perfect)
 * calculateAccuracy(0, 5) // 0 (infinite variance)
 * calculateAccuracy(10, 1000) // 0 (extreme variance)
 */
export function calculateAccuracy(predicted: number, actual: number): number {
  // Handle null/undefined values
  if (predicted === null || predicted === undefined || 
      actual === null || actual === undefined) {
    return 0;
  }
  
  // Handle zero predicted value
  if (predicted === 0) {
    return actual === 0 ? 100 : 0; // Perfect if both zero, else 0%
  }
  
  // Calculate variance as percentage of predicted value
  // Use Math.abs(predicted) to handle negative predictions correctly
  const variance = safeDivide(Math.abs(actual - predicted), Math.abs(predicted)) * 100;
  
  // Accuracy is inverse of variance, clamped to 0-100 range
  return Math.max(0, 100 - variance);
}
