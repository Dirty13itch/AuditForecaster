import { useState, useRef, useEffect } from "react";
import { Mic, Square, Play, Pause, Trash2, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface VoiceRecorderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (audioBlob: Blob, duration: number) => Promise<void>;
  existingVoiceNote?: {
    url: string;
    duration: number;
  };
  onDelete?: () => Promise<void>;
}

const MAX_DURATION_SECONDS = 300; // 5 minutes
const WARNING_DURATION_SECONDS = 270; // 4:30 minutes

export default function VoiceRecorder({
  open,
  onOpenChange,
  onSave,
  existingVoiceNote,
  onDelete,
}: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [browserNotSupported, setBrowserNotSupported] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedTimeRef = useRef<number>(0);

  const { toast } = useToast();

  useEffect(() => {
    // Check browser support
    if (!navigator.mediaDevices || !window.MediaRecorder) {
      setBrowserNotSupported(true);
    }
  }, []);

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      if (recordedUrl) {
        URL.revokeObjectURL(recordedUrl);
      }
    };
  }, [recordedUrl]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const startTimer = () => {
    startTimeRef.current = Date.now() - pausedTimeRef.current;
    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setDuration(elapsed);

      if (elapsed >= MAX_DURATION_SECONDS) {
        stopRecording();
        toast({
          title: "Maximum duration reached",
          description: "Recording stopped at 5 minutes.",
        });
      } else if (elapsed === WARNING_DURATION_SECONDS) {
        toast({
          title: "30 seconds remaining",
          description: "Recording will stop at 5 minutes.",
          variant: "destructive",
        });
      }
    }, 100);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Determine supported mime type
      let mimeType = "audio/webm;codecs=opus";
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = "audio/webm";
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = "audio/mp4";
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = ""; // Use default
          }
        }
      }

      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType || "audio/webm" });
        
        // Check file size (10MB limit)
        if (audioBlob.size > 10485760) {
          toast({
            title: "File too large",
            description: "Recording exceeds 10MB limit. Please record a shorter note.",
            variant: "destructive",
          });
          resetRecording();
          return;
        }

        setRecordedBlob(audioBlob);
        const url = URL.createObjectURL(audioBlob);
        setRecordedUrl(url);
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setPermissionDenied(false);
      pausedTimeRef.current = 0;
      setDuration(0);
      startTimer();
    } catch (error) {
      console.error("Error accessing microphone:", error);
      if (error instanceof Error && error.name === "NotAllowedError") {
        setPermissionDenied(true);
        toast({
          title: "Microphone permission denied",
          description: "Please allow microphone access to record voice notes.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error accessing microphone",
          description: "Unable to access microphone. Please check your device settings.",
          variant: "destructive",
        });
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      stopTimer();
    }
  };

  const playRecording = () => {
    if (!audioRef.current) {
      audioRef.current = new Audio(recordedUrl || existingVoiceNote?.url);
      audioRef.current.addEventListener("ended", () => {
        setIsPlaying(false);
        setCurrentTime(0);
      });
      audioRef.current.addEventListener("timeupdate", () => {
        setCurrentTime(audioRef.current?.currentTime || 0);
      });
    }

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const resetRecording = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (recordedUrl) {
      URL.revokeObjectURL(recordedUrl);
    }
    setRecordedBlob(null);
    setRecordedUrl(null);
    setDuration(0);
    setCurrentTime(0);
    setIsPlaying(false);
    pausedTimeRef.current = 0;
  };

  const handleSave = async () => {
    if (!recordedBlob) return;

    setIsSaving(true);
    try {
      await onSave(recordedBlob, duration);
      toast({
        title: "Voice note saved",
        description: "Your voice note has been saved successfully.",
      });
      resetRecording();
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving voice note:", error);
      toast({
        title: "Failed to save voice note",
        description: "An error occurred while saving. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;

    try {
      await onDelete();
      toast({
        title: "Voice note deleted",
        description: "Your voice note has been deleted.",
      });
      resetRecording();
      onOpenChange(false);
    } catch (error) {
      console.error("Error deleting voice note:", error);
      toast({
        title: "Failed to delete voice note",
        description: "An error occurred while deleting. Please try again.",
        variant: "destructive",
      });
    }
    setShowDeleteConfirm(false);
  };

  const handleCancel = () => {
    if (isRecording) {
      stopRecording();
    }
    resetRecording();
    onOpenChange(false);
  };

  const renderRecordingControls = () => {
    if (browserNotSupported) {
      return (
        <div className="text-center py-8" data-testid="text-not-supported">
          <p className="text-destructive font-medium">Browser not supported</p>
          <p className="text-sm text-muted-foreground mt-2">
            Your browser doesn't support audio recording. Please use a modern browser like Chrome, Firefox, or Edge.
          </p>
        </div>
      );
    }

    if (permissionDenied) {
      return (
        <div className="text-center py-8" data-testid="text-permission-denied">
          <p className="text-destructive font-medium">Microphone permission denied</p>
          <p className="text-sm text-muted-foreground mt-2">
            Please allow microphone access in your browser settings to record voice notes.
          </p>
        </div>
      );
    }

    if (existingVoiceNote && !recordedBlob) {
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div className="flex items-center gap-3">
              <Button
                size="icon"
                variant="outline"
                onClick={playRecording}
                data-testid="button-play-existing"
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
              <div>
                <p className="text-sm font-medium">Existing Voice Note</p>
                <p className="text-xs text-muted-foreground">
                  {formatTime(currentTime)} / {formatTime(existingVoiceNote.duration)}
                </p>
              </div>
            </div>
            <Button
              size="icon"
              variant="destructive"
              onClick={() => setShowDeleteConfirm(true)}
              data-testid="button-delete-existing"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          <div className="text-center">
            <Button
              onClick={startRecording}
              variant="outline"
              className="w-full"
              data-testid="button-record-new"
            >
              <Mic className="h-4 w-4 mr-2" />
              Record New Voice Note
            </Button>
          </div>
        </div>
      );
    }

    if (recordedBlob) {
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div className="flex items-center gap-3 flex-1">
              <Button
                size="icon"
                variant="outline"
                onClick={playRecording}
                data-testid="button-play-preview"
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
              <div className="flex-1">
                <p className="text-sm font-medium">Preview Recording</p>
                <p className="text-xs text-muted-foreground">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </p>
                <Progress
                  value={(currentTime / duration) * 100}
                  className="h-1 mt-2"
                  data-testid="progress-playback"
                />
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={resetRecording}
              variant="outline"
              className="flex-1"
              data-testid="button-discard"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Discard
            </Button>
            <Button
              onClick={handleSave}
              className="flex-1"
              disabled={isSaving}
              data-testid="button-save-recording"
            >
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      );
    }

    if (isRecording) {
      return (
        <div className="space-y-6">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <Button
                size="icon"
                onClick={stopRecording}
                className="h-20 w-20 rounded-full bg-destructive hover:bg-destructive/90"
                data-testid="button-stop-recording"
              >
                <Square className="h-8 w-8" />
              </Button>
              <div className="absolute -top-1 -right-1 h-4 w-4 bg-destructive rounded-full animate-pulse" />
            </div>
            <div className="text-center">
              <p className="text-2xl font-mono font-bold" data-testid="text-recording-timer">
                {formatTime(duration)}
              </p>
              <p className="text-sm text-muted-foreground">Recording...</p>
              {duration >= WARNING_DURATION_SECONDS && (
                <p className="text-xs text-destructive mt-1">
                  {formatTime(MAX_DURATION_SECONDS - duration)} remaining
                </p>
              )}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center gap-4 py-6">
        <Button
          size="icon"
          onClick={startRecording}
          className="h-20 w-20 rounded-full bg-primary hover:bg-primary/90"
          data-testid="button-start-recording"
        >
          <Mic className="h-8 w-8" />
        </Button>
        <div className="text-center">
          <p className="text-sm font-medium">Tap to start recording</p>
          <p className="text-xs text-muted-foreground mt-1">Maximum duration: 5 minutes</p>
        </div>
      </div>
    );
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md" data-testid="dialog-voice-recorder">
          <DialogHeader>
            <DialogTitle>Voice Note</DialogTitle>
            <DialogDescription>
              Record a voice note for this inspection item
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {renderRecordingControls()}
          </div>
          {!isRecording && !recordedBlob && !existingVoiceNote && (
            <div className="flex justify-end">
              <Button
                variant="outline"
                onClick={handleCancel}
                data-testid="button-cancel"
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent data-testid="dialog-delete-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Voice Note</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this voice note? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
