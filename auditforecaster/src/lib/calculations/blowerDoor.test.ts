import { calculateACH50, checkMinnesotaCompliance, calculateELA } from './blowerDoor'

describe('Blower Door Calculations', () => {
    describe('calculateACH50', () => {
        it('calculates ACH50 correctly', () => {
            // 1500 CFM50, 18000 cuft
            // (1500 * 60) / 18000 = 5
            const result = calculateACH50(1500, 18000)
            expect(result).toBe(5)
        })

        it('throws error for zero volume', () => {
            expect(() => calculateACH50(1500, 0)).toThrow('Volume must be greater than zero')
        })

        it('rounds to 2 decimal places', () => {
            // 1234 CFM50, 15000 volume
            // (1234 * 60) / 15000 = 4.936 -> 4.94
            const result = calculateACH50(1234, 15000)
            expect(result).toBe(4.94)
        })
    })

    describe('checkMinnesotaCompliance', () => {
        it('returns compliant for ACH50 <= 3.0', () => {
            const result = checkMinnesotaCompliance(2.5)
            expect(result.compliant).toBe(true)
            expect(result.margin).toBe(0.5)
        })

        it('returns non-compliant for ACH50 > 3.0', () => {
            const result = checkMinnesotaCompliance(3.5)
            expect(result.compliant).toBe(false)
            expect(result.margin).toBe(-0.5)
        })

        it('returns compliant for exact target 3.0', () => {
            const result = checkMinnesotaCompliance(3.0)
            expect(result.compliant).toBe(true)
            expect(result.margin).toBe(0)
        })
    })

    describe('calculateELA', () => {
        it('calculates ELA correctly', () => {
            // ELA = CFM50 / (2610 * sqrt(4))
            // ELA = 1000 / (2610 * 2) = 1000 / 5220 = 0.1915...
            const result = calculateELA(1000)
            expect(result).toBe(0.19)
        })
    })
})
