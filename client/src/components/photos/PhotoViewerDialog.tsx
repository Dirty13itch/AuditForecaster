import { useState, useEffect, useCallback } from "react";
import {
  ChevronLeft,
  ChevronRight,
  X,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Download,
  Info,
  Star,
  Edit2,
  Maximize2,
  Grid3x3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import type { Photo } from "@shared/schema";

interface PhotoViewerDialogProps {
  photo: Photo;
  photos: Photo[];
  onClose: () => void;
}

export function PhotoViewerDialog({ photo: initialPhoto, photos, onClose }: PhotoViewerDialogProps) {
  const [currentPhoto, setCurrentPhoto] = useState(initialPhoto);
  const [currentIndex, setCurrentIndex] = useState(() => 
    photos.findIndex(p => p.id === initialPhoto.id)
  );
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [showInfo, setShowInfo] = useState(false);
  const [showThumbnails, setShowThumbnails] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Update current photo when index changes
  useEffect(() => {
    if (currentIndex >= 0 && currentIndex < photos.length) {
      setCurrentPhoto(photos[currentIndex]);
      // Reset view state when changing photos
      setZoom(1);
      setRotation(0);
      setPosition({ x: 0, y: 0 });
    }
  }, [currentIndex, photos]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft':
          navigatePrevious();
          break;
        case 'ArrowRight':
          navigateNext();
          break;
        case 'Escape':
          if (isFullscreen) {
            setIsFullscreen(false);
          } else {
            onClose();
          }
          break;
        case '+':
        case '=':
          handleZoomIn();
          break;
        case '-':
          handleZoomOut();
          break;
        case 'r':
          handleRotate();
          break;
        case 'i':
          setShowInfo(!showInfo);
          break;
        case 'f':
          setIsFullscreen(!isFullscreen);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, showInfo, isFullscreen]);

  const navigatePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const navigateNext = () => {
    if (currentIndex < photos.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleZoomIn = () => {
    setZoom(Math.min(zoom * 1.2, 5));
  };

  const handleZoomOut = () => {
    setZoom(Math.max(zoom / 1.2, 0.5));
  };

  const handleRotate = () => {
    setRotation((rotation + 90) % 360);
  };

  const handleDownload = () => {
    window.open(currentPhoto.filePath, '_blank');
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 1) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoom > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      handleZoomIn();
    } else {
      handleZoomOut();
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
  };

  const content = (
    <div className={cn(
      "flex flex-col bg-background",
      isFullscreen && "fixed inset-0 z-50"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between border-b p-3">
        <div className="flex items-center gap-3">
          <h2 className="font-semibold">
            {currentPhoto.caption || `Photo ${currentIndex + 1} of ${photos.length}`}
          </h2>
          {currentPhoto.isFavorite && (
            <Star className="h-5 w-5 fill-yellow-500 text-yellow-500" />
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRotate}
            title="Rotate (R)"
            data-testid="button-rotate"
          >
            <RotateCw className="h-4 w-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={handleZoomOut}
            disabled={zoom <= 0.5}
            title="Zoom Out (-)"
            data-testid="button-zoom-out"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          
          <span className="min-w-[60px] text-center text-sm">
            {Math.round(zoom * 100)}%
          </span>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={handleZoomIn}
            disabled={zoom >= 5}
            title="Zoom In (+)"
            data-testid="button-zoom-in"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          
          <Separator orientation="vertical" className="h-6" />
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowThumbnails(!showThumbnails)}
            title="Toggle Thumbnails"
            data-testid="button-toggle-thumbnails"
          >
            <Grid3x3 className="h-4 w-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowInfo(!showInfo)}
            title="Toggle Info (I)"
            data-testid="button-toggle-info"
          >
            <Info className="h-4 w-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDownload}
            title="Download"
            data-testid="button-download"
          >
            <Download className="h-4 w-4" />
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
          
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            title="Close (ESC)"
            data-testid="button-close"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Image viewer */}
        <div className="relative flex-1 overflow-hidden bg-muted/20">
          {/* Navigation buttons */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-4 top-1/2 z-10 -translate-y-1/2 bg-background/80 backdrop-blur"
            onClick={navigatePrevious}
            disabled={currentIndex === 0}
            data-testid="button-previous"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-1/2 z-10 -translate-y-1/2 bg-background/80 backdrop-blur"
            onClick={navigateNext}
            disabled={currentIndex === photos.length - 1}
            data-testid="button-next"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>

          {/* Image */}
          <div
            className="flex h-full items-center justify-center p-8"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
            style={{ cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
          >
            <img
              src={currentPhoto.filePath}
              alt={currentPhoto.caption || "Photo"}
              className="max-h-full max-w-full object-contain transition-transform"
              style={{
                transform: `scale(${zoom}) rotate(${rotation}deg) translate(${position.x / zoom}px, ${position.y / zoom}px)`,
                imageRendering: zoom > 2 ? 'pixelated' : 'auto',
              }}
              draggable={false}
            />
          </div>
        </div>

        {/* Info panel */}
        {showInfo && (
          <div className="w-80 border-l">
            <ScrollArea className="h-full">
              <div className="p-4 space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Details</h3>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">File Name</dt>
                      <dd className="font-mono text-xs">{currentPhoto.filePath.split('/').pop()}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Size</dt>
                      <dd>{formatFileSize(currentPhoto.fileSize)}</dd>
                    </div>
                    {currentPhoto.width && currentPhoto.height && (
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Dimensions</dt>
                        <dd>{currentPhoto.width} × {currentPhoto.height}</dd>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Uploaded</dt>
                      <dd>{format(new Date(currentPhoto.uploadedAt), "PPp")}</dd>
                    </div>
                    {currentPhoto.location && (
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Location</dt>
                        <dd>{currentPhoto.location}</dd>
                      </div>
                    )}
                  </dl>
                </div>

                {currentPhoto.tags && currentPhoto.tags.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">Tags</h3>
                    <div className="flex flex-wrap gap-2">
                      {currentPhoto.tags.map(tag => (
                        <Badge key={tag} variant="secondary">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {currentPhoto.exifData && (
                  <div>
                    <h3 className="font-semibold mb-2">EXIF Data</h3>
                    <dl className="space-y-2 text-sm">
                      {Object.entries(currentPhoto.exifData).map(([key, value]) => (
                        <div key={key} className="flex justify-between">
                          <dt className="text-muted-foreground">{key}</dt>
                          <dd className="text-xs">{String(value)}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                )}

                {currentPhoto.ocrText && (
                  <div>
                    <h3 className="font-semibold mb-2">OCR Text</h3>
                    <p className="text-sm whitespace-pre-wrap">{currentPhoto.ocrText}</p>
                    {currentPhoto.ocrConfidence && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Confidence: {Math.round(parseFloat(currentPhoto.ocrConfidence) * 100)}%
                      </p>
                    )}
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        )}
      </div>

      {/* Thumbnail strip */}
      {showThumbnails && (
        <div className="border-t">
          <ScrollArea className="h-24">
            <div className="flex gap-2 p-2">
              {photos.map((photo, index) => (
                <button
                  key={photo.id}
                  onClick={() => setCurrentIndex(index)}
                  className={cn(
                    "relative h-20 w-20 flex-shrink-0 overflow-hidden rounded border-2",
                    index === currentIndex
                      ? "border-primary"
                      : "border-transparent hover:border-muted-foreground/50"
                  )}
                  data-testid={`thumbnail-${photo.id}`}
                >
                  <img
                    src={photo.thumbnailPath || photo.filePath}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                  {photo.isFavorite && (
                    <Star className="absolute right-1 top-1 h-3 w-3 fill-yellow-500 text-yellow-500" />
                  )}
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );

  if (isFullscreen) {
    return content;
  }

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-[90vw] max-h-[90vh] p-0">
        {content}
      </DialogContent>
    </Dialog>
  );
}