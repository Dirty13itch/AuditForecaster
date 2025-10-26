import { useState, useRef, useEffect } from "react";
import { useInfiniteQuery, useQuery, useMutation } from "@tanstack/react-query";
import { ArrowLeft, Camera, Filter, X, FilterX, CheckSquare, Square, WifiOff, CloudUpload, Compare, Star, FolderOpen } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import TopBar from "@/components/TopBar";
import PhotoGallery from "@/components/PhotoGallery";
import BottomNav from "@/components/BottomNav";
import { ObjectUploader } from "@/components/ObjectUploader";
import { PhotoCleanupBanner } from "@/components/PhotoCleanupBanner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useBulkSelection } from "@/hooks/use-bulk-selection";
import { SelectionToolbar, commonBulkActions } from "@/components/SelectionToolbar";
import { BulkDeleteDialog, BulkTagDialog, BulkExportDialog, type TagOperationMode, type ExportFormat } from "@/components/BulkActionDialogs";
import { EnhancedPhotoGallery } from "@/components/photos/EnhancedPhotoGallery";
import { PhotoComparisonTool } from "@/components/photos/PhotoComparisonTool";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { indexedDB } from "@/utils/indexedDB";
import { syncQueue } from "@/utils/syncQueue";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TAG_CATEGORIES,
  INSPECTION_TAGS,
  STATUS_TAGS,
  PRIORITY_TAGS,
  LOCATION_TAGS,
  getTagConfig,
  getCategoryLabel,
  type PhotoTag,
} from "@shared/photoTags";
import type { Job } from "@shared/schema";

export default function Photos() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "inspection" | "photos" | "forecast">("photos");
  const { toast } = useToast();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingUploads, setPendingUploads] = useState<number>(0);
  
  // View mode state
  const [viewMode, setViewMode] = useState<"classic" | "enhanced" | "comparison">("enhanced");
  const [showComparisonTool, setShowComparisonTool] = useState(false);
  
  // Filter states
  const [selectedTags, setSelectedTags] = useState<PhotoTag[]>([]);
  const [jobFilter, setJobFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [filterItem, setFilterItem] = useState("all");
  
  // Bulk selection state
  const [selectionMode, setSelectionMode] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showTagDialog, setShowTagDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  
  // Upload modal state
  const [showUploadModal, setShowUploadModal] = useState(false);
  
  const loadMoreRef = useRef<HTMLDivElement>(null);
  
  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast({
        title: "Back online",
        description: "Uploading pending photos...",
      });
      syncQueue.processQueue();
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      toast({
        title: "Working offline",
        description: "Photos will be uploaded when back online",
        variant: "default",
      });
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [toast]);
  
  // Track pending uploads
  useEffect(() => {
    const checkPendingUploads = async () => {
      const queue = await syncQueue.getQueue();
      const photoUploads = queue.filter(item => 
        item.url.includes('/api/photos') && item.method === 'POST'
      );
      setPendingUploads(photoUploads.length);
    };
    
    checkPendingUploads();
    const interval = setInterval(checkPendingUploads, 3000);
    
    return () => clearInterval(interval);
  }, []);

  // Query for jobs to populate job filter (paginated with reasonable limit for dropdown)
  const { data: jobsData } = useQuery({
    queryKey: ["/api/jobs-paginated"],
    queryFn: async () => {
      const res = await fetch("/api/jobs?limit=200&offset=0", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch jobs");
      return res.json();
    },
  });
  
  const jobs = jobsData?.data ?? [];

  // Infinite query for photos with cursor-based pagination and filtering
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
  } = useInfiniteQuery({
    queryKey: ['/api/photos-cursor', selectedTags, jobFilter, dateFrom, dateTo, filterItem],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      // Build query string with filters and cursor
      const params = new URLSearchParams({
        limit: '50',
        sortOrder: 'desc',
      });
      
      // Add cursor for pagination (if not first page)
      if (pageParam) {
        params.append('cursor', pageParam);
      }
      
      // Add filter parameters
      if (selectedTags.length > 0) {
        params.append('tags', selectedTags.join(','));
      }
      if (jobFilter !== 'all') {
        params.append('jobId', jobFilter);
      }
      if (dateFrom) {
        params.append('dateFrom', dateFrom);
      }
      if (dateTo) {
        params.append('dateTo', dateTo);
      }
      if (filterItem !== 'all') {
        params.append('checklistItemId', filterItem);
      }
      
      const res = await fetch(`/api/photos?${params.toString()}`, {
        credentials: 'include',
      });
      
      if (!res.ok) {
        throw new Error(`Failed to fetch photos: ${res.statusText}`);
      }
      
      return await res.json();
    },
    getNextPageParam: (lastPage: any) => {
      // Cursor-based pagination: use nextCursor from response
      return lastPage.hasMore ? lastPage.nextCursor : undefined;
    },
  });

  // Auto-load more photos when user scrolls near bottom
  useEffect(() => {
    if (!loadMoreRef.current) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Flatten all pages into single array
  const allPhotos = data?.pages.flatMap(page => page.data) ?? [];

  // Transform to PhotoGallery format
  const photos = allPhotos.map(photo => ({
    id: photo.id,
    url: photo.fullUrl ?? photo.url ?? '',
    thumbnailPath: photo.thumbnailPath,
    timestamp: new Date(photo.uploadedAt).toLocaleString(),
    itemNumber: photo.checklistItemId ? parseInt(photo.checklistItemId) : undefined,
  }));

  // Bulk selection hook (only active in selection mode)
  const photoIds = photos.map(p => p.id);
  const { metadata, actions, selectedIds } = useBulkSelection(photoIds);

  // Get unique checklist item numbers from all fetched photos for dynamic filter
  const uniqueItems = Array.from(new Set(photos.map(p => p.itemNumber).filter((n): n is number => n !== undefined))).sort((a, b) => a - b);

  // Total photos loaded so far (cursor-based pagination doesn't provide total count)
  const totalPhotos = photos.length;

  const handleToggleTag = (tag: PhotoTag) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleClearFilters = () => {
    setSelectedTags([]);
    setJobFilter("all");
    setDateFrom("");
    setDateTo("");
    setFilterItem("all");
  };

  const hasActiveFilters = selectedTags.length > 0 || jobFilter !== "all" || dateFrom || dateTo || filterItem !== "all";

  // Bulk delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const response = await apiRequest("/api/photos/bulk", {
        method: "DELETE",
        body: JSON.stringify({ ids }),
      });
      return response;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/photos-cursor'] });
      toast({
        title: "Photos deleted",
        description: `Successfully deleted ${data.deleted} of ${data.total} photos`,
      });
      setShowDeleteDialog(false);
      actions.deselectAll();
    },
    onError: (error: Error) => {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Bulk tag mutation
  const tagMutation = useMutation({
    mutationFn: async ({ ids, mode, tags }: { ids: string[], mode: TagOperationMode, tags: string[] }) => {
      const response = await apiRequest("/api/photos/bulk-tag", {
        method: "POST",
        body: JSON.stringify({ ids, mode, tags }),
      });
      return response;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/photos-cursor'] });
      const modeLabel = data.mode === 'add' ? 'added to' : data.mode === 'remove' ? 'removed from' : 'replaced on';
      toast({
        title: "Tags updated",
        description: `Successfully ${modeLabel} ${data.updated} of ${data.total} photos`,
      });
      setShowTagDialog(false);
      actions.deselectAll();
    },
    onError: (error: Error) => {
      toast({
        title: "Tag update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Bulk export mutation
  const exportMutation = useMutation({
    mutationFn: async ({ ids, format }: { ids: string[], format: ExportFormat }) => {
      const response = await fetch("/api/photos/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ids, format }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Export failed");
      }
      
      // Branch before consuming response body
      if (format === 'csv') {
        // For CSV, download the blob directly
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `photos-export-${Date.now()}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        // Can't easily parse CSV count, use IDs length as approximation
        return { format, count: ids.length };
      }
      
      // JSON format - parse the response to get actual count
      const data = await response.json();
      const count = Array.isArray(data) ? data.length : ids.length;
      
      // Trigger download of JSON
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `photos-export-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      return { format, count };
    },
    onSuccess: (data) => {
      toast({
        title: "Export complete",
        description: `Exported ${data.count} photos as ${data.format.toUpperCase()}`,
      });
      setShowExportDialog(false);
      actions.deselectAll();
    },
    onError: (error: Error) => {
      toast({
        title: "Export failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Bulk action handlers
  const handleBulkDelete = () => {
    deleteMutation.mutate(Array.from(selectedIds));
  };

  const handleBulkTag = (mode: TagOperationMode, tags: string[]) => {
    tagMutation.mutate({ ids: Array.from(selectedIds), mode, tags });
  };

  const handleBulkExport = (format: ExportFormat) => {
    exportMutation.mutate({ ids: Array.from(selectedIds), format });
  };

  // Toggle selection mode and clear selection when exiting
  const toggleSelectionMode = () => {
    if (selectionMode) {
      actions.deselectAll();
    }
    setSelectionMode(!selectionMode);
  };

  if (isError) {
    return (
      <div className="min-h-screen bg-background pb-20 md:pb-6">
        <TopBar title="Inspection Photos" isOnline={false} pendingSync={3} />
        <main className="pt-20 px-4 md:px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="text-center text-destructive p-8">
            Failed to load photos. Please try again.
          </div>
        </main>
        <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-6">
      <TopBar 
        title="Inspection Photos"
        isOnline={false}
        pendingSync={3}
      />
      
      <main className="pt-20 px-4 md:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="space-y-6">
          <PhotoCleanupBanner />
          
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <h2 className="text-xl font-bold" data-testid="text-page-title">Inspection Photos</h2>
              {!isLoading && (
                <p className="text-sm text-muted-foreground">
                  Showing {photos.length} of {totalPhotos} photo{totalPhotos !== 1 ? 's' : ''}
                </p>
              )}
            </div>
            <Button 
              onClick={() => setShowUploadModal(true)}
              data-testid="button-add-photo"
            >
              <Camera className="h-4 w-4 mr-2" />
              Take Photo
            </Button>
            <Button
              variant={selectionMode ? "default" : "outline"}
              onClick={toggleSelectionMode}
              data-testid="button-toggle-selection"
            >
              {selectionMode ? (
                <>
                  <CheckSquare className="h-4 w-4 mr-2" />
                  Exit Select
                </>
              ) : (
                <>
                  <Square className="h-4 w-4 mr-2" />
                  Select
                </>
              )}
            </Button>
          </div>

          {/* Selection Toolbar (shows when items selected) */}
          {selectionMode && metadata.hasSelection && (
            <SelectionToolbar
              selectedCount={metadata.selectedCount}
              totalCount={metadata.totalCount}
              entityName="photos"
              onClear={actions.deselectAll}
              actions={[
                commonBulkActions.tag(() => setShowTagDialog(true)),
                commonBulkActions.export(() => setShowExportDialog(true)),
                commonBulkActions.delete(() => setShowDeleteDialog(true)),
              ]}
            />
          )}

          {/* Filters Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <Filter className="h-5 w-5 text-muted-foreground" />
                  <CardTitle>Filters & Search</CardTitle>
                </div>
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearFilters}
                    data-testid="button-clear-filters"
                  >
                    <FilterX className="h-4 w-4 mr-2" />
                    Clear All
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Tag filters */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Filter by Tags</Label>
                
                {/* Inspection Tags */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">
                    {getCategoryLabel(TAG_CATEGORIES.INSPECTION)}
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {INSPECTION_TAGS.map((tag) => {
                      const config = getTagConfig(tag);
                      const isSelected = selectedTags.includes(tag);
                      return (
                        <Badge
                          key={tag}
                          variant={isSelected ? "default" : "outline"}
                          className="cursor-pointer hover-elevate active-elevate-2"
                          onClick={() => handleToggleTag(tag)}
                          data-testid={`tag-filter-${tag}`}
                        >
                          {config?.label}
                          {isSelected && <X className="h-3 w-3 ml-1" />}
                        </Badge>
                      );
                    })}
                  </div>
                </div>

                {/* Status Tags */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">
                    {getCategoryLabel(TAG_CATEGORIES.STATUS)}
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {STATUS_TAGS.map((tag) => {
                      const config = getTagConfig(tag);
                      const isSelected = selectedTags.includes(tag);
                      return (
                        <Badge
                          key={tag}
                          variant={isSelected ? "default" : "outline"}
                          className="cursor-pointer hover-elevate active-elevate-2"
                          onClick={() => handleToggleTag(tag)}
                          data-testid={`tag-filter-${tag}`}
                        >
                          {config?.label}
                          {isSelected && <X className="h-3 w-3 ml-1" />}
                        </Badge>
                      );
                    })}
                  </div>
                </div>

                {/* Priority Tags */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">
                    {getCategoryLabel(TAG_CATEGORIES.PRIORITY)}
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {PRIORITY_TAGS.map((tag) => {
                      const config = getTagConfig(tag);
                      const isSelected = selectedTags.includes(tag);
                      return (
                        <Badge
                          key={tag}
                          variant={isSelected ? "default" : "outline"}
                          className="cursor-pointer hover-elevate active-elevate-2"
                          onClick={() => handleToggleTag(tag)}
                          data-testid={`tag-filter-${tag}`}
                        >
                          {config?.label}
                          {isSelected && <X className="h-3 w-3 ml-1" />}
                        </Badge>
                      );
                    })}
                  </div>
                </div>

                {/* Location Tags */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">
                    {getCategoryLabel(TAG_CATEGORIES.LOCATION)}
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {LOCATION_TAGS.map((tag) => {
                      const config = getTagConfig(tag);
                      const isSelected = selectedTags.includes(tag);
                      return (
                        <Badge
                          key={tag}
                          variant={isSelected ? "default" : "outline"}
                          className="cursor-pointer hover-elevate active-elevate-2"
                          onClick={() => handleToggleTag(tag)}
                          data-testid={`tag-filter-${tag}`}
                        >
                          {config?.label}
                          {isSelected && <X className="h-3 w-3 ml-1" />}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Job, Date, and Item filters */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="job-filter" className="text-sm">Job</Label>
                  <Select value={jobFilter} onValueChange={setJobFilter}>
                    <SelectTrigger id="job-filter" data-testid="select-job-filter">
                      <SelectValue placeholder="All Jobs" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Jobs</SelectItem>
                      {jobs.map((job) => (
                        <SelectItem key={job.id} value={job.id}>
                          {job.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="date-from" className="text-sm">Date From</Label>
                  <Input
                    id="date-from"
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    data-testid="input-date-from"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="date-to" className="text-sm">Date To</Label>
                  <Input
                    id="date-to"
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    data-testid="input-date-to"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="item-filter" className="text-sm">Checklist Item</Label>
                  <Select value={filterItem} onValueChange={setFilterItem}>
                    <SelectTrigger id="item-filter" data-testid="select-item-filter">
                      <SelectValue placeholder="All Items" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Items</SelectItem>
                      {uniqueItems.map((itemNum) => (
                        <SelectItem key={itemNum} value={itemNum.toString()}>
                          Item #{itemNum}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Active filters summary */}
              {hasActiveFilters && (
                <div className="flex flex-wrap gap-2 pt-2 border-t">
                  <span className="text-sm text-muted-foreground">Active filters:</span>
                  {selectedTags.map(tag => {
                    const config = getTagConfig(tag);
                    return (
                      <Badge key={tag} variant="secondary" className="gap-1">
                        {config?.label}
                        <X 
                          className="h-3 w-3 cursor-pointer" 
                          onClick={() => handleToggleTag(tag)}
                        />
                      </Badge>
                    );
                  })}
                  {jobFilter !== "all" && (
                    <Badge variant="secondary" className="gap-1">
                      Job: {jobs.find(j => j.id === jobFilter)?.name}
                      <X 
                        className="h-3 w-3 cursor-pointer" 
                        onClick={() => setJobFilter("all")}
                      />
                    </Badge>
                  )}
                  {dateFrom && (
                    <Badge variant="secondary" className="gap-1">
                      From: {dateFrom}
                      <X 
                        className="h-3 w-3 cursor-pointer" 
                        onClick={() => setDateFrom("")}
                      />
                    </Badge>
                  )}
                  {dateTo && (
                    <Badge variant="secondary" className="gap-1">
                      To: {dateTo}
                      <X 
                        className="h-3 w-3 cursor-pointer" 
                        onClick={() => setDateTo("")}
                      />
                    </Badge>
                  )}
                  {filterItem !== "all" && (
                    <Badge variant="secondary" className="gap-1">
                      Item #{filterItem}
                      <X 
                        className="h-3 w-3 cursor-pointer" 
                        onClick={() => setFilterItem("all")}
                      />
                    </Badge>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Loading skeleton for initial load */}
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <Skeleton key={i} className="aspect-square" />
              ))}
            </div>
          ) : photos.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Camera className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2" data-testid="text-no-results">
                  No photos found
                </h3>
                <p className="text-sm text-muted-foreground text-center max-w-md">
                  {hasActiveFilters 
                    ? "Try adjusting your filters to see more photos" 
                    : "No photos have been uploaded yet"}
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <PhotoGallery
                photos={photos}
                onPhotoClick={(photo) => {}}
                onPhotoDelete={(id) => {}}
                selectionMode={selectionMode}
                selectedIds={metadata.selectedIds}
                onToggleSelection={actions.toggle}
              />

              {/* Intersection observer trigger */}
              <div ref={loadMoreRef} className="h-10" />

              {/* Load more button (fallback) */}
              {hasNextPage && (
                <div className="flex justify-center pt-4">
                  <Button
                    onClick={() => fetchNextPage()}
                    disabled={isFetchingNextPage}
                    variant="outline"
                    data-testid="button-load-more"
                  >
                    {isFetchingNextPage ? "Loading..." : "Load More Photos"}
                  </Button>
                </div>
              )}

              {/* Loading indicator for next page */}
              {isFetchingNextPage && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pt-4">
                  {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} className="aspect-square" />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Bulk Action Dialogs */}
      <BulkDeleteDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={handleBulkDelete}
        selectedCount={metadata.selectedCount}
        entityName="photos"
        isPending={deleteMutation.isPending}
        warningMessage="This will also remove associated annotations and OCR data."
      />

      <BulkTagDialog
        open={showTagDialog}
        onOpenChange={setShowTagDialog}
        onConfirm={handleBulkTag}
        selectedCount={metadata.selectedCount}
        isPending={tagMutation.isPending}
      />

      <BulkExportDialog
        open={showExportDialog}
        onOpenChange={setShowExportDialog}
        onConfirm={handleBulkExport}
        selectedCount={metadata.selectedCount}
        entityName="photos"
        isPending={exportMutation.isPending}
      />

      {/* Photo Upload Modal */}
      <ObjectUploader
        open={showUploadModal}
        onOpenChange={setShowUploadModal}
        onUploadComplete={() => {
          queryClient.invalidateQueries({ queryKey: ['/api/photos-cursor'] });
          setShowUploadModal(false);
        }}
        bucketPath="photos"
        enableWebcam={true}
        enableCompression={true}
        compressionQuality={0.8}
        maxImageSizeKB={500}
      />

      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}
