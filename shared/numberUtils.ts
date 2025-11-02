/**
 * Number utility functions for safe mathematical operations
 */

/**
 * Safely converts a value to a fixed decimal string
 * @param value - The value to convert (can be number, null, undefined, or string)
 * @param decimals - Number of decimal places (default: 2)
 * @returns A string representation with the specified decimals
 * 
 * @example
 * safeToFixed(3.14159, 2) // "3.14"
 * safeToFixed(null, 2) // "0.00"
 * safeToFixed(5, 0) // "5"
 * safeToFixed(undefined, 0) // "0"
 */
export function safeToFixed(value: number | null | undefined | string, decimals: number = 2): string {
  const num = typeof value === 'number' ? value : parseFloat(value as string);
  
  if (typeof num === 'number' && !isNaN(num)) {
    return num.toFixed(decimals);
  }
  
  // Fix: when decimals is 0, return '0' not '0.'
  if (decimals === 0) {
    return '0';
  }
  
  return '0.' + '0'.repeat(decimals);
}

/**
 * Safely parses a value to a float number
 * @param value - The value to parse
 * @param defaultValue - The value to return if parsing fails (default: 0)
 * @returns A valid number or the default value
 * 
 * @example
 * safeParseFloat("3.14") // 3.14
 * safeParseFloat("abc") // 0
 * safeParseFloat(null) // 0
 * safeParseFloat("abc", 10) // 10
 */
export function safeParseFloat(value: string | number | null | undefined, defaultValue: number = 0): number {
  const num = parseFloat(value as string);
  return !isNaN(num) ? num : defaultValue;
}

/**
 * Safely parses a value to an integer number
 * @param value - The value to parse
 * @param defaultValue - The value to return if parsing fails (default: 0)
 * @returns A valid integer or the default value
 * 
 * @example
 * safeParseInt("42") // 42
 * safeParseInt("abc") // 0
 * safeParseInt(null) // 0
 * safeParseInt("abc", 10) // 10
 * safeParseInt("3.14") // 3
 */
export function safeParseInt(value: string | number | null | undefined, defaultValue: number = 0): number {
  const num = parseInt(value as string, 10);
  return !isNaN(num) ? num : defaultValue;
}

/**
 * Safely divides two numbers with a fallback value for division by zero
 * @param numerator - The numerator
 * @param denominator - The denominator
 * @param fallback - The value to return when division is not possible (default: 0)
 * @returns The result of division or the fallback value
 * 
 * @example
 * safeDivide(10, 2) // 5
 * safeDivide(10, 0) // 0 (default fallback)
 * safeDivide(10, 0, null) // null (for variance calculations)
 * safeDivide(10, 0, Infinity) // Infinity
 */
export function safeDivide(
  numerator: number, 
  denominator: number, 
  fallback: number | null = 0
): number | null {
  // Check for invalid denominator
  if (denominator === 0 || !isFinite(denominator)) {
    return fallback;
  }
  
  // Check for invalid numerator
  if (!isFinite(numerator) || isNaN(numerator)) {
    return fallback;
  }
  
  const result = numerator / denominator;
  
  // Check if result is valid
  return isFinite(result) ? result : fallback;
}
