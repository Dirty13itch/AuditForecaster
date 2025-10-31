import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useConfirmDialog } from "@/components/ConfirmDialog";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { 
  Plus, 
  Wand2, 
  Search, 
  FileText, 
  Edit, 
  Trash2, 
  Copy, 
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  RefreshCw,
  Loader2,
  Archive,
  History
} from "lucide-react";
import { format } from "date-fns";
import type { 
  ReportTemplate, 
  InsertReportTemplate
} from "@shared/schema";

// Phase 3 - OPTIMIZE: Module-level constants prevent recreation on every render
// Phase 6 - DOCUMENT: Template categories supported by the system
const TEMPLATE_CATEGORIES = {
  PRE_DRYWALL: "pre_drywall",
  FINAL: "final",
  DUCT_TESTING: "duct_testing",
  BLOWER_DOOR: "blower_door",
  PRE_INSULATION: "pre_insulation",
  POST_INSULATION: "post_insulation",
  ROUGH_IN: "rough_in",
  ENERGY_AUDIT: "energy_audit",
  CUSTOM: "custom",
} as const;

// Phase 6 - DOCUMENT: Template status workflow states
// draft -> published -> archived
const TEMPLATE_STATUS = {
  DRAFT: "draft",
  PUBLISHED: "published",
  ARCHIVED: "archived",
} as const;

// Phase 6 - DOCUMENT: Status badge variant mapping for visual consistency
const STATUS_BADGE_VARIANTS = {
  [TEMPLATE_STATUS.PUBLISHED]: "default",
  [TEMPLATE_STATUS.DRAFT]: "secondary",
  [TEMPLATE_STATUS.ARCHIVED]: "outline",
} as const;

// Phase 6 - DOCUMENT: Skeleton loader counts for consistent loading UX
const SKELETON_COUNTS = {
  templateList: 6,
  templateCards: 4,
} as const;

// Phase 6 - DOCUMENT: Category display names for UI
const CATEGORY_LABELS: Record<string, string> = {
  pre_drywall: "Pre-Drywall",
  final: "Final Inspection",
  duct_testing: "Duct Testing",
  blower_door: "Blower Door",
  pre_insulation: "Pre-Insulation",
  post_insulation: "Post-Insulation",
  rough_in: "Rough-In",
  energy_audit: "Energy Audit",
  custom: "Custom",
};

// Phase 2 - BUILD: Main component content
function ReportTemplatesContent() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isCreating, setIsCreating] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ReportTemplate | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);
  const [newTemplate, setNewTemplate] = useState<Partial<InsertReportTemplate>>({
    name: "",
    description: "",
    category: "custom",
    status: "draft",
    isDefault: false
  });
  const { showConfirm, ConfirmDialog } = useConfirmDialog();

  // Phase 5 - HARDEN: All queries have retry: 2 for resilience
  const { 
    data: templates = [], 
    isLoading: templatesLoading,
    error: templatesError,
    refetch: refetchTemplates,
  } = useQuery<ReportTemplate[]>({
    queryKey: ["/api/report-templates"],
    retry: 2,
  });

  // Phase 5 - HARDEN: Mutation with error handling
  const createTemplateMutation = useMutation({
    mutationFn: async (data: Partial<InsertReportTemplate>) => {
      // Get the current user to set the userId
      const userResponse = await fetch("/api/auth/user");
      const userData = userResponse.ok ? await userResponse.json() : null;
      
      const templateData: InsertReportTemplate = {
        name: data.name || "",
        description: data.description || null,
        category: data.category || "custom",
        status: data.status || "draft",
        isDefault: data.isDefault || false,
        userId: userData?.id || null,
        sections: [],
        publishedAt: null
      };
      
      return apiRequest("POST", "/api/report-templates", templateData);
    },
    onSuccess: (newTemplate: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/report-templates"] });
      setIsCreating(false);
      setNewTemplate({ name: "", description: "", category: "custom", status: "draft", isDefault: false });
      toast({
        title: "Template created",
        description: "Your report template has been created successfully.",
      });
      navigate(`/report-templates/${newTemplate.id}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create template",
        description: error.message || "Please check your input and try again.",
        variant: "destructive",
      });
    },
  });

  const updateTemplateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ReportTemplate> }) => {
      return apiRequest("PATCH", `/api/report-templates/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/report-templates"] });
      setEditingTemplate(null);
      toast({
        title: "Template updated",
        description: "Your changes have been saved successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update template",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/report-templates/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/report-templates"] });
      toast({ title: "Template deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Failed to delete template", 
        description: error.message || "This template may be in use.",
        variant: "destructive" 
      });
    },
  });

  const publishTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("PATCH", `/api/report-templates/${id}`, { 
        status: "published",
        publishedAt: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/report-templates"] });
      toast({ title: "Template published successfully" });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Failed to publish template",
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const archiveTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("PATCH", `/api/report-templates/${id}`, { 
        status: "archived",
        isActive: false
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/report-templates"] });
      toast({ title: "Template archived successfully" });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Failed to archive template",
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const duplicateTemplateMutation = useMutation({
    mutationFn: async (template: ReportTemplate) => {
      const userResponse = await fetch("/api/auth/user");
      const userData = userResponse.ok ? await userResponse.json() : null;
      
      const duplicateData: InsertReportTemplate = {
        name: `${template.name} (Copy)`,
        description: template.description,
        category: template.category,
        status: "draft",
        isDefault: false,
        userId: userData?.id || null,
        sections: template.sections || [],
        publishedAt: null
      };
      
      return apiRequest("POST", "/api/report-templates", duplicateData);
    },
    onSuccess: (newTemplate: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/report-templates"] });
      toast({
        title: "Template duplicated",
        description: "A copy of the template has been created.",
      });
      navigate(`/report-templates/${newTemplate.id}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to duplicate template",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Phase 3 - OPTIMIZE: Memoize filtered templates list
  const filteredTemplates = useMemo(() => {
    return templates.filter(template => {
      const matchesSearch = 
        template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (template.description?.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesStatus = statusFilter === "all" || template.status === statusFilter;
      
      return matchesSearch && matchesStatus && template.isActive;
    });
  }, [templates, searchQuery, statusFilter]);

  // Phase 3 - OPTIMIZE: useCallback for all event handlers
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }, []);

  const handleStatusFilterChange = useCallback((value: string) => {
    setStatusFilter(value);
  }, []);

  const handleCreateTemplate = useCallback(() => {
    setNewTemplate({ name: "", description: "", category: "custom", status: "draft", isDefault: false });
    setIsCreating(true);
  }, []);

  const handleEditTemplate = useCallback((template: ReportTemplate) => {
    setEditingTemplate(template);
    setNewTemplate({
      name: template.name,
      description: template.description || "",
      category: template.category,
      status: template.status,
      isDefault: template.isDefault || false
    });
  }, []);

  const handleDeleteTemplate = useCallback(async (id: string, name: string) => {
    const confirmed = await showConfirm(
      "Delete Template",
      `Are you sure you want to delete "${name}"? This action cannot be undone.`,
      {
        confirmText: "Delete",
        cancelText: "Cancel",
        variant: "destructive"
      }
    );
    if (confirmed) {
      deleteTemplateMutation.mutate(id);
    }
  }, [showConfirm, deleteTemplateMutation]);

  const handlePublishTemplate = useCallback(async (id: string, name: string) => {
    const confirmed = await showConfirm(
      "Publish Template",
      `Publish "${name}"? This will make it available for creating reports.`,
      {
        confirmText: "Publish",
        cancelText: "Cancel",
      }
    );
    if (confirmed) {
      publishTemplateMutation.mutate(id);
    }
  }, [showConfirm, publishTemplateMutation]);

  const handleArchiveTemplate = useCallback(async (id: string, name: string) => {
    const confirmed = await showConfirm(
      "Archive Template",
      `Archive "${name}"? Archived templates won't be available for new reports.`,
      {
        confirmText: "Archive",
        cancelText: "Cancel",
      }
    );
    if (confirmed) {
      archiveTemplateMutation.mutate(id);
    }
  }, [showConfirm, archiveTemplateMutation]);

  const handleDuplicateTemplate = useCallback((template: ReportTemplate) => {
    duplicateTemplateMutation.mutate(template);
  }, [duplicateTemplateMutation]);

  const handleViewTemplate = useCallback((id: string) => {
    navigate(`/report-templates/${id}`);
  }, [navigate]);

  const handleOpenDesigner = useCallback(() => {
    navigate("/report-template-designer");
  }, [navigate]);

  const handleSaveTemplate = useCallback(() => {
    if (editingTemplate) {
      updateTemplateMutation.mutate({
        id: editingTemplate.id,
        data: {
          name: newTemplate.name,
          description: newTemplate.description,
          category: newTemplate.category,
          isDefault: newTemplate.isDefault,
        }
      });
    } else {
      createTemplateMutation.mutate(newTemplate);
    }
  }, [editingTemplate, newTemplate, updateTemplateMutation, createTemplateMutation]);

  const handleCancelEdit = useCallback(() => {
    setEditingTemplate(null);
    setIsCreating(false);
    setNewTemplate({ name: "", description: "", category: "custom", status: "draft", isDefault: false });
  }, []);

  // Phase 3 - OPTIMIZE: useCallback for retry handler
  const handleRetryTemplates = useCallback(() => {
    refetchTemplates();
  }, [refetchTemplates]);

  // Phase 6 - DOCUMENT: Helper to get status icon
  const getStatusIcon = useCallback((status: string) => {
    switch (status) {
      case TEMPLATE_STATUS.PUBLISHED:
        return <CheckCircle2 className="h-4 w-4" />;
      case TEMPLATE_STATUS.DRAFT:
        return <Clock className="h-4 w-4" />;
      case TEMPLATE_STATUS.ARCHIVED:
        return <Archive className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  }, []);

  // Phase 6 - DOCUMENT: Helper to get status badge variant
  const getStatusBadgeVariant = useCallback((status: string) => {
    return STATUS_BADGE_VARIANTS[status as keyof typeof STATUS_BADGE_VARIANTS] || "outline";
  }, []);

  // Phase 2 - BUILD: Per-query error state with retry button
  if (templatesError) {
    return (
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="flex items-center gap-3 mb-6">
          <FileText className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Report Templates</h1>
        </div>
        <Card className="border-destructive/20 bg-destructive/5" data-testid="error-templates-query">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
            <h3 className="text-lg font-semibold text-destructive mb-2">Failed to Load Templates</h3>
            <p className="text-sm text-muted-foreground mb-4 text-center max-w-md">
              {templatesError instanceof Error ? templatesError.message : "Unable to fetch report templates. Please check your connection and try again."}
            </p>
            <Button 
              onClick={handleRetryTemplates}
              variant="outline"
              data-testid="button-retry-templates"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <FileText className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold" data-testid="text-page-title">Report Templates</h1>
            <p className="text-muted-foreground mt-1" data-testid="text-page-subtitle">
              Create and manage inspection report templates
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button 
            variant="outline"
            onClick={handleOpenDesigner}
            data-testid="button-visual-designer"
          >
            <Wand2 className="h-4 w-4 mr-2" />
            Visual Designer
          </Button>
          <Button onClick={handleCreateTemplate} data-testid="button-create-template">
            <Plus className="h-4 w-4 mr-2" />
            Create Template
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="pl-10"
            data-testid="input-search-templates"
          />
        </div>
        <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
          <SelectTrigger className="w-[180px]" data-testid="select-status-filter">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" data-testid="option-status-all">All Status</SelectItem>
            <SelectItem value="draft" data-testid="option-status-draft">Draft</SelectItem>
            <SelectItem value="published" data-testid="option-status-published">Published</SelectItem>
            <SelectItem value="archived" data-testid="option-status-archived">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Phase 2 - BUILD: Comprehensive skeleton loaders */}
      {templatesLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3" data-testid="skeleton-templates">
          {Array.from({ length: SKELETON_COUNTS.templateCards }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-5 w-16" />
                </div>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-40" />
              </CardContent>
              <CardFooter className="flex gap-2">
                <Skeleton className="h-9 flex-1" />
                <Skeleton className="h-9 flex-1" />
                <Skeleton className="h-9 w-9" />
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : filteredTemplates.length === 0 ? (
        <Card data-testid="empty-templates">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2" data-testid="text-empty-title">
              {searchQuery || statusFilter !== "all" ? "No templates found" : "No templates yet"}
            </h3>
            <p className="text-muted-foreground text-center max-w-md mb-4" data-testid="text-empty-description">
              {searchQuery || statusFilter !== "all" 
                ? "Try adjusting your search or filter criteria."
                : "Create your first template to get started with inspection reports."}
            </p>
            {!searchQuery && statusFilter === "all" && (
              <Button onClick={handleCreateTemplate} data-testid="button-create-first-template">
                <Plus className="h-4 w-4 mr-2" />
                Create Template
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3" data-testid="grid-templates">
          {filteredTemplates.map((template) => (
            <Card key={template.id} className="hover-elevate" data-testid={`card-template-${template.id}`}>
              <CardHeader className="space-y-0 pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-lg flex items-center gap-2" data-testid={`text-template-name-${template.id}`}>
                    {getStatusIcon(template.status)}
                    {template.name}
                  </CardTitle>
                  <Badge variant={getStatusBadgeVariant(template.status)} data-testid={`badge-status-${template.id}`}>
                    {template.status}
                  </Badge>
                </div>
                {template.isDefault && (
                  <Badge variant="outline" className="w-fit mt-2" data-testid={`badge-default-${template.id}`}>
                    Default
                  </Badge>
                )}
              </CardHeader>
              <CardContent className="space-y-3 pt-4">
                <CardDescription className="line-clamp-2" data-testid={`text-template-description-${template.id}`}>
                  {template.description || "No description provided"}
                </CardDescription>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  <span data-testid={`text-category-${template.id}`}>{CATEGORY_LABELS[template.category] || template.category}</span>
                </div>
                {template.version && template.version > 1 && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <History className="h-4 w-4" />
                    <span data-testid={`text-version-${template.id}`}>Version {template.version}</span>
                  </div>
                )}
                {template.createdAt && (
                  <div className="text-xs text-muted-foreground" data-testid={`text-created-${template.id}`}>
                    Created {format(new Date(template.createdAt), "MMM d, yyyy")}
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex flex-wrap gap-2 pt-4">
                <Button
                  variant="default"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleViewTemplate(template.id)}
                  data-testid={`button-view-${template.id}`}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleEditTemplate(template)}
                  data-testid={`button-edit-${template.id}`}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDuplicateTemplate(template)}
                  disabled={duplicateTemplateMutation.isPending}
                  data-testid={`button-duplicate-${template.id}`}
                >
                  {duplicateTemplateMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
                {template.status === "draft" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePublishTemplate(template.id, template.name)}
                    disabled={publishTemplateMutation.isPending}
                    data-testid={`button-publish-${template.id}`}
                  >
                    {publishTemplateMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                  </Button>
                )}
                {template.status === "published" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleArchiveTemplate(template.id, template.name)}
                    disabled={archiveTemplateMutation.isPending}
                    data-testid={`button-archive-${template.id}`}
                  >
                    {archiveTemplateMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Archive className="h-4 w-4" />
                    )}
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDeleteTemplate(template.id, template.name)}
                  disabled={deleteTemplateMutation.isPending}
                  data-testid={`button-delete-${template.id}`}
                >
                  {deleteTemplateMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Phase 2 - BUILD: Create/Edit template dialog with validation */}
      <Dialog open={isCreating || !!editingTemplate} onOpenChange={(open) => !open && handleCancelEdit()}>
        <DialogContent data-testid="dialog-template-form">
          <DialogHeader>
            <DialogTitle data-testid="text-dialog-title">
              {editingTemplate ? "Edit Template" : "Create Report Template"}
            </DialogTitle>
            <DialogDescription data-testid="text-dialog-description">
              {editingTemplate ? "Update the template details below." : "Create a new inspection report template"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="template-name" data-testid="label-template-name">Template Name *</Label>
              <Input
                id="template-name"
                value={newTemplate.name}
                onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                placeholder="Enter template name"
                data-testid="input-template-name"
              />
              {!newTemplate.name && (
                <p className="text-sm text-muted-foreground mt-1" data-testid="text-name-hint">
                  Template name is required
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="template-description" data-testid="label-template-description">Description</Label>
              <Textarea
                id="template-description"
                value={newTemplate.description || ""}
                onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                placeholder="Enter template description"
                data-testid="input-template-description"
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="template-category" data-testid="label-template-category">Category *</Label>
              <Select
                value={newTemplate.category}
                onValueChange={(value) => setNewTemplate({ ...newTemplate, category: value as any })}
              >
                <SelectTrigger data-testid="select-template-category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pre_drywall" data-testid="option-category-pre-drywall">Pre-Drywall</SelectItem>
                  <SelectItem value="final" data-testid="option-category-final">Final Inspection</SelectItem>
                  <SelectItem value="duct_testing" data-testid="option-category-duct">Duct Testing</SelectItem>
                  <SelectItem value="blower_door" data-testid="option-category-blower">Blower Door</SelectItem>
                  <SelectItem value="pre_insulation" data-testid="option-category-pre-insulation">Pre-Insulation</SelectItem>
                  <SelectItem value="post_insulation" data-testid="option-category-post-insulation">Post-Insulation</SelectItem>
                  <SelectItem value="rough_in" data-testid="option-category-rough">Rough-In</SelectItem>
                  <SelectItem value="energy_audit" data-testid="option-category-energy">Energy Audit</SelectItem>
                  <SelectItem value="custom" data-testid="option-category-custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="template-default" className="cursor-pointer" data-testid="label-is-default">
                Set as default template
              </Label>
              <Switch
                id="template-default"
                checked={newTemplate.isDefault || false}
                onCheckedChange={(checked) => setNewTemplate({ ...newTemplate, isDefault: checked })}
                data-testid="switch-is-default"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleCancelEdit}
              data-testid="button-cancel-template"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveTemplate}
              disabled={
                !newTemplate.name || 
                !newTemplate.category ||
                createTemplateMutation.isPending ||
                updateTemplateMutation.isPending
              }
              data-testid="button-save-template"
            >
              {(createTemplateMutation.isPending || updateTemplateMutation.isPending) ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {editingTemplate ? "Updating..." : "Creating..."}
                </>
              ) : (
                editingTemplate ? "Update Template" : "Create Template"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Phase 2 - BUILD: Confirmation dialog */}
      <ConfirmDialog />
    </div>
  );
}

// Phase 2 - BUILD: Wrap main component in ErrorBoundary
export default function ReportTemplatesPage() {
  return (
    <ErrorBoundary
      fallback={
        <div className="container mx-auto p-6 max-w-7xl">
          <Card className="border-destructive/20 bg-destructive/5" data-testid="error-boundary-fallback">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <XCircle className="h-12 w-12 text-destructive mb-4" />
              <h3 className="text-lg font-semibold text-destructive mb-2">Something went wrong</h3>
              <p className="text-sm text-muted-foreground mb-4 text-center max-w-md">
                An unexpected error occurred while loading the templates page. Please refresh the page to try again.
              </p>
              <Button 
                onClick={() => window.location.reload()}
                variant="outline"
                data-testid="button-reload-page"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Reload Page
              </Button>
            </CardContent>
          </Card>
        </div>
      }
    >
      <ReportTemplatesContent />
    </ErrorBoundary>
  );
}
