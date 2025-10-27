import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { PhotoTag, TAG_CONFIGS, TAG_CATEGORIES, getCategoryLabel, getTagsByCategory } from "@shared/photoTags";
import { Photo, getSuggestedTags, getMostUsedTags, combineTagSuggestions } from "@shared/photoTagSuggestions";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useState, useMemo } from "react";

interface SmartTagSelectorProps {
  inspectionType: string;
  recentPhotos?: Photo[];
  selectedTags: PhotoTag[];
  onTagsChange: (tags: PhotoTag[]) => void;
  maxTags?: number;
}

export function SmartTagSelector({
  inspectionType,
  recentPhotos = [],
  selectedTags,
  onTagsChange,
  maxTags = 5,
}: SmartTagSelectorProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const suggestedTags = useMemo(() => {
    const inspectionSuggestions = getSuggestedTags(inspectionType);
    const recentlyUsed = getMostUsedTags(recentPhotos, 5);
    return combineTagSuggestions(inspectionSuggestions, recentlyUsed, 8);
  }, [inspectionType, recentPhotos]);

  const frequentlyUsedTags = useMemo(() => {
    return new Set(getMostUsedTags(recentPhotos, 10));
  }, [recentPhotos]);

  const handleTagToggle = (tag: PhotoTag) => {
    if (selectedTags.includes(tag)) {
      onTagsChange(selectedTags.filter(t => t !== tag));
    } else {
      if (selectedTags.length < maxTags) {
        onTagsChange([...selectedTags, tag]);
      }
    }
  };

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const isSelected = (tag: PhotoTag) => selectedTags.includes(tag);
  const canSelectMore = selectedTags.length < maxTags;

  const renderTag = (tag: PhotoTag, showFrequentIndicator: boolean = true) => {
    const config = TAG_CONFIGS[tag];
    const selected = isSelected(tag);
    const isFrequent = frequentlyUsedTags.has(tag);

    return (
      <button
        key={tag}
        onClick={() => handleTagToggle(tag)}
        disabled={!selected && !canSelectMore}
        className="flex-shrink-0"
        data-testid={`button-tag-${tag}`}
        aria-label={`${selected ? 'Remove' : 'Add'} ${config.label} tag`}
        aria-pressed={selected}
      >
        <Badge
          variant={selected ? "default" : "outline"}
          className={`
            cursor-pointer min-h-12 px-4 py-2 flex items-center gap-1 text-sm
            ${selected ? config.color : ''}
            ${!selected && !canSelectMore ? 'opacity-50 cursor-not-allowed' : ''}
            ${isFrequent && !selected && showFrequentIndicator ? 'border-2 border-primary/50' : ''}
          `}
        >
          {config.label}
          {isFrequent && showFrequentIndicator && (
            <span className="text-xs font-bold" aria-label="Frequently used">★</span>
          )}
        </Badge>
      </button>
    );
  };

  return (
    <div className="space-y-6 w-full" data-testid="smart-tag-selector">
      <div className="flex items-center justify-between px-1">
        <span className="text-sm font-semibold text-foreground" data-testid="text-selection-count">
          {selectedTags.length}/{maxTags} tags selected
        </span>
        {!canSelectMore && (
          <span className="text-xs text-muted-foreground">
            Maximum reached
          </span>
        )}
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground px-1">
          Suggested
        </h3>
        <ScrollArea className="w-full">
          <div className="flex gap-2 pb-3 px-1" data-testid="container-suggested-tags">
            {suggestedTags.map((tag) => renderTag(tag, true))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-foreground px-1">
          All Categories
        </h3>
        {Object.values(TAG_CATEGORIES).map((category) => {
          const categoryTags = getTagsByCategory(category);
          const isExpanded = expandedCategories.has(category);
          const categoryLabel = getCategoryLabel(category);

          if (categoryTags.length === 0) return null;

          return (
            <div key={category} className="space-y-2">
              <Button
                variant="ghost"
                onClick={() => toggleCategory(category)}
                className="w-full justify-between min-h-12 px-1"
                data-testid={`button-category-${category}`}
                aria-expanded={isExpanded}
              >
                <span className="text-sm font-medium text-muted-foreground">
                  {categoryLabel}
                </span>
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>

              {isExpanded && (
                <div 
                  className="flex flex-wrap gap-2 px-1" 
                  data-testid={`container-category-${category}`}
                >
                  {categoryTags.map((tag) => renderTag(tag, true))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
