import { useState, useRef, useEffect } from "react";
import { Stage, Layer, Image as KonvaImage, Arrow, Text as KonvaText, Line } from "react-konva";
import type { KonvaEventObject } from "konva/lib/Node";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { ArrowRight, Type, Minus, Undo2, Redo2, Save, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import useImage from "use-image";

export interface Annotation {
  type: 'arrow' | 'text' | 'line';
  points?: number[];
  text?: string;
  x?: number;
  y?: number;
  color: string;
  fontSize?: number;
  id: string;
}

interface PhotoAnnotatorProps {
  photoUrl: string;
  existingAnnotations?: Annotation[];
  onSave: (annotations: Annotation[]) => void;
  onCancel: () => void;
  open: boolean;
}

const COLORS = [
  { name: 'Red', value: '#DC3545' },
  { name: 'Blue', value: '#2E5BBA' },
  { name: 'Green', value: '#28A745' },
  { name: 'Yellow', value: '#FFC107' },
  { name: 'Orange', value: '#FD7E14' },
  { name: 'White', value: '#FFFFFF' },
  { name: 'Black', value: '#000000' },
];

type Tool = 'arrow' | 'text' | 'line' | null;

export function PhotoAnnotator({ photoUrl, existingAnnotations = [], onSave, onCancel, open }: PhotoAnnotatorProps) {
  const [image] = useImage(photoUrl, 'anonymous');
  const [annotations, setAnnotations] = useState<Annotation[]>(existingAnnotations);
  const [history, setHistory] = useState<Annotation[][]>([existingAnnotations]);
  const [historyStep, setHistoryStep] = useState(0);
  const [tool, setTool] = useState<Tool>(null);
  const [color, setColor] = useState('#DC3545');
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<number[]>([]);
  const [textInput, setTextInput] = useState('');
  const [showTextInput, setShowTextInput] = useState(false);
  const [textPosition, setTextPosition] = useState({ x: 0, y: 0 });
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const stageRef = useRef<any>(null);

  useEffect(() => {
    setAnnotations(existingAnnotations);
    setHistory([existingAnnotations]);
    setHistoryStep(0);
  }, [existingAnnotations, open]);

  useEffect(() => {
    if (image) {
      const maxWidth = Math.min(window.innerWidth - 100, 1200);
      const maxHeight = Math.min(window.innerHeight - 300, 800);
      const scale = Math.min(maxWidth / image.width, maxHeight / image.height, 1);
      setDimensions({
        width: image.width * scale,
        height: image.height * scale,
      });
    }
  }, [image]);

  const addToHistory = (newAnnotations: Annotation[]) => {
    const newHistory = history.slice(0, historyStep + 1);
    newHistory.push(newAnnotations);
    setHistory(newHistory);
    setHistoryStep(newHistory.length - 1);
    setAnnotations(newAnnotations);
  };

  const handleUndo = () => {
    if (historyStep > 0) {
      setHistoryStep(historyStep - 1);
      setAnnotations(history[historyStep - 1]);
    }
  };

  const handleRedo = () => {
    if (historyStep < history.length - 1) {
      setHistoryStep(historyStep + 1);
      setAnnotations(history[historyStep + 1]);
    }
  };

  const handleStageMouseDown = (e: KonvaEventObject<MouseEvent>) => {
    if (!tool || tool === 'text') return;

    const stage = e.target.getStage();
    const pos = stage?.getPointerPosition();
    if (!pos) return;

    setIsDrawing(true);
    setCurrentPoints([pos.x, pos.y]);
  };

  const handleStageMouseMove = (e: KonvaEventObject<MouseEvent>) => {
    if (!isDrawing || !tool || tool === 'text') return;

    const stage = e.target.getStage();
    const pos = stage?.getPointerPosition();
    if (!pos) return;

    setCurrentPoints([currentPoints[0], currentPoints[1], pos.x, pos.y]);
  };

  const handleStageMouseUp = (e: KonvaEventObject<MouseEvent>) => {
    if (!tool) return;

    if (tool === 'text') {
      const stage = e.target.getStage();
      const pos = stage?.getPointerPosition();
      if (!pos) return;
      setTextPosition(pos);
      setShowTextInput(true);
      return;
    }

    if (!isDrawing) return;

    setIsDrawing(false);

    if (currentPoints.length < 4) return;

    const newAnnotation: Annotation = {
      id: `${Date.now()}-${Math.random()}`,
      type: tool,
      points: currentPoints,
      color,
    };

    addToHistory([...annotations, newAnnotation]);
    setCurrentPoints([]);
  };

  const handleAddText = () => {
    if (!textInput.trim()) {
      setShowTextInput(false);
      return;
    }

    const newAnnotation: Annotation = {
      id: `${Date.now()}-${Math.random()}`,
      type: 'text',
      text: textInput,
      x: textPosition.x,
      y: textPosition.y,
      color,
      fontSize: 24,
    };

    addToHistory([...annotations, newAnnotation]);
    setTextInput('');
    setShowTextInput(false);
  };

  const handleSave = () => {
    onSave(annotations);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle data-testid="text-annotator-title">Annotate Photo</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Card className="p-4">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium">Tools:</Label>
                <Button
                  variant={tool === 'arrow' ? 'default' : 'outline'}
                  size="icon"
                  onClick={() => setTool(tool === 'arrow' ? null : 'arrow')}
                  data-testid="button-tool-arrow"
                  title="Draw Arrow"
                >
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button
                  variant={tool === 'text' ? 'default' : 'outline'}
                  size="icon"
                  onClick={() => setTool(tool === 'text' ? null : 'text')}
                  data-testid="button-tool-text"
                  title="Add Text"
                >
                  <Type className="h-4 w-4" />
                </Button>
                <Button
                  variant={tool === 'line' ? 'default' : 'outline'}
                  size="icon"
                  onClick={() => setTool(tool === 'line' ? null : 'line')}
                  data-testid="button-tool-line"
                  title="Draw Line"
                >
                  <Minus className="h-4 w-4" />
                </Button>
              </div>

              <div className="h-6 w-px bg-border" />

              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium">Color:</Label>
                {COLORS.map((c) => (
                  <button
                    key={c.value}
                    className={`h-12 w-12 rounded-md border-2 ${
                      color === c.value ? 'border-primary' : 'border-border'
                    }`}
                    style={{ backgroundColor: c.value }}
                    onClick={() => setColor(c.value)}
                    data-testid={`button-color-${c.name.toLowerCase()}`}
                    title={c.name}
                  />
                ))}
              </div>

              <div className="h-6 w-px bg-border" />

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleUndo}
                  disabled={historyStep === 0}
                  data-testid="button-undo"
                  title="Undo"
                >
                  <Undo2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleRedo}
                  disabled={historyStep === history.length - 1}
                  data-testid="button-redo"
                  title="Redo"
                >
                  <Redo2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>

          <div className="relative border rounded-md overflow-hidden bg-muted">
            <Stage
              width={dimensions.width}
              height={dimensions.height}
              onMouseDown={handleStageMouseDown}
              onMouseMove={handleStageMouseMove}
              onMouseUp={handleStageMouseUp}
              onTouchStart={handleStageMouseDown}
              onTouchMove={handleStageMouseMove}
              onTouchEnd={handleStageMouseUp}
              ref={stageRef}
              style={{ cursor: tool ? 'crosshair' : 'default' }}
            >
              <Layer>
                {image && (
                  <KonvaImage
                    image={image}
                    width={dimensions.width}
                    height={dimensions.height}
                  />
                )}
              </Layer>
              <Layer>
                {annotations.map((annotation) => {
                  if (annotation.type === 'arrow' && annotation.points && annotation.points.length === 4) {
                    return (
                      <Arrow
                        key={annotation.id}
                        points={annotation.points}
                        stroke={annotation.color}
                        strokeWidth={3}
                        fill={annotation.color}
                        pointerLength={15}
                        pointerWidth={15}
                      />
                    );
                  }
                  if (annotation.type === 'line' && annotation.points && annotation.points.length === 4) {
                    return (
                      <Line
                        key={annotation.id}
                        points={annotation.points}
                        stroke={annotation.color}
                        strokeWidth={3}
                      />
                    );
                  }
                  if (annotation.type === 'text' && annotation.text) {
                    return (
                      <KonvaText
                        key={annotation.id}
                        x={annotation.x}
                        y={annotation.y}
                        text={annotation.text}
                        fontSize={annotation.fontSize || 24}
                        fill={annotation.color}
                        fontFamily="Arial"
                        fontStyle="bold"
                        stroke="#000000"
                        strokeWidth={1}
                      />
                    );
                  }
                  return null;
                })}
                
                {isDrawing && currentPoints.length === 4 && tool === 'arrow' && (
                  <Arrow
                    points={currentPoints}
                    stroke={color}
                    strokeWidth={3}
                    fill={color}
                    pointerLength={15}
                    pointerWidth={15}
                  />
                )}
                
                {isDrawing && currentPoints.length === 4 && tool === 'line' && (
                  <Line
                    points={currentPoints}
                    stroke={color}
                    strokeWidth={3}
                  />
                )}
              </Layer>
            </Stage>

            {showTextInput && (
              <div
                className="absolute bg-background border rounded-md p-4 shadow-lg"
                style={{
                  left: Math.min(textPosition.x, dimensions.width - 250),
                  top: Math.min(textPosition.y, dimensions.height - 120),
                  width: '240px',
                }}
              >
                <Label className="text-sm font-medium mb-2">Enter Text</Label>
                <Input
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddText();
                    if (e.key === 'Escape') setShowTextInput(false);
                  }}
                  placeholder="Type your annotation..."
                  autoFocus
                  data-testid="input-annotation-text"
                />
                <div className="flex gap-2 mt-3">
                  <Button size="sm" onClick={handleAddText} data-testid="button-add-text">
                    Add
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setShowTextInput(false);
                      setTextInput('');
                    }}
                    data-testid="button-cancel-text"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} data-testid="button-cancel-annotator">
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleSave} data-testid="button-save-annotations">
            <Save className="h-4 w-4 mr-2" />
            Save Annotations
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
