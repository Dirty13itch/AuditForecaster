import { useState, useCallback, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useConfirmDialog } from "@/components/ConfirmDialog";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { 
  Heart,
  Download,
  Trash2,
  Maximize2,
  Eye,
  Copy,
  Edit2,
  MoreVertical,
  Star,
  Tag,
  Info,
  CheckCircle2,
  Circle,
  Grid3x3,
  List,
  Calendar,
  FolderOpen,
  Filter,
  SortAsc,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useBulkSelection } from "@/hooks/use-bulk-selection";
import { BulkOperationsToolbar } from "./BulkOperationsToolbar";
import { PhotoViewerDialog } from "./PhotoViewerDialog";
import type { Photo, PhotoAlbum } from "@shared/schema";

interface EnhancedPhotoGalleryProps {
  jobId?: string;
  checklistItemId?: string;
  initialView?: 'grid' | 'list' | 'albums';
  showFilters?: boolean;
}

interface SortablePhotoProps {
  photo: Photo;
  isSelected: boolean;
  onToggle: (id: string) => void;
  onView: (photo: Photo) => void;
  onQuickAction: (action: string, photo: Photo) => void;
  viewMode: 'grid' | 'list';
}

function SortablePhoto({ photo, isSelected, onToggle, onView, onQuickAction, viewMode }: SortablePhotoProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: photo.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  if (viewMode === 'list') {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          "flex items-center gap-4 p-3 border rounded-lg hover-elevate",
          isSelected && "ring-2 ring-primary",
          isDragging && "cursor-move"
        )}
        {...attributes}
        {...listeners}
      >
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onToggle(photo.id)}
          onClick={(e) => e.stopPropagation()}
          data-testid={`checkbox-photo-${photo.id}`}
        />
        
        <img
          src={photo.thumbnailPath || photo.filePath}
          alt={photo.caption || `Photo from ${format(new Date(photo.uploadedAt), "PPp")}${photo.tags && photo.tags.length > 0 ? `, tagged: ${photo.tags.slice(0, 3).join(', ')}` : ''}`}
          className="h-16 w-16 object-cover rounded"
        />
        
        <div className="flex-1">
          <p className="font-medium">{photo.caption || "Untitled"}</p>
          <p className="text-sm text-muted-foreground">
            {format(new Date(photo.uploadedAt), "PPp")}
          </p>
          <div className="flex gap-2 mt-1">
            {photo.tags?.map(tag => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {photo.isFavorite && <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />}
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onView(photo)}>
                <Eye className="h-4 w-4 mr-2" />
                View
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onQuickAction('favorite', photo)}>
                <Star className="h-4 w-4 mr-2" />
                {photo.isFavorite ? 'Unfavorite' : 'Favorite'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onQuickAction('download', photo)}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onQuickAction('duplicate', photo)}>
                <Copy className="h-4 w-4 mr-2" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => onQuickAction('delete', photo)}
                className="text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    );
  }

  // Grid view
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative aspect-square overflow-hidden rounded-lg border bg-card hover-elevate cursor-pointer",
        isSelected && "ring-2 ring-primary",
        isDragging && "cursor-move"
      )}
      {...attributes}
      {...listeners}
      onClick={() => onView(photo)}
      data-testid={`card-photo-${photo.id}`}
    >
      <img
        src={photo.thumbnailPath || photo.filePath}
        alt={photo.caption || `Photo from ${format(new Date(photo.uploadedAt), "PPp")}${photo.tags && photo.tags.length > 0 ? `, tagged: ${photo.tags.slice(0, 3).join(', ')}` : ''}`}
        className="h-full w-full object-cover"
        loading="lazy"
      />
      
      {/* Selection checkbox */}
      <div className="absolute left-2 top-2 z-10" onClick={(e) => e.stopPropagation()}>
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onToggle(photo.id)}
          className="bg-background/80 backdrop-blur"
          data-testid={`checkbox-photo-${photo.id}`}
        />
      </div>

      {/* Favorite indicator */}
      {photo.isFavorite && (
        <div className="absolute right-2 top-2">
          <Star className="h-5 w-5 fill-yellow-500 text-yellow-500 drop-shadow" />
        </div>
      )}

      {/* Quick actions on hover */}
      <div className="absolute inset-x-0 bottom-0 translate-y-full bg-gradient-to-t from-black/80 to-transparent p-3 transition-transform group-hover:translate-y-0">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-white line-clamp-1">
            {photo.caption || format(new Date(photo.uploadedAt), "PP")}
          </p>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-white hover:bg-white/20"
              onClick={(e) => {
                e.stopPropagation();
                onQuickAction('favorite', photo);
              }}
            >
              <Heart className={cn("h-4 w-4", photo.isFavorite && "fill-current")} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-white hover:bg-white/20"
              onClick={(e) => {
                e.stopPropagation();
                onQuickAction('download', photo);
              }}
            >
              <Download className="h-4 w-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-white hover:bg-white/20"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onQuickAction('info', photo)}>
                  <Info className="h-4 w-4 mr-2" />
                  Details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onQuickAction('edit', photo)}>
                  <Edit2 className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onQuickAction('duplicate', photo)}>
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={(e) => {
                    e.stopPropagation();
                    onQuickAction('delete', photo);
                  }}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        {photo.tags && photo.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {photo.tags.slice(0, 3).map(tag => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
            {photo.tags.length > 3 && (
              <Badge variant="secondary" className="text-xs">
                +{photo.tags.length - 3}
              </Badge>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function EnhancedPhotoGallery({
  jobId,
  checklistItemId,
  initialView = 'grid',
  showFilters = true,
}: EnhancedPhotoGalleryProps) {
  const { toast } = useToast();
  const { showConfirm, ConfirmDialog } = useConfirmDialog();
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'albums'>(initialView);
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'size'>('date');
  const [filterTag, setFilterTag] = useState<string>('');
  const [filterDate, setFilterDate] = useState<string>('');
  const [groupBy, setGroupBy] = useState<'none' | 'date' | 'tag' | 'job'>('none');
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [photoOrder, setPhotoOrder] = useState<string[]>([]);

  const {
    selectedIds,
    isSelected,
    toggleSelection,
    selectAll,
    clearSelection,
  } = useBulkSelection();

  // Fetch photos
  const { data: photos = [], isLoading } = useQuery<Photo[]>({
    queryKey: ['/api/photos', { jobId, checklistItemId }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (jobId) params.append('jobId', jobId);
      if (checklistItemId) params.append('checklistItemId', checklistItemId);
      const response = await fetch(`/api/photos?${params}`);
      if (!response.ok) throw new Error('Failed to fetch photos');
      return response.json();
    },
  });

  // Fetch albums
  const { data: albums = [] } = useQuery<PhotoAlbum[]>({
    queryKey: ['/api/photo-albums'],
    enabled: viewMode === 'albums',
  });

  // Initialize photo order when photos change
  useState(() => {
    if (photos.length > 0 && photoOrder.length === 0) {
      setPhotoOrder(photos.map(p => p.id));
    }
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setPhotoOrder((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleQuickAction = useCallback(async (action: string, photo: Photo) => {
    switch (action) {
      case 'favorite':
        try {
          await apiRequest(`/api/photos/${photo.id}`, {
            method: 'PATCH',
            body: JSON.stringify({ isFavorite: !photo.isFavorite }),
          });
          queryClient.invalidateQueries({ queryKey: ['/api/photos'] });
          toast({
            title: photo.isFavorite ? 'Removed from favorites' : 'Added to favorites',
          });
        } catch (error) {
          toast({
            title: 'Error',
            description: 'Failed to update favorite status',
            variant: 'destructive',
          });
        }
        break;
      
      case 'download':
        window.open(photo.filePath, '_blank');
        break;
      
      case 'delete':
        const confirmed = await showConfirm(
          'Delete Photo',
          'Are you sure you want to delete this photo? This action cannot be undone.',
          {
            confirmText: 'Delete',
            cancelText: 'Cancel',
            variant: 'destructive'
          }
        );
        if (confirmed) {
          try {
            await apiRequest(`/api/photos/${photo.id}`, { method: 'DELETE' });
            queryClient.invalidateQueries({ queryKey: ['/api/photos'] });
            toast({ title: 'Photo deleted' });
          } catch (error) {
            toast({
              title: 'Error',
              description: 'Failed to delete photo',
              variant: 'destructive',
            });
          }
        }
        break;
      
      case 'info':
        setSelectedPhoto(photo);
        break;
    }
  }, [toast]);

  // Filter and sort photos
  const processedPhotos = photos
    .filter(photo => {
      if (filterTag && !photo.tags?.includes(filterTag)) return false;
      if (filterDate) {
        const photoDate = format(new Date(photo.uploadedAt), 'yyyy-MM-dd');
        if (photoDate !== filterDate) return false;
      }
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return (a.caption || '').localeCompare(b.caption || '');
        case 'size':
          return (b.fileSize || 0) - (a.fileSize || 0);
        default:
          return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime();
      }
    });

  // Group photos if needed
  const groupedPhotos = groupBy === 'none' ? { 'All Photos': processedPhotos } : 
    processedPhotos.reduce((groups, photo) => {
      let key = '';
      switch (groupBy) {
        case 'date':
          key = format(new Date(photo.uploadedAt), 'PP');
          break;
        case 'tag':
          key = photo.tags?.[0] || 'Untagged';
          break;
        case 'job':
          key = photo.jobId || 'No Job';
          break;
      }
      if (!groups[key]) groups[key] = [];
      groups[key].push(photo);
      return groups;
    }, {} as Record<string, Photo[]>);

  return (
    <div className="flex h-full flex-col">
      {/* Bulk operations toolbar */}
      <BulkOperationsToolbar
        photos={processedPhotos}
        selectedCount={selectedIds.size}
        selectedIds={selectedIds}
        onClearSelection={clearSelection}
        onSelectAll={() => selectAll(processedPhotos.map(p => p.id))}
        isAllSelected={selectedIds.size === processedPhotos.length && processedPhotos.length > 0}
      />

      {/* Filters and controls */}
      {showFilters && (
        <div className="border-b p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              {/* View mode toggle */}
              <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)}>
                <TabsList>
                  <TabsTrigger value="grid">
                    <Grid3x3 className="h-4 w-4" />
                  </TabsTrigger>
                  <TabsTrigger value="list">
                    <List className="h-4 w-4" />
                  </TabsTrigger>
                  <TabsTrigger value="albums">
                    <FolderOpen className="h-4 w-4" />
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              {/* Sort */}
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
                <SelectTrigger className="w-32" data-testid="select-sort">
                  <SortAsc className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="size">Size</SelectItem>
                </SelectContent>
              </Select>

              {/* Group by */}
              <Select value={groupBy} onValueChange={(v) => setGroupBy(v as any)}>
                <SelectTrigger className="w-32" data-testid="select-group">
                  <SelectValue placeholder="Group by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No grouping</SelectItem>
                  <SelectItem value="date">By Date</SelectItem>
                  <SelectItem value="tag">By Tag</SelectItem>
                  <SelectItem value="job">By Job</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              {/* Tag filter */}
              <Input
                placeholder="Filter by tag"
                value={filterTag}
                onChange={(e) => setFilterTag(e.target.value)}
                className="w-40"
                data-testid="input-filter-tag"
              />

              {/* Date filter */}
              <Input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="w-40"
                data-testid="input-filter-date"
              />
            </div>
          </div>
        </div>
      )}

      {/* Photo content */}
      <ScrollArea className="flex-1">
        {viewMode === 'albums' ? (
          <div className="p-4 grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {albums.map(album => (
              <Card key={album.id} className="p-4 hover-elevate cursor-pointer">
                <h3 className="font-semibold">{album.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">{album.description}</p>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span>{album.photoCount || 0} photos</span>
                  <span>{format(new Date(album.createdAt), 'PP')}</span>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <div className="p-4">
              {Object.entries(groupedPhotos).map(([group, photos]) => (
                <div key={group} className="mb-6">
                  {groupBy !== 'none' && (
                    <h3 className="font-semibold mb-3">{group}</h3>
                  )}
                  
                  <SortableContext
                    items={photos.map(p => p.id)}
                    strategy={viewMode === 'list' ? verticalListSortingStrategy : rectSortingStrategy}
                  >
                    {viewMode === 'list' ? (
                      <div className="space-y-2">
                        {photos.map(photo => (
                          <SortablePhoto
                            key={photo.id}
                            photo={photo}
                            isSelected={isSelected(photo.id)}
                            onToggle={toggleSelection}
                            onView={setSelectedPhoto}
                            onQuickAction={handleQuickAction}
                            viewMode={viewMode}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                        {photos.map(photo => (
                          <SortablePhoto
                            key={photo.id}
                            photo={photo}
                            isSelected={isSelected(photo.id)}
                            onToggle={toggleSelection}
                            onView={setSelectedPhoto}
                            onQuickAction={handleQuickAction}
                            viewMode={viewMode}
                          />
                        ))}
                      </div>
                    )}
                  </SortableContext>
                </div>
              ))}
            </div>
          </DndContext>
        )}
      </ScrollArea>

      {/* Photo viewer dialog */}
      {selectedPhoto && (
        <PhotoViewerDialog
          photo={selectedPhoto}
          photos={processedPhotos}
          onClose={() => setSelectedPhoto(null)}
        />
      )}
      <ConfirmDialog />
    </div>
  );
}