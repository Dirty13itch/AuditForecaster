import { cn } from './utils'

describe('utils', () => {
    test('cn merges class names correctly', () => {
        const result = cn('text-red-500', 'bg-blue-500')
        expect(result).toBe('text-red-500 bg-blue-500')
    })

    test('cn handles conditional classes', () => {
        const result = cn('text-red-500', true && 'bg-blue-500', false && 'hidden')
        expect(result).toBe('text-red-500 bg-blue-500')
    })
})
