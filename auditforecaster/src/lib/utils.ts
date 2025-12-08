import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

/**
 * Safely parse JSON with a fallback value
 * Prevents crashes from malformed JSON strings
 */
export function safeJsonParse<T>(json: string | null | undefined, fallback: T): T {
  if (!json) return fallback
  try {
    return JSON.parse(json) as T
  } catch {
    console.warn('Failed to parse JSON:', json.substring(0, 100))
    return fallback
  }
}

/**
 * Safely parse a number with validation
 * Returns fallback if the result is NaN or invalid
 */
export function safeParseInt(value: string | null | undefined, fallback: number): number {
  if (!value) return fallback
  const parsed = parseInt(value, 10)
  return Number.isNaN(parsed) ? fallback : parsed
}

export function safeParseFloat(value: string | null | undefined, fallback: number): number {
  if (!value) return fallback
  const parsed = parseFloat(value)
  return Number.isNaN(parsed) ? fallback : parsed
}
