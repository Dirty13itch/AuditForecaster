import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";
import {
  Columns2,
  Layers,
  Move,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Copy,
  ArrowLeft,
  ArrowRight
} from "lucide-react";
import type { Photo } from "@shared/schema";

interface PhotoComparisonProps {
  photo1: Photo;
  photo2: Photo;
  onClose?: () => void;
}

type ComparisonMode = "side-by-side" | "overlay" | "swipe";

export function PhotoComparison({ photo1, photo2, onClose }: PhotoComparisonProps) {
  const [mode, setMode] = useState<ComparisonMode>("side-by-side");
  const [overlayOpacity, setOverlayOpacity] = useState(0.5);
  const [swipePosition, setSwipePosition] = useState(50);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [syncControls, setSyncControls] = useState(true);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const image1Ref = useRef<HTMLImageElement>(null);
  const image2Ref = useRef<HTMLImageElement>(null);

  // Handle zoom
  const handleZoomIn = () => {
    setZoom(Math.min(zoom * 1.2, 5));
  };

  const handleZoomOut = () => {
    setZoom(Math.max(zoom * 0.8, 0.5));
  };

  const handleReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setOverlayOpacity(0.5);
    setSwipePosition(50);
  };

  // Handle pan
  const handleMouseDown = (e: React.MouseEvent) => {
    if (mode === "swipe" && Math.abs(e.clientX - (containerRef.current?.offsetLeft || 0) - (containerRef.current?.offsetWidth || 0) * swipePosition / 100) < 20) {
      // Dragging the swipe handle
      setIsDragging(true);
    } else {
      // Panning the image
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    
    if (mode === "swipe" && !dragStart.x) {
      // Moving swipe position
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const newPosition = ((e.clientX - rect.left) / rect.width) * 100;
        setSwipePosition(Math.max(0, Math.min(100, newPosition)));
      }
    } else if (dragStart.x) {
      // Panning
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDragStart({ x: 0, y: 0 });
  };

  // Handle wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(Math.max(0.5, Math.min(5, zoom * delta)));
  };

  // Copy annotations between images
  const copyAnnotations = (direction: "left-to-right" | "right-to-left") => {
    // This would trigger an API call to copy annotations
    // Implementation would depend on the annotation system
  };

  const renderSideBySide = () => (
    <div className="grid grid-cols-2 gap-4 h-full">
      <div className="relative overflow-hidden border rounded-lg">
        <img
          ref={image1Ref}
          src={photo1.fullUrl || photo1.filePath}
          alt={`Before photo: ${photo1.caption || (photo1.location ? `taken at ${photo1.location}` : 'First comparison photo')}${photo1.tags && photo1.tags.length > 0 ? `, tagged: ${photo1.tags.slice(0, 3).join(', ')}` : ''}`}
          className="w-full h-full object-contain"
          style={{
            transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
            transformOrigin: "center",
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onWheel={handleWheel}
          draggable={false}
        />
        <div className="absolute top-2 left-2 bg-background/80 px-2 py-1 rounded text-sm">
          Before
        </div>
      </div>
      <div className="relative overflow-hidden border rounded-lg">
        <img
          ref={image2Ref}
          src={photo2.fullUrl || photo2.filePath}
          alt={`After photo: ${photo2.caption || (photo2.location ? `taken at ${photo2.location}` : 'Second comparison photo')}${photo2.tags && photo2.tags.length > 0 ? `, tagged: ${photo2.tags.slice(0, 3).join(', ')}` : ''}`}
          className="w-full h-full object-contain"
          style={{
            transform: `scale(${zoom}) translate(${syncControls ? pan.x / zoom : 0}px, ${syncControls ? pan.y / zoom : 0}px)`,
            transformOrigin: "center",
          }}
          onMouseDown={syncControls ? undefined : handleMouseDown}
          onMouseMove={syncControls ? undefined : handleMouseMove}
          onMouseUp={syncControls ? undefined : handleMouseUp}
          onWheel={handleWheel}
          draggable={false}
        />
        <div className="absolute top-2 left-2 bg-background/80 px-2 py-1 rounded text-sm">
          After
        </div>
      </div>
    </div>
  );

  const renderOverlay = () => (
    <div className="relative h-full overflow-hidden border rounded-lg" ref={containerRef}>
      <img
        src={photo1.fullUrl || photo1.filePath}
        alt={`Base layer photo: ${photo1.caption || (photo1.location ? `taken at ${photo1.location}` : 'First photo in overlay')}${photo1.tags && photo1.tags.length > 0 ? `, tagged: ${photo1.tags.slice(0, 3).join(', ')}` : ''}`}
        className="absolute inset-0 w-full h-full object-contain"
        style={{
          transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
          transformOrigin: "center",
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        draggable={false}
      />
      <img
        src={photo2.fullUrl || photo2.filePath}
        alt={`Overlay photo: ${photo2.caption || (photo2.location ? `taken at ${photo2.location}` : 'Second photo in overlay')}${photo2.tags && photo2.tags.length > 0 ? `, tagged: ${photo2.tags.slice(0, 3).join(', ')}` : ''}`}
        className="absolute inset-0 w-full h-full object-contain"
        style={{
          opacity: overlayOpacity,
          transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
          transformOrigin: "center",
        }}
        draggable={false}
      />
      <div className="absolute top-2 left-2 bg-background/80 px-2 py-1 rounded text-sm">
        Overlay
      </div>
    </div>
  );

  const renderSwipe = () => (
    <div 
      className="relative h-full overflow-hidden border rounded-lg" 
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
    >
      <img
        src={photo1.fullUrl || photo1.filePath}
        alt={`Swipe base photo: ${photo1.caption || (photo1.location ? `taken at ${photo1.location}` : 'Left side of swipe comparison')}${photo1.tags && photo1.tags.length > 0 ? `, tagged: ${photo1.tags.slice(0, 3).join(', ')}` : ''}`}
        className="absolute inset-0 w-full h-full object-contain"
        style={{
          transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
          transformOrigin: "center",
        }}
        draggable={false}
      />
      <div
        className="absolute inset-0 overflow-hidden"
        style={{
          clipPath: `inset(0 ${100 - swipePosition}% 0 0)`,
        }}
      >
        <img
          src={photo2.fullUrl || photo2.filePath}
          alt={`Swipe reveal photo: ${photo2.caption || (photo2.location ? `taken at ${photo2.location}` : 'Right side of swipe comparison')}${photo2.tags && photo2.tags.length > 0 ? `, tagged: ${photo2.tags.slice(0, 3).join(', ')}` : ''}`}
          className="absolute inset-0 w-full h-full object-contain"
          style={{
            transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
            transformOrigin: "center",
          }}
          draggable={false}
        />
      </div>
      <div
        className="absolute top-0 bottom-0 w-1 bg-primary cursor-ew-resize"
        style={{ left: `${swipePosition}%` }}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-primary text-white rounded-full p-1">
          <Move className="h-4 w-4" />
        </div>
      </div>
      <div className="absolute top-2 left-2 bg-background/80 px-2 py-1 rounded text-sm">
        Before | After
      </div>
    </div>
  );

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle>Photo Comparison</CardTitle>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              ×
            </Button>
          )}
        </div>
        
        <div className="flex items-center gap-4">
          <ToggleGroup
            type="single"
            value={mode}
            onValueChange={(v) => v && setMode(v as ComparisonMode)}
          >
            <ToggleGroupItem value="side-by-side" data-testid="mode-side-by-side">
              <Columns2 className="h-4 w-4 mr-2" />
              Side by Side
            </ToggleGroupItem>
            <ToggleGroupItem value="overlay" data-testid="mode-overlay">
              <Layers className="h-4 w-4 mr-2" />
              Overlay
            </ToggleGroupItem>
            <ToggleGroupItem value="swipe" data-testid="mode-swipe">
              <Move className="h-4 w-4 mr-2" />
              Swipe
            </ToggleGroupItem>
          </ToggleGroup>
          
          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="outline"
              onClick={handleZoomOut}
              data-testid="button-zoom-out"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm w-12 text-center">{Math.round(zoom * 100)}%</span>
            <Button
              size="icon"
              variant="outline"
              onClick={handleZoomIn}
              data-testid="button-zoom-in"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="outline"
              onClick={handleReset}
              data-testid="button-reset"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 p-4">
        <div className="h-full">
          {mode === "side-by-side" && renderSideBySide()}
          {mode === "overlay" && renderOverlay()}
          {mode === "swipe" && renderSwipe()}
        </div>
        
        <div className="mt-4 space-y-4">
          {mode === "overlay" && (
            <div className="flex items-center gap-4">
              <Label>Opacity</Label>
              <Slider
                value={[overlayOpacity]}
                onValueChange={([v]) => setOverlayOpacity(v)}
                min={0}
                max={1}
                step={0.01}
                className="flex-1"
                data-testid="slider-opacity"
              />
              <span className="text-sm w-12">{Math.round(overlayOpacity * 100)}%</span>
            </div>
          )}
          
          {mode === "swipe" && (
            <div className="flex items-center gap-4">
              <Label>Position</Label>
              <Slider
                value={[swipePosition]}
                onValueChange={([v]) => setSwipePosition(v)}
                min={0}
                max={100}
                step={1}
                className="flex-1"
                data-testid="slider-swipe"
              />
              <span className="text-sm w-12">{Math.round(swipePosition)}%</span>
            </div>
          )}
          
          {mode === "side-by-side" && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="sync-controls"
                  checked={syncControls}
                  onChange={(e) => setSyncControls(e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="sync-controls">Synchronized Controls</Label>
              </div>
              
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyAnnotations("left-to-right")}
                  data-testid="button-copy-left-to-right"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyAnnotations("right-to-left")}
                  data-testid="button-copy-right-to-left"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <Copy className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}