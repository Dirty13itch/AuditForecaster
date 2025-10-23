import { useState, useRef, useEffect } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { ArrowLeft, Camera, Filter } from "lucide-react";
import TopBar from "@/components/TopBar";
import PhotoGallery from "@/components/PhotoGallery";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Photos() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "inspection" | "photos" | "forecast">("photos");
  const [filterItem, setFilterItem] = useState("all");
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Infinite query for photos with pagination
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
  } = useInfiniteQuery({
    queryKey: ['/api/photos'],
    initialPageParam: 0,
    queryFn: async ({ pageParam = 0 }) => {
      const res = await fetch(`/api/photos?limit=20&offset=${pageParam}`, {
        credentials: 'include',
      });
      
      if (!res.ok) {
        throw new Error(`Failed to fetch photos: ${res.statusText}`);
      }
      
      return await res.json();
    },
    getNextPageParam: (lastPage: any) => {
      // If we got less than 20 photos, we're at the end
      if (lastPage.data.length < 20) return undefined;
      // Otherwise, next page starts after current offset + count
      return lastPage.pagination.offset + lastPage.data.length;
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
    timestamp: new Date(photo.uploadedAt).toLocaleString(),
    itemNumber: photo.checklistItemId ? parseInt(photo.checklistItemId) : undefined,
  }));

  // Filter photos by item number
  const filteredPhotos = filterItem === "all" 
    ? photos 
    : photos.filter(photo => photo.itemNumber === parseInt(filterItem));

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
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <h2 className="text-xl font-bold" data-testid="text-page-title">Johnson Residence Photos</h2>
              {!isLoading && <p className="text-sm text-muted-foreground">{filteredPhotos.length} photo{filteredPhotos.length !== 1 ? 's' : ''}</p>}
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <Button data-testid="button-add-photo">
              <Camera className="h-4 w-4 mr-2" />
              Take Photo
            </Button>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={filterItem} onValueChange={setFilterItem}>
                <SelectTrigger className="w-48" data-testid="select-filter">
                  <SelectValue placeholder="Filter by item" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Items</SelectItem>
                  <SelectItem value="1">Item #1</SelectItem>
                  <SelectItem value="2">Item #2</SelectItem>
                  <SelectItem value="5">Item #5</SelectItem>
                  <SelectItem value="7">Item #7</SelectItem>
                  <SelectItem value="8">Item #8</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Loading skeleton for initial load */}
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <Skeleton key={i} className="aspect-square" />
              ))}
            </div>
          ) : (
            <>
              <PhotoGallery
                photos={filteredPhotos}
                onPhotoClick={(photo) => {}}
                onPhotoDelete={(id) => {}}
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

      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}
