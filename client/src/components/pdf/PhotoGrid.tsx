import { Text, View, Image, StyleSheet } from '@react-pdf/renderer';
import { colors } from './styles';
import type { Photo } from '@shared/schema';

interface PhotoGridProps {
  photos: Photo[];
  title?: string;
  columns?: number;
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 25,
  },
  title: {
    fontSize: 18,
    fontWeight: 700,
    color: colors.primary,
    marginBottom: 15,
    fontFamily: 'Roboto',
    borderBottom: `2pt solid ${colors.primary}`,
    paddingBottom: 6,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  photoContainer: {
    marginBottom: 15,
  },
  photoContainer2Col: {
    width: '48%',
  },
  photoContainer3Col: {
    width: '31%',
  },
  photo: {
    width: '100%',
    height: 150,
    objectFit: 'cover',
    borderRadius: 4,
    border: `1pt solid ${colors.border}`,
  },
  photoCaption: {
    fontSize: 9,
    color: colors.textLight,
    marginTop: 4,
    lineHeight: 1.3,
  },
  photoTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 3,
    gap: 3,
  },
  tag: {
    backgroundColor: colors.background,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 2,
    fontSize: 8,
    color: colors.textLight,
  },
  beforeAfterContainer: {
    marginBottom: 20,
  },
  beforeAfterRow: {
    flexDirection: 'row',
    gap: 10,
  },
  beforeAfterItem: {
    flex: 1,
  },
  beforeAfterLabel: {
    fontSize: 10,
    fontWeight: 600,
    color: colors.text,
    marginBottom: 4,
    fontFamily: 'Roboto',
  },
  annotationOverlay: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 0, 0, 0.2)',
    borderWidth: 2,
    borderColor: colors.error,
    borderRadius: 4,
  },
  annotationText: {
    position: 'absolute',
    fontSize: 8,
    color: colors.error,
    fontWeight: 600,
    backgroundColor: colors.white,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 2,
  },
  categorySection: {
    marginBottom: 20,
  },
  categoryTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: colors.text,
    marginBottom: 10,
    fontFamily: 'Roboto',
    borderLeft: `3pt solid ${colors.primary}`,
    paddingLeft: 8,
  },
  noPhotosMessage: {
    fontSize: 11,
    color: colors.textLight,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 20,
  },
});

interface GroupedPhotos {
  [category: string]: Photo[];
}

function groupPhotosByCategory(photos: Photo[]): GroupedPhotos {
  return photos.reduce((acc, photo) => {
    const category = photo.category || 'Uncategorized';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(photo);
    return acc;
  }, {} as GroupedPhotos);
}

function findBeforeAfterPairs(photos: Photo[]): Array<{ before: Photo; after: Photo }> {
  const pairs: Array<{ before: Photo; after: Photo }> = [];
  const used = new Set<string>();
  
  for (const photo of photos) {
    if (used.has(photo.id)) continue;
    
    // Look for matching before/after based on tags or caption
    const isBefore = photo.tags?.some(tag => tag.toLowerCase().includes('before')) ||
                     photo.caption?.toLowerCase().includes('before');
    const isAfter = photo.tags?.some(tag => tag.toLowerCase().includes('after')) ||
                    photo.caption?.toLowerCase().includes('after');
    
    if (isBefore) {
      // Find corresponding after photo
      const afterPhoto = photos.find(p => 
        !used.has(p.id) && 
        p.id !== photo.id &&
        (p.tags?.some(tag => tag.toLowerCase().includes('after')) ||
         p.caption?.toLowerCase().includes('after')) &&
        p.category === photo.category
      );
      
      if (afterPhoto) {
        pairs.push({ before: photo, after: afterPhoto });
        used.add(photo.id);
        used.add(afterPhoto.id);
      }
    }
  }
  
  return pairs;
}

export function PhotoGrid({ photos, title = "Photos", columns = 2 }: PhotoGridProps) {
  if (!photos || photos.length === 0) {
    return (
      <View style={styles.section}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.noPhotosMessage}>No photos available</Text>
      </View>
    );
  }

  const groupedPhotos = groupPhotosByCategory(photos);
  const beforeAfterPairs = findBeforeAfterPairs(photos);
  const usedPhotoIds = new Set(beforeAfterPairs.flatMap(pair => [pair.before.id, pair.after.id]));
  
  const containerStyle = columns === 3 ? styles.photoContainer3Col : styles.photoContainer2Col;

  return (
    <View style={styles.section}>
      <Text style={styles.title}>{title}</Text>
      
      {/* Before/After Comparisons */}
      {beforeAfterPairs.length > 0 && (
        <View style={styles.categorySection}>
          <Text style={styles.categoryTitle}>Before & After Comparisons</Text>
          {beforeAfterPairs.map((pair, index) => (
            <View key={index} style={styles.beforeAfterContainer} wrap={false}>
              <View style={styles.beforeAfterRow}>
                <View style={styles.beforeAfterItem}>
                  <Text style={styles.beforeAfterLabel}>Before</Text>
                  <Image 
                    style={styles.photo} 
                    src={pair.before.url || pair.before.thumbnailUrl || ''} 
                  />
                  {pair.before.caption && (
                    <Text style={styles.photoCaption}>{pair.before.caption}</Text>
                  )}
                </View>
                <View style={styles.beforeAfterItem}>
                  <Text style={styles.beforeAfterLabel}>After</Text>
                  <Image 
                    style={styles.photo} 
                    src={pair.after.url || pair.after.thumbnailUrl || ''} 
                  />
                  {pair.after.caption && (
                    <Text style={styles.photoCaption}>{pair.after.caption}</Text>
                  )}
                </View>
              </View>
            </View>
          ))}
        </View>
      )}
      
      {/* Grouped Photos by Category */}
      {Object.entries(groupedPhotos).map(([category, categoryPhotos]) => {
        // Filter out photos already used in before/after pairs
        const remainingPhotos = categoryPhotos.filter(p => !usedPhotoIds.has(p.id));
        
        if (remainingPhotos.length === 0) return null;
        
        return (
          <View key={category} style={styles.categorySection}>
            <Text style={styles.categoryTitle}>{category}</Text>
            <View style={styles.photoGrid}>
              {remainingPhotos.map(photo => (
                <View key={photo.id} style={[styles.photoContainer, containerStyle]} wrap={false}>
                  <Image 
                    style={styles.photo} 
                    src={photo.url || photo.thumbnailUrl || ''} 
                  />
                  {photo.caption && (
                    <Text style={styles.photoCaption}>{photo.caption}</Text>
                  )}
                  {photo.tags && photo.tags.length > 0 && (
                    <View style={styles.photoTags}>
                      {photo.tags.map((tag, tagIndex) => (
                        <Text key={tagIndex} style={styles.tag}>#{tag}</Text>
                      ))}
                    </View>
                  )}
                </View>
              ))}
            </View>
          </View>
        );
      })}
    </View>
  );
}