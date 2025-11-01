import { useState, useMemo } from "react";
import { X, ZoomIn } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { VirtualGrid } from "@/components/ui/virtual-grid";

interface Photo {
  id: string;
  url: string;
  thumbnailPath?: string | null;
  timestamp: string;
  itemNumber?: number;
}

interface VirtualPhotoGalleryProps {
  photos: Photo[];
  onPhotoClick?: (photo: Photo) => void;
  onPhotoDelete?: (photoId: string) => void;
  // Bulk selection props
  selectionMode?: boolean;
  selectedIds?: Set<string>;
  onToggleSelection?: (photoId: string) => void;
  // Virtual scrolling props
  columns?: number;
  height?: string;
  itemHeight?: number;
}

export default function VirtualPhotoGallery({ 
  photos, 
  onPhotoClick, 
  onPhotoDelete,
  selectionMode = false,
  selectedIds = new Set(),
  onToggleSelection,
  columns = 4,
  height = "600px",
  itemHeight = 250,
}: VirtualPhotoGalleryProps) {
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

  const handleImageLoad = (photoId: string) => {
    setLoadedImages(prev => new Set(prev).add(photoId));
  };

  const handleImageError = (photoId: string) => {
    setFailedImages(prev => new Set(prev).add(photoId));
  };

  // Calculate responsive columns based on screen size
  const responsiveColumns = useMemo(() => {
    if (typeof window !== 'undefined') {
      if (window.innerWidth < 640) return 2; // mobile
      if (window.innerWidth < 768) return 3; // tablet
      if (window.innerWidth < 1024) return 4; // desktop
      return columns;
    }
    return columns;
  }, [columns]);

  const renderPhotoCard = (photo: Photo) => {
    const isLoaded = loadedImages.has(photo.id);
    const hasFailed = failedImages.has(photo.id);
    const isSelected = selectedIds.has(photo.id);

    return (
      <Card
        key={photo.id}
        className={`overflow-hidden group relative hover-elevate cursor-pointer transition-all ${
          isSelected ? 'ring-2 ring-primary' : ''
        }`}
        data-testid={`card-photo-${photo.id}`}
      >
        <div className="aspect-square bg-muted relative">
          {/* Shimmer loader while image loads */}
          {!isLoaded && !hasFailed && (
            <div className="absolute inset-0 bg-gradient-to-r from-muted via-muted-foreground/10 to-muted animate-pulse" />
          )}

          {/* Error state */}
          {hasFailed && (
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
              <p className="text-sm">Failed to load</p>
            </div>
          )}

          {/* Main image with native lazy loading - use thumbnail if available */}
          {!hasFailed && (
            <img
              src={photo.thumbnailPath || photo.url}
              alt={`${photo.itemNumber ? `Checklist item ${photo.itemNumber} photo` : 'Inspection photo'} captured on ${photo.timestamp}`}
              className={`w-full h-full object-cover transition-opacity duration-300 ${
                isLoaded ? 'opacity-100' : 'opacity-0'
              }`}
              loading="lazy"
              onLoad={() => handleImageLoad(photo.id)}
              onError={() => handleImageError(photo.id)}
              onClick={() => onPhotoClick?.(photo)}
            />
          )}

          {/* Hover overlay with zoom button */}
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Button
              size="icon"
              variant="ghost"
              className="text-white hover:bg-white/20"
              onClick={(e) => {
                e.stopPropagation();
                onPhotoClick?.(photo);
              }}
              data-testid="button-zoom"
            >
              <ZoomIn className="h-6 w-6" />
            </Button>
          </div>

          {/* Selection checkbox (in selection mode) */}
          {selectionMode && onToggleSelection && (
            <div
              className="absolute top-2 left-2 z-10"
              onClick={(e) => e.stopPropagation()}
            >
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => onToggleSelection(photo.id)}
                className="bg-white"
                data-testid={`checkbox-photo-${photo.id}`}
              />
            </div>
          )}

          {/* Item number badge (moved if in selection mode) */}
          {photo.itemNumber && !selectionMode && (
            <Badge
              variant="secondary"
              className="absolute top-2 left-2 text-xs"
              data-testid="badge-item-number"
            >
              #{photo.itemNumber}
            </Badge>
          )}
          
          {/* Item number badge in selection mode (positioned differently) */}
          {photo.itemNumber && selectionMode && (
            <Badge
              variant="secondary"
              className="absolute top-2 left-12 text-xs"
              data-testid="badge-item-number"
            >
              #{photo.itemNumber}
            </Badge>
          )}

          {/* Delete button */}
          {onPhotoDelete && (
            <Button
              size="icon"
              variant="destructive"
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                onPhotoDelete(photo.id);
              }}
              data-testid="button-delete-photo"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Timestamp */}
        <div className="p-2 text-xs text-muted-foreground">
          {photo.timestamp}
        </div>
      </Card>
    );
  };

  if (photos.length === 0) {
    return (
      <Card className="p-12">
        <div className="text-center text-muted-foreground">
          <p>No photos yet</p>
          <p className="text-sm mt-1">Photos will appear here as you add them to checklist items</p>
        </div>
      </Card>
    );
  }

  return (
    <VirtualGrid
      items={photos}
      columns={responsiveColumns}
      height={height}
      itemHeight={itemHeight}
      renderItem={renderPhotoCard}
      overscan={3}
      gap={16}
      emptyComponent={
        <Card className="p-12">
          <div className="text-center text-muted-foreground">
            <p>No photos yet</p>
            <p className="text-sm mt-1">Photos will appear here as you add them to checklist items</p>
          </div>
        </Card>
      }
    />
  );
}