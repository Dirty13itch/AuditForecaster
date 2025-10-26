import { useState, useCallback, useEffect } from "react";
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

export default function ReportTemplateDesigner() {
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

  // Form for save dialog
  const form = useForm<TemplateFormValues>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: {
      name: templateData.name,
      description: templateData.description,
      category: templateData.category as any,
    },
  });

  // Queries and mutations
  const { data: existingTemplate, isLoading } = useQuery<ReportTemplate>({
    queryKey: ["/api/report-templates", templateId],
    queryFn: async () => {
      const response = await fetch(`/api/report-templates/${templateId}`);
      if (!response.ok) throw new Error("Failed to fetch template");
      return response.json();
    },
    enabled: isEditMode,
  });

  const { data: versionHistory } = useQuery<ReportTemplate[]>({
    queryKey: ["/api/report-templates", templateId, "versions"],
    queryFn: async () => {
      const response = await fetch(`/api/report-templates/${templateId}/versions`);
      if (!response.ok) throw new Error("Failed to fetch versions");
      return response.json();
    },
    enabled: isEditMode && versionHistoryOpen,
  });

  const saveTemplateMutation = useMutation({
    mutationFn: async (data: TemplateData) => {
      if (isEditMode) {
        return apiRequest(`/api/report-templates/${templateId}`, "PUT", data);
      } else {
        return apiRequest("/api/report-templates", "POST", data);
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
      return apiRequest(`/api/report-templates/${templateId}/clone`, "POST", { name });
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
      return apiRequest(`/api/report-templates/${templateId}/archive`, "POST");
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

  // Undo/Redo functionality
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

  // Drag and drop handlers
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    setOverId(over?.id || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) {
      setActiveId(null);
      setOverId(null);
      return;
    }

    pushToUndoStack();

    // Check if dragging from palette
    const paletteComponent = componentPalette.find((c) => c.id === active.id);
    if (paletteComponent) {
      // Add new component to canvas
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
      // Reorder existing components
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
  };

  // Component property update
  const updateComponentProperty = (componentId: string, property: string, value: any) => {
    pushToUndoStack();
    setTemplateData((prev) => ({
      ...prev,
      components: prev.components.map((c) =>
        c.id === componentId
          ? { ...c, properties: { ...c.properties, [property]: value } }
          : c
      ),
    }));
  };

  // Delete component
  const deleteComponent = (componentId: string) => {
    pushToUndoStack();
    setTemplateData((prev) => ({
      ...prev,
      components: prev.components.filter((c) => c.id !== componentId),
    }));
    setSelectedComponentId(null);
  };

  // Duplicate component
  const duplicateComponent = (componentId: string) => {
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
  };

  // Save template
  const handleSaveTemplate = (values: TemplateFormValues) => {
    const dataToSave: TemplateData = {
      ...templateData,
      name: values.name,
      description: values.description,
      category: values.category,
    };
    saveTemplateMutation.mutate(dataToSave);
  };

  // Export template
  const handleExportTemplate = () => {
    const dataStr = JSON.stringify(templateData, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${templateData.name.replace(/\s+/g, "_")}_template.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast({ title: "Template exported successfully" });
  };

  // Import template
  const handleImportTemplate = (event: React.ChangeEvent<HTMLInputElement>) => {
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
  };

  const selectedComponent = templateData.components.find((c) => c.id === selectedComponentId);

  const renderComponentPreview = (component: TemplateComponent) => {
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
      >
        <div className="flex items-start gap-2">
          <Icon className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
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
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <MoreVertical className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => duplicateComponent(component.id)}>
                <Copy className="h-3.5 w-3.5 mr-2" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => deleteComponent(component.id)}
                className="text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    );
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="h-screen flex flex-col">
        {/* Header Toolbar */}
        <div className="border-b px-4 py-2 bg-background">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-lg font-semibold">Report Template Designer</h1>
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
              <Separator orientation="vertical" className="h-6" />
              <div className="flex items-center gap-1 bg-muted rounded-md p-1">
                <Button
                  variant={previewMode === "desktop" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setPreviewMode("desktop")}
                  data-testid="button-preview-desktop"
                >
                  <Monitor className="h-4 w-4" />
                </Button>
                <Button
                  variant={previewMode === "tablet" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setPreviewMode("tablet")}
                  data-testid="button-preview-tablet"
                >
                  <Tablet className="h-4 w-4" />
                </Button>
                <Button
                  variant={previewMode === "mobile" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setPreviewMode("mobile")}
                  data-testid="button-preview-mobile"
                >
                  <Smartphone className="h-4 w-4" />
                </Button>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowGrid(!showGrid)}
                data-testid="button-toggle-grid"
              >
                <Grid3X3 className={`h-4 w-4 ${showGrid ? "text-primary" : ""}`} />
              </Button>
            </div>
            <div className="flex items-center gap-2">
              {isEditMode && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setVersionHistoryOpen(true)}
                    data-testid="button-version-history"
                  >
                    <GitBranch className="h-4 w-4 mr-2" />
                    Version History
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => cloneTemplateMutation.mutate(`${templateData.name} (Copy)`)}
                    data-testid="button-clone"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Clone
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => archiveTemplateMutation.mutate()}
                    data-testid="button-archive"
                  >
                    <Archive className="h-4 w-4 mr-2" />
                    Archive
                  </Button>
                </>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleExportTemplate}
                data-testid="button-export"
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <input
                type="file"
                accept=".json"
                onChange={handleImportTemplate}
                className="hidden"
                id="import-template"
              />
              <label htmlFor="import-template">
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                  data-testid="button-import"
                >
                  <span>
                    <Upload className="h-4 w-4 mr-2" />
                    Import
                  </span>
                </Button>
              </label>
              <Button
                variant="default"
                size="sm"
                onClick={() => setSaveDialogOpen(true)}
                data-testid="button-save"
              >
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
            </div>
          </div>
        </div>

        {/* Main Designer Area */}
        <ResizablePanelGroup direction="horizontal" className="flex-1">
          {/* Component Palette */}
          <ResizablePanel defaultSize={20} minSize={15} maxSize={30}>
            <div className="h-full flex flex-col border-r">
              <div className="p-4 border-b">
                <h2 className="font-semibold">Components</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Drag components to the canvas
                </p>
              </div>
              <ScrollArea className="flex-1">
                <div className="p-4 space-y-4">
                  {["Text", "Number", "DateTime", "Selection", "Media", "Structure", "Calculations", "Specialized"].map(
                    (category) => (
                      <div key={category}>
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                          {category}
                        </h3>
                        <div className="space-y-2">
                          {componentPalette
                            .filter((c) => c.category === category)
                            .map((component) => (
                              <div
                                key={component.id}
                                draggable
                                onDragStart={(e) => {
                                  e.dataTransfer.effectAllowed = "copy";
                                  handleDragStart({
                                    active: { id: component.id, data: { current: component } },
                                  } as DragStartEvent);
                                }}
                                className="p-2 border rounded-md cursor-move hover:bg-accent hover:border-primary/50 transition-colors"
                                data-testid={`palette-${component.type}`}
                              >
                                <div className="flex items-center gap-2">
                                  <component.icon className="h-4 w-4 text-muted-foreground" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">
                                      {component.label}
                                    </p>
                                    {component.description && (
                                      <p className="text-xs text-muted-foreground truncate">
                                        {component.description}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    )
                  )}
                </div>
              </ScrollArea>
            </div>
          </ResizablePanel>

          <ResizableHandle />

          {/* Design Canvas */}
          <ResizablePanel defaultSize={50}>
            <div className="h-full flex flex-col">
              <div className="p-4 border-b bg-muted/50">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold">{templateData.name}</h2>
                    {templateData.description && (
                      <p className="text-sm text-muted-foreground">
                        {templateData.description}
                      </p>
                    )}
                  </div>
                  <Badge variant="outline">{templateData.category}</Badge>
                </div>
              </div>
              <ScrollArea className="flex-1">
                <div
                  className={`min-h-full p-6 ${
                    showGrid ? "bg-grid-pattern" : ""
                  } ${
                    previewMode === "mobile"
                      ? "max-w-sm mx-auto"
                      : previewMode === "tablet"
                      ? "max-w-2xl mx-auto"
                      : ""
                  }`}
                  onClick={() => setSelectedComponentId(null)}
                  style={{
                    backgroundImage: showGrid
                      ? `linear-gradient(to right, #e5e7eb 1px, transparent 1px), linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)`
                      : undefined,
                    backgroundSize: showGrid ? "24px 24px" : undefined,
                  }}
                >
                  {templateData.components.length === 0 ? (
                    <div className="h-96 flex items-center justify-center">
                      <div className="text-center">
                        <Package className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                        <p className="text-muted-foreground">
                          Drag components here to start building your template
                        </p>
                      </div>
                    </div>
                  ) : (
                    <SortableContext
                      items={templateData.components.map((c) => c.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-3">
                        {templateData.components.map((component) => (
                          <div key={component.id} data-testid={`canvas-component-${component.id}`}>
                            {renderComponentPreview(component)}
                          </div>
                        ))}
                      </div>
                    </SortableContext>
                  )}
                </div>
              </ScrollArea>
            </div>
          </ResizablePanel>

          <ResizableHandle />

          {/* Properties Panel */}
          <ResizablePanel defaultSize={30} minSize={20} maxSize={40}>
            <div className="h-full flex flex-col border-l">
              <div className="p-4 border-b">
                <h2 className="font-semibold">Properties</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  {selectedComponent ? "Configure selected component" : "Select a component to edit"}
                </p>
              </div>
              {selectedComponent ? (
                <ScrollArea className="flex-1">
                  <div className="p-4 space-y-4">
                    <div>
                      <Label htmlFor="component-label">Label</Label>
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
                      <Label htmlFor="component-description">Description</Label>
                      <Textarea
                        id="component-description"
                        value={selectedComponent.properties.description || ""}
                        onChange={(e) =>
                          updateComponentProperty(selectedComponent.id, "description", e.target.value)
                        }
                        className="mt-1"
                        rows={2}
                        data-testid="textarea-component-description"
                      />
                    </div>

                    {selectedComponent.type !== "section" && selectedComponent.type !== "divider" && (
                      <>
                        <div>
                          <Label htmlFor="component-placeholder">Placeholder</Label>
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
                          <Label htmlFor="component-required">Required Field</Label>
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
                        <Label>Options</Label>
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
                            <Label htmlFor="component-min">Min Value</Label>
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
                            />
                          </div>
                          <div>
                            <Label htmlFor="component-max">Max Value</Label>
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
                            />
                          </div>
                        </div>
                      </>
                    )}

                    {selectedComponent.type === "calculated" || selectedComponent.type === "formula" && (
                      <div>
                        <Label htmlFor="component-formula">Formula</Label>
                        <Textarea
                          id="component-formula"
                          value={selectedComponent.properties.formula || ""}
                          onChange={(e) =>
                            updateComponentProperty(selectedComponent.id, "formula", e.target.value)
                          }
                          className="mt-1 font-mono text-sm"
                          rows={3}
                          placeholder="e.g., field1 + field2 * 0.1"
                        />
                      </div>
                    )}

                    <Separator />

                    <div>
                      <h3 className="text-sm font-semibold mb-2">Conditional Logic</h3>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="component-conditional-show">Show/Hide</Label>
                          <Switch
                            id="component-conditional-show"
                            checked={selectedComponent.properties.conditional?.show || false}
                            onCheckedChange={(checked) =>
                              updateComponentProperty(selectedComponent.id, "conditional", {
                                ...selectedComponent.properties.conditional,
                                show: checked,
                              })
                            }
                          />
                        </div>
                        {selectedComponent.properties.conditional?.show && (
                          <div>
                            <Label>When field</Label>
                            <Select
                              value={selectedComponent.properties.conditional?.when || ""}
                              onValueChange={(value) =>
                                updateComponentProperty(selectedComponent.id, "conditional", {
                                  ...selectedComponent.properties.conditional,
                                  when: value,
                                })
                              }
                            >
                              <SelectTrigger className="mt-1">
                                <SelectValue placeholder="Select field" />
                              </SelectTrigger>
                              <SelectContent>
                                {templateData.components
                                  .filter((c) => c.id !== selectedComponent.id)
                                  .map((c) => (
                                    <SelectItem key={c.id} value={c.id}>
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
                  <div className="text-center text-muted-foreground">
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isEditMode ? "Update Template" : "Save Template"}</DialogTitle>
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
                        <SelectItem value="pre_drywall">Pre-Drywall</SelectItem>
                        <SelectItem value="final">Final</SelectItem>
                        <SelectItem value="duct_testing">Duct Testing</SelectItem>
                        <SelectItem value="blower_door">Blower Door</SelectItem>
                        <SelectItem value="pre_insulation">Pre-Insulation</SelectItem>
                        <SelectItem value="post_insulation">Post-Insulation</SelectItem>
                        <SelectItem value="rough_in">Rough-in</SelectItem>
                        <SelectItem value="energy_audit">Energy Audit</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" disabled={saveTemplateMutation.isPending}>
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
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Version History</DialogTitle>
              <DialogDescription>
                View and restore previous versions of this template
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-96">
              <div className="space-y-2">
                {versionHistory?.map((version) => (
                  <Card key={version.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-base">
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
          </DialogContent>
        </Dialog>
      )}

      {/* Drag Overlay */}
      <DragOverlay>
        {activeId && (
          <div className="p-3 bg-background border-2 border-primary rounded-md shadow-lg opacity-80">
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