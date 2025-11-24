'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Play, Square, Save } from 'lucide-react'
import { logTrip } from '@/app/actions/logistics'

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 3959; // Radius of the earth in miles
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

export function MileageTracker() {
    const [isTracking, setIsTracking] = useState(false)
    const [distance, setDistance] = useState(0)
    const [startPos, setStartPos] = useState<{ lat: number; lng: number } | null>(null)
    const [currentPos, setCurrentPos] = useState<{ lat: number; lng: number } | null>(null)
    const [startLocationName, setStartLocationName] = useState('')
    const [endLocationName, setEndLocationName] = useState('')
    const [selectedVehicle, setSelectedVehicle] = useState<string>('')
    const [vehicles, setVehicles] = useState<any[]>([]) // Need to fetch vehicles

    useEffect(() => {
        // Mock vehicles for now or fetch
        setVehicles([
            { id: 'v1', name: 'Ford F-150', licensePlate: 'ABC-123' },
            { id: 'v2', name: 'Chevy Silverado', licensePlate: 'XYZ-789' }
        ])
    }, [])

    useEffect(() => {
        let watchId: number;
        if (isTracking) {
            watchId = navigator.geolocation.watchPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    setCurrentPos({ lat: latitude, lng: longitude });

                    if (startPos) {
                        const dist = calculateDistance(startPos.lat, startPos.lng, latitude, longitude);
                        setDistance(dist);
                    }
                },
                (error) => console.error(error),
                { enableHighAccuracy: true }
            );
        }
        return () => {
            if (watchId) navigator.geolocation.clearWatch(watchId);
        };
    }, [isTracking, startPos]);

    const handleStartTrip = () => {
        if (!selectedVehicle) {
            alert('Please select a vehicle first')
            return
        }
        navigator.geolocation.getCurrentPosition((pos) => {
            setStartPos({ lat: pos.coords.latitude, lng: pos.coords.longitude })
            setCurrentPos({ lat: pos.coords.latitude, lng: pos.coords.longitude })
            setIsTracking(true)
            setDistance(0)
            setStartLocationName('Current Location') // In real app, reverse geocode here
        })
    }

    const handleStopTrip = () => {
        setIsTracking(false)
        setEndLocationName('Current Location') // In real app, reverse geocode here
    }

    const handleSaveLog = async () => {
        if (!selectedVehicle) return

        await logTrip({
            vehicleId: selectedVehicle,
            date: new Date(),
            distance: parseFloat(distance.toFixed(1)),
            startLocation: startLocationName,
            endLocation: endLocationName,
            purpose: 'Business'
        })

        // Reset
        setStartPos(null)
        setCurrentPos(null)
        setDistance(0)
        setStartLocationName('')
        setEndLocationName('')
        alert('Trip logged successfully!')
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Mileage Tracker</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                    <Label>Vehicle</Label>
                    <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select Vehicle" />
                        </SelectTrigger>
                        <SelectContent>
                            {vehicles.map(v => (
                                <SelectItem key={v.id} value={v.id}>{v.name} ({v.licensePlate})</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex flex-col items-center justify-center p-6 bg-slate-50 rounded-lg border border-dashed">
                    <div className="text-4xl font-mono font-bold text-slate-900 mb-2">
                        {distance.toFixed(1)} <span className="text-lg text-slate-500">mi</span>
                    </div>
                    <div className="text-sm text-slate-500">
                        {isTracking ? 'Tracking in progress...' : 'Ready to track'}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    {!isTracking ? (
                        <Button onClick={handleStartTrip} className="w-full bg-green-600 hover:bg-green-700" size="lg">
                            <Play className="mr-2 h-4 w-4" /> Start Trip
                        </Button>
                    ) : (
                        <Button onClick={handleStopTrip} className="w-full bg-red-600 hover:bg-red-700" size="lg">
                            <Square className="mr-2 h-4 w-4" /> Stop Trip
                        </Button>
                    )}

                    <Button onClick={handleSaveLog} disabled={isTracking || distance === 0} variant="outline" size="lg">
                        <Save className="mr-2 h-4 w-4" /> Save Log
                    </Button>
                </div>

                {!isTracking && distance > 0 && (
                    <div className="space-y-4 pt-4 border-t">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Start Location</Label>
                                <Input value={startLocationName} onChange={e => setStartLocationName(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>End Location</Label>
                                <Input value={endLocationName} onChange={e => setEndLocationName(e.target.value)} />
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
