import { useState, useRef, useEffect } from "react";
import { X, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { clientLogger } from "@/lib/logger";

interface SignatureCaptureProps {
  open: boolean;
  onClose: () => void;
  onSave: (signatureData: {
    signatureBlob: Blob;
    signerName: string;
    signerRole: string;
  }) => Promise<void>;
  jobName?: string;
}

export function SignatureCapture({ open, onClose, onSave, jobName }: SignatureCaptureProps) {
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [signerName, setSignerName] = useState("");
  const [signerRole, setSignerRole] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [lastPoint, setLastPoint] = useState<{ x: number; y: number } | null>(null);
  const [showWatermark, setShowWatermark] = useState(true);

  useEffect(() => {
    if (open && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const updateCanvasSize = () => {
        const container = canvas.parentElement;
        if (!container) return;

        const rect = container.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;

        canvas.width = rect.width * dpr;
        canvas.height = Math.max(150, Math.min(300, rect.height)) * dpr;
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${Math.max(150, Math.min(300, rect.height))}px`;

        ctx.scale(dpr, dpr);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      };

      updateCanvasSize();
      window.addEventListener('resize', updateCanvasSize);

      return () => {
        window.removeEventListener('resize', updateCanvasSize);
      };
    }
  }, [open]);

  const getCoordinates = (e: MouseEvent | TouchEvent): { x: number; y: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    let clientX: number;
    let clientY: number;

    if (e instanceof TouchEvent) {
      if (e.touches.length === 0) return null;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const drawLine = (x0: number, y0: number, x1: number, y1: number) => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    const midX = (x0 + x1) / 2;
    const midY = (y0 + y1) / 2;

    ctx.lineWidth = 2;
    ctx.strokeStyle = '#000000';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo(x0, y0, midX, midY);
    ctx.stroke();
  };

  const startDrawing = (e: MouseEvent | TouchEvent) => {
    e.preventDefault();
    const coords = getCoordinates(e);
    if (!coords) return;

    setIsDrawing(true);
    setLastPoint(coords);
    setShowWatermark(false);
    setHasSignature(true);

    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
  };

  const draw = (e: MouseEvent | TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault();

    const coords = getCoordinates(e);
    if (!coords || !lastPoint) return;

    drawLine(lastPoint.x, lastPoint.y, coords.x, coords.y);
    setLastPoint(coords);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    setLastPoint(null);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleMouseDown = (e: MouseEvent) => startDrawing(e);
    const handleMouseMove = (e: MouseEvent) => draw(e);
    const handleMouseUp = () => stopDrawing();
    const handleTouchStart = (e: TouchEvent) => startDrawing(e);
    const handleTouchMove = (e: TouchEvent) => draw(e);
    const handleTouchEnd = () => stopDrawing();

    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mouseleave', handleMouseUp);
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd);

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('mouseleave', handleMouseUp);
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDrawing, lastPoint]);

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
    setShowWatermark(true);
  };

  const handleSave = async () => {
    if (!hasSignature) {
      toast({
        title: "Signature Required",
        description: "Please draw your signature before saving",
        variant: "destructive",
      });
      return;
    }

    if (!signerName.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter your name",
        variant: "destructive",
      });
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsSaving(true);

    try {
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create signature image'));
          }
        }, 'image/png');
      });

      await onSave({
        signatureBlob: blob,
        signerName: signerName.trim(),
        signerRole: signerRole.trim(),
      });

      setSignerName("");
      setSignerRole("");
      clearSignature();
      onClose();
    } catch (error) {
      clientLogger.error('Error saving signature:', error);
      toast({
        title: "Error",
        description: "Failed to save signature. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setSignerName("");
    setSignerRole("");
    clearSignature();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && handleCancel()}>
      <DialogContent className="sm:max-w-[600px]" data-testid="dialog-signature-capture">
        <DialogHeader>
          <DialogTitle data-testid="text-signature-title">Builder Sign-Off</DialogTitle>
          <DialogDescription data-testid="text-signature-description">
            {jobName ? `Sign to confirm completion of ${jobName}` : "Sign to confirm completion of inspection"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="signature-canvas">Signature *</Label>
            <div className="relative w-full min-h-[150px] border-2 border-input rounded-md bg-white">
              {showWatermark && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <p className="text-muted-foreground text-lg select-none" data-testid="text-watermark">
                    Sign here
                  </p>
                </div>
              )}
              <canvas
                ref={canvasRef}
                id="signature-canvas"
                className="w-full touch-none cursor-crosshair"
                style={{ touchAction: 'none' }}
                data-testid="canvas-signature"
              />
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearSignature}
                disabled={!hasSignature || isSaving}
                data-testid="button-clear-signature"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Clear
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="signer-name">Name *</Label>
              <Input
                id="signer-name"
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                placeholder="Enter your full name"
                disabled={isSaving}
                data-testid="input-signer-name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="signer-role">Role/Title (Optional)</Label>
              <Input
                id="signer-role"
                value={signerRole}
                onChange={(e) => setSignerRole(e.target.value)}
                placeholder="e.g., General Contractor, Site Supervisor"
                disabled={isSaving}
                data-testid="input-signer-role"
              />
            </div>
          </div>

          <div className="text-sm text-muted-foreground border-l-2 border-primary pl-4" data-testid="text-disclaimer">
            By signing, I certify that the inspection was completed as documented.
          </div>

          <div className="flex gap-3 justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={handleCancel}
              disabled={isSaving}
              data-testid="button-cancel-signature"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={!hasSignature || !signerName.trim() || isSaving}
              data-testid="button-save-signature"
            >
              {isSaving ? "Saving..." : "Save Signature"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
