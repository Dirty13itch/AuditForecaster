'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Sun, Cloud, Wind } from 'lucide-react'

interface WeatherData {
    temperature: number
    windspeed: number
    weathercode: number
    time: string
}

export function WeatherWidget({ lat, lng }: { lat: number, lng: number }) {
    const [weather, setWeather] = useState<WeatherData | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!lat || !lng) return

        fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true&temperature_unit=fahrenheit&windspeed_unit=mph`)
            .then(res => res.json())
            .then(data => {
                setWeather(data.current_weather)
                setLoading(false)
            })
            .catch(err => {
                console.error('Weather fetch failed', err)
                setLoading(false)
            })
    }, [lat, lng])

    if (loading) return <div className="animate-pulse h-24 bg-slate-100 rounded-lg"></div>
    if (!weather) return null

    const isWindy = weather.windspeed > 10 // Threshold for Blower Door issues

    return (
        <Card className={`${isWindy ? 'border-amber-400 bg-amber-50' : 'bg-blue-50 border-blue-200'}`}>
            <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="p-2 bg-white rounded-full shadow-sm">
                        {weather.weathercode < 3 ? <Sun className="text-amber-500" /> : <Cloud className="text-slate-500" />}
                    </div>
                    <div>
                        <div className="text-2xl font-bold">{weather.temperature}°F</div>
                        <div className="text-sm text-slate-600 flex items-center gap-1">
                            <Wind className="h-3 w-3" /> {weather.windspeed} mph
                        </div>
                    </div>
                </div>

                {isWindy && (
                    <div className="text-xs font-bold text-amber-700 bg-amber-200 px-2 py-1 rounded">
                        HIGH WIND WARNING
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
