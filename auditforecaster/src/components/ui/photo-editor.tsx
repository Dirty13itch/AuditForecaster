'use client'

import React, { useRef, useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Circle, ArrowRight, Save } from 'lucide-react'

interface PhotoEditorProps {
    imageFile: File
    onSave: (editedFile: File) => void
    onCancel: () => void
}

export function PhotoEditor({ imageFile, onSave, onCancel }: PhotoEditorProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const [context, setContext] = useState<CanvasRenderingContext2D | null>(null)
    const [color, setColor] = useState('#ff0000')
    const [lineWidth, setLineWidth] = useState(5)
    const [tool, setTool] = useState<'free' | 'arrow' | 'circle' | 'text'>('free')
    const [isDrawing, setIsDrawing] = useState(false)
    const [startPos, setStartPos] = useState({ x: 0, y: 0 })
    const [snapshot, setSnapshot] = useState<ImageData | null>(null)

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        setContext(ctx)

        const img = new Image()
        img.src = URL.createObjectURL(imageFile)
        img.onload = () => {
            canvas.width = img.width
            canvas.height = img.height
            // Scale down if too large for display, but keep resolution? 
            // For simplicity, we keep original resolution but style it with CSS
            ctx.drawImage(img, 0, 0)
            URL.revokeObjectURL(img.src)
        }
    }, [imageFile])

    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!context || !canvasRef.current) return
        
        setIsDrawing(true)
        const rect = canvasRef.current.getBoundingClientRect()
        const scaleX = canvasRef.current.width / rect.width
        const scaleY = canvasRef.current.height / rect.height
        
        const x = (e.clientX - rect.left) * scaleX
        const y = (e.clientY - rect.top) * scaleY
        
        setStartPos({ x, y })
        setSnapshot(context.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height))
        
        context.beginPath()
        context.moveTo(x, y)
        context.strokeStyle = color
        context.lineWidth = lineWidth
        context.lineCap = 'round'
    }

    const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDrawing || !context || !canvasRef.current || !snapshot) return

        const rect = canvasRef.current.getBoundingClientRect()
        const scaleX = canvasRef.current.width / rect.width
        const scaleY = canvasRef.current.height / rect.height
        
        const x = (e.clientX - rect.left) * scaleX
        const y = (e.clientY - rect.top) * scaleY

        if (tool === 'free') {
            context.lineTo(x, y)
            context.stroke()
        } else {
            // Restore snapshot to avoid trails for shapes
            context.putImageData(snapshot, 0, 0)
            context.beginPath()
            
            if (tool === 'circle') {
                const radius = Math.sqrt(Math.pow(x - startPos.x, 2) + Math.pow(y - startPos.y, 2))
                context.arc(startPos.x, startPos.y, radius, 0, 2 * Math.PI)
                context.stroke()
            } else if (tool === 'arrow') {
                // Draw line
                context.moveTo(startPos.x, startPos.y)
                context.lineTo(x, y)
                context.stroke()
                
                // Draw Arrowhead
                const angle = Math.atan2(y - startPos.y, x - startPos.x)
                const headLen = lineWidth * 3
                context.beginPath()
                context.moveTo(x, y)
                context.lineTo(x - headLen * Math.cos(angle - Math.PI / 6), y - headLen * Math.sin(angle - Math.PI / 6))
                context.moveTo(x, y)
                context.lineTo(x - headLen * Math.cos(angle + Math.PI / 6), y - headLen * Math.sin(angle + Math.PI / 6))
                context.stroke()
            }
        }
    }

    const stopDrawing = () => {
        setIsDrawing(false)
    }

    const handleSave = () => {
        if (!canvasRef.current) return
        canvasRef.current.toBlob((blob) => {
            if (blob) {
                const file = new File([blob], imageFile.name, { type: imageFile.type })
                onSave(file)
            }
        }, imageFile.type)
    }

    return (
        <div className="flex flex-col h-full bg-background border rounded-lg overflow-hidden">
            {/* Toolbar */}
            <div className="flex items-center justify-between p-2 border-b bg-muted/50">
                <div className="flex space-x-2">
                    <Button variant={tool === 'free' ? 'secondary' : 'ghost'} size="icon" onClick={() => setTool('free')}>
                        <span className="font-bold">~</span>
                    </Button>
                    <Button variant={tool === 'arrow' ? 'secondary' : 'ghost'} size="icon" onClick={() => setTool('arrow')}>
                        <ArrowRight className="w-4 h-4" />
                    </Button>
                    <Button variant={tool === 'circle' ? 'secondary' : 'ghost'} size="icon" onClick={() => setTool('circle')}>
                        <Circle className="w-4 h-4" />
                    </Button>
                </div>
                
                <div className="flex items-center space-x-4">
                    <input 
                        type="color" 
                        value={color} 
                        onChange={(e) => setColor(e.target.value)}
                        className="w-8 h-8 rounded cursor-pointer"
                    />
                    <Slider 
                        value={[lineWidth]} 
                        onValueChange={(v) => setLineWidth(v[0] ?? 1)} 
                        min={1} 
                        max={20} 
                        step={1}
                        className="w-24" 
                    />
                </div>

                <div className="flex space-x-2">
                    <Button variant="ghost" onClick={onCancel}>Cancel</Button>
                    <Button onClick={handleSave}>
                        <Save className="w-4 h-4 mr-2" />
                        Save
                    </Button>
                </div>
            </div>

            {/* Canvas Area */}
            <div className="flex-1 overflow-auto bg-neutral-900 flex items-center justify-center p-4">
                <canvas
                    ref={canvasRef}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    className="max-w-full max-h-full shadow-2xl"
                    style={{ cursor: 'crosshair' }}
                />
            </div>
        </div>
    )
}
