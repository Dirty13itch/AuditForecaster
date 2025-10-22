import { useState } from "react";
import { Camera, ChevronDown, ChevronUp, ImageIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

interface ChecklistItemProps {
  id: string;
  itemNumber: number;
  title: string;
  completed: boolean;
  notes?: string;
  photoCount: number;
  onToggle?: (id: string) => void;
  onNotesChange?: (id: string, notes: string) => void;
  onPhotoAdd?: (id: string) => void;
}

export default function ChecklistItem({
  id,
  itemNumber,
  title,
  completed,
  notes = "",
  photoCount,
  onToggle,
  onNotesChange,
  onPhotoAdd
}: ChecklistItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [localNotes, setLocalNotes] = useState(notes);

  const handleNotesBlur = () => {
    if (onNotesChange && localNotes !== notes) {
      onNotesChange(id, localNotes);
    }
  };

  return (
    <Card className="overflow-visible" data-testid={`card-checklist-${id}`}>
      <div className="p-4">
        <div className="flex items-start gap-3">
          <Checkbox
            checked={completed}
            onCheckedChange={() => onToggle?.(id)}
            className="mt-1"
            data-testid={`checkbox-item-${id}`}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-xs font-mono" data-testid="badge-item-number">
                    #{itemNumber}
                  </Badge>
                  <h4 
                    className={`text-sm font-medium ${completed ? "line-through text-muted-foreground" : ""}`}
                    data-testid="text-item-title"
                  >
                    {title}
                  </h4>
                </div>
                {photoCount > 0 && (
                  <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                    <ImageIcon className="h-3 w-3" />
                    <span data-testid="text-photo-count">{photoCount} photo{photoCount !== 1 ? 's' : ''}</span>
                  </div>
                )}
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setIsExpanded(!isExpanded)}
                data-testid="button-expand"
              >
                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>

            {isExpanded && (
              <div className="mt-4 space-y-3">
                <div>
                  <label className="text-sm font-medium mb-2 block">Notes</label>
                  <Textarea
                    value={localNotes}
                    onChange={(e) => setLocalNotes(e.target.value)}
                    onBlur={handleNotesBlur}
                    placeholder="Add inspection notes..."
                    className="min-h-20 resize-none"
                    data-testid="input-notes"
                  />
                </div>
                <Button
                  variant="outline"
                  onClick={() => onPhotoAdd?.(id)}
                  className="w-full"
                  data-testid="button-add-photo"
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Add Photo
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
