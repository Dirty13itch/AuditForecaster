import { useState, useRef, useEffect } from "react";
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Download,
  Layers,
  Grid2x2,
  Maximize2,
  Move,
  FileDown,
  Lock,
  Unlock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import type { Photo } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface PhotoComparisonToolProps {
  photos: Photo[];
  initialPhotos?: Photo[];
  onClose?: () => void;
}

interface ViewState {
  zoom: number;
  rotation: number;
  position: { x: number; y: number };
}

function ComparisonPane({
  photo,
  viewState,
  onViewChange,
  onRemove,
  onPhotoChange,
  availablePhotos,
  syncedMode,
  overlayMode,
  overlayOpacity,
  showLabels,
  index,
}: {
  photo: Photo | null;
  viewState: ViewState;
  onViewChange: (state: ViewState) => void;
  onRemove: () => void;
  onPhotoChange: (photo: Photo) => void;
  availablePhotos: Photo[];
  syncedMode: boolean;
  overlayMode: boolean;
  overlayOpacity?: number;
  showLabels: boolean;
  index: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    if (viewState.zoom > 1 && !syncedMode) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - viewState.position.x,
        y: e.clientY - viewState.position.y,
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && !syncedMode) {
      onViewChange({
        ...viewState,
        position: {
          x: e.clientX - dragStart.x,
          y: e.clientY - dragStart.y,
        },
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (!syncedMode) {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 1.1 : 0.9;
      const newZoom = Math.max(0.5, Math.min(5, viewState.zoom * delta));
      onViewChange({ ...viewState, zoom: newZoom });
    }
  };

  if (!photo) {
    return (
      <div className="flex h-full flex-col items-center justify-center border rounded-lg bg-muted/20 p-8">
        <p className="text-muted-foreground mb-4">Select a photo to compare</p>
        <Select onValueChange={(id) => {
          const selected = availablePhotos.find(p => p.id === id);
          if (selected) onPhotoChange(selected);
        }}>
          <SelectTrigger className="w-64" data-testid={`select-photo-${index}`}>
            <SelectValue placeholder="Choose a photo" />
          </SelectTrigger>
          <SelectContent>
            {availablePhotos.map(p => (
              <SelectItem key={p.id} value={p.id}>
                {p.caption || format(new Date(p.uploadedAt), "PP")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  return (
    <div className="relative h-full border rounded-lg overflow-hidden bg-muted/20">
      {/* Header */}
      {showLabels && (
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between bg-background/80 backdrop-blur p-2">
          <span className="text-sm font-medium truncate">
            {photo.caption || format(new Date(photo.uploadedAt), "PP")}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={onRemove}
            data-testid={`button-remove-${index}`}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Image container */}
      <div
        ref={containerRef}
        className="h-full w-full flex items-center justify-center overflow-hidden"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        style={{ 
          cursor: viewState.zoom > 1 && !syncedMode ? (isDragging ? 'grabbing' : 'grab') : 'default',
          opacity: overlayMode ? overlayOpacity : 1,
        }}
      >
        <img
          src={photo.filePath}
          alt={photo.caption || "Photo"}
          className="max-h-full max-w-full object-contain"
          style={{
            transform: `scale(${viewState.zoom}) rotate(${viewState.rotation}deg) translate(${viewState.position.x / viewState.zoom}px, ${viewState.position.y / viewState.zoom}px)`,
          }}
          draggable={false}
        />
      </div>

      {/* Info overlay */}
      {showLabels && (
        <div className="absolute bottom-0 left-0 right-0 bg-background/80 backdrop-blur p-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex gap-2">
              {photo.tags?.slice(0, 3).map(tag => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
            <span className="text-muted-foreground">
              {viewState.zoom !== 1 && `${Math.round(viewState.zoom * 100)}%`}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export function PhotoComparisonTool({
  photos,
  initialPhotos = [],
  onClose,
}: PhotoComparisonToolProps) {
  const { toast } = useToast();
  const [selectedPhotos, setSelectedPhotos] = useState<(Photo | null)[]>(() => {
    const initial = [...initialPhotos];
    while (initial.length < 4) {
      initial.push(null);
    }
    return initial.slice(0, 4);
  });
  
  const [viewStates, setViewStates] = useState<ViewState[]>(() =>
    Array(4).fill(null).map(() => ({
      zoom: 1,
      rotation: 0,
      position: { x: 0, y: 0 },
    }))
  );
  
  const [layout, setLayout] = useState<'2x2' | '1x2' | '1x3' | '1x4'>('2x2');
  const [syncedMode, setSyncedMode] = useState(true);
  const [overlayMode, setOverlayMode] = useState(false);
  const [overlayOpacity, setOverlayOpacity] = useState(0.5);
  const [showLabels, setShowLabels] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Get the number of slots based on layout
  const getSlotCount = () => {
    switch (layout) {
      case '1x2': return 2;
      case '1x3': return 3;
      case '1x4': return 4;
      default: return 4;
    }
  };

  const activeSlots = getSlotCount();

  // Handle synchronized view changes
  const handleViewChange = (index: number, state: ViewState) => {
    if (syncedMode) {
      // Update all view states when in synced mode
      setViewStates(viewStates.map(() => state));
    } else {
      // Update only the specific pane
      const newStates = [...viewStates];
      newStates[index] = state;
      setViewStates(newStates);
    }
  };

  // Global zoom controls
  const handleGlobalZoom = (delta: number) => {
    setViewStates(viewStates.map(state => ({
      ...state,
      zoom: Math.max(0.5, Math.min(5, state.zoom * delta)),
    })));
  };

  // Global rotate
  const handleGlobalRotate = () => {
    setViewStates(viewStates.map(state => ({
      ...state,
      rotation: (state.rotation + 90) % 360,
    })));
  };

  // Reset all views
  const handleResetViews = () => {
    setViewStates(viewStates.map(() => ({
      zoom: 1,
      rotation: 0,
      position: { x: 0, y: 0 },
    })));
  };

  // Export as PDF
  const handleExportPDF = async () => {
    try {
      const activePhotos = selectedPhotos
        .slice(0, activeSlots)
        .filter((p): p is Photo => p !== null);
      
      if (activePhotos.length === 0) {
        toast({
          title: "No photos to export",
          description: "Please select at least one photo to export",
          variant: "destructive",
        });
        return;
      }

      const response = await apiRequest("/api/photos/comparison-export", {
        method: "POST",
        body: JSON.stringify({
          photoIds: activePhotos.map(p => p.id),
          layout,
          title: "Photo Comparison",
        }),
      });

      if (response.downloadUrl) {
        window.open(response.downloadUrl, '_blank');
        toast({
          title: "Export successful",
          description: "Your comparison PDF is being downloaded",
        });
      }
    } catch (error) {
      toast({
        title: "Export failed",
        description: "Failed to export comparison as PDF",
        variant: "destructive",
      });
    }
  };

  const handlePhotoChange = (index: number, photo: Photo) => {
    const newPhotos = [...selectedPhotos];
    newPhotos[index] = photo;
    setSelectedPhotos(newPhotos);
  };

  const handleRemovePhoto = (index: number) => {
    const newPhotos = [...selectedPhotos];
    newPhotos[index] = null;
    setSelectedPhotos(newPhotos);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          if (isFullscreen) {
            setIsFullscreen(false);
          } else {
            onClose?.();
          }
          break;
        case '+':
        case '=':
          handleGlobalZoom(1.1);
          break;
        case '-':
          handleGlobalZoom(0.9);
          break;
        case 'r':
          handleGlobalRotate();
          break;
        case 's':
          setSyncedMode(!syncedMode);
          break;
        case 'l':
          setShowLabels(!showLabels);
          break;
        case 'f':
          setIsFullscreen(!isFullscreen);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [syncedMode, showLabels, isFullscreen]);

  const gridClass = layout === '2x2' 
    ? 'grid-cols-2 grid-rows-2'
    : layout === '1x2'
    ? 'grid-cols-2 grid-rows-1'
    : layout === '1x3'
    ? 'grid-cols-3 grid-rows-1'
    : 'grid-cols-4 grid-rows-1';

  const content = (
    <div className={cn(
      "flex flex-col h-full bg-background",
      isFullscreen && "fixed inset-0 z-50"
    )}>
      {/* Header controls */}
      <div className="border-b p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="font-semibold">Photo Comparison</h2>
            
            {/* Layout selector */}
            <Select value={layout} onValueChange={(v: any) => setLayout(v)}>
              <SelectTrigger className="w-32" data-testid="select-layout">
                <Grid2x2 className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1x2">Side by Side (2)</SelectItem>
                <SelectItem value="1x3">Three Photos</SelectItem>
                <SelectItem value="1x4">Four Photos</SelectItem>
                <SelectItem value="2x2">Grid (2×2)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            {/* Sync controls */}
            <div className="flex items-center gap-2">
              <Switch
                checked={syncedMode}
                onCheckedChange={setSyncedMode}
                id="sync-mode"
                data-testid="switch-sync"
              />
              <Label htmlFor="sync-mode" className="text-sm">
                {syncedMode ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
              </Label>
            </div>

            <Separator orientation="vertical" className="h-6" />

            {/* Overlay mode */}
            {layout === '1x2' && (
              <>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={overlayMode}
                    onCheckedChange={setOverlayMode}
                    id="overlay-mode"
                    data-testid="switch-overlay"
                  />
                  <Label htmlFor="overlay-mode" className="text-sm">
                    <Layers className="h-4 w-4" />
                  </Label>
                </div>
                {overlayMode && (
                  <Slider
                    value={[overlayOpacity]}
                    onValueChange={([v]) => setOverlayOpacity(v)}
                    min={0}
                    max={1}
                    step={0.1}
                    className="w-24"
                    data-testid="slider-opacity"
                  />
                )}
                <Separator orientation="vertical" className="h-6" />
              </>
            )}

            {/* View controls */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleGlobalZoom(0.9)}
              title="Zoom Out (-)"
              data-testid="button-global-zoom-out"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleGlobalZoom(1.1)}
              title="Zoom In (+)"
              data-testid="button-global-zoom-in"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={handleGlobalRotate}
              title="Rotate All (R)"
              data-testid="button-global-rotate"
            >
              <RotateCw className="h-4 w-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetViews}
              data-testid="button-reset-views"
            >
              Reset
            </Button>

            <Separator orientation="vertical" className="h-6" />

            {/* Labels toggle */}
            <div className="flex items-center gap-2">
              <Switch
                checked={showLabels}
                onCheckedChange={setShowLabels}
                id="show-labels"
                data-testid="switch-labels"
              />
              <Label htmlFor="show-labels" className="text-sm">
                Labels
              </Label>
            </div>

            <Separator orientation="vertical" className="h-6" />

            {/* Actions */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportPDF}
              data-testid="button-export-pdf"
            >
              <FileDown className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsFullscreen(!isFullscreen)}
              title="Fullscreen (F)"
              data-testid="button-fullscreen"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
            
            {onClose && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                title="Close (ESC)"
                data-testid="button-close"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Comparison grid */}
      <div className="flex-1 p-4 overflow-hidden">
        <div className={cn("grid gap-4 h-full", gridClass)}>
          {Array(activeSlots).fill(null).map((_, index) => (
            <ComparisonPane
              key={index}
              index={index}
              photo={overlayMode && index > 0 ? selectedPhotos[0] : selectedPhotos[index]}
              viewState={viewStates[index]}
              onViewChange={(state) => handleViewChange(index, state)}
              onRemove={() => handleRemovePhoto(index)}
              onPhotoChange={(photo) => handlePhotoChange(index, photo)}
              availablePhotos={photos}
              syncedMode={syncedMode}
              overlayMode={overlayMode && index === 1}
              overlayOpacity={overlayMode && index === 1 ? overlayOpacity : 1}
              showLabels={showLabels}
            />
          ))}
        </div>
      </div>
    </div>
  );

  if (isFullscreen) {
    return content;
  }

  if (onClose) {
    return (
      <Dialog open onOpenChange={() => onClose()}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0">
          {content}
        </DialogContent>
      </Dialog>
    );
  }

  return content;
}