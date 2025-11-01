import { useState, useCallback, useEffect, useMemo } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  UniqueIdentifier,
  Active,
  Over,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Save,
  Download,
  Upload,
  Plus,
  Copy,
  Trash2,
  Undo,
  Redo,
  Eye,
  Settings,
  Grid3X3,
  Smartphone,
  Tablet,
  Monitor,
  ChevronDown,
  ChevronRight,
  Type,
  Hash,
  Calendar,
  List,
  CheckSquare,
  Radio,
  Image,
  PenTool,
  Table,
  Minus,
  FolderOpen,
  Calculator,
  Wind,
  Home,
  Thermometer,
  Layers,
  GitBranch,
  Archive,
  Clock,
  FileText,
  AlertCircle,
  GripVertical,
  MoreVertical,
  Code,
  Package,
  RefreshCw,
} from "lucide-react";
import type { ReportTemplate } from "@shared/schema";

// Component types for the palette
type ComponentType = 
  | "text" 
  | "textarea" 
  | "richtext"
  | "number"
  | "decimal"
  | "calculated"
  | "date"
  | "datetime"
  | "time"
  | "select"
  | "multiselect"
  | "checkbox"
  | "radio"
  | "photo"
  | "signature"
  | "table"
  | "section"
  | "divider"
  | "conditional"
  | "formula"
  | "blowerDoor"
  | "ductLeakage"
  | "buildingDetails"
  | "hvacSystems"
  | "insulationDetails";

interface ComponentDefinition {
  id: string;
  type: ComponentType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  category: string;
  description?: string;
  defaultProperties?: Record<string, any>;
}

interface TemplateComponent {
  id: string;
  type: ComponentType;
  properties: {
    label?: string;
    placeholder?: string;
    required?: boolean;
    description?: string;
    defaultValue?: any;
    validation?: {
      min?: number;
      max?: number;
      pattern?: string;
      custom?: string;
    };
    conditional?: {
      show?: boolean;
      when?: string;
      eq?: any;
      conditions?: Array<{
        field: string;
        operator: string;
        value: any;
      }>;
    };
    options?: Array<{ value: string; label: string }>;
    formula?: string;
    dependencies?: string[];
    rows?: number;
    columns?: Array<{ key: string; label: string; type: string }>;
  };
  gridPosition?: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  parentId?: string | null;
}

interface TemplateData {
  id?: string;
  name: string;
  description?: string;
  category: string;
  components: TemplateComponent[];
  layout: {
    gridSize: number;
    responsive: boolean;
  };
  conditionalRules: Array<{
    id: string;
    name: string;
    conditions: Array<{
      field: string;
      operator: string;
      value: any;
    }>;
    actions: Array<{
      type: string;
      target: string;
      value?: any;
    }>;
  }>;
  calculations: Array<{
    id: string;
    name: string;
    formula: string;
    dependencies: string[];
  }>;
  metadata: {
    gridEnabled: boolean;
    snapToGrid: boolean;
    gridSize: number;
    theme?: string;
  };
}

const componentPalette: ComponentDefinition[] = [
  // Text Fields
  { id: "text", type: "text", label: "Text Field", icon: Type, category: "Text", description: "Single line text input" },
  { id: "textarea", type: "textarea", label: "Text Area", icon: FileText, category: "Text", description: "Multi-line text input" },
  { id: "richtext", type: "richtext", label: "Rich Text", icon: FileText, category: "Text", description: "Formatted text editor" },
  
  // Number Fields
  { id: "number", type: "number", label: "Number", icon: Hash, category: "Number", description: "Integer number input" },
  { id: "decimal", type: "decimal", label: "Decimal", icon: Hash, category: "Number", description: "Decimal number input" },
  { id: "calculated", type: "calculated", label: "Calculated", icon: Calculator, category: "Number", description: "Auto-calculated field" },
  
  // Date/Time
  { id: "date", type: "date", label: "Date", icon: Calendar, category: "DateTime", description: "Date picker" },
  { id: "datetime", type: "datetime", label: "Date & Time", icon: Clock, category: "DateTime", description: "Date and time picker" },
  { id: "time", type: "time", label: "Time", icon: Clock, category: "DateTime", description: "Time picker" },
  
  // Selection
  { id: "select", type: "select", label: "Dropdown", icon: List, category: "Selection", description: "Single selection dropdown" },
  { id: "multiselect", type: "multiselect", label: "Multi-Select", icon: List, category: "Selection", description: "Multiple selection list" },
  { id: "checkbox", type: "checkbox", label: "Checkbox", icon: CheckSquare, category: "Selection", description: "Yes/No checkbox" },
  { id: "radio", type: "radio", label: "Radio Buttons", icon: Radio, category: "Selection", description: "Single choice options" },
  
  // Media
  { id: "photo", type: "photo", label: "Photo Upload", icon: Image, category: "Media", description: "Photo capture/upload area" },
  { id: "signature", type: "signature", label: "Signature", icon: PenTool, category: "Media", description: "Digital signature field" },
  
  // Structure
  { id: "table", type: "table", label: "Table/Grid", icon: Table, category: "Structure", description: "Data table with rows/columns" },
  { id: "section", type: "section", label: "Section Header", icon: Minus, category: "Structure", description: "Section separator with title" },
  { id: "divider", type: "divider", label: "Divider", icon: Minus, category: "Structure", description: "Visual separator line" },
  { id: "conditional", type: "conditional", label: "Conditional Section", icon: GitBranch, category: "Structure", description: "Show/hide based on conditions" },
  
  // Calculations
  { id: "formula", type: "formula", label: "Formula Field", icon: Calculator, category: "Calculations", description: "Custom calculation formula" },
  
  // Specialized Components
  { id: "blowerDoor", type: "blowerDoor", label: "Blower Door Test", icon: Wind, category: "Specialized", description: "ACH50, CFM50 calculations" },
  { id: "ductLeakage", type: "ductLeakage", label: "Duct Leakage Test", icon: Wind, category: "Specialized", description: "TDL, DLO calculations" },
  { id: "buildingDetails", type: "buildingDetails", label: "Building Details", icon: Home, category: "Specialized", description: "Building specifications form" },
  { id: "hvacSystems", type: "hvacSystems", label: "HVAC Systems", icon: Thermometer, category: "Specialized", description: "HVAC equipment details" },
  { id: "insulationDetails", type: "insulationDetails", label: "Insulation Details", icon: Layers, category: "Specialized", description: "Insulation specifications" },
];

const templateFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  category: z.enum(["pre_drywall", "final", "duct_testing", "blower_door", "pre_insulation", "post_insulation", "rough_in", "energy_audit", "custom"]),
});

type TemplateFormValues = z.infer<typeof templateFormSchema>;

function ReportTemplateDesignerContent() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { id: templateId } = useParams();
  const isEditMode = !!templateId;

  // State management
  const [templateData, setTemplateData] = useState<TemplateData>({
    name: "Untitled Template",
    description: "",
    category: "custom",
    components: [],
    layout: {
      gridSize: 12,
      responsive: true,
    },
    conditionalRules: [],
    calculations: [],
    metadata: {
      gridEnabled: true,
      snapToGrid: true,
      gridSize: 8,
    },
  });

  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [overId, setOverId] = useState<UniqueIdentifier | null>(null);
  const [previewMode, setPreviewMode] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [showGrid, setShowGrid] = useState(true);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [versionHistoryOpen, setVersionHistoryOpen] = useState(false);
  const [undoStack, setUndoStack] = useState<TemplateData[]>([]);
  const [redoStack, setRedoStack] = useState<TemplateData[]>([]);

  // DnD Kit sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Canvas droppable area
  const { setNodeRef: setCanvasRef } = useDroppable({
    id: 'canvas',
  });

  // Form for save dialog
  const form = useForm<TemplateFormValues>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: {
      name: templateData.name,
      description: templateData.description,
      category: templateData.category as any,
    },
  });

  // Queries and mutations with retry: 2
  const { 
    data: existingTemplate, 
    isLoading: isLoadingTemplate,
    error: templateError,
    refetch: refetchTemplate
  } = useQuery<ReportTemplate>({
    queryKey: ["/api/report-templates", templateId],
    queryFn: async () => {
      const response = await fetch(`/api/report-templates/${templateId}`);
      if (!response.ok) throw new Error("Failed to fetch template");
      return response.json();
    },
    enabled: isEditMode,
    retry: 2,
  });

  const { 
    data: versionHistory,
    isLoading: isLoadingVersions,
    error: versionsError,
    refetch: refetchVersions 
  } = useQuery<ReportTemplate[]>({
    queryKey: ["/api/report-templates", templateId, "versions"],
    queryFn: async () => {
      const response = await fetch(`/api/report-templates/${templateId}/versions`);
      if (!response.ok) throw new Error("Failed to fetch versions");
      return response.json();
    },
    enabled: isEditMode && versionHistoryOpen,
    retry: 2,
  });

  const saveTemplateMutation = useMutation({
    mutationFn: async (data: TemplateData) => {
      if (isEditMode) {
        return apiRequest("PUT", `/api/report-templates/${templateId}`, data);
      } else {
        return apiRequest("POST", "/api/report-templates", data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/report-templates"] });
      toast({ title: "Template saved successfully" });
      setSaveDialogOpen(false);
    },
    onError: () => {
      toast({ title: "Failed to save template", variant: "destructive" });
    },
  });

  const cloneTemplateMutation = useMutation({
    mutationFn: async (name: string) => {
      return apiRequest("POST", `/api/report-templates/${templateId}/clone`, { name });
    },
    onSuccess: (cloned: ReportTemplate) => {
      queryClient.invalidateQueries({ queryKey: ["/api/report-templates"] });
      toast({ title: "Template cloned successfully" });
      navigate(`/report-template-designer/${cloned.id}`);
    },
    onError: () => {
      toast({ title: "Failed to clone template", variant: "destructive" });
    },
  });

  const archiveTemplateMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/report-templates/${templateId}/archive`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/report-templates"] });
      toast({ title: "Template archived successfully" });
      navigate("/report-templates");
    },
    onError: () => {
      toast({ title: "Failed to archive template", variant: "destructive" });
    },
  });

  // Load existing template
  useEffect(() => {
    if (existingTemplate) {
      const loadedData: TemplateData = {
        id: existingTemplate.id,
        name: existingTemplate.name,
        description: existingTemplate.description || "",
        category: existingTemplate.category,
        components: (existingTemplate.components as any) || [],
        layout: (existingTemplate.layout as any) || { gridSize: 12, responsive: true },
        conditionalRules: (existingTemplate.conditionalRules as any) || [],
        calculations: (existingTemplate.calculations as any) || [],
        metadata: (existingTemplate.metadata as any) || { gridEnabled: true, snapToGrid: true, gridSize: 8 },
      };
      setTemplateData(loadedData);
      form.reset({
        name: loadedData.name,
        description: loadedData.description,
        category: loadedData.category as any,
      });
    }
  }, [existingTemplate]);

  // Memoized callbacks for undo/redo
  const pushToUndoStack = useCallback(() => {
    setUndoStack((prev) => [...prev, { ...templateData }]);
    setRedoStack([]);
  }, [templateData]);

  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    const previousState = undoStack[undoStack.length - 1];
    setRedoStack((prev) => [templateData, ...prev]);
    setTemplateData(previousState);
    setUndoStack((prev) => prev.slice(0, -1));
  }, [undoStack, templateData]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const nextState = redoStack[0];
    setUndoStack((prev) => [...prev, templateData]);
    setTemplateData(nextState);
    setRedoStack((prev) => prev.slice(1));
  }, [redoStack, templateData]);

  // Memoized drag and drop handlers
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id);
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { over } = event;
    setOverId(over?.id || null);
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) {
      setActiveId(null);
      setOverId(null);
      return;
    }

    pushToUndoStack();

    const paletteComponent = componentPalette.find((c) => c.id === active.id);
    if (paletteComponent) {
      const newComponent: TemplateComponent = {
        id: `${paletteComponent.type}_${Date.now()}`,
        type: paletteComponent.type,
        properties: {
          label: paletteComponent.label,
          ...paletteComponent.defaultProperties,
        },
      };

      setTemplateData((prev) => ({
        ...prev,
        components: [...prev.components, newComponent],
      }));
      setSelectedComponentId(newComponent.id);
    } else {
      const oldIndex = templateData.components.findIndex((c) => c.id === active.id);
      const newIndex = templateData.components.findIndex((c) => c.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        setTemplateData((prev) => ({
          ...prev,
          components: arrayMove(prev.components, oldIndex, newIndex),
        }));
      }
    }

    setActiveId(null);
    setOverId(null);
  }, [templateData.components, pushToUndoStack]);

  // Memoized component property update
  const updateComponentProperty = useCallback((componentId: string, property: string, value: any) => {
    pushToUndoStack();
    setTemplateData((prev) => ({
      ...prev,
      components: prev.components.map((c) =>
        c.id === componentId
          ? { ...c, properties: { ...c.properties, [property]: value } }
          : c
      ),
    }));
  }, [pushToUndoStack]);

  // Memoized delete component
  const deleteComponent = useCallback((componentId: string) => {
    pushToUndoStack();
    setTemplateData((prev) => ({
      ...prev,
      components: prev.components.filter((c) => c.id !== componentId),
    }));
    setSelectedComponentId(null);
  }, [pushToUndoStack]);

  // Memoized duplicate component
  const duplicateComponent = useCallback((componentId: string) => {
    const component = templateData.components.find((c) => c.id === componentId);
    if (!component) return;

    pushToUndoStack();
    const newComponent: TemplateComponent = {
      ...component,
      id: `${component.type}_${Date.now()}`,
      properties: { ...component.properties },
    };

    setTemplateData((prev) => ({
      ...prev,
      components: [...prev.components, newComponent],
    }));
    setSelectedComponentId(newComponent.id);
  }, [templateData.components, pushToUndoStack]);

  // Memoized save template
  const handleSaveTemplate = useCallback((values: TemplateFormValues) => {
    const dataToSave: TemplateData = {
      ...templateData,
      name: values.name,
      description: values.description,
      category: values.category,
    };
    saveTemplateMutation.mutate(dataToSave);
  }, [templateData, saveTemplateMutation]);

  // Memoized export template
  const handleExportTemplate = useCallback(() => {
    const dataStr = JSON.stringify(templateData, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${templateData.name.replace(/\s+/g, "_")}_template.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast({ title: "Template exported successfully" });
  }, [templateData, toast]);

  // Memoized import template
  const handleImportTemplate = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string);
        pushToUndoStack();
        setTemplateData(imported);
        toast({ title: "Template imported successfully" });
      } catch (error) {
        toast({ title: "Failed to import template", variant: "destructive" });
      }
    };
    reader.readAsText(file);
  }, [pushToUndoStack, toast]);

  // Memoized selected component
  const selectedComponent = useMemo(() => 
    templateData.components.find((c) => c.id === selectedComponentId),
    [templateData.components, selectedComponentId]
  );

  // Memoized component categories
  const componentCategories = useMemo(() => {
    const categories = new Set(componentPalette.map((c) => c.category));
    return Array.from(categories);
  }, []);

  // Memoized render component preview
  const renderComponentPreview = useCallback((component: TemplateComponent) => {
    const paletteItem = componentPalette.find((p) => p.type === component.type);
    const Icon = paletteItem?.icon || FileText;

    return (
      <div
        className={`p-3 border rounded-md cursor-move transition-all ${
          selectedComponentId === component.id
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50"
        }`}
        onClick={(e) => {
          e.stopPropagation();
          setSelectedComponentId(component.id);
        }}
        data-testid={`component-${component.id}`}
      >
        <div className="flex items-start gap-2">
          <Icon className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate" data-testid={`text-component-label-${component.id}`}>
              {component.properties.label || paletteItem?.label}
            </p>
            {component.properties.description && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {component.properties.description}
              </p>
            )}
            {component.properties.required && (
              <Badge variant="secondary" className="mt-1 text-xs">
                Required
              </Badge>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-7 w-7" data-testid={`button-component-menu-${component.id}`}>
                <MoreVertical className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => duplicateComponent(component.id)} data-testid={`menu-duplicate-${component.id}`}>
                <Copy className="h-3.5 w-3.5 mr-2" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => deleteComponent(component.id)}
                className="text-destructive"
                data-testid={`menu-delete-${component.id}`}
              >
                <Trash2 className="h-3.5 w-3.5 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    );
  }, [selectedComponentId, duplicateComponent, deleteComponent]);

  // Loading state with skeleton loaders
  if (isLoadingTemplate && isEditMode) {
    return (
      <div className="h-screen flex flex-col" data-testid="skeleton-designer">
        <div className="border-b px-4 py-2 bg-background">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-48" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-9 w-24" />
            </div>
          </div>
        </div>
        <div className="flex-1 p-4 space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </div>
        </div>
      </div>
    );
  }

  // Error state with retry button
  if (templateError && isEditMode) {
    return (
      <div className="h-screen flex items-center justify-center p-4" data-testid="error-template">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Failed to load template</AlertTitle>
          <AlertDescription className="space-y-4">
            <p>{templateError instanceof Error ? templateError.message : 'Unknown error occurred'}</p>
            <Button 
              variant="outline" 
              onClick={() => refetchTemplate()}
              className="w-full"
              data-testid="button-retry-template"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="h-screen flex flex-col" data-testid="page-designer">
        {/* Header Toolbar */}
        <div className="border-b px-4 py-2 bg-background">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-lg font-semibold" data-testid="text-designer-title">Report Template Designer</h1>
              <Separator orientation="vertical" className="h-6" />
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleUndo}
                  disabled={undoStack.length === 0}
                  data-testid="button-undo"
                >
                  <Undo className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRedo}
                  disabled={redoStack.length === 0}
                  data-testid="button-redo"
                >
                  <Redo className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowGrid(!showGrid)}
                data-testid="button-toggle-grid"
              >
                <Grid3X3 className="h-4 w-4 mr-2" />
                {showGrid ? "Hide Grid" : "Show Grid"}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" data-testid="button-preview-mode">
                    {previewMode === "desktop" ? <Monitor className="h-4 w-4 mr-2" /> : 
                     previewMode === "tablet" ? <Tablet className="h-4 w-4 mr-2" /> : 
                     <Smartphone className="h-4 w-4 mr-2" />}
                    Preview
                    <ChevronDown className="h-4 w-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setPreviewMode("desktop")} data-testid="menu-preview-desktop">
                    <Monitor className="h-4 w-4 mr-2" />
                    Desktop
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setPreviewMode("tablet")} data-testid="menu-preview-tablet">
                    <Tablet className="h-4 w-4 mr-2" />
                    Tablet
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setPreviewMode("mobile")} data-testid="menu-preview-mobile">
                    <Smartphone className="h-4 w-4 mr-2" />
                    Mobile
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Separator orientation="vertical" className="h-6" />
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportTemplate}
                data-testid="button-export"
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => document.getElementById("import-file")?.click()}
                data-testid="button-import"
              >
                <Upload className="h-4 w-4 mr-2" />
                Import
                <input
                  id="import-file"
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={handleImportTemplate}
                  data-testid="input-import-file"
                />
              </Button>
              <Button
                size="sm"
                onClick={() => setSaveDialogOpen(true)}
                disabled={saveTemplateMutation.isPending}
                data-testid="button-save"
              >
                <Save className="h-4 w-4 mr-2" />
                {saveTemplateMutation.isPending ? "Saving..." : "Save"}
              </Button>
              {isEditMode && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" data-testid="button-more-options">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setVersionHistoryOpen(true)} data-testid="menu-version-history">
                      <Clock className="h-3.5 w-3.5 mr-2" />
                      Version History
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => {
                        const name = prompt("Enter clone name:");
                        if (name) cloneTemplateMutation.mutate(name);
                      }}
                      data-testid="menu-clone"
                    >
                      <Copy className="h-3.5 w-3.5 mr-2" />
                      Clone Template
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => {
                        if (confirm("Archive this template?")) {
                          archiveTemplateMutation.mutate();
                        }
                      }}
                      className="text-destructive"
                      data-testid="menu-archive"
                    >
                      <Archive className="h-3.5 w-3.5 mr-2" />
                      Archive
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <ResizablePanelGroup direction="horizontal" className="flex-1">
          {/* Left Panel - Component Palette */}
          <ResizablePanel defaultSize={20} minSize={15} data-testid="panel-palette">
            <div className="h-full flex flex-col border-r">
              <div className="p-4 border-b">
                <h2 className="text-sm font-semibold" data-testid="text-palette-title">Component Palette</h2>
              </div>
              <ScrollArea className="flex-1">
                <div className="p-4 space-y-6">
                  {componentCategories.map((category) => (
                    <div key={category}>
                      <h3 className="text-xs font-medium text-muted-foreground mb-2" data-testid={`text-category-${category.toLowerCase()}`}>
                        {category}
                      </h3>
                      <div className="grid gap-2">
                        {componentPalette
                          .filter((c) => c.category === category)
                          .map((component) => {
                            const Icon = component.icon;
                            return (
                              <div
                                key={component.id}
                                className="p-2 border rounded cursor-move hover:border-primary transition-colors"
                                draggable
                                data-testid={`palette-${component.id}`}
                              >
                                <div className="flex items-center gap-2">
                                  <Icon className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-sm">{component.label}</span>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </ResizablePanel>

          <ResizableHandle />

          {/* Middle Panel - Canvas */}
          <ResizablePanel defaultSize={50} minSize={30} data-testid="panel-canvas">
            <div className="h-full flex flex-col">
              <div className="p-4 border-b">
                <h2 className="text-sm font-semibold" data-testid="text-canvas-title">{templateData.name}</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  {templateData.components.length} component{templateData.components.length !== 1 ? "s" : ""}
                </p>
              </div>
              <ScrollArea className="flex-1">
                <div
                  ref={setCanvasRef}
                  className={`p-6 min-h-full ${
                    showGrid ? "bg-grid-pattern" : ""
                  }`}
                  onClick={() => setSelectedComponentId(null)}
                  data-testid="canvas-drop-area"
                >
                  {templateData.components.length === 0 ? (
                    <div className="flex items-center justify-center h-64 border-2 border-dashed rounded-lg" data-testid="empty-canvas">
                      <div className="text-center text-muted-foreground">
                        <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p>Drag components here to build your template</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <SortableContext
                        items={templateData.components.map((c) => c.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        {templateData.components.map((component) => (
                          <div key={component.id}>
                            {renderComponentPreview(component)}
                          </div>
                        ))}
                      </SortableContext>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </ResizablePanel>

          <ResizableHandle />

          {/* Right Panel - Properties */}
          <ResizablePanel defaultSize={30} minSize={20} data-testid="panel-properties">
            <div className="h-full flex flex-col border-l">
              <div className="p-4 border-b">
                <h2 className="text-sm font-semibold" data-testid="text-properties-title">Properties</h2>
              </div>
              {selectedComponent ? (
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="component-label" data-testid="label-component-label">Label</Label>
                      <Input
                        id="component-label"
                        value={selectedComponent.properties.label || ""}
                        onChange={(e) =>
                          updateComponentProperty(selectedComponent.id, "label", e.target.value)
                        }
                        className="mt-1"
                        data-testid="input-component-label"
                      />
                    </div>

                    <div>
                      <Label htmlFor="component-description" data-testid="label-component-description">Description</Label>
                      <Textarea
                        id="component-description"
                        value={selectedComponent.properties.description || ""}
                        onChange={(e) =>
                          updateComponentProperty(selectedComponent.id, "description", e.target.value)
                        }
                        className="mt-1"
                        rows={3}
                        data-testid="textarea-component-description"
                      />
                    </div>

                    {(selectedComponent.type === "text" || 
                      selectedComponent.type === "textarea" || 
                      selectedComponent.type === "number" || 
                      selectedComponent.type === "decimal") && (
                      <>
                        <div>
                          <Label htmlFor="component-placeholder" data-testid="label-component-placeholder">Placeholder</Label>
                          <Input
                            id="component-placeholder"
                            value={selectedComponent.properties.placeholder || ""}
                            onChange={(e) =>
                              updateComponentProperty(selectedComponent.id, "placeholder", e.target.value)
                            }
                            className="mt-1"
                            data-testid="input-component-placeholder"
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <Label htmlFor="component-required" data-testid="label-component-required">Required Field</Label>
                          <Switch
                            id="component-required"
                            checked={selectedComponent.properties.required || false}
                            onCheckedChange={(checked) =>
                              updateComponentProperty(selectedComponent.id, "required", checked)
                            }
                            data-testid="switch-component-required"
                          />
                        </div>
                      </>
                    )}

                    {(selectedComponent.type === "select" || selectedComponent.type === "multiselect" || selectedComponent.type === "radio") && (
                      <div>
                        <Label data-testid="label-component-options">Options</Label>
                        <div className="mt-2 space-y-2">
                          {(selectedComponent.properties.options || []).map((option, index) => (
                            <div key={index} className="flex gap-2">
                              <Input
                                value={option.value}
                                onChange={(e) => {
                                  const newOptions = [...(selectedComponent.properties.options || [])];
                                  newOptions[index].value = e.target.value;
                                  updateComponentProperty(selectedComponent.id, "options", newOptions);
                                }}
                                placeholder="Value"
                                className="flex-1"
                                data-testid={`input-option-value-${index}`}
                              />
                              <Input
                                value={option.label}
                                onChange={(e) => {
                                  const newOptions = [...(selectedComponent.properties.options || [])];
                                  newOptions[index].label = e.target.value;
                                  updateComponentProperty(selectedComponent.id, "options", newOptions);
                                }}
                                placeholder="Label"
                                className="flex-1"
                                data-testid={`input-option-label-${index}`}
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  const newOptions = (selectedComponent.properties.options || []).filter(
                                    (_, i) => i !== index
                                  );
                                  updateComponentProperty(selectedComponent.id, "options", newOptions);
                                }}
                                data-testid={`button-remove-option-${index}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const newOptions = [
                                ...(selectedComponent.properties.options || []),
                                { value: "", label: "" },
                              ];
                              updateComponentProperty(selectedComponent.id, "options", newOptions);
                            }}
                            className="w-full"
                            data-testid="button-add-option"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Option
                          </Button>
                        </div>
                      </div>
                    )}

                    {(selectedComponent.type === "number" || selectedComponent.type === "decimal") && (
                      <>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label htmlFor="component-min" data-testid="label-component-min">Min Value</Label>
                            <Input
                              id="component-min"
                              type="number"
                              value={selectedComponent.properties.validation?.min || ""}
                              onChange={(e) =>
                                updateComponentProperty(selectedComponent.id, "validation", {
                                  ...selectedComponent.properties.validation,
                                  min: e.target.value ? Number(e.target.value) : undefined,
                                })
                              }
                              className="mt-1"
                              data-testid="input-component-min"
                            />
                          </div>
                          <div>
                            <Label htmlFor="component-max" data-testid="label-component-max">Max Value</Label>
                            <Input
                              id="component-max"
                              type="number"
                              value={selectedComponent.properties.validation?.max || ""}
                              onChange={(e) =>
                                updateComponentProperty(selectedComponent.id, "validation", {
                                  ...selectedComponent.properties.validation,
                                  max: e.target.value ? Number(e.target.value) : undefined,
                                })
                              }
                              className="mt-1"
                              data-testid="input-component-max"
                            />
                          </div>
                        </div>
                      </>
                    )}

                    {selectedComponent.type === "calculated" || selectedComponent.type === "formula" && (
                      <div>
                        <Label htmlFor="component-formula" data-testid="label-component-formula">Formula</Label>
                        <Textarea
                          id="component-formula"
                          value={selectedComponent.properties.formula || ""}
                          onChange={(e) =>
                            updateComponentProperty(selectedComponent.id, "formula", e.target.value)
                          }
                          className="mt-1 font-mono text-sm"
                          rows={3}
                          placeholder="e.g., field1 + field2 * 0.1"
                          data-testid="textarea-component-formula"
                        />
                      </div>
                    )}

                    <Separator />

                    <div>
                      <h3 className="text-sm font-semibold mb-2" data-testid="text-conditional-logic">Conditional Logic</h3>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="component-conditional-show" data-testid="label-conditional-show">Show/Hide</Label>
                          <Switch
                            id="component-conditional-show"
                            checked={selectedComponent.properties.conditional?.show || false}
                            onCheckedChange={(checked) =>
                              updateComponentProperty(selectedComponent.id, "conditional", {
                                ...selectedComponent.properties.conditional,
                                show: checked,
                              })
                            }
                            data-testid="switch-conditional-show"
                          />
                        </div>
                        {selectedComponent.properties.conditional?.show && (
                          <div>
                            <Label data-testid="label-conditional-when">When field</Label>
                            <Select
                              value={selectedComponent.properties.conditional?.when || ""}
                              onValueChange={(value) =>
                                updateComponentProperty(selectedComponent.id, "conditional", {
                                  ...selectedComponent.properties.conditional,
                                  when: value,
                                })
                              }
                            >
                              <SelectTrigger className="mt-1" data-testid="select-conditional-when">
                                <SelectValue placeholder="Select field" />
                              </SelectTrigger>
                              <SelectContent>
                                {templateData.components
                                  .filter((c) => c.id !== selectedComponent.id)
                                  .map((c) => (
                                    <SelectItem key={c.id} value={c.id} data-testid={`option-field-${c.id}`}>
                                      {c.properties.label || c.id}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              ) : (
                <div className="flex-1 flex items-center justify-center p-4">
                  <div className="text-center text-muted-foreground" data-testid="empty-properties">
                    <Settings className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Select a component to view and edit its properties</p>
                  </div>
                </div>
              )}
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* Save Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent data-testid="dialog-save-template">
          <DialogHeader>
            <DialogTitle data-testid="text-save-dialog-title">{isEditMode ? "Update Template" : "Save Template"}</DialogTitle>
            <DialogDescription>
              Provide details for your report template
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSaveTemplate)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Template Name</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-template-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={3} data-testid="textarea-template-description" />
                    </FormControl>
                    <FormDescription>
                      Optional description to help identify this template
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-template-category">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="pre_drywall" data-testid="option-pre-drywall">Pre-Drywall</SelectItem>
                        <SelectItem value="final" data-testid="option-final">Final</SelectItem>
                        <SelectItem value="duct_testing" data-testid="option-duct-testing">Duct Testing</SelectItem>
                        <SelectItem value="blower_door" data-testid="option-blower-door">Blower Door</SelectItem>
                        <SelectItem value="pre_insulation" data-testid="option-pre-insulation">Pre-Insulation</SelectItem>
                        <SelectItem value="post_insulation" data-testid="option-post-insulation">Post-Insulation</SelectItem>
                        <SelectItem value="rough_in" data-testid="option-rough-in">Rough-in</SelectItem>
                        <SelectItem value="energy_audit" data-testid="option-energy-audit">Energy Audit</SelectItem>
                        <SelectItem value="custom" data-testid="option-custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" disabled={saveTemplateMutation.isPending} data-testid="button-submit-save">
                  {saveTemplateMutation.isPending ? "Saving..." : "Save Template"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Version History Dialog */}
      {isEditMode && (
        <Dialog open={versionHistoryOpen} onOpenChange={setVersionHistoryOpen}>
          <DialogContent className="max-w-2xl" data-testid="dialog-version-history">
            <DialogHeader>
              <DialogTitle data-testid="text-version-history-title">Version History</DialogTitle>
              <DialogDescription>
                View and restore previous versions of this template
              </DialogDescription>
            </DialogHeader>
            {isLoadingVersions ? (
              <div className="space-y-3" data-testid="skeleton-versions">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : versionsError ? (
              <Alert variant="destructive" data-testid="alert-error-versions">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="flex items-center justify-between gap-4">
                  <span>Failed to load versions: {versionsError instanceof Error ? versionsError.message : 'Unknown error'}</span>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => refetchVersions()}
                    data-testid="button-retry-versions"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Retry
                  </Button>
                </AlertDescription>
              </Alert>
            ) : (
              <ScrollArea className="max-h-96">
                <div className="space-y-2" data-testid="list-versions">
                  {versionHistory?.map((version, idx) => (
                    <Card key={version.id} data-testid={`card-version-${idx}`}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-base" data-testid={`text-version-${idx}`}>
                              Version {version.version}
                              {version.id === templateId && (
                                <Badge variant="secondary" className="ml-2">
                                  Current
                                </Badge>
                              )}
                            </CardTitle>
                            <CardDescription className="text-xs">
                              {version.versionNotes || "No notes"}
                            </CardDescription>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {version.updatedAt && new Date(version.updatedAt).toLocaleDateString()}
                          </div>
                        </div>
                      </CardHeader>
                      {version.id !== templateId && (
                        <CardContent className="pt-0">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              navigate(`/report-template-designer/${version.id}`);
                              setVersionHistoryOpen(false);
                            }}
                            data-testid={`button-view-version-${idx}`}
                          >
                            <Eye className="h-3.5 w-3.5 mr-2" />
                            View Version
                          </Button>
                        </CardContent>
                      )}
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
          </DialogContent>
        </Dialog>
      )}

      {/* Drag Overlay */}
      <DragOverlay>
        {activeId && (
          <div className="p-3 bg-background border-2 border-primary rounded-md shadow-lg opacity-80" data-testid="drag-overlay">
            <div className="flex items-center gap-2">
              <GripVertical className="h-4 w-4" />
              <span className="text-sm font-medium">Moving component</span>
            </div>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

export default function ReportTemplateDesigner() {
  return (
    <ErrorBoundary>
      <ReportTemplateDesignerContent />
    </ErrorBoundary>
  );
}
