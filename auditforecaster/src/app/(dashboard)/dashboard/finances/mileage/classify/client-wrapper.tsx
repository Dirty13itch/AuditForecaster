"use client";

import { SwipeCard } from "@/components/ui/swipe-card";
import { classifyMileage } from "@/app/actions/finances";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type MileageLog = {
    id: string
    date: Date
    distance: number
    startLocation: string | null
    endLocation: string | null
    vehicle: {
        name: string
    }
}

export function ClientSwipeWrapper({ log }: { log: MileageLog }) {
    const [isVisible, setIsVisible] = useState(true);

    const handleSwipe = async (purpose: "Business" | "Personal") => {
        setIsVisible(false); // Optimistic update
        await classifyMileage(log.id, purpose);
    };

    if (!isVisible) return null;

    return (
        <SwipeCard
            onSwipeLeft={() => handleSwipe("Personal")}
            onSwipeRight={() => handleSwipe("Business")}
            className="w-full h-full"
        >
            <Card className="w-full h-full border-none shadow-none bg-transparent pointer-events-none">
                <CardHeader>
                    <CardTitle>{log.date.toLocaleDateString()}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="text-4xl font-bold text-center py-8">
                        {log.distance} mi
                    </div>
                    <div className="space-y-2 text-sm text-muted-foreground">
                        <p>Vehicle: {log.vehicle.name}</p>
                        <p>Route: {log.startLocation || 'Unknown'} → {log.endLocation || 'Unknown'}</p>
                    </div>
                </CardContent>
            </Card>
        </SwipeCard>
    );
}
