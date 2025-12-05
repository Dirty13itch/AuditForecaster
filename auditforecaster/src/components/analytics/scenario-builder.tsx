'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

export function ScenarioBuilder() {
    const [ach50, setAch50] = useState(3.5)
    const [windowU, setWindowU] = useState(0.30)
    const [ceilingR, setCeilingR] = useState(38)
    const [wallR, setWallR] = useState(13)
    
    const [baseScore, setBaseScore] = useState(65)
    const [projectedScore, setProjectedScore] = useState(65)

    // Simple mock calculation logic
    useEffect(() => {
        let score = 65
        
        // ACH50 impact: Lower is better
        // Baseline 3.5. Every 0.5 reduction = -1 point
        score -= (3.5 - ach50) * 2

        // Window U: Lower is better
        // Baseline 0.30. Every 0.01 reduction = -0.5 point
        score -= (0.30 - windowU) * 50

        // Ceiling R: Higher is better
        // Baseline 38. Every 10 increase = -1 point
        score -= (ceilingR - 38) * 0.1

        // Wall R: Higher is better
        // Baseline 13. Every 1 increase = -0.5 point
        score -= (wallR - 13) * 0.5

        setProjectedScore(Math.round(score))
    }, [ach50, windowU, ceilingR, wallR])

    const data = [
        { name: 'Baseline', score: baseScore },
        { name: 'Projected', score: projectedScore }
    ]

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
                <CardHeader>
                    <CardTitle>Scenario Inputs</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <Label>Infiltration (ACH50)</Label>
                            <span className="font-mono">{ach50}</span>
                        </div>
                        <Slider 
                            value={[ach50]} 
                            onValueChange={v => setAch50(v[0] ?? 3.5)} 
                            min={1} max={10} step={0.1} 
                        />
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <Label>Window U-Factor</Label>
                            <span className="font-mono">{windowU}</span>
                        </div>
                        <Slider 
                            value={[windowU]} 
                            onValueChange={v => setWindowU(v[0] ?? 0.30)} 
                            min={0.15} max={0.50} step={0.01} 
                        />
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <Label>Ceiling Insulation (R-Value)</Label>
                            <span className="font-mono">{ceilingR}</span>
                        </div>
                        <Slider 
                            value={[ceilingR]} 
                            onValueChange={v => setCeilingR(v[0] ?? 38)} 
                            min={19} max={60} step={1} 
                        />
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <Label>Wall Insulation (R-Value)</Label>
                            <span className="font-mono">{wallR}</span>
                        </div>
                        <Slider 
                            value={[wallR]} 
                            onValueChange={v => setWallR(v[0] ?? 13)} 
                            min={11} max={30} step={1} 
                        />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>HERS Score Projection</CardTitle>
                </CardHeader>
                <CardContent className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data}>
                            <XAxis dataKey="name" />
                            <YAxis domain={[0, 100]} />
                            <Tooltip />
                            <Bar dataKey="score" fill="#8884d8" radius={[4, 4, 0, 0]}>
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={index === 0 ? '#94a3b8' : '#22c55e'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                    <div className="text-center mt-4">
                        <p className="text-sm text-muted-foreground">
                            Projected Improvement: <span className="font-bold text-green-600">{baseScore - projectedScore} points</span>
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
