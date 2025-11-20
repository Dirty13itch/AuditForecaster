'use client'

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

export function BlowerDoorForm() {
    const [cfm50, setCfm50] = useState('');
    const [volume, setVolume] = useState('25000'); // Default volume for demo
    const [ach50, setAch50] = useState<number | null>(null);

    const calculateACH50 = () => {
        if (cfm50 && volume) {
            const result = (parseFloat(cfm50) * 60) / parseFloat(volume);
            setAch50(parseFloat(result.toFixed(2)));
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Blower Door Test (RESNET 380)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="volume">Building Volume (ft³)</Label>
                    <Input
                        id="volume"
                        type="number"
                        value={volume}
                        onChange={(e) => setVolume(e.target.value)}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="cfm50">CFM50 Reading</Label>
                    <Input
                        id="cfm50"
                        type="number"
                        placeholder="Enter CFM value"
                        value={cfm50}
                        onChange={(e) => setCfm50(e.target.value)}
                    />
                </div>

                <Button onClick={calculateACH50} className="w-full">Calculate ACH50</Button>

                {ach50 !== null && (
                    <div className={`p-4 rounded-lg text-center ${ach50 <= 3.0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        <div className="text-sm font-medium">Result</div>
                        <div className="text-3xl font-bold">{ach50} ACH50</div>
                        <div className="text-xs mt-1">{ach50 <= 3.0 ? 'PASS' : 'FAIL (> 3.0)'}</div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
