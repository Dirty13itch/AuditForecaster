import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { Stage, Layer, Line, Rect, Circle, Text, Arrow, Transformer } from "react-konva";
import { useParams, useLocation } from "wouter";
import { useInputDialog } from "@/components/InputDialog";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
  RotateCcw,
  AlertCircle,
  RefreshCw
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

/**
 * Phase 3 - OPTIMIZE: Module-level constants prevent recreation on every render
 * Tool and annotation configuration constants
 */

// Tool types for annotation editor
type Tool = "select" | "arrow" | "rect" | "circle" | "line" | "text" | "measure";
type ShapeType = "arrow" | "rect" | "circle" | "line" | "text" | "measure";

// Shape definition for annotations
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

// Phase 3 - OPTIMIZE: Color palette constants
const ANNOTATION_COLORS = {
  RED: "#DC3545",
  YELLOW: "#FFC107",
  GREEN: "#28A745",
  BLUE: "#007BFF",
  BLACK: "#000000",
  WHITE: "#FFFFFF",
} as const;

// Phase 3 - OPTIMIZE: Tool property defaults
const DEFAULT_STROKE_WIDTH = 2;
const DEFAULT_FONT_SIZE = 16;
const DEFAULT_OPACITY = 1;
const DEFAULT_SCALE = 1;
const DEFAULT_POSITION = { x: 0, y: 0 };

// Phase 3 - OPTIMIZE: Zoom constraints
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 5;
const ZOOM_IN_FACTOR = 1.2;
const ZOOM_OUT_FACTOR = 0.8;
const IMAGE_FIT_PADDING = 0.9;

// Phase 3 - OPTIMIZE: Canvas sizing constants
const CANVAS_WIDTH_OFFSET = 400;
const CANVAS_HEIGHT_OFFSET = 200;

// Phase 3 - OPTIMIZE: Skeleton counts for loading states
const SKELETON_COUNTS = {
  toolbarButtons: 7,
  propertyControls: 4,
} as const;

/**
 * Phase 2 - BUILD: PhotoAnnotationContent component wrapped in ErrorBoundary at export
 * 
 * Business Logic - Photo Annotation Tool:
 * - Provides canvas-based annotation editor for inspection photos
 * - Supports multiple annotation tools: arrows, rectangles, circles, lines, text, measurements
 * - Implements undo/redo history for all shape operations
 * - Allows customization of colors, stroke width, opacity, and font size
 * - Saves annotation data to photo record via API
 * - Critical for field inspectors to mark defects, measurements, and points of interest on photos
 */
function PhotoAnnotationContent() {
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
  const [stageScale, setStageScale] = useState(DEFAULT_SCALE);
  const [stagePosition, setStagePosition] = useState(DEFAULT_POSITION);
  
  // Phase 3 - OPTIMIZE: Tool properties with constants
  const [color, setColor] = useState(ANNOTATION_COLORS.RED);
  const [strokeWidth, setStrokeWidth] = useState(DEFAULT_STROKE_WIDTH);
  const [fontSize, setFontSize] = useState(DEFAULT_FONT_SIZE);
  const [opacity, setOpacity] = useState(DEFAULT_OPACITY);
  
  // Image state
  const [imageElement, setImageElement] = useState<HTMLImageElement | null>(null);
  const [imageDimensions, setImageDimensions] = useState({ width: 800, height: 600 });
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState(false);
  
  const stageRef = useRef<any>(null);
  const layerRef = useRef<any>(null);
  const transformerRef = useRef<any>(null);

  /**
   * Phase 5 - HARDEN: Query with retry: 2 for resilience
   * 
   * Business Logic - Photo Data Fetch:
   * - Loads photo metadata including URL and existing annotations
   * - Retries up to 2 times on network failures
   * - Critical for ensuring field inspectors can access photos even with poor connectivity
   */
  const { 
    data: photo, 
    isLoading,
    isError,
    error,
    refetch: refetchPhoto
  } = useQuery<Photo>({
    queryKey: [`/api/photos/${photoId}`],
    enabled: !!photoId,
    retry: 2,
  });

  /**
   * Phase 5 - HARDEN: Save mutation with proper error handling
   * 
   * Business Logic - Save Annotations:
   * - Persists all annotation shapes to photo record
   * - Invalidates photo cache to show updated data
   * - Navigates back to photos page on success
   * - Shows error toast with retry option on failure
   */
  const saveMutation = useMutation({
    mutationFn: async (annotations: Shape[]) => {
      // Phase 5 - HARDEN: Validate annotations before saving
      if (!photoId) {
        throw new Error("Photo ID is required");
      }
      if (!Array.isArray(annotations)) {
        throw new Error("Annotations must be an array");
      }
      
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
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Save failed",
        description: error.message || "Failed to save annotations. Please try again.",
      });
    },
  });

  /**
   * Load and scale image to fit canvas
   * Handles cross-origin images for annotation overlay
   */
  useEffect(() => {
    if (!photo?.fullUrl) return;

    setImageLoading(true);
    setImageError(false);

    const img = new Image();
    img.crossOrigin = "anonymous";
    
    img.onload = () => {
      setImageElement(img);
      setImageDimensions({ width: img.width, height: img.height });
      setImageLoading(false);
      
      // Phase 3 - OPTIMIZE: Fit image to screen using constants
      const container = document.getElementById("canvas-container");
      if (container) {
        const scale = Math.min(
          container.clientWidth / img.width,
          container.clientHeight / img.height
        ) * IMAGE_FIT_PADDING;
        setStageScale(scale);
      }
    };
    
    img.onerror = () => {
      setImageLoading(false);
      setImageError(true);
      toast({
        variant: "destructive",
        title: "Image load failed",
        description: "Failed to load image for annotation.",
      });
    };
    
    img.src = photo.fullUrl;
  }, [photo, toast]);

  /**
   * Load existing annotations from photo metadata
   * Initializes annotation history for undo/redo
   */
  useEffect(() => {
    if (photo?.annotationData) {
      // Phase 5 - HARDEN: Validate annotation data structure
      try {
        const annotations = photo.annotationData as Shape[];
        if (Array.isArray(annotations)) {
          setShapes(annotations);
          setHistory([annotations]);
          setHistoryIndex(0);
        }
      } catch (error) {
        console.error("Failed to parse annotation data:", error);
      }
    }
  }, [photo]);

  /**
   * Update Konva transformer when shape selection changes
   * Enables interactive shape manipulation in select mode
   */
  useEffect(() => {
    if (selectedId && transformerRef.current) {
      const selectedNode = layerRef.current?.findOne(`#${selectedId}`);
      if (selectedNode) {
        transformerRef.current.nodes([selectedNode]);
        transformerRef.current.getLayer().batchDraw();
      }
    }
  }, [selectedId]);

  /**
   * Phase 3 - OPTIMIZE: useCallback for mouse down handler
   * Prevents recreation on every render
   * 
   * Handles initial shape creation and text annotation prompts
   */
  const handleMouseDown = useCallback(async (e: any) => {
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
          setShapes(prev => [...prev, newShape]);
          addToHistory([...shapes, newShape]);
        }
        setIsDrawing(false);
        return;
    }

    setShapes(prev => [...prev, newShape]);
  }, [tool, color, strokeWidth, fontSize, opacity, shapes, showInput]);

  /**
   * Phase 3 - OPTIMIZE: useCallback for mouse move handler
   * Updates shape dimensions during drawing
   */
  const handleMouseMove = useCallback((e: any) => {
    if (!isDrawing) return;

    const pos = e.target.getStage().getPointerPosition();
    
    setShapes(prev => {
      const lastShape = prev[prev.length - 1];
      if (!lastShape) return prev;
      
      const updatedShapes = [...prev];
      const updated = { ...lastShape };

      switch (lastShape.type) {
        case "arrow":
        case "line":
        case "measure":
          updated.points = [lastShape.points![0], lastShape.points![1], pos.x, pos.y];
          break;
        case "rect":
          updated.width = pos.x - lastShape.x!;
          updated.height = pos.y - lastShape.y!;
          break;
        case "circle":
          updated.radius = Math.sqrt(
            Math.pow(pos.x - lastShape.x!, 2) + Math.pow(pos.y - lastShape.y!, 2)
          );
          break;
      }
      
      updatedShapes[updatedShapes.length - 1] = updated;
      return updatedShapes;
    });
  }, [isDrawing]);

  /**
   * Phase 3 - OPTIMIZE: useCallback for mouse up handler
   * Finalizes shape and adds to history
   */
  const handleMouseUp = useCallback(() => {
    if (!isDrawing) return;
    setIsDrawing(false);
    addToHistory(shapes);
  }, [isDrawing, shapes]);

  /**
   * Phase 3 - OPTIMIZE: useCallback for history management
   * Adds new state to undo/redo history
   */
  const addToHistory = useCallback((newShapes: Shape[]) => {
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(newShapes);
      return newHistory;
    });
    setHistoryIndex(prev => prev + 1);
  }, [historyIndex]);

  /**
   * Phase 3 - OPTIMIZE: useCallback for undo action
   */
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setShapes(history[historyIndex - 1]);
    }
  }, [historyIndex, history]);

  /**
   * Phase 3 - OPTIMIZE: useCallback for redo action
   */
  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setShapes(history[historyIndex + 1]);
    }
  }, [historyIndex, history]);

  /**
   * Phase 3 - OPTIMIZE: useCallback for delete action
   */
  const handleDelete = useCallback(() => {
    if (selectedId) {
      const newShapes = shapes.filter(s => s.id !== selectedId);
      setShapes(newShapes);
      addToHistory(newShapes);
      setSelectedId(null);
    }
  }, [selectedId, shapes, addToHistory]);

  /**
   * Phase 3 - OPTIMIZE: useCallback for zoom with constants
   */
  const handleZoom = useCallback((scaleFactor: number) => {
    setStageScale(prev => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, prev * scaleFactor)));
  }, []);

  /**
   * Phase 3 - OPTIMIZE: useCallback for reset view
   */
  const handleReset = useCallback(() => {
    setStageScale(DEFAULT_SCALE);
    setStagePosition(DEFAULT_POSITION);
  }, []);

  /**
   * Phase 3 - OPTIMIZE: useCallback for save with validation
   */
  const handleSave = useCallback(() => {
    // Phase 5 - HARDEN: Validate before save
    if (!photoId) {
      toast({
        variant: "destructive",
        title: "Cannot save",
        description: "Photo ID is missing.",
      });
      return;
    }
    
    saveMutation.mutate(shapes);
  }, [photoId, shapes, saveMutation, toast]);

  /**
   * Phase 3 - OPTIMIZE: useCallback for navigation
   */
  const handleCancel = useCallback(() => {
    setLocation("/photos");
  }, [setLocation]);

  /**
   * Phase 3 - OPTIMIZE: useCallback for shape selection
   */
  const handleShapeClick = useCallback((shapeId: string) => {
    setSelectedId(shapeId);
  }, []);

  /**
   * Phase 3 - OPTIMIZE: Memoized canvas dimensions
   * Prevents recalculation on every render
   */
  const canvasDimensions = useMemo(() => ({
    width: window.innerWidth - CANVAS_WIDTH_OFFSET,
    height: window.innerHeight - CANVAS_HEIGHT_OFFSET,
  }), []);

  /**
   * Phase 3 - OPTIMIZE: Memoized undo/redo button states
   */
  const canUndo = useMemo(() => historyIndex > 0, [historyIndex]);
  const canRedo = useMemo(() => historyIndex < history.length - 1, [historyIndex, history.length]);

  /**
   * Phase 2 - BUILD: Loading state with comprehensive skeleton
   */
  if (isLoading || imageLoading) {
    return (
      <div className="flex h-screen flex-col" data-testid="container-loading">
        <TopBar />
        <div className="flex flex-1 overflow-hidden">
          {/* Left Toolbar Skeleton */}
          <Card className="m-2 w-16" data-testid="skeleton-toolbar">
            <CardContent className="p-2 space-y-2">
              {Array.from({ length: SKELETON_COUNTS.toolbarButtons }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" data-testid={`skeleton-tool-${i}`} />
              ))}
            </CardContent>
          </Card>
          
          {/* Canvas Skeleton */}
          <div className="flex-1 p-4" data-testid="skeleton-canvas">
            <Skeleton className="h-full w-full" />
          </div>
          
          {/* Right Panel Skeleton */}
          <Card className="m-2 w-80" data-testid="skeleton-properties">
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="space-y-4">
              {Array.from({ length: SKELETON_COUNTS.propertyControls }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-20" data-testid={`skeleton-property-label-${i}`} />
                  <Skeleton className="h-10 w-full" data-testid={`skeleton-property-control-${i}`} />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
        <BottomNav />
      </div>
    );
  }

  /**
   * Phase 2 - BUILD: Error state with retry button
   */
  if (isError || imageError) {
    return (
      <div className="flex h-screen flex-col" data-testid="container-error">
        <TopBar />
        <div className="flex flex-1 items-center justify-center p-4">
          <Card className="w-full max-w-md" data-testid="error-photo-query">
            <CardContent className="p-6">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle data-testid="text-error-title">Failed to load photo</AlertTitle>
                <AlertDescription data-testid="text-error-description">
                  {error instanceof Error ? error.message : "Unable to load photo for annotation"}
                </AlertDescription>
              </Alert>
              <div className="flex gap-2 mt-4">
                <Button
                  onClick={() => refetchPhoto()}
                  variant="outline"
                  className="flex-1"
                  data-testid="button-retry-photo"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Retry
                </Button>
                <Button
                  onClick={handleCancel}
                  variant="outline"
                  className="flex-1"
                  data-testid="button-back-error"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Photos
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        <BottomNav />
      </div>
    );
  }

  /**
   * Phase 2 - BUILD: Empty/not found state
   */
  if (!photo) {
    return (
      <div className="flex h-screen flex-col" data-testid="container-not-found">
        <TopBar />
        <div className="flex flex-1 items-center justify-center p-4">
          <Card className="w-full max-w-md" data-testid="empty-photo">
            <CardContent className="p-6">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle data-testid="text-not-found-title">Photo not found</AlertTitle>
                <AlertDescription data-testid="text-not-found-description">
                  The requested photo could not be found. It may have been deleted.
                </AlertDescription>
              </Alert>
              <Button 
                onClick={handleCancel} 
                className="mt-4 w-full"
                data-testid="button-back-not-found"
              >
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
    <div className="flex h-screen flex-col" data-testid="container-annotation-editor">
      <TopBar />
      
      <div className="flex flex-1 overflow-hidden">
        {/* Phase 2 - BUILD: Left Toolbar with comprehensive data-testid */}
        <Card className="m-2 w-16" data-testid="card-toolbar">
          <CardContent className="p-2">
            <ToggleGroup
              type="single"
              value={tool}
              onValueChange={(v) => v && setTool(v as Tool)}
              className="flex flex-col"
              data-testid="toggle-group-tools"
            >
              <ToggleGroupItem 
                value="select" 
                data-testid="tool-select"
                aria-label="Select tool"
              >
                <MousePointer className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem 
                value="arrow" 
                data-testid="tool-arrow"
                aria-label="Arrow tool"
              >
                <ArrowUpRight className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem 
                value="rect" 
                data-testid="tool-rect"
                aria-label="Rectangle tool"
              >
                <Square className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem 
                value="circle" 
                data-testid="tool-circle"
                aria-label="Circle tool"
              >
                <CircleIcon className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem 
                value="line" 
                data-testid="tool-line"
                aria-label="Line tool"
              >
                <Pencil className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem 
                value="text" 
                data-testid="tool-text"
                aria-label="Text tool"
              >
                <Type className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem 
                value="measure" 
                data-testid="tool-measure"
                aria-label="Measurement tool"
              >
                <Ruler className="h-4 w-4" />
              </ToggleGroupItem>
            </ToggleGroup>
            
            <div className="mt-4 space-y-2" data-testid="container-actions">
              <Button
                size="icon"
                variant="ghost"
                onClick={handleUndo}
                disabled={!canUndo}
                data-testid="button-undo"
                aria-label="Undo"
              >
                <Undo2 className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={handleRedo}
                disabled={!canRedo}
                data-testid="button-redo"
                aria-label="Redo"
              >
                <Redo2 className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={handleDelete}
                disabled={!selectedId}
                data-testid="button-delete"
                aria-label="Delete selected shape"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Phase 2 - BUILD: Canvas with data-testid */}
        <div 
          className="flex-1 relative bg-gray-100 dark:bg-gray-900" 
          id="canvas-container"
          data-testid="container-canvas"
        >
          <Stage
            ref={stageRef}
            width={canvasDimensions.width}
            height={canvasDimensions.height}
            onMouseDown={handleMouseDown}
            onMousemove={handleMouseMove}
            onMouseup={handleMouseUp}
            scaleX={stageScale}
            scaleY={stageScale}
            x={stagePosition.x}
            y={stagePosition.y}
            draggable={tool === "select"}
            onDragEnd={(e) => setStagePosition({ x: e.target.x(), y: e.target.y() })}
            data-testid="stage-annotation"
          >
            <Layer ref={layerRef}>
              {/* Render shapes with proper data attributes */}
              {shapes.map((shape, index) => {
                const commonProps = {
                  key: shape.id,
                  id: shape.id,
                  onClick: () => handleShapeClick(shape.id),
                  draggable: tool === "select",
                };

                switch (shape.type) {
                  case "arrow":
                    return (
                      <Arrow
                        {...commonProps}
                        points={shape.points}
                        stroke={shape.color}
                        strokeWidth={shape.strokeWidth}
                        opacity={shape.opacity}
                        data-testid={`shape-arrow-${index}`}
                      />
                    );
                  case "rect":
                    return (
                      <Rect
                        {...commonProps}
                        x={shape.x}
                        y={shape.y}
                        width={shape.width}
                        height={shape.height}
                        stroke={shape.color}
                        strokeWidth={shape.strokeWidth}
                        opacity={shape.opacity}
                        data-testid={`shape-rect-${index}`}
                      />
                    );
                  case "circle":
                    return (
                      <Circle
                        {...commonProps}
                        x={shape.x}
                        y={shape.y}
                        radius={shape.radius}
                        stroke={shape.color}
                        strokeWidth={shape.strokeWidth}
                        opacity={shape.opacity}
                        data-testid={`shape-circle-${index}`}
                      />
                    );
                  case "line":
                  case "measure":
                    return (
                      <Line
                        {...commonProps}
                        points={shape.points}
                        stroke={shape.color}
                        strokeWidth={shape.strokeWidth}
                        opacity={shape.opacity}
                        data-testid={`shape-${shape.type}-${index}`}
                      />
                    );
                  case "text":
                    return (
                      <Text
                        {...commonProps}
                        x={shape.x}
                        y={shape.y}
                        text={shape.text}
                        fontSize={shape.fontSize}
                        fill={shape.color}
                        opacity={shape.opacity}
                        data-testid={`shape-text-${index}`}
                      />
                    );
                  default:
                    return null;
                }
              })}
              
              <Transformer ref={transformerRef} />
            </Layer>
          </Stage>
          
          {/* Phase 2 - BUILD: Zoom Controls with data-testid */}
          <div className="absolute bottom-4 left-4 flex gap-2" data-testid="container-zoom-controls">
            <Button
              size="icon"
              variant="secondary"
              onClick={() => handleZoom(ZOOM_IN_FACTOR)}
              data-testid="button-zoom-in"
              aria-label="Zoom in"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="secondary"
              onClick={() => handleZoom(ZOOM_OUT_FACTOR)}
              data-testid="button-zoom-out"
              aria-label="Zoom out"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="secondary"
              onClick={handleReset}
              data-testid="button-reset-view"
              aria-label="Reset view"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Phase 2 - BUILD: Zoom level indicator */}
          <div 
            className="absolute top-4 left-4 bg-background/80 backdrop-blur-sm px-3 py-1 rounded-md text-sm"
            data-testid="text-zoom-level"
          >
            {Math.round(stageScale * 100)}%
          </div>
        </div>

        {/* Phase 2 - BUILD: Right Properties Panel with comprehensive data-testid */}
        <Card className="m-2 w-80" data-testid="card-properties">
          <CardHeader>
            <CardTitle data-testid="text-properties-title">Properties</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Color Picker */}
            <div data-testid="container-color-picker">
              <Label htmlFor="select-color" data-testid="label-color">Color</Label>
              <Select value={color} onValueChange={setColor}>
                <SelectTrigger id="select-color" data-testid="select-color">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ANNOTATION_COLORS.RED} data-testid="color-red">Red</SelectItem>
                  <SelectItem value={ANNOTATION_COLORS.YELLOW} data-testid="color-yellow">Yellow</SelectItem>
                  <SelectItem value={ANNOTATION_COLORS.GREEN} data-testid="color-green">Green</SelectItem>
                  <SelectItem value={ANNOTATION_COLORS.BLUE} data-testid="color-blue">Blue</SelectItem>
                  <SelectItem value={ANNOTATION_COLORS.BLACK} data-testid="color-black">Black</SelectItem>
                  <SelectItem value={ANNOTATION_COLORS.WHITE} data-testid="color-white">White</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Line Thickness */}
            <div data-testid="container-stroke-width">
              <Label htmlFor="select-thickness" data-testid="label-thickness">Line Thickness</Label>
              <Select value={strokeWidth.toString()} onValueChange={(v) => setStrokeWidth(Number(v))}>
                <SelectTrigger id="select-thickness" data-testid="select-thickness">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1" data-testid="thickness-thin">Thin</SelectItem>
                  <SelectItem value="2" data-testid="thickness-medium">Medium</SelectItem>
                  <SelectItem value="4" data-testid="thickness-thick">Thick</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Font Size */}
            <div data-testid="container-font-size">
              <Label htmlFor="select-font-size" data-testid="label-font-size">Font Size</Label>
              <Select value={fontSize.toString()} onValueChange={(v) => setFontSize(Number(v))}>
                <SelectTrigger id="select-font-size" data-testid="select-font-size">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="12" data-testid="font-small">Small</SelectItem>
                  <SelectItem value="16" data-testid="font-medium">Medium</SelectItem>
                  <SelectItem value="24" data-testid="font-large">Large</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Opacity */}
            <div data-testid="container-opacity">
              <Label htmlFor="slider-opacity" data-testid="label-opacity">
                Opacity ({Math.round(opacity * 100)}%)
              </Label>
              <Slider
                id="slider-opacity"
                value={[opacity]}
                onValueChange={([v]) => setOpacity(v)}
                min={0}
                max={1}
                step={0.1}
                className="mt-2"
                data-testid="slider-opacity"
              />
            </div>

            {/* Phase 2 - BUILD: Action buttons with data-testid */}
            <div className="flex gap-2 pt-4" data-testid="container-save-actions">
              <Button
                onClick={handleCancel}
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
                {saveMutation.isPending ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save
                  </>
                )}
              </Button>
            </div>
            
            {/* Phase 2 - BUILD: Shape count indicator */}
            <div 
              className="text-sm text-muted-foreground text-center pt-2"
              data-testid="text-shape-count"
            >
              {shapes.length} {shapes.length === 1 ? 'annotation' : 'annotations'}
            </div>
          </CardContent>
        </Card>
      </div>

      <BottomNav />
      <InputDialog />
    </div>
  );
}

/**
 * Phase 2 - BUILD: Export component wrapped in ErrorBoundary
 * Provides fallback UI if annotation editor crashes
 */
export default function PhotoAnnotation() {
  return (
    <ErrorBoundary>
      <PhotoAnnotationContent />
    </ErrorBoundary>
  );
}
