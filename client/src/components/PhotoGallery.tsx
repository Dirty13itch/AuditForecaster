import { X, ZoomIn } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Photo {
  id: string;
  url: string;
  timestamp: string;
  itemNumber?: number;
}

interface PhotoGalleryProps {
  photos: Photo[];
  onPhotoClick?: (photo: Photo) => void;
  onPhotoDelete?: (photoId: string) => void;
}

export default function PhotoGallery({ photos, onPhotoClick, onPhotoDelete }: PhotoGalleryProps) {
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
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {photos.map((photo) => (
        <Card 
          key={photo.id} 
          className="overflow-hidden group relative hover-elevate cursor-pointer"
          data-testid={`card-photo-${photo.id}`}
        >
          <div className="aspect-square bg-muted relative">
            <img
              src={photo.url}
              alt={`Inspection photo ${photo.id}`}
              className="w-full h-full object-cover"
              onClick={() => onPhotoClick?.(photo)}
            />
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
            {photo.itemNumber && (
              <Badge 
                variant="secondary" 
                className="absolute top-2 left-2 text-xs"
                data-testid="badge-item-number"
              >
                #{photo.itemNumber}
              </Badge>
            )}
            {onPhotoDelete && (
              <Button
                size="icon"
                variant="destructive"
                className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
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
          <div className="p-2">
            <p className="text-xs text-muted-foreground truncate" data-testid="text-timestamp">
              {photo.timestamp}
            </p>
          </div>
        </Card>
      ))}
    </div>
  );
}
