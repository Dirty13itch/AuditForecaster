import { useState, useRef, useEffect } from "react";
import { Stage, Layer, Line, Rect, Circle, Text, Arrow, Transformer } from "react-konva";
import { useParams, useLocation } from "wouter";
import { useInputDialog } from "@/components/InputDialog";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { 
  ArrowLeft, 
  Save, 
  Undo2, 
  Redo2, 
  Trash2, 
  Square, 
  Circle as CircleIcon,
  Type,
  MousePointer,
  Pencil,
  ArrowUpRight,
  Ruler,
  ZoomIn,
  ZoomOut,
  RotateCcw
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";
import TopBar from "@/components/TopBar";
import BottomNav from "@/components/BottomNav";
import type { Photo } from "@shared/schema";

type Tool = "select" | "arrow" | "rect" | "circle" | "line" | "text" | "measure";
type ShapeType = "arrow" | "rect" | "circle" | "line" | "text" | "measure";

interface Shape {
  id: string;
  type: ShapeType;
  points?: number[];
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  radius?: number;
  text?: string;
  color: string;
  strokeWidth: number;
  fontSize?: number;
  opacity: number;
  rotation?: number;
}

export default function PhotoAnnotation() {
  const [, setLocation] = useLocation();
  const { photoId } = useParams();
  const { toast } = useToast();
  const { showInput, InputDialog } = useInputDialog();

  // Canvas state
  const [tool, setTool] = useState<Tool>("select");
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [history, setHistory] = useState<Shape[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [stageScale, setStageScale] = useState(1);
  const [stagePosition, setStagePosition] = useState({ x: 0, y: 0 });
  
  // Tool properties
  const [color, setColor] = useState("#DC3545");
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [fontSize, setFontSize] = useState(16);
  const [opacity, setOpacity] = useState(1);
  
  // Image state
  const [imageElement, setImageElement] = useState<HTMLImageElement | null>(null);
  const [imageDimensions, setImageDimensions] = useState({ width: 800, height: 600 });
  
  const stageRef = useRef<any>(null);
  const layerRef = useRef<any>(null);
  const transformerRef = useRef<any>(null);

  // Fetch photo data
  const { data: photo, isLoading } = useQuery<Photo>({
    queryKey: [`/api/photos/${photoId}`],
    enabled: !!photoId,
  });

  // Save annotations mutation
  const saveMutation = useMutation({
    mutationFn: async (annotations: Shape[]) => {
      return await apiRequest(`/api/photos/${photoId}/annotations`, {
        method: "POST",
        body: JSON.stringify({ annotations }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/photos/${photoId}`] });
      toast({
        title: "Annotations saved",
        description: "Your annotations have been saved successfully.",
      });
      setLocation(`/photos`);
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Save failed",
        description: "Failed to save annotations. Please try again.",
      });
    },
  });

  // Load image
  useEffect(() => {
    if (!photo?.fullUrl) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      setImageElement(img);
      setImageDimensions({ width: img.width, height: img.height });
      
      // Fit image to screen
      const container = document.getElementById("canvas-container");
      if (container) {
        const scale = Math.min(
          container.clientWidth / img.width,
          container.clientHeight / img.height
        ) * 0.9;
        setStageScale(scale);
      }
    };
    img.src = photo.fullUrl;
  }, [photo]);

  // Load existing annotations
  useEffect(() => {
    if (photo?.annotationData) {
      const annotations = photo.annotationData as Shape[];
      setShapes(annotations);
      setHistory([annotations]);
    }
  }, [photo]);

  // Update transformer when selection changes
  useEffect(() => {
    if (selectedId && transformerRef.current) {
      const selectedNode = layerRef.current?.findOne(`#${selectedId}`);
      if (selectedNode) {
        transformerRef.current.nodes([selectedNode]);
        transformerRef.current.getLayer().batchDraw();
      }
    }
  }, [selectedId]);

  const handleMouseDown = async (e: any) => {
    if (tool === "select") {
      const clickedOnEmpty = e.target === e.target.getStage();
      if (clickedOnEmpty) {
        setSelectedId(null);
      }
      return;
    }

    setIsDrawing(true);
    const pos = e.target.getStage().getPointerPosition();
    const newShape: Shape = {
      id: `shape-${Date.now()}`,
      type: tool as ShapeType,
      color,
      strokeWidth,
      fontSize,
      opacity,
    };

    switch (tool) {
      case "arrow":
      case "line":
      case "measure":
        newShape.points = [pos.x, pos.y];
        break;
      case "rect":
      case "circle":
        newShape.x = pos.x;
        newShape.y = pos.y;
        newShape.width = 0;
        newShape.height = 0;
        newShape.radius = 0;
        break;
      case "text":
        const text = await showInput("Add Text Annotation", {
          description: "Enter the text to display on the image",
          placeholder: "Enter text...",
          confirmText: "Add",
          required: true
        });
        if (text) {
          newShape.x = pos.x;
          newShape.y = pos.y;
          newShape.text = text;
          setShapes([...shapes, newShape]);
          addToHistory([...shapes, newShape]);
        }
        setIsDrawing(false);
        return;
    }

    setShapes([...shapes, newShape]);
  };

  const handleMouseMove = (e: any) => {
    if (!isDrawing) return;

    const pos = e.target.getStage().getPointerPosition();
    const lastShape = shapes[shapes.length - 1];

    switch (lastShape.type) {
      case "arrow":
      case "line":
      case "measure":
        const newPoints = [lastShape.points![0], lastShape.points![1], pos.x, pos.y];
        updateLastShape({ points: newPoints });
        break;
      case "rect":
        const width = pos.x - lastShape.x!;
        const height = pos.y - lastShape.y!;
        updateLastShape({ width, height });
        break;
      case "circle":
        const radius = Math.sqrt(
          Math.pow(pos.x - lastShape.x!, 2) + Math.pow(pos.y - lastShape.y!, 2)
        );
        updateLastShape({ radius });
        break;
    }
  };

  const handleMouseUp = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    addToHistory(shapes);
  };

  const updateLastShape = (updates: Partial<Shape>) => {
    const newShapes = [...shapes];
    newShapes[newShapes.length - 1] = { ...newShapes[newShapes.length - 1], ...updates };
    setShapes(newShapes);
  };

  const addToHistory = (newShapes: Shape[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newShapes);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setShapes(history[historyIndex - 1]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setShapes(history[historyIndex + 1]);
    }
  };

  const handleDelete = () => {
    if (selectedId) {
      const newShapes = shapes.filter(s => s.id !== selectedId);
      setShapes(newShapes);
      addToHistory(newShapes);
      setSelectedId(null);
    }
  };

  const handleZoom = (scale: number) => {
    setStageScale(Math.max(0.1, Math.min(5, stageScale * scale)));
  };

  const handleReset = () => {
    setStageScale(1);
    setStagePosition({ x: 0, y: 0 });
  };

  const handleSave = () => {
    saveMutation.mutate(shapes);
  };

  if (isLoading) {
    return (
      <div className="flex h-screen flex-col">
        <TopBar />
        <div className="flex-1 p-4">
          <Skeleton className="h-full w-full" />
        </div>
        <BottomNav />
      </div>
    );
  }

  if (!photo) {
    return (
      <div className="flex h-screen flex-col">
        <TopBar />
        <div className="flex flex-1 items-center justify-center">
          <Card>
            <CardContent className="p-6">
              <p className="text-muted-foreground">Photo not found</p>
              <Button onClick={() => setLocation("/photos")} className="mt-4">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Photos
              </Button>
            </CardContent>
          </Card>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col">
      <TopBar />
      
      <div className="flex flex-1 overflow-hidden">
        {/* Left Toolbar */}
        <Card className="m-2 w-16">
          <CardContent className="p-2">
            <ToggleGroup
              type="single"
              value={tool}
              onValueChange={(v) => v && setTool(v as Tool)}
              className="flex flex-col"
            >
              <ToggleGroupItem value="select" data-testid="tool-select">
                <MousePointer className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="arrow" data-testid="tool-arrow">
                <ArrowUpRight className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="rect" data-testid="tool-rect">
                <Square className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="circle" data-testid="tool-circle">
                <CircleIcon className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="line" data-testid="tool-line">
                <Pencil className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="text" data-testid="tool-text">
                <Type className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="measure" data-testid="tool-measure">
                <Ruler className="h-4 w-4" />
              </ToggleGroupItem>
            </ToggleGroup>
            
            <div className="mt-4 space-y-2">
              <Button
                size="icon"
                variant="ghost"
                onClick={handleUndo}
                disabled={historyIndex <= 0}
                data-testid="button-undo"
              >
                <Undo2 className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={handleRedo}
                disabled={historyIndex >= history.length - 1}
                data-testid="button-redo"
              >
                <Redo2 className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={handleDelete}
                disabled={!selectedId}
                data-testid="button-delete"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Canvas */}
        <div className="flex-1 relative bg-gray-100" id="canvas-container">
          <Stage
            ref={stageRef}
            width={window.innerWidth - 400}
            height={window.innerHeight - 200}
            onMouseDown={handleMouseDown}
            onMousemove={handleMouseMove}
            onMouseup={handleMouseUp}
            scaleX={stageScale}
            scaleY={stageScale}
            x={stagePosition.x}
            y={stagePosition.y}
            draggable={tool === "select"}
            onDragEnd={(e) => setStagePosition({ x: e.target.x(), y: e.target.y() })}
          >
            <Layer ref={layerRef}>
              {/* Render shapes */}
              {shapes.map((shape) => {
                switch (shape.type) {
                  case "arrow":
                    return (
                      <Arrow
                        key={shape.id}
                        id={shape.id}
                        points={shape.points}
                        stroke={shape.color}
                        strokeWidth={shape.strokeWidth}
                        opacity={shape.opacity}
                        onClick={() => setSelectedId(shape.id)}
                        draggable={tool === "select"}
                      />
                    );
                  case "rect":
                    return (
                      <Rect
                        key={shape.id}
                        id={shape.id}
                        x={shape.x}
                        y={shape.y}
                        width={shape.width}
                        height={shape.height}
                        stroke={shape.color}
                        strokeWidth={shape.strokeWidth}
                        opacity={shape.opacity}
                        onClick={() => setSelectedId(shape.id)}
                        draggable={tool === "select"}
                      />
                    );
                  case "circle":
                    return (
                      <Circle
                        key={shape.id}
                        id={shape.id}
                        x={shape.x}
                        y={shape.y}
                        radius={shape.radius}
                        stroke={shape.color}
                        strokeWidth={shape.strokeWidth}
                        opacity={shape.opacity}
                        onClick={() => setSelectedId(shape.id)}
                        draggable={tool === "select"}
                      />
                    );
                  case "line":
                  case "measure":
                    return (
                      <Line
                        key={shape.id}
                        id={shape.id}
                        points={shape.points}
                        stroke={shape.color}
                        strokeWidth={shape.strokeWidth}
                        opacity={shape.opacity}
                        onClick={() => setSelectedId(shape.id)}
                        draggable={tool === "select"}
                      />
                    );
                  case "text":
                    return (
                      <Text
                        key={shape.id}
                        id={shape.id}
                        x={shape.x}
                        y={shape.y}
                        text={shape.text}
                        fontSize={shape.fontSize}
                        fill={shape.color}
                        opacity={shape.opacity}
                        onClick={() => setSelectedId(shape.id)}
                        draggable={tool === "select"}
                      />
                    );
                  default:
                    return null;
                }
              })}
              
              <Transformer ref={transformerRef} />
            </Layer>
          </Stage>
          
          {/* Zoom Controls */}
          <div className="absolute bottom-4 left-4 flex gap-2">
            <Button
              size="icon"
              variant="secondary"
              onClick={() => handleZoom(1.2)}
              data-testid="button-zoom-in"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="secondary"
              onClick={() => handleZoom(0.8)}
              data-testid="button-zoom-out"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="secondary"
              onClick={handleReset}
              data-testid="button-reset-view"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Right Properties Panel */}
        <Card className="m-2 w-80">
          <CardHeader>
            <CardTitle>Properties</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Color Picker */}
            <div>
              <Label>Color</Label>
              <Select value={color} onValueChange={setColor}>
                <SelectTrigger data-testid="select-color">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="#DC3545">Red</SelectItem>
                  <SelectItem value="#FFC107">Yellow</SelectItem>
                  <SelectItem value="#28A745">Green</SelectItem>
                  <SelectItem value="#007BFF">Blue</SelectItem>
                  <SelectItem value="#000000">Black</SelectItem>
                  <SelectItem value="#FFFFFF">White</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Line Thickness */}
            <div>
              <Label>Line Thickness</Label>
              <Select value={strokeWidth.toString()} onValueChange={(v) => setStrokeWidth(Number(v))}>
                <SelectTrigger data-testid="select-thickness">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Thin</SelectItem>
                  <SelectItem value="2">Medium</SelectItem>
                  <SelectItem value="4">Thick</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Font Size */}
            <div>
              <Label>Font Size</Label>
              <Select value={fontSize.toString()} onValueChange={(v) => setFontSize(Number(v))}>
                <SelectTrigger data-testid="select-font-size">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="12">Small</SelectItem>
                  <SelectItem value="16">Medium</SelectItem>
                  <SelectItem value="24">Large</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Opacity */}
            <div>
              <Label>Opacity</Label>
              <Slider
                value={[opacity]}
                onValueChange={([v]) => setOpacity(v)}
                min={0}
                max={1}
                step={0.1}
                className="mt-2"
                data-testid="slider-opacity"
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                onClick={() => setLocation("/photos")}
                variant="outline"
                className="flex-1"
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                className="flex-1"
                disabled={saveMutation.isPending}
                data-testid="button-save"
              >
                <Save className="mr-2 h-4 w-4" />
                Save
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <BottomNav />
      <InputDialog />
    </div>
  );
}