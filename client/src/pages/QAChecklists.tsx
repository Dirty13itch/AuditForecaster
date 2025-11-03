import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  DashboardCardSkeleton,
  TableSkeleton,
  ListSkeleton
} from "@/components/ui/skeleton-variants";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import {
  staggerContainer,
  cardAppear,
  listItem
} from "@/lib/animations";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Plus,
  Edit,
  Trash2,
  GripVertical,
  CheckCircle2,
  AlertCircle,
  FileText,
  Camera,
  Ruler,
  PenTool,
  Shield,
  ClipboardList,
  Settings,
  Copy,
  BarChart,
  Clock,
  TrendingUp
} from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { QaChecklist, QaChecklistItem } from "@shared/schema";

// Phase 3 - OPTIMIZE: Module-level constants prevent recreation on every render
const REFRESH_INTERVAL = 60000; // 60 seconds for checklist data
const DEFAULT_CATEGORY = "pre-inspection"; // Default checklist category

// Phase 6 - DOCUMENT: Evidence type icon mappings
// Maps evidence requirements to their corresponding icons for visual feedback
const EVIDENCE_ICONS = {
  photo: Camera,
  measurement: Ruler,
  signature: PenTool,
  note: FileText,
  default: FileText
} as const;

// Phase 6 - DOCUMENT: Checklist category icon mappings
// Defines visual indicators for different checklist stages
const CATEGORY_ICONS = {
  'pre-inspection': Shield,
  'during': ClipboardList,
  'post': CheckCircle2,
  'compliance': FileText,
  default: ClipboardList
} as const;

// Phase 6 - DOCUMENT: Job type options for checklist assignment
// Defines which job types can have checklists assigned to them
const JOB_TYPES = [
  { value: 'full-inspection', label: 'Full Inspection' },
  { value: 'blower-door', label: 'Blower Door Test' },
  { value: 'duct-test', label: 'Duct Leakage Test' },
  { value: 'ventilation', label: 'Ventilation Test' },
  { value: 'final-testing', label: 'Final Testing' }
] as const;

// Phase 6 - DOCUMENT: Evidence type options for checklist items
// Defines what types of evidence can be required for compliance
const EVIDENCE_TYPES = [
  { value: '', label: 'None' },
  { value: 'photo', label: 'Photo Required' },
  { value: 'measurement', label: 'Measurement Required' },
  { value: 'signature', label: 'Signature Required' },
  { value: 'note', label: 'Note Required' }
] as const;

// Phase 6 - DOCUMENT: Checklist category options
// Defines when in the workflow checklists should be used
const CHECKLIST_CATEGORIES = [
  { value: 'pre-inspection', label: 'Pre-Inspection' },
  { value: 'during', label: 'During Inspection' },
  { value: 'post', label: 'Post-Inspection' },
  { value: 'compliance', label: 'Compliance' }
] as const;

// Phase 6 - DOCUMENT: TypeScript interfaces for type safety
interface ChecklistWithItems extends QaChecklist {
  items: QaChecklistItem[];
}

interface ChecklistStats {
  totalUses: number;
  completionRate: number;
  avgTimeToComplete: number;
  commonlySkipped: string[];
}

// Phase 3 - OPTIMIZE: Module-level helper functions
// Phase 6 - DOCUMENT: Get icon component for evidence type
const getEvidenceIcon = (evidence: string) => {
  const IconComponent = EVIDENCE_ICONS[evidence as keyof typeof EVIDENCE_ICONS] || EVIDENCE_ICONS.default;
  return <IconComponent className="w-4 h-4" data-testid={`icon-evidence-${evidence}`} />;
};

// Phase 6 - DOCUMENT: Get icon component for checklist category
const getCategoryIcon = (category: string) => {
  const IconComponent = CATEGORY_ICONS[category as keyof typeof CATEGORY_ICONS] || CATEGORY_ICONS.default;
  return <IconComponent className="w-4 h-4" data-testid={`icon-category-${category}`} />;
};

// Phase 6 - DOCUMENT: Mock checklist data for development until backend endpoints are ready
// These represent realistic QA checklists with safety, equipment, and compliance checks
const MOCK_CHECKLISTS: ChecklistWithItems[] = [
  {
    id: "1",
    name: "Pre-Inspection Safety",
    category: "pre-inspection",
    description: "Safety checks before starting inspection",
    isActive: true,
    requiredForJobTypes: ["full-inspection", "blower-door"],
    createdAt: new Date(),
    updatedAt: new Date(),
    items: [
      {
        id: "item-1",
        checklistId: "1",
        itemText: "Check for gas leaks",
        isCritical: true,
        category: "safety",
        sortOrder: 1,
        helpText: "Use gas detector around all appliances",
        requiredEvidence: "note"
      },
      {
        id: "item-2",
        checklistId: "1",
        itemText: "Verify electrical panel safety",
        isCritical: true,
        category: "safety",
        sortOrder: 2,
        helpText: "Look for exposed wires, proper grounding",
        requiredEvidence: "photo"
      },
      {
        id: "item-3",
        checklistId: "1",
        itemText: "Document existing damage",
        isCritical: false,
        category: "documentation",
        sortOrder: 3,
        helpText: "Photo any pre-existing damage",
        requiredEvidence: "photo"
      }
    ]
  },
  {
    id: "2",
    name: "Equipment Verification",
    category: "during",
    description: "Verify all equipment is calibrated and functioning",
    isActive: true,
    requiredForJobTypes: ["blower-door", "duct-test"],
    createdAt: new Date(),
    updatedAt: new Date(),
    items: [
      {
        id: "item-4",
        checklistId: "2",
        itemText: "Check blower door calibration date",
        isCritical: true,
        category: "equipment",
        sortOrder: 1,
        helpText: "Must be calibrated within last 12 months",
        requiredEvidence: "note"
      },
      {
        id: "item-5",
        checklistId: "2",
        itemText: "Verify manometer accuracy",
        isCritical: true,
        category: "equipment",
        sortOrder: 2,
        helpText: "Test with known pressure",
        requiredEvidence: "measurement"
      }
    ]
  },
  {
    id: "3",
    name: "Minnesota Code Compliance",
    category: "compliance",
    description: "Ensure all Minnesota energy code requirements are met",
    isActive: true,
    requiredForJobTypes: ["full-inspection"],
    createdAt: new Date(),
    updatedAt: new Date(),
    items: [
      {
        id: "item-6",
        checklistId: "3",
        itemText: "Verify insulation R-values meet code",
        isCritical: true,
        category: "compliance",
        sortOrder: 1,
        helpText: "Check against current MN energy code",
        requiredEvidence: "measurement"
      },
      {
        id: "item-7",
        checklistId: "3",
        itemText: "Document ventilation requirements",
        isCritical: true,
        category: "compliance",
        sortOrder: 2,
        helpText: "Calculate required CFM",
        requiredEvidence: "measurement"
      }
    ]
  }
];

// Phase 6 - DOCUMENT: Mock statistics data for checklist usage analytics
const MOCK_STATS: ChecklistStats = {
  totalUses: 145,
  completionRate: 92.5,
  avgTimeToComplete: 12.3,
  commonlySkipped: ["Document existing damage", "Take reference photos"]
};

// Phase 6 - DOCUMENT: Sortable checklist item component with drag-and-drop support
// Allows inspectors to reorder checklist items for optimal workflow
function SortableItem({ item, onEdit, onDelete }: {
  item: QaChecklistItem;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-3 bg-background border rounded-lg"
      data-testid={`item-checklist-${item.id}`}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-move"
        data-testid={`handle-drag-${item.id}`}
      >
        <GripVertical className="w-5 h-5 text-muted-foreground" data-testid="icon-drag-handle" />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium" data-testid={`text-item-${item.id}`}>{item.itemText}</span>
          {item.isCritical && (
            <Badge variant="destructive" className="text-xs" data-testid={`badge-critical-${item.id}`}>
              Critical
            </Badge>
          )}
          {item.requiredEvidence && (
            <div className="flex items-center gap-1" data-testid={`group-evidence-${item.id}`}>
              {getEvidenceIcon(item.requiredEvidence)}
              <span className="text-xs text-muted-foreground" data-testid="text-evidence-label">
                Required
              </span>
            </div>
          )}
        </div>
        {item.helpText && (
          <p className="text-sm text-muted-foreground mt-1" data-testid={`text-help-${item.id}`}>
            {item.helpText}
          </p>
        )}
      </div>
      <div className="flex gap-1" data-testid={`group-actions-${item.id}`}>
        <Button 
          size="icon" 
          variant="ghost" 
          onClick={onEdit}
          data-testid={`button-edit-${item.id}`}
        >
          <Edit className="w-4 h-4" data-testid="icon-edit" />
        </Button>
        <Button 
          size="icon" 
          variant="ghost" 
          onClick={onDelete}
          data-testid={`button-delete-${item.id}`}
        >
          <Trash2 className="w-4 h-4" data-testid="icon-delete" />
        </Button>
      </div>
    </div>
  );
}

// Phase 2 - BUILD: Main content component with comprehensive error handling
function QAChecklistsContent() {
  const { toast } = useToast();
  const [selectedTab, setSelectedTab] = useState("manage");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
  const [selectedChecklist, setSelectedChecklist] = useState<ChecklistWithItems | null>(null);
  const [editingItem, setEditingItem] = useState<QaChecklistItem | null>(null);

  // Phase 6 - DOCUMENT: Form state for creating new checklists
  const [newChecklist, setNewChecklist] = useState({
    name: "",
    category: DEFAULT_CATEGORY,
    description: "",
    isActive: true,
    requiredForJobTypes: [] as string[]
  });

  // Phase 6 - DOCUMENT: Form state for creating/editing checklist items
  const [itemForm, setItemForm] = useState({
    itemText: "",
    isCritical: false,
    category: "",
    helpText: "",
    requiredEvidence: ""
  });

  // Phase 6 - DOCUMENT: Drag and drop sensors for item reordering
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Phase 5 - HARDEN: All queries have retry: 2 for resilience
  // Phase 6 - DOCUMENT: Fetch all checklists with their items
  const { 
    data: checklists, 
    isLoading: checklistsLoading,
    error: checklistsError
  } = useQuery<ChecklistWithItems[]>({
    queryKey: ['/api/qa/checklists'],
    enabled: true,
    retry: 2,
    refetchInterval: REFRESH_INTERVAL
  });

  // Phase 6 - DOCUMENT: Fetch usage statistics for selected checklist
  const { 
    data: stats,
    isLoading: statsLoading,
    error: statsError
  } = useQuery<ChecklistStats>({
    queryKey: ['/api/qa/checklists/stats', selectedChecklist?.id],
    enabled: !!selectedChecklist?.id, // Only fetch when checklist is selected
    retry: 2
  });

  // Phase 3 - OPTIMIZE: useMemo for computed display values
  // Phase 6 - DOCUMENT: Use real data from API
  const displayChecklists = useMemo(() => 
    checklists || [], 
    [checklists]
  );

  const displayStats = useMemo(() => 
    stats || { totalUses: 0, completionRate: 0, avgTimeToComplete: 0, commonlySkipped: [] }, 
    [stats]
  );

  // Phase 5 - HARDEN: Create checklist mutation with retry and error handling
  const createChecklistMutation = useMutation({
    mutationFn: (data: any) => apiRequest('/api/qa/checklists', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    retry: 2,
    onSuccess: () => {
      toast({
        title: "Checklist created",
        description: "New checklist has been created successfully"
      });
      setIsCreateDialogOpen(false);
      // Phase 6 - DOCUMENT: Reset form state
      setNewChecklist({
        name: "",
        category: DEFAULT_CATEGORY,
        description: "",
        isActive: true,
        requiredForJobTypes: []
      });
      queryClient.invalidateQueries({ queryKey: ['/api/qa/checklists'] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create checklist",
        description: error.message || "Please try again",
        variant: "destructive"
      });
    }
  });

  // Phase 5 - HARDEN: Create/update item mutation with validation
  const createItemMutation = useMutation({
    mutationFn: (data: any) => {
      // Phase 5 - HARDEN: Client-side validation
      if (!data.itemText || data.itemText.trim().length === 0) {
        throw new Error("Item text is required");
      }
      
      return apiRequest('/api/qa/checklist-items', {
        method: editingItem ? 'PATCH' : 'POST',
        body: JSON.stringify(data)
      });
    },
    retry: 2,
    onSuccess: () => {
      toast({
        title: editingItem ? "Item updated" : "Item added",
        description: `Checklist item has been ${editingItem ? 'updated' : 'added'} successfully`
      });
      setIsItemDialogOpen(false);
      setEditingItem(null);
      // Phase 6 - DOCUMENT: Reset form state
      setItemForm({
        itemText: "",
        isCritical: false,
        category: "",
        helpText: "",
        requiredEvidence: ""
      });
      queryClient.invalidateQueries({ queryKey: ['/api/qa/checklists'] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to save item",
        description: error.message || "Please try again",
        variant: "destructive"
      });
    }
  });

  // Phase 5 - HARDEN: Delete item mutation with confirmation
  const deleteItemMutation = useMutation({
    mutationFn: (itemId: string) => 
      apiRequest(`/api/qa/checklist-items/${itemId}`, {
        method: 'DELETE'
      }),
    retry: 2,
    onSuccess: () => {
      toast({
        title: "Item deleted",
        description: "Checklist item has been deleted"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/qa/checklists'] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete item",
        description: error.message || "Please try again",
        variant: "destructive"
      });
    }
  });

  // Phase 5 - HARDEN: Reorder items mutation with optimistic update
  const reorderItemsMutation = useMutation({
    mutationFn: ({ checklistId, itemIds }: { checklistId: string; itemIds: string[] }) =>
      apiRequest(`/api/qa/checklists/${checklistId}/items/reorder`, {
        method: 'POST',
        body: JSON.stringify({ itemIds })
      }),
    retry: 2,
    onSuccess: () => {
      toast({
        title: "Items reordered",
        description: "Checklist items have been reordered"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to reorder items",
        description: error.message || "Please try again",
        variant: "destructive"
      });
      // Phase 5 - HARDEN: Refetch to restore correct order on error
      queryClient.invalidateQueries({ queryKey: ['/api/qa/checklists'] });
    }
  });

  // Phase 5 - HARDEN: Toggle checklist active status
  const toggleActiveMutation = useMutation({
    mutationFn: (checklistId: string) =>
      apiRequest(`/api/qa/checklists/${checklistId}/toggle-active`, {
        method: 'PATCH'
      }),
    retry: 2,
    onSuccess: () => {
      toast({
        title: "Status updated",
        description: "Checklist status has been updated"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/qa/checklists'] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update status",
        description: error.message || "Please try again",
        variant: "destructive"
      });
    }
  });

  // Phase 3 - OPTIMIZE: useCallback for event handlers
  // Phase 6 - DOCUMENT: Handle drag end event for item reordering
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id && selectedChecklist) {
      const oldIndex = selectedChecklist.items.findIndex(item => item.id === active.id);
      const newIndex = selectedChecklist.items.findIndex(item => item.id === over?.id);
      
      const newItems = arrayMove(selectedChecklist.items, oldIndex, newIndex);
      
      // Phase 5 - HARDEN: Optimistic update for better UX
      setSelectedChecklist({
        ...selectedChecklist,
        items: newItems
      });

      // Phase 6 - DOCUMENT: Persist reorder to backend
      reorderItemsMutation.mutate({
        checklistId: selectedChecklist.id,
        itemIds: newItems.map(item => item.id)
      });
    }
  }, [selectedChecklist, reorderItemsMutation]);

  // Phase 3 - OPTIMIZE: useCallback for tab change
  const handleTabChange = useCallback((value: string) => {
    setSelectedTab(value);
  }, []);

  // Phase 3 - OPTIMIZE: useCallback for checklist selection
  const handleChecklistSelect = useCallback((checklist: ChecklistWithItems) => {
    setSelectedChecklist(checklist);
  }, []);

  // Phase 3 - OPTIMIZE: useCallback for opening create dialog
  const handleOpenCreateDialog = useCallback(() => {
    setIsCreateDialogOpen(true);
  }, []);

  // Phase 3 - OPTIMIZE: useCallback for opening item dialog
  const handleOpenItemDialog = useCallback(() => {
    setEditingItem(null);
    setItemForm({
      itemText: "",
      isCritical: false,
      category: "",
      helpText: "",
      requiredEvidence: ""
    });
    setIsItemDialogOpen(true);
  }, []);

  // Phase 3 - OPTIMIZE: useCallback for editing item
  const handleEditItem = useCallback((item: QaChecklistItem) => {
    setEditingItem(item);
    setItemForm({
      itemText: item.itemText,
      isCritical: item.isCritical,
      category: item.category || "",
      helpText: item.helpText || "",
      requiredEvidence: item.requiredEvidence || ""
    });
    setIsItemDialogOpen(true);
  }, []);

  // Phase 3 - OPTIMIZE: useCallback for deleting item
  const handleDeleteItem = useCallback((itemId: string) => {
    // Phase 5 - HARDEN: Add confirmation before delete
    if (confirm("Are you sure you want to delete this checklist item?")) {
      deleteItemMutation.mutate(itemId);
    }
  }, [deleteItemMutation]);

  // Phase 3 - OPTIMIZE: useCallback for creating checklist
  const handleCreateChecklist = useCallback(() => {
    // Phase 5 - HARDEN: Validate required fields
    if (!newChecklist.name || newChecklist.name.trim().length === 0) {
      toast({
        title: "Validation error",
        description: "Checklist name is required",
        variant: "destructive"
      });
      return;
    }

    createChecklistMutation.mutate(newChecklist);
  }, [newChecklist, createChecklistMutation, toast]);

  // Phase 3 - OPTIMIZE: useCallback for creating/updating item
  const handleSaveItem = useCallback(() => {
    createItemMutation.mutate({
      ...itemForm,
      checklistId: selectedChecklist?.id,
      id: editingItem?.id
    });
  }, [itemForm, selectedChecklist, editingItem, createItemMutation]);

  // Phase 2 - BUILD: Comprehensive loading states with skeleton loaders
  const isLoading = checklistsLoading || statsLoading;

  // Phase 2 - BUILD: Error detection across all queries
  const hasError = checklistsError || statsError;

  // Phase 2 - BUILD: Show skeleton loaders during initial data fetch
  if (isLoading && !displayChecklists) {
    return (
      <div className="container mx-auto p-6 max-w-7xl" data-testid="container-checklists-loading">
        <div className="mb-6">
          <h1 className="text-3xl font-bold" data-testid="heading-checklists-title">QA Checklists</h1>
          <p className="text-muted-foreground mt-1" data-testid="text-checklists-subtitle">
            Manage inspection checklists and compliance templates
          </p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <DashboardCardSkeleton />
          <div className="lg:col-span-2">
            <TableSkeleton />
          </div>
        </div>
      </div>
    );
  }

  // Phase 2 - BUILD: Show error alert if any query fails
  if (hasError) {
    return (
      <div className="container mx-auto p-6 max-w-7xl" data-testid="container-checklists-error">
        <Alert variant="destructive" data-testid="alert-checklists-error">
          <AlertCircle className="h-4 w-4" data-testid="icon-error" />
          <AlertTitle data-testid="text-error-title">Error Loading Checklists</AlertTitle>
          <AlertDescription data-testid="text-error-description">
            {checklistsError?.message || statsError?.message || 
             'Failed to load checklist data. Please try again.'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <motion.div 
      className="container mx-auto p-6 max-w-7xl"
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      data-testid="container-checklists-main"
    >
      {/* Header Section */}
      <motion.div 
        className="flex items-center justify-between mb-6"
        variants={cardAppear}
        data-testid="section-checklists-header"
      >
        <div>
          <h1 className="text-3xl font-bold" data-testid="heading-checklists-title">
            QA Checklists
          </h1>
          <p className="text-muted-foreground mt-1" data-testid="text-checklists-subtitle">
            Manage inspection checklists and compliance templates
          </p>
        </div>
        <Button onClick={handleOpenCreateDialog} data-testid="button-new-checklist">
          <Plus className="w-4 h-4 mr-2" data-testid="icon-plus" />
          New Checklist
        </Button>
      </motion.div>

      {/* Tabs Navigation */}
      <Tabs value={selectedTab} onValueChange={handleTabChange} data-testid="tabs-checklists">
        <TabsList className="grid grid-cols-4 w-full max-w-2xl" data-testid="tabs-list">
          <TabsTrigger value="manage" data-testid="tab-manage">Manage</TabsTrigger>
          <TabsTrigger value="templates" data-testid="tab-templates">Templates</TabsTrigger>
          <TabsTrigger value="analytics" data-testid="tab-analytics">Analytics</TabsTrigger>
          <TabsTrigger value="settings" data-testid="tab-settings">Settings</TabsTrigger>
        </TabsList>

        {/* Manage Tab */}
        <TabsContent value="manage" className="mt-6" data-testid="content-manage">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Checklists List */}
            <motion.div 
              className="lg:col-span-1"
              variants={cardAppear}
              data-testid="section-checklists-list"
            >
              <Card data-testid="card-checklists-list">
                <CardHeader data-testid="card-header-list">
                  <CardTitle data-testid="title-checklists">Checklists</CardTitle>
                  <CardDescription data-testid="description-checklists">
                    Select a checklist to manage items
                  </CardDescription>
                </CardHeader>
                <CardContent data-testid="card-content-list">
                  <ScrollArea className="h-[600px]" data-testid="scroll-checklists">
                    <div className="space-y-2 pr-4">
                      {displayChecklists.map((checklist) => (
                        <motion.div
                          key={checklist.id}
                          variants={listItem}
                          className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                            selectedChecklist?.id === checklist.id
                              ? "bg-accent border-accent-foreground/20"
                              : "hover-elevate"
                          }`}
                          onClick={() => handleChecklistSelect(checklist)}
                          data-testid={`card-checklist-${checklist.id}`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                {getCategoryIcon(checklist.category)}
                                <span 
                                  className="font-medium" 
                                  data-testid={`text-name-${checklist.id}`}
                                >
                                  {checklist.name}
                                </span>
                              </div>
                              <p 
                                className="text-sm text-muted-foreground"
                                data-testid={`text-description-${checklist.id}`}
                              >
                                {checklist.description}
                              </p>
                              <div className="flex items-center gap-2 mt-2">
                                <Badge 
                                  variant={checklist.isActive ? "default" : "secondary"}
                                  data-testid={`badge-status-${checklist.id}`}
                                >
                                  {checklist.isActive ? "Active" : "Inactive"}
                                </Badge>
                                <Badge 
                                  variant="outline" 
                                  className="text-xs"
                                  data-testid={`badge-count-${checklist.id}`}
                                >
                                  {checklist.items?.length || 0} items
                                </Badge>
                              </div>
                            </div>
                            <Switch
                              checked={checklist.isActive}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleActiveMutation.mutate(checklist.id);
                              }}
                              data-testid={`switch-active-${checklist.id}`}
                            />
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </motion.div>

            {/* Checklist Items */}
            <motion.div 
              className="lg:col-span-2"
              variants={cardAppear}
              data-testid="section-checklist-items"
            >
              {selectedChecklist ? (
                <Card data-testid="card-checklist-items">
                  <CardHeader data-testid="card-header-items">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle data-testid="title-selected-checklist">
                          {selectedChecklist.name}
                        </CardTitle>
                        <CardDescription data-testid="description-selected-checklist">
                          {selectedChecklist.description}
                        </CardDescription>
                      </div>
                      <Button
                        onClick={handleOpenItemDialog}
                        data-testid="button-add-item"
                      >
                        <Plus className="w-4 h-4 mr-2" data-testid="icon-plus-item" />
                        Add Item
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent data-testid="card-content-items">
                    {selectedChecklist.items.length > 0 ? (
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                      >
                        <SortableContext
                          items={selectedChecklist.items.map(item => item.id)}
                          strategy={verticalListSortingStrategy}
                        >
                          <div className="space-y-2" data-testid="list-checklist-items">
                            {selectedChecklist.items.map((item) => (
                              <SortableItem
                                key={item.id}
                                item={item}
                                onEdit={() => handleEditItem(item)}
                                onDelete={() => handleDeleteItem(item.id)}
                              />
                            ))}
                          </div>
                        </SortableContext>
                      </DndContext>
                    ) : (
                      <div className="text-center py-12" data-testid="empty-state-items">
                        <ClipboardList 
                          className="w-12 h-12 text-muted-foreground mx-auto mb-3" 
                          data-testid="icon-empty-state"
                        />
                        <p className="text-muted-foreground" data-testid="text-empty-state">
                          No items in this checklist
                        </p>
                        <Button
                          variant="outline"
                          className="mt-4"
                          onClick={handleOpenItemDialog}
                          data-testid="button-add-first-item"
                        >
                          Add First Item
                        </Button>
                      </div>
                    )}

                    {/* Checklist Stats */}
                    {selectedChecklist.items.length > 0 && (
                      <div className="mt-6 pt-6 border-t" data-testid="section-checklist-stats">
                        <h4 className="font-medium mb-3" data-testid="heading-stats">
                          Usage Statistics
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div data-testid="stat-total-uses">
                            <p className="text-sm text-muted-foreground" data-testid="label-total-uses">
                              Total Uses
                            </p>
                            <p className="text-xl font-bold" data-testid="value-total-uses">
                              {displayStats.totalUses}
                            </p>
                          </div>
                          <div data-testid="stat-completion-rate">
                            <p className="text-sm text-muted-foreground" data-testid="label-completion-rate">
                              Completion Rate
                            </p>
                            <p className="text-xl font-bold" data-testid="value-completion-rate">
                              {displayStats.completionRate}%
                            </p>
                          </div>
                          <div data-testid="stat-avg-time">
                            <p className="text-sm text-muted-foreground" data-testid="label-avg-time">
                              Avg Time
                            </p>
                            <p className="text-xl font-bold" data-testid="value-avg-time">
                              {displayStats.avgTimeToComplete} min
                            </p>
                          </div>
                          <div data-testid="stat-critical-items">
                            <p className="text-sm text-muted-foreground" data-testid="label-critical-items">
                              Critical Items
                            </p>
                            <p className="text-xl font-bold" data-testid="value-critical-items">
                              {selectedChecklist.items.filter(i => i.isCritical).length}
                            </p>
                          </div>
                        </div>
                        {displayStats.commonlySkipped.length > 0 && (
                          <div className="mt-4" data-testid="section-commonly-skipped">
                            <p className="text-sm font-medium mb-2" data-testid="label-commonly-skipped">
                              Commonly Skipped Items:
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {displayStats.commonlySkipped.map((item, index) => (
                                <Badge 
                                  key={index} 
                                  variant="outline"
                                  data-testid={`badge-skipped-${index}`}
                                >
                                  {item}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <Card data-testid="card-no-selection">
                  <CardContent className="text-center py-12">
                    <ClipboardList 
                      className="w-12 h-12 text-muted-foreground mx-auto mb-3" 
                      data-testid="icon-select-checklist"
                    />
                    <p className="text-muted-foreground" data-testid="text-select-checklist">
                      Select a checklist to manage items
                    </p>
                  </CardContent>
                </Card>
              )}
            </motion.div>
          </div>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" data-testid="content-templates">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card data-testid="template-safety">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" data-testid="icon-safety" />
                  Safety Inspection
                </CardTitle>
                <CardDescription data-testid="description-safety">
                  Comprehensive safety checklist
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" data-testid="button-use-safety">
                  <Copy className="w-4 h-4 mr-2" data-testid="icon-copy" />
                  Use Template
                </Button>
              </CardContent>
            </Card>

            <Card data-testid="template-equipment">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" data-testid="icon-equipment" />
                  Equipment Check
                </CardTitle>
                <CardDescription data-testid="description-equipment">
                  Standard equipment verification
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" data-testid="button-use-equipment">
                  <Copy className="w-4 h-4 mr-2" data-testid="icon-copy-equipment" />
                  Use Template
                </Button>
              </CardContent>
            </Card>

            <Card data-testid="template-compliance">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" data-testid="icon-compliance" />
                  MN Code Compliance
                </CardTitle>
                <CardDescription data-testid="description-compliance">
                  Minnesota energy code checklist
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" data-testid="button-use-compliance">
                  <Copy className="w-4 h-4 mr-2" data-testid="icon-copy-compliance" />
                  Use Template
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" data-testid="content-analytics">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card data-testid="card-checklist-performance">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart className="w-5 h-5" data-testid="icon-performance" />
                  Checklist Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {displayChecklists.slice(0, 3).map((checklist) => (
                    <div key={checklist.id} data-testid={`performance-${checklist.id}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium" data-testid={`name-${checklist.id}`}>
                          {checklist.name}
                        </span>
                        <span className="text-sm text-muted-foreground" data-testid={`rate-${checklist.id}`}>
                          {displayStats.completionRate}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-usage-trends">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" data-testid="icon-trends" />
                  Usage Trends
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div data-testid="trend-this-month">
                    <p className="text-sm text-muted-foreground" data-testid="label-this-month">
                      This Month
                    </p>
                    <p className="text-2xl font-bold" data-testid="value-this-month">
                      {displayStats.totalUses}
                    </p>
                  </div>
                  <div data-testid="trend-avg-time">
                    <p className="text-sm text-muted-foreground" data-testid="label-trend-avg">
                      Avg. Completion Time
                    </p>
                    <p className="text-2xl font-bold" data-testid="value-trend-avg">
                      {displayStats.avgTimeToComplete} min
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" data-testid="content-settings">
          <Card data-testid="card-settings">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" data-testid="icon-settings" />
                Checklist Settings
              </CardTitle>
              <CardDescription data-testid="description-settings">
                Configure default behaviors and requirements
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between" data-testid="setting-require-evidence">
                  <div>
                    <p className="font-medium" data-testid="label-evidence">Require Evidence</p>
                    <p className="text-sm text-muted-foreground" data-testid="description-evidence">
                      Automatically require evidence for critical items
                    </p>
                  </div>
                  <Switch data-testid="switch-require-evidence" />
                </div>
                <Separator />
                <div className="flex items-center justify-between" data-testid="setting-auto-complete">
                  <div>
                    <p className="font-medium" data-testid="label-auto-complete">Auto-Complete</p>
                    <p className="text-sm text-muted-foreground" data-testid="description-auto-complete">
                      Allow checklists to auto-complete when all items checked
                    </p>
                  </div>
                  <Switch data-testid="switch-auto-complete" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Checklist Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent data-testid="dialog-create-checklist">
          <DialogHeader>
            <DialogTitle data-testid="title-create-dialog">Create New Checklist</DialogTitle>
            <DialogDescription data-testid="description-create-dialog">
              Add a new QA checklist template
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div data-testid="field-name">
              <Label htmlFor="name" data-testid="label-name">Name</Label>
              <Input
                id="name"
                value={newChecklist.name}
                onChange={(e) => setNewChecklist({ ...newChecklist, name: e.target.value })}
                placeholder="e.g., Pre-Inspection Safety"
                data-testid="input-name"
              />
            </div>
            <div data-testid="field-category">
              <Label htmlFor="category" data-testid="label-category">Category</Label>
              <Select
                value={newChecklist.category}
                onValueChange={(value) => setNewChecklist({ ...newChecklist, category: value })}
              >
                <SelectTrigger id="category" data-testid="select-category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent data-testid="select-content-category">
                  {CHECKLIST_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value} data-testid={`option-${cat.value}`}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div data-testid="field-description">
              <Label htmlFor="description" data-testid="label-description">Description</Label>
              <Textarea
                id="description"
                value={newChecklist.description}
                onChange={(e) => setNewChecklist({ ...newChecklist, description: e.target.value })}
                placeholder="Brief description of this checklist"
                data-testid="textarea-description"
              />
            </div>
          </div>
          <DialogFooter data-testid="footer-create-dialog">
            <Button 
              variant="outline" 
              onClick={() => setIsCreateDialogOpen(false)}
              data-testid="button-cancel-create"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreateChecklist}
              disabled={createChecklistMutation.isPending}
              data-testid="button-save-create"
            >
              {createChecklistMutation.isPending ? "Creating..." : "Create Checklist"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Item Dialog */}
      <Dialog open={isItemDialogOpen} onOpenChange={setIsItemDialogOpen}>
        <DialogContent data-testid="dialog-item">
          <DialogHeader>
            <DialogTitle data-testid="title-item-dialog">
              {editingItem ? "Edit" : "Add"} Checklist Item
            </DialogTitle>
            <DialogDescription data-testid="description-item-dialog">
              {editingItem ? "Update" : "Add"} an item to {selectedChecklist?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div data-testid="field-item-text">
              <Label htmlFor="itemText" data-testid="label-item-text">Item Text</Label>
              <Input
                id="itemText"
                value={itemForm.itemText}
                onChange={(e) => setItemForm({ ...itemForm, itemText: e.target.value })}
                placeholder="e.g., Check for gas leaks"
                data-testid="input-item-text"
              />
            </div>
            <div data-testid="field-help-text">
              <Label htmlFor="helpText" data-testid="label-help-text">Help Text</Label>
              <Textarea
                id="helpText"
                value={itemForm.helpText}
                onChange={(e) => setItemForm({ ...itemForm, helpText: e.target.value })}
                placeholder="Additional instructions or guidance"
                data-testid="textarea-help-text"
              />
            </div>
            <div data-testid="field-evidence">
              <Label htmlFor="evidence" data-testid="label-evidence-type">Required Evidence</Label>
              <Select
                value={itemForm.requiredEvidence}
                onValueChange={(value) => setItemForm({ ...itemForm, requiredEvidence: value })}
              >
                <SelectTrigger id="evidence" data-testid="select-evidence">
                  <SelectValue placeholder="Select evidence type" />
                </SelectTrigger>
                <SelectContent data-testid="select-content-evidence">
                  {EVIDENCE_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value} data-testid={`option-evidence-${type.value}`}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2" data-testid="field-critical">
              <Switch
                id="critical"
                checked={itemForm.isCritical}
                onCheckedChange={(checked) => setItemForm({ ...itemForm, isCritical: checked })}
                data-testid="switch-critical"
              />
              <Label htmlFor="critical" data-testid="label-critical">Critical Item</Label>
            </div>
          </div>
          <DialogFooter data-testid="footer-item-dialog">
            <Button 
              variant="outline" 
              onClick={() => setIsItemDialogOpen(false)}
              data-testid="button-cancel-item"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSaveItem}
              disabled={createItemMutation.isPending}
              data-testid="button-save-item"
            >
              {createItemMutation.isPending ? "Saving..." : editingItem ? "Update Item" : "Add Item"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

// Phase 2 - BUILD: Export with ErrorBoundary wrapper for production resilience
export default function QAChecklists() {
  return (
    <ErrorBoundary>
      <QAChecklistsContent />
    </ErrorBoundary>
  );
}
