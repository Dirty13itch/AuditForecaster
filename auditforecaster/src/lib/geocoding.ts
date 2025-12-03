import { logger } from '@/lib/logger'

export async function getCoordinates(address: string): Promise<{ lat: number; lng: number; formattedAddress: string; placeId: string } | null> {
    try {
        const encodedAddress = encodeURIComponent(address);
        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1`,
            {
                headers: {
                    'User-Agent': 'AuditForecaster/1.0', // Required by Nominatim
                },
                signal: AbortSignal.timeout(5000)
            }
        );

        if (!response.ok) {
            logger.error('Geocoding failed:', { statusText: response.statusText })
            return null;
        }

        const data = await response.json()
        if (data.status !== 'OK' && (!Array.isArray(data) || data.length === 0)) {
            return null
        }

        // Handle Nominatim response format (array)
        if (Array.isArray(data) && data.length > 0) {
            const result = data[0]
            return {
                lat: parseFloat(result.lat),
                lng: parseFloat(result.lon),
                formattedAddress: result.display_name,
                placeId: result.place_id?.toString() || 'unknown'
            }
        }

        return null
    } catch (error) {
        logger.error('Geocoding error:', { error })
        return null;
    }
}
