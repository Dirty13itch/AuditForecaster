import { useState } from 'react';
import PhotoGallery from '../PhotoGallery';

export default function PhotoGalleryExample() {
  const [photos] = useState([
    { id: '1', url: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=400&h=400&fit=crop', timestamp: 'Oct 22, 2025 2:30 PM', itemNumber: 1 },
    { id: '2', url: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=400&h=400&fit=crop', timestamp: 'Oct 22, 2025 2:45 PM', itemNumber: 1 },
    { id: '3', url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop', timestamp: 'Oct 22, 2025 3:15 PM', itemNumber: 3 },
    { id: '4', url: 'https://images.unsplash.com/photo-1621905251918-48416bd8575a?w=400&h=400&fit=crop', timestamp: 'Oct 22, 2025 3:30 PM', itemNumber: 5 },
    { id: '5', url: 'https://images.unsplash.com/photo-1597218868981-1b68e15f0065?w=400&h=400&fit=crop', timestamp: 'Oct 22, 2025 3:45 PM', itemNumber: 7 },
  ]);

  return (
    <div className="p-4">
      <PhotoGallery
        photos={photos}
        onPhotoClick={(photo) => console.log('View photo:', photo)}
        onPhotoDelete={(id) => console.log('Delete photo:', id)}
      />
    </div>
  );
}
