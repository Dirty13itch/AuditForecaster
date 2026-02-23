import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getCoordinates } from '../geocoding'

describe('getCoordinates', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('returns coordinates for a valid address', async () => {
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve([{
                lat: '44.9778',
                lon: '-93.2650',
                display_name: 'Minneapolis, MN, USA',
                place_id: '12345',
            }]),
        })

        const result = await getCoordinates('Minneapolis, MN')
        expect(result).not.toBeNull()
        expect(result!.lat).toBeCloseTo(44.9778)
        expect(result!.lng).toBeCloseTo(-93.2650)
        expect(result!.formattedAddress).toBe('Minneapolis, MN, USA')
        expect(result!.placeId).toBe('12345')
    })

    it('returns null for empty results', async () => {
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve([]),
        })

        const result = await getCoordinates('nonexistent place')
        expect(result).toBeNull()
    })

    it('returns null when API returns error status', async () => {
        global.fetch = vi.fn().mockResolvedValue({
            ok: false,
            statusText: 'Internal Server Error',
        })

        const result = await getCoordinates('Minneapolis, MN')
        expect(result).toBeNull()
    })

    it('returns null on network error', async () => {
        global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

        const result = await getCoordinates('Minneapolis, MN')
        expect(result).toBeNull()
    })

    it('encodes address properly in URL', async () => {
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve([]),
        })

        await getCoordinates('123 Main St, Minneapolis, MN')

        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining('123%20Main%20St'),
            expect.any(Object)
        )
    })

    it('sets correct User-Agent header', async () => {
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve([]),
        })

        await getCoordinates('test address')

        expect(global.fetch).toHaveBeenCalledWith(
            expect.any(String),
            expect.objectContaining({
                headers: { 'User-Agent': 'AuditForecaster/1.0' },
            })
        )
    })
})
