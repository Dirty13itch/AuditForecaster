import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
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

interface ChecklistWithItems extends QaChecklist {
  items: QaChecklistItem[];
}

interface ChecklistStats {
  totalUses: number;
  completionRate: number;
  avgTimeToComplete: number;
  commonlySkipped: string[];
}

// Sortable Item Component
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

  const getEvidenceIcon = (evidence: string) => {
    switch (evidence) {
      case 'photo':
        return <Camera className="w-4 h-4" />;
      case 'measurement':
        return <Ruler className="w-4 h-4" />;
      case 'signature':
        return <PenTool className="w-4 h-4" />;
      case 'note':
        return <FileText className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-3 bg-background border rounded-lg"
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-move"
      >
        <GripVertical className="w-5 h-5 text-muted-foreground" />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">{item.itemText}</span>
          {item.isCritical && (
            <Badge variant="destructive" className="text-xs">Critical</Badge>
          )}
          {item.requiredEvidence && (
            <div className="flex items-center gap-1">
              {getEvidenceIcon(item.requiredEvidence)}
              <span className="text-xs text-muted-foreground">Required</span>
            </div>
          )}
        </div>
        {item.helpText && (
          <p className="text-sm text-muted-foreground mt-1">{item.helpText}</p>
        )}
      </div>
      <div className="flex gap-1">
        <Button size="icon" variant="ghost" onClick={onEdit}>
          <Edit className="w-4 h-4" />
        </Button>
        <Button size="icon" variant="ghost" onClick={onDelete}>
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

export default function QAChecklists() {
  const { toast } = useToast();
  const [selectedTab, setSelectedTab] = useState("manage");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
  const [selectedChecklist, setSelectedChecklist] = useState<ChecklistWithItems | null>(null);
  const [editingItem, setEditingItem] = useState<QaChecklistItem | null>(null);

  // Form state for new checklist
  const [newChecklist, setNewChecklist] = useState({
    name: "",
    category: "pre-inspection",
    description: "",
    isActive: true,
    requiredForJobTypes: [] as string[]
  });

  // Form state for new/edit item
  const [itemForm, setItemForm] = useState({
    itemText: "",
    isCritical: false,
    category: "",
    helpText: "",
    requiredEvidence: ""
  });

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Fetch checklists
  const { data: checklists, isLoading: checklistsLoading } = useQuery<ChecklistWithItems[]>({
    queryKey: ['/api/qa/checklists'],
    enabled: false // Will be enabled when backend is ready
  });

  // Fetch checklist stats
  const { data: stats } = useQuery<ChecklistStats>({
    queryKey: ['/api/qa/checklists/stats', selectedChecklist?.id],
    enabled: false // Will be enabled when backend is ready
  });

  // Mock data
  const mockChecklists: ChecklistWithItems[] = [
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

  const mockStats: ChecklistStats = {
    totalUses: 145,
    completionRate: 92.5,
    avgTimeToComplete: 12.3,
    commonlySkipped: ["Document existing damage", "Take reference photos"]
  };

  const displayChecklists = checklists || mockChecklists;
  const displayStats = stats || mockStats;

  // Create checklist mutation
  const createChecklistMutation = useMutation({
    mutationFn: (data: any) => apiRequest('/api/qa/checklists', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    onSuccess: () => {
      toast({
        title: "Checklist created",
        description: "New checklist has been created successfully"
      });
      setIsCreateDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/qa/checklists'] });
    }
  });

  // Create item mutation
  const createItemMutation = useMutation({
    mutationFn: (data: any) => apiRequest('/api/qa/checklist-items', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    onSuccess: () => {
      toast({
        title: "Item added",
        description: "Checklist item has been added successfully"
      });
      setIsItemDialogOpen(false);
      setEditingItem(null);
      queryClient.invalidateQueries({ queryKey: ['/api/qa/checklists'] });
    }
  });

  // Reorder items mutation
  const reorderItemsMutation = useMutation({
    mutationFn: ({ checklistId, itemIds }: { checklistId: string; itemIds: string[] }) =>
      apiRequest(`/api/qa/checklists/${checklistId}/items/reorder`, {
        method: 'POST',
        body: JSON.stringify({ itemIds })
      }),
    onSuccess: () => {
      toast({
        title: "Items reordered",
        description: "Checklist items have been reordered"
      });
    }
  });

  // Toggle checklist active
  const toggleActiveMutation = useMutation({
    mutationFn: (checklistId: string) =>
      apiRequest(`/api/qa/checklists/${checklistId}/toggle-active`, {
        method: 'PATCH'
      }),
    onSuccess: () => {
      toast({
        title: "Status updated",
        description: "Checklist status has been updated"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/qa/checklists'] });
    }
  });

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id && selectedChecklist) {
      const oldIndex = selectedChecklist.items.findIndex(item => item.id === active.id);
      const newIndex = selectedChecklist.items.findIndex(item => item.id === over?.id);
      
      const newItems = arrayMove(selectedChecklist.items, oldIndex, newIndex);
      
      // Update local state
      setSelectedChecklist({
        ...selectedChecklist,
        items: newItems
      });

      // Send reorder request
      reorderItemsMutation.mutate({
        checklistId: selectedChecklist.id,
        itemIds: newItems.map(item => item.id)
      });
    }
  };

  // Get category icon
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'pre-inspection':
        return <Shield className="w-4 h-4" />;
      case 'during':
        return <ClipboardList className="w-4 h-4" />;
      case 'post':
        return <CheckCircle2 className="w-4 h-4" />;
      case 'compliance':
        return <FileText className="w-4 h-4" />;
      default:
        return <ClipboardList className="w-4 h-4" />;
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">QA Checklists</h1>
          <p className="text-muted-foreground mt-1">
            Manage inspection checklists and compliance templates
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Checklist
        </Button>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid grid-cols-4 w-full max-w-2xl">
          <TabsTrigger value="manage">Manage</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="manage" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Checklists List */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle>Checklists</CardTitle>
                  <CardDescription>Select a checklist to manage items</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[600px]">
                    <div className="space-y-2 pr-4">
                      {displayChecklists.map((checklist) => (
                        <div
                          key={checklist.id}
                          className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                            selectedChecklist?.id === checklist.id
                              ? "bg-accent border-accent-foreground/20"
                              : "hover:bg-muted"
                          }`}
                          onClick={() => setSelectedChecklist(checklist)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                {getCategoryIcon(checklist.category)}
                                <span className="font-medium">{checklist.name}</span>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {checklist.description}
                              </p>
                              <div className="flex items-center gap-2 mt-2">
                                <Badge variant={checklist.isActive ? "default" : "secondary"}>
                                  {checklist.isActive ? "Active" : "Inactive"}
                                </Badge>
                                <Badge variant="outline" className="text-xs">
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
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>

            {/* Checklist Items */}
            <div className="lg:col-span-2">
              {selectedChecklist ? (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>{selectedChecklist.name}</CardTitle>
                        <CardDescription>{selectedChecklist.description}</CardDescription>
                      </div>
                      <Button
                        onClick={() => {
                          setEditingItem(null);
                          setItemForm({
                            itemText: "",
                            isCritical: false,
                            category: "",
                            helpText: "",
                            requiredEvidence: ""
                          });
                          setIsItemDialogOpen(true);
                        }}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Item
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
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
                          <div className="space-y-2">
                            {selectedChecklist.items.map((item) => (
                              <SortableItem
                                key={item.id}
                                item={item}
                                onEdit={() => {
                                  setEditingItem(item);
                                  setItemForm({
                                    itemText: item.itemText,
                                    isCritical: item.isCritical,
                                    category: item.category || "",
                                    helpText: item.helpText || "",
                                    requiredEvidence: item.requiredEvidence || ""
                                  });
                                  setIsItemDialogOpen(true);
                                }}
                                onDelete={() => {
                                  // Implement delete
                                  toast({
                                    title: "Item deleted",
                                    description: "Checklist item has been deleted"
                                  });
                                }}
                              />
                            ))}
                          </div>
                        </SortableContext>
                      </DndContext>
                    ) : (
                      <div className="text-center py-12">
                        <ClipboardList className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                        <p className="text-muted-foreground">No items in this checklist</p>
                        <Button
                          variant="outline"
                          className="mt-4"
                          onClick={() => setIsItemDialogOpen(true)}
                        >
                          Add First Item
                        </Button>
                      </div>
                    )}

                    {/* Checklist Stats */}
                    {selectedChecklist.items.length > 0 && (
                      <div className="mt-6 pt-6 border-t">
                        <h4 className="font-medium mb-3">Usage Statistics</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Total Uses</p>
                            <p className="text-xl font-bold">{displayStats.totalUses}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Completion Rate</p>
                            <p className="text-xl font-bold">{displayStats.completionRate}%</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Avg Time</p>
                            <p className="text-xl font-bold">{displayStats.avgTimeToComplete} min</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Critical Items</p>
                            <p className="text-xl font-bold">
                              {selectedChecklist.items.filter(i => i.isCritical).length}
                            </p>
                          </div>
                        </div>
                        {displayStats.commonlySkipped.length > 0 && (
                          <div className="mt-4">
                            <p className="text-sm font-medium mb-2">Commonly Skipped Items:</p>
                            <div className="flex flex-wrap gap-2">
                              {displayStats.commonlySkipped.map(item => (
                                <Badge key={item} variant="outline">
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
                <Card>
                  <CardContent className="text-center py-12">
                    <ClipboardList className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">Select a checklist to manage items</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="templates">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Checklist Templates */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Safety Inspection
                </CardTitle>
                <CardDescription>Comprehensive safety checklist</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">15 critical items</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Copy className="w-4 h-4 mr-2" />
                    Use Template
                  </Button>
                  <Button variant="ghost" size="sm">Preview</Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  45L Compliance
                </CardTitle>
                <CardDescription>Tax credit requirements checklist</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">23 required items</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Copy className="w-4 h-4 mr-2" />
                    Use Template
                  </Button>
                  <Button variant="ghost" size="sm">Preview</Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardList className="w-5 h-5" />
                  Equipment Check
                </CardTitle>
                <CardDescription>Pre-inspection equipment verification</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">8 verification items</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Copy className="w-4 h-4 mr-2" />
                    Use Template
                  </Button>
                  <Button variant="ghost" size="sm">Preview</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analytics">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Active Checklists</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {displayChecklists.filter(c => c.isActive).length}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Total Items</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {displayChecklists.reduce((sum, c) => sum + c.items.length, 0)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Avg Completion</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">92.5%</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Critical Items</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {displayChecklists.reduce((sum, c) => 
                    sum + c.items.filter(i => i.isCritical).length, 0
                  )}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Checklist Usage Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                <BarChart className="w-12 h-12 opacity-20" />
                <span className="ml-3">Usage chart will be displayed here</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Checklist Settings</CardTitle>
              <CardDescription>Configure default settings for checklists</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Auto-assign to new jobs</p>
                  <p className="text-sm text-muted-foreground">
                    Automatically assign relevant checklists to new jobs
                  </p>
                </div>
                <Switch />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Require all critical items</p>
                  <p className="text-sm text-muted-foreground">
                    Block job completion if critical items are not completed
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Track completion time</p>
                  <p className="text-sm text-muted-foreground">
                    Record time taken to complete each checklist
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Checklist Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>Create New Checklist</DialogTitle>
            <DialogDescription>
              Create a new checklist template for inspections
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={newChecklist.name}
                onChange={(e) => setNewChecklist({ ...newChecklist, name: e.target.value })}
                placeholder="e.g., Pre-Inspection Safety"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={newChecklist.category}
                onValueChange={(value) => setNewChecklist({ ...newChecklist, category: value })}
              >
                <SelectTrigger id="category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pre-inspection">Pre-Inspection</SelectItem>
                  <SelectItem value="during">During Inspection</SelectItem>
                  <SelectItem value="post">Post-Inspection</SelectItem>
                  <SelectItem value="compliance">Compliance</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={newChecklist.description}
                onChange={(e) => setNewChecklist({ ...newChecklist, description: e.target.value })}
                placeholder="Describe the purpose of this checklist..."
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="active"
                checked={newChecklist.isActive}
                onCheckedChange={(checked) => setNewChecklist({ ...newChecklist, isActive: checked })}
              />
              <Label htmlFor="active">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => createChecklistMutation.mutate(newChecklist)}>
              Create Checklist
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Item Dialog */}
      <Dialog open={isItemDialogOpen} onOpenChange={setIsItemDialogOpen}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit Item" : "Add Checklist Item"}</DialogTitle>
            <DialogDescription>
              {editingItem ? "Update the checklist item details" : "Add a new item to the checklist"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="itemText">Item Text</Label>
              <Input
                id="itemText"
                value={itemForm.itemText}
                onChange={(e) => setItemForm({ ...itemForm, itemText: e.target.value })}
                placeholder="e.g., Check for gas leaks"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="helpText">Help Text (Optional)</Label>
              <Textarea
                id="helpText"
                value={itemForm.helpText}
                onChange={(e) => setItemForm({ ...itemForm, helpText: e.target.value })}
                placeholder="Additional instructions or guidance..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="evidence">Required Evidence</Label>
              <Select
                value={itemForm.requiredEvidence}
                onValueChange={(value) => setItemForm({ ...itemForm, requiredEvidence: value })}
              >
                <SelectTrigger id="evidence">
                  <SelectValue placeholder="Select evidence type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="photo">Photo</SelectItem>
                  <SelectItem value="measurement">Measurement</SelectItem>
                  <SelectItem value="signature">Signature</SelectItem>
                  <SelectItem value="note">Note</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="critical"
                checked={itemForm.isCritical}
                onCheckedChange={(checked) => setItemForm({ ...itemForm, isCritical: checked })}
              />
              <Label htmlFor="critical">Critical Item</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsItemDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                const data = {
                  ...itemForm,
                  checklistId: selectedChecklist?.id,
                  sortOrder: selectedChecklist?.items.length || 0
                };
                createItemMutation.mutate(data);
              }}
            >
              {editingItem ? "Update Item" : "Add Item"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}