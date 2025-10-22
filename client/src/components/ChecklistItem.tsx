import { useState, useRef, useEffect } from "react";
import { Camera, ChevronDown, ChevronUp, ImageIcon, AlertTriangle, Mic, Play, Pause } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import VoiceRecorder from "./VoiceRecorder";

interface ChecklistItemProps {
  id: string;
  itemNumber: number;
  title: string;
  completed: boolean;
  notes?: string;
  photoCount: number;
  photoRequired?: boolean;
  voiceNoteUrl?: string | null;
  voiceNoteDuration?: number | null;
  onToggle?: (id: string) => void;
  onNotesChange?: (id: string, notes: string) => void;
  onPhotoAdd?: (id: string) => void;
  onVoiceNoteAdd?: (id: string, audioBlob: Blob, duration: number) => Promise<void>;
  onVoiceNoteDelete?: (id: string) => Promise<void>;
}

export default function ChecklistItem({
  id,
  itemNumber,
  title,
  completed,
  notes = "",
  photoCount,
  photoRequired = false,
  voiceNoteUrl,
  voiceNoteDuration,
  onToggle,
  onNotesChange,
  onPhotoAdd,
  onVoiceNoteAdd,
  onVoiceNoteDelete,
}: ChecklistItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [localNotes, setLocalNotes] = useState(notes);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);
  const [voiceCurrentTime, setVoiceCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsPlayingVoice(false);
    setVoiceCurrentTime(0);
  }, [voiceNoteUrl]);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const handleNotesBlur = () => {
    if (onNotesChange && localNotes !== notes) {
      onNotesChange(id, localNotes);
    }
  };

  const handleToggle = () => {
    if (!completed && photoRequired && photoCount === 0) {
      toast({
        title: "Photo Required",
        description: "This item requires at least one photo before it can be marked as complete.",
        variant: "destructive",
      });
      return;
    }
    onToggle?.(id);
  };

  const formatVoiceTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handlePlayVoice = () => {
    if (!voiceNoteUrl) return;

    if (!audioRef.current) {
      audioRef.current = new Audio(voiceNoteUrl);
      audioRef.current.addEventListener("ended", () => {
        setIsPlayingVoice(false);
        setVoiceCurrentTime(0);
      });
      audioRef.current.addEventListener("timeupdate", () => {
        setVoiceCurrentTime(audioRef.current?.currentTime || 0);
      });
    }

    if (isPlayingVoice) {
      audioRef.current.pause();
      setIsPlayingVoice(false);
    } else {
      audioRef.current.play();
      setIsPlayingVoice(true);
    }
  };

  const handleVoiceNoteSave = async (audioBlob: Blob, duration: number) => {
    if (onVoiceNoteAdd) {
      await onVoiceNoteAdd(id, audioBlob, duration);
    }
  };

  const handleVoiceNoteDelete = async () => {
    if (onVoiceNoteDelete) {
      await onVoiceNoteDelete(id);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setIsPlayingVoice(false);
      setVoiceCurrentTime(0);
    }
  };

  const missingRequiredPhoto = photoRequired && photoCount === 0;

  return (
    <Card 
      className={`overflow-visible ${missingRequiredPhoto && !completed ? "border-destructive" : ""}`}
      data-testid={`card-checklist-${id}`}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <Checkbox
            checked={completed}
            onCheckedChange={handleToggle}
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
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {photoRequired && (
                    <Badge 
                      variant={missingRequiredPhoto ? "destructive" : "secondary"}
                      className="text-xs"
                      data-testid="badge-photo-required"
                    >
                      {missingRequiredPhoto && <AlertTriangle className="h-3 w-3 mr-1" />}
                      Photo Required
                    </Badge>
                  )}
                  {photoCount > 0 && (
                    <Badge 
                      variant="outline"
                      className="text-xs bg-green-50 text-green-700 border-green-200"
                      data-testid="badge-photo-count"
                    >
                      <ImageIcon className="h-3 w-3 mr-1" />
                      {photoCount} photo{photoCount !== 1 ? 's' : ''}
                    </Badge>
                  )}
                  {voiceNoteUrl && voiceNoteDuration && (
                    <Badge 
                      variant="outline"
                      className="text-xs bg-blue-50 text-blue-700 border-blue-200"
                      data-testid="badge-voice-note"
                    >
                      <Mic className="h-3 w-3 mr-1" />
                      {formatVoiceTime(voiceNoteDuration)}
                    </Badge>
                  )}
                </div>
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

                {voiceNoteUrl && voiceNoteDuration && (
                  <div>
                    <label className="text-sm font-medium mb-2 block">Voice Note</label>
                    <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={handlePlayVoice}
                        data-testid="button-play-voice"
                      >
                        {isPlayingVoice ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </Button>
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground mb-1">
                          {formatVoiceTime(voiceCurrentTime)} / {formatVoiceTime(voiceNoteDuration)}
                        </p>
                        <Progress
                          value={(voiceCurrentTime / voiceNoteDuration) * 100}
                          className="h-1"
                          data-testid="progress-voice-playback"
                        />
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowVoiceRecorder(true)}
                        data-testid="button-replace-voice"
                      >
                        <Mic className="h-4 w-4 mr-2" />
                        Replace
                      </Button>
                    </div>
                  </div>
                )}

                <Button
                  variant={missingRequiredPhoto ? "default" : "outline"}
                  onClick={() => onPhotoAdd?.(id)}
                  className="w-full"
                  data-testid="button-add-photo"
                >
                  <Camera className="h-4 w-4 mr-2" />
                  {photoRequired ? "Add Required Photo" : "Add Photo"}
                </Button>

                {!voiceNoteUrl && (
                  <Button
                    variant="outline"
                    onClick={() => setShowVoiceRecorder(true)}
                    className="w-full"
                    data-testid="button-record-voice"
                  >
                    <Mic className="h-4 w-4 mr-2" />
                    Record Voice Note
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <VoiceRecorder
        open={showVoiceRecorder}
        onOpenChange={setShowVoiceRecorder}
        onSave={handleVoiceNoteSave}
        existingVoiceNote={
          voiceNoteUrl && voiceNoteDuration
            ? { url: voiceNoteUrl, duration: voiceNoteDuration }
            : undefined
        }
        onDelete={onVoiceNoteDelete ? handleVoiceNoteDelete : undefined}
      />
    </Card>
  );
}
