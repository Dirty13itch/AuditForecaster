import { useState } from "react";
import { ArrowLeft, Camera, Filter } from "lucide-react";
import TopBar from "@/components/TopBar";
import PhotoGallery from "@/components/PhotoGallery";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
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

  const photos = [
    { id: '1', url: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=400&h=400&fit=crop', timestamp: 'Oct 22, 2025 2:30 PM', itemNumber: 1 },
    { id: '2', url: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=400&h=400&fit=crop', timestamp: 'Oct 22, 2025 2:45 PM', itemNumber: 1 },
    { id: '3', url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop', timestamp: 'Oct 22, 2025 3:15 PM', itemNumber: 2 },
    { id: '4', url: 'https://images.unsplash.com/photo-1621905251918-48416bd8575a?w=400&h=400&fit=crop', timestamp: 'Oct 22, 2025 3:30 PM', itemNumber: 2 },
    { id: '5', url: 'https://images.unsplash.com/photo-1597218868981-1b68e15f0065?w=400&h=400&fit=crop', timestamp: 'Oct 22, 2025 3:45 PM', itemNumber: 5 },
    { id: '6', url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400&h=400&fit=crop', timestamp: 'Oct 22, 2025 4:00 PM', itemNumber: 5 },
    { id: '7', url: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=400&h=400&fit=crop', timestamp: 'Oct 22, 2025 4:15 PM', itemNumber: 7 },
    { id: '8', url: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=400&h=400&fit=crop', timestamp: 'Oct 22, 2025 4:30 PM', itemNumber: 8 },
  ];

  const filteredPhotos = filterItem === "all" 
    ? photos 
    : photos.filter(photo => photo.itemNumber === parseInt(filterItem));

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
              <p className="text-sm text-muted-foreground">{filteredPhotos.length} photo{filteredPhotos.length !== 1 ? 's' : ''}</p>
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

          <PhotoGallery
            photos={filteredPhotos}
            onPhotoClick={(photo) => {}}
            onPhotoDelete={(id) => {}}
          />
        </div>
      </main>

      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}
