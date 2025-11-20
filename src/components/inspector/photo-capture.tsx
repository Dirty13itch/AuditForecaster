'use client'

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Camera, Loader2 } from 'lucide-react';

export function PhotoCapture() {
    const [isCapturing, setIsCapturing] = useState(false);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [ocrResult, setOcrResult] = useState<string | null>(null);

    const handleCapture = () => {
        setIsCapturing(true);
        // Simulate camera delay and OCR processing
        setTimeout(() => {
            setCapturedImage('https://placehold.co/600x400/png?text=Furnace+Label');
            setOcrResult('Model: 59TP6B060\nSerial: 2312A12345\nBTU: 60,000');
            setIsCapturing(false);
        }, 2000);
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Equipment Photo & OCR</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {!capturedImage ? (
                    <div className="border-2 border-dashed border-slate-300 rounded-lg h-48 flex flex-col items-center justify-center bg-slate-50">
                        <Button onClick={handleCapture} disabled={isCapturing}>
                            {isCapturing ? <Loader2 className="animate-spin mr-2" /> : <Camera className="mr-2" />}
                            {isCapturing ? 'Processing...' : 'Take Photo'}
                        </Button>
                        <p className="text-xs text-slate-500 mt-2">Auto-detects model numbers</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <img src={capturedImage} alt="Captured equipment" className="w-full rounded-lg" />
                        <div className="bg-slate-100 p-3 rounded-md">
                            <h4 className="text-sm font-bold mb-2">Detected Data:</h4>
                            <pre className="text-xs whitespace-pre-wrap">{ocrResult}</pre>
                        </div>
                        <Button variant="outline" onClick={() => setCapturedImage(null)} className="w-full">
                            Retake
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
