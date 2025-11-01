import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useInfiniteQuery, useQuery, useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowLeft, Camera, Filter, X, FilterX, CheckSquare, Square, WifiOff, CloudUpload, Compare, Star, FolderOpen, AlertCircle, RefreshCw } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import TopBar from "@/components/TopBar";
import PhotoGallery from "@/components/PhotoGallery";
import BottomNav from "@/components/BottomNav";
import { ObjectUploader } from "@/components/ObjectUploader";
import { PhotoCleanupBanner } from "@/components/PhotoCleanupBanner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fadeInUp, scaleIn } from "@/lib/animations";
import { useBulkSelection } from "@/hooks/use-bulk-selection";
import { SelectionToolbar, commonBulkActions } from "@/components/SelectionToolbar";
import { BulkDeleteDialog, BulkTagDialog, BulkExportDialog, type TagOperationMode, type ExportFormat } from "@/components/BulkActionDialogs";
import { EnhancedPhotoGallery } from "@/components/photos/EnhancedPhotoGallery";
import { PhotoComparisonTool } from "@/components/photos/PhotoComparisonTool";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { indexedDB } from "@/utils/indexedDB";
import { syncQueue } from "@/utils/syncQueue";
import { VirtualGrid } from "@/components/ui/virtual-grid";
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

// Phase 3 - OPTIMIZE: Module-level constants prevent recreation on every render
// Sync check interval for pending uploads
const SYNC_CHECK_INTERVAL = 3000;

// Pagination defaults
const PHOTOS_PER_PAGE = 50;
const INFINITE_SCROLL_THRESHOLD = 0.1;

// Skeleton counts for loading states
const SKELETON_COUNTS = {
  initialGrid: 8,
  loadMoreGrid: 4,
} as const;

// Phase 2 - BUILD: PhotosContent component wrapped in ErrorBoundary at export
function PhotosContent() {
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
  
  /**
   * Phase 3 - OPTIMIZE: Memoized callback prevents recreation on every render
   * 
   * Business Logic - Online/Offline Status Monitoring:
   * - Listens for browser online/offline events
   * - Shows toast notifications to user about connectivity changes
   * - Triggers sync queue processing when coming back online
   * - Critical for field inspectors with intermittent connectivity
   */
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
    
    // Phase 3 - OPTIMIZE: Cleanup function prevents memory leak
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [toast]);
  
  /**
   * Phase 3 - OPTIMIZE: Memoized callback for pending upload check
   * Scans offline sync queue for pending photo uploads and updates UI badge count
   */
  const checkPendingUploads = useCallback(async () => {
    const queue = await syncQueue.getQueue();
    const photoUploads = queue.filter(item => 
      item.url.includes('/api/photos') && item.method === 'POST'
    );
    setPendingUploads(photoUploads.length);
  }, []);

  /**
   * Track pending uploads - polls sync queue every 3 seconds
   * Shows count of photos waiting to upload in offline mode
   */
  useEffect(() => {
    checkPendingUploads();
    // Phase 3 - OPTIMIZE: Use constant for interval duration
    const interval = setInterval(checkPendingUploads, SYNC_CHECK_INTERVAL);
    
    // Phase 3 - OPTIMIZE: Cleanup function prevents memory leak
    return () => clearInterval(interval);
  }, [checkPendingUploads]);

  // Phase 5 - HARDEN: Query for jobs with retry: 2 for resilience
  const { 
    data: jobsData,
    isLoading: isLoadingJobs,
    error: jobsError,
    refetch: refetchJobs
  } = useQuery({
    queryKey: ["/api/jobs-paginated"],
    queryFn: async () => {
      const res = await fetch("/api/jobs?limit=200&offset=0", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch jobs");
      return res.json();
    },
    retry: 2, // Retry failed requests twice before showing error
  });
  
  const jobs = jobsData?.data ?? [];

  // Phase 5 - HARDEN: Infinite query for photos with retry: 2 and proper error handling
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
    refetch: refetchPhotos,
  } = useInfiniteQuery({
    queryKey: ['/api/photos-cursor', selectedTags, jobFilter, dateFrom, dateTo, filterItem],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      // Build query string with filters and cursor
      const params = new URLSearchParams({
        limit: PHOTOS_PER_PAGE.toString(),
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
    retry: 2, // Retry failed requests twice before showing error
  });

  /**
   * Auto-load more photos when user scrolls near bottom
   * Uses IntersectionObserver for efficient scroll detection
   */
  useEffect(() => {
    if (!loadMoreRef.current) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: INFINITE_SCROLL_THRESHOLD }
    );

    observer.observe(loadMoreRef.current);
    
    // Phase 3 - OPTIMIZE: Cleanup function prevents memory leak
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Phase 3 - OPTIMIZE: Memoized photo transformation
  // Flatten all pages and transform to PhotoGallery format
  const allPhotos = useMemo(() => data?.pages.flatMap(page => page.data) ?? [], [data]);

  // Phase 3 - OPTIMIZE: Memoized photo format transformation
  const photos = useMemo(() => allPhotos.map(photo => ({
    id: photo.id,
    url: photo.fullUrl ?? photo.url ?? '',
    thumbnailPath: photo.thumbnailPath,
    timestamp: new Date(photo.uploadedAt).toLocaleString(),
    itemNumber: photo.checklistItemId ? parseInt(photo.checklistItemId) : undefined,
  })), [allPhotos]);

  // Bulk selection hook (only active in selection mode)
  const photoIds = useMemo(() => photos.map(p => p.id), [photos]);
  const { metadata, actions, selectedIds } = useBulkSelection(photoIds);

  // Phase 3 - OPTIMIZE: Memoized unique checklist items extraction
  const uniqueItems = useMemo(() => 
    Array.from(new Set(photos.map(p => p.itemNumber).filter((n): n is number => n !== undefined))).sort((a, b) => a - b),
    [photos]
  );

  // Total photos loaded so far (cursor-based pagination doesn't provide total count)
  const totalPhotos = photos.length;

  // Phase 3 - OPTIMIZE: Memoized active filter check
  const hasActiveFilters = useMemo(() => 
    selectedTags.length > 0 || jobFilter !== "all" || dateFrom || dateTo || filterItem !== "all",
    [selectedTags.length, jobFilter, dateFrom, dateTo, filterItem]
  );

  /**
   * Phase 3 - OPTIMIZE: useCallback for tag toggle handler
   * Prevents recreation on every render
   */
  const handleToggleTag = useCallback((tag: PhotoTag) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  }, []);

  /**
   * Phase 3 - OPTIMIZE: useCallback for clear filters handler
   */
  const handleClearFilters = useCallback(() => {
    setSelectedTags([]);
    setJobFilter("all");
    setDateFrom("");
    setDateTo("");
    setFilterItem("all");
  }, []);

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

  /**
   * Phase 3 - OPTIMIZE: useCallback for bulk action handlers
   */
  const handleBulkDelete = useCallback(() => {
    deleteMutation.mutate(Array.from(selectedIds));
  }, [deleteMutation, selectedIds]);

  const handleBulkTag = useCallback((mode: TagOperationMode, tags: string[]) => {
    tagMutation.mutate({ ids: Array.from(selectedIds), mode, tags });
  }, [tagMutation, selectedIds]);

  const handleBulkExport = useCallback((format: ExportFormat) => {
    exportMutation.mutate({ ids: Array.from(selectedIds), format });
  }, [exportMutation, selectedIds]);

  /**
   * Phase 3 - OPTIMIZE: useCallback for selection mode toggle
   * Clears selection when exiting selection mode
   */
  const toggleSelectionMode = useCallback(() => {
    if (selectionMode) {
      actions.deselectAll();
    }
    setSelectionMode(!selectionMode);
  }, [selectionMode, actions]);

  /**
   * Phase 3 - OPTIMIZE: useCallback for filter change handlers
   */
  const handleJobFilterChange = useCallback((value: string) => {
    setJobFilter(value);
  }, []);

  const handleDateFromChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setDateFrom(e.target.value);
  }, []);

  const handleDateToChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setDateTo(e.target.value);
  }, []);

  const handleItemFilterChange = useCallback((value: string) => {
    setFilterItem(value);
  }, []);

  /**
   * Phase 5 - HARDEN: Retry handler for photos query errors
   */
  const handleRetryPhotos = useCallback(() => {
    refetchPhotos();
  }, [refetchPhotos]);

  /**
   * Phase 5 - HARDEN: Retry handler for jobs query errors
   */
  const handleRetryJobs = useCallback(() => {
    refetchJobs();
  }, [refetchJobs]);

  /**
   * Phase 2 - BUILD: Comprehensive error state with retry button
   * Shows when photo query fails after retry attempts
   */
  if (isError) {
    return (
      <div className="min-h-screen bg-background pb-20 md:pb-6">
        <TopBar title="Inspection Photos" isOnline={isOnline} pendingSync={pendingUploads} />
        <main className="pt-20 px-4 md:px-6 lg:px-8 max-w-7xl mx-auto">
          <Card className="border-red-600/20 bg-red-50/50 dark:bg-red-900/10" data-testid="error-photos-query">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="h-12 w-12 text-red-600 dark:text-red-400 mb-4" />
              <h3 className="text-lg font-semibold text-red-900 dark:text-red-300 mb-2">Failed to Load Photos</h3>
              <p className="text-sm text-red-800 dark:text-red-400 mb-4 text-center max-w-md">
                {error instanceof Error ? error.message : "Unable to fetch photos. Please check your connection and try again."}
              </p>
              <Button 
                onClick={handleRetryPhotos}
                variant="outline"
                data-testid="button-retry-photos"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry
              </Button>
            </CardContent>
          </Card>
        </main>
        <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-6">
      <TopBar 
        title="Inspection Photos"
        isOnline={isOnline}
        pendingSync={pendingUploads}
      />
      
      <main className="pt-20 px-4 md:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="space-y-6">
          <PhotoCleanupBanner />
          
          <div className="flex items-center gap-4 flex-wrap">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1 min-w-[200px]">
              <h2 className="text-xl font-bold" data-testid="text-page-title">Inspection Photos</h2>
              {!isLoading && (
                <p className="text-sm text-muted-foreground" data-testid="text-photo-count">
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
              data-testid="toolbar-selection"
            />
          )}

          {/* Filters Card */}
          <Card data-testid="card-filters">
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
                  <div className="flex flex-wrap gap-2" data-testid="container-inspection-tags">
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
                  <div className="flex flex-wrap gap-2" data-testid="container-status-tags">
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
                  <div className="flex flex-wrap gap-2" data-testid="container-priority-tags">
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
                  <div className="flex flex-wrap gap-2" data-testid="container-location-tags">
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
                  {isLoadingJobs ? (
                    <Skeleton className="h-12 w-full" data-testid="skeleton-job-filter" />
                  ) : jobsError ? (
                    <Alert className="p-2" data-testid="error-job-filter">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="text-xs">
                        Failed to load jobs
                        <Button size="sm" variant="ghost" onClick={handleRetryJobs} className="ml-2">
                          <RefreshCw className="h-3 w-3" />
                        </Button>
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <Select value={jobFilter} onValueChange={handleJobFilterChange}>
                      <SelectTrigger id="job-filter" data-testid="select-job-filter">
                        <SelectValue placeholder="All Jobs" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Jobs</SelectItem>
                        {jobs.map((job) => (
                          <SelectItem key={job.id} value={job.id} data-testid={`option-job-${job.id}`}>
                            {job.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="date-from" className="text-sm">Date From</Label>
                  <Input
                    id="date-from"
                    type="date"
                    value={dateFrom}
                    onChange={handleDateFromChange}
                    data-testid="input-date-from"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="date-to" className="text-sm">Date To</Label>
                  <Input
                    id="date-to"
                    type="date"
                    value={dateTo}
                    onChange={handleDateToChange}
                    data-testid="input-date-to"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="item-filter" className="text-sm">Checklist Item</Label>
                  <Select value={filterItem} onValueChange={handleItemFilterChange}>
                    <SelectTrigger id="item-filter" data-testid="select-item-filter">
                      <SelectValue placeholder="All Items" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Items</SelectItem>
                      {uniqueItems.map((itemNum) => (
                        <SelectItem key={itemNum} value={itemNum.toString()} data-testid={`option-item-${itemNum}`}>
                          Item #{itemNum}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Active filters summary */}
              {hasActiveFilters && (
                <div className="flex flex-wrap gap-2 pt-2 border-t" data-testid="container-active-filters">
                  <span className="text-sm text-muted-foreground">Active filters:</span>
                  {selectedTags.map(tag => {
                    const config = getTagConfig(tag);
                    return (
                      <Badge key={tag} variant="secondary" className="gap-1" data-testid={`active-filter-tag-${tag}`}>
                        {config?.label}
                        <X 
                          className="h-3 w-3 cursor-pointer" 
                          onClick={() => handleToggleTag(tag)}
                        />
                      </Badge>
                    );
                  })}
                  {jobFilter !== "all" && (
                    <Badge variant="secondary" className="gap-1" data-testid="active-filter-job">
                      Job: {jobs.find(j => j.id === jobFilter)?.name}
                      <X 
                        className="h-3 w-3 cursor-pointer" 
                        onClick={() => setJobFilter("all")}
                      />
                    </Badge>
                  )}
                  {dateFrom && (
                    <Badge variant="secondary" className="gap-1" data-testid="active-filter-date-from">
                      From: {dateFrom}
                      <X 
                        className="h-3 w-3 cursor-pointer" 
                        onClick={() => setDateFrom("")}
                      />
                    </Badge>
                  )}
                  {dateTo && (
                    <Badge variant="secondary" className="gap-1" data-testid="active-filter-date-to">
                      To: {dateTo}
                      <X 
                        className="h-3 w-3 cursor-pointer" 
                        onClick={() => setDateTo("")}
                      />
                    </Badge>
                  )}
                  {filterItem !== "all" && (
                    <Badge variant="secondary" className="gap-1" data-testid="active-filter-item">
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

          {/* Phase 2 - BUILD: Comprehensive skeleton loaders for initial load */}
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4" data-testid="skeleton-photo-grid">
              {[...Array(SKELETON_COUNTS.initialGrid)].map((_, i) => (
                <Skeleton key={i} className="aspect-square" data-testid={`skeleton-photo-${i}`} />
              ))}
            </div>
          ) : photos.length === 0 ? (
            // Phase 2 - BUILD: Empty state with helpful messaging
            <Card data-testid="empty-photos">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Camera className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2" data-testid="text-no-results">
                  No photos found
                </h3>
                <p className="text-sm text-muted-foreground text-center max-w-md">
                  {hasActiveFilters 
                    ? "Try adjusting your filters to see more photos" 
                    : "No photos have been uploaded yet. Click 'Take Photo' to get started."}
                </p>
                {hasActiveFilters && (
                  <Button 
                    variant="outline" 
                    onClick={handleClearFilters}
                    className="mt-4"
                    data-testid="button-clear-filters-empty"
                  >
                    Clear Filters
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <>
              <motion.div
                variants={fadeInUp}
                initial="hidden"
                animate="visible"
                data-testid="container-photo-grid"
              >
                <PhotoGallery
                  photos={photos}
                  onPhotoClick={(photo) => {}}
                  onPhotoDelete={(id) => {}}
                  selectionMode={selectionMode}
                  selectedIds={metadata.selectedIds}
                  onToggleSelection={actions.toggle}
                />
              </motion.div>

              {/* Intersection observer trigger for infinite scroll */}
              <div ref={loadMoreRef} className="h-10" />

              {/* Load more button (fallback for infinite scroll) */}
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

              {/* Phase 2 - BUILD: Skeleton loaders for loading next page */}
              {isFetchingNextPage && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pt-4" data-testid="skeleton-load-more">
                  {[...Array(SKELETON_COUNTS.loadMoreGrid)].map((_, i) => (
                    <Skeleton key={i} className="aspect-square" data-testid={`skeleton-more-${i}`} />
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

/**
 * Phase 2 - BUILD: ErrorBoundary wrapper for production resilience
 * Catches and displays errors gracefully instead of white screen
 */
export default function Photos() {
  return (
    <ErrorBoundary
      fallback={
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="max-w-md w-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                Something went wrong
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                The photo management interface encountered an error. Please refresh the page to try again.
              </p>
              <Button 
                onClick={() => window.location.reload()} 
                className="w-full"
                data-testid="button-reload-page"
              >
                Refresh Page
              </Button>
            </CardContent>
          </Card>
        </div>
      }
    >
      <PhotosContent />
    </ErrorBoundary>
  );
}
