import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { Plus, Search, Filter, Trash2, RefreshCw, CheckSquare, Image as ImageIcon, X, FilterX, Pencil, ScanText, PenTool, AlertTriangle, CheckCircle2, Clock, HelpCircle, Loader2 } from "lucide-react";
import { useBulkSelection } from "@/hooks/use-bulk-selection";
import { SelectionToolbar, commonBulkActions } from "@/components/SelectionToolbar";
import { BulkDeleteDialog, BulkExportDialog, type ExportFormat } from "@/components/BulkActionDialogs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import JobCard from "@/components/JobCard";
import JobDialog from "@/components/JobDialog";
import WorkflowStepper from "@/components/WorkflowStepper";
import { OfflineBanner } from "@/components/OfflineBanner";
import { ObjectUploader } from "@/components/ObjectUploader";
import { PhotoCapture } from "@/components/PhotoCapture";
import { PhotoAnnotator, type Annotation } from "@/components/PhotoAnnotator";
import { PhotoOCR } from "@/components/PhotoOCR";
import { SignatureCapture } from "@/components/SignatureCapture";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Job, Builder, Photo, ChecklistItem, InsertJob, InsertPhoto, InsertChecklistItem } from "@shared/schema";
import { clientLogger } from "@/lib/logger";
import ChecklistItemComponent from "@/components/ChecklistItem";
import {
  TAG_CATEGORIES,
  INSPECTION_TAGS,
  STATUS_TAGS,
  PRIORITY_TAGS,
  LOCATION_TAGS,
  getTagConfig,
  getCategoryLabel,
  type PhotoTag,
  type TagCategory,
} from "@shared/photoTags";

type SortOption = "date" | "priority" | "status" | "name";

export default function Jobs() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [builderFilter, setBuilderFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [complianceFilter, setComplianceFilter] = useState("all");
  const [sortBy, setSortBy] = useState<SortOption>("date");
  const [isJobDialogOpen, setIsJobDialogOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [bulkStatusDialogOpen, setBulkStatusDialogOpen] = useState(false);
  const [bulkBuilderDialogOpen, setBulkBuilderDialogOpen] = useState(false);
  const [bulkStatus, setBulkStatus] = useState("");
  const [bulkBuilder, setBulkBuilder] = useState("");
  const [workflowJobId, setWorkflowJobId] = useState<string | null>(null);
  const [photosDialogOpen, setPhotosDialogOpen] = useState(false);
  const [selectedJobForPhotos, setSelectedJobForPhotos] = useState<Job | null>(null);
  const [filterTags, setFilterTags] = useState<PhotoTag[]>([]);
  const [annotatorOpen, setAnnotatorOpen] = useState(false);
  const [photoToAnnotate, setPhotoToAnnotate] = useState<Photo | null>(null);
  const [ocrOpen, setOcrOpen] = useState(false);
  const [photoToOCR, setPhotoToOCR] = useState<Photo | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<Set<string>>(new Set());
  const [selectedChecklistItemForPhoto, setSelectedChecklistItemForPhoto] = useState<string | null>(null);
  const [completionValidationDialogOpen, setCompletionValidationDialogOpen] = useState(false);
  const [missingPhotoItems, setMissingPhotoItems] = useState<ChecklistItem[]>([]);
  const [signatureDialogOpen, setSignatureDialogOpen] = useState(false);
  const [selectedJobForSignature, setSelectedJobForSignature] = useState<Job | null>(null);
  const [complianceDrawerOpen, setComplianceDrawerOpen] = useState(false);
  const [selectedJobForCompliance, setSelectedJobForCompliance] = useState<Job | null>(null);

  const { data: jobs = [], isLoading: isLoadingJobs} = useQuery<Job[]>({
    queryKey: ["/api/jobs"],
  });

  const { data: builders = [], isLoading: isLoadingBuilders } = useQuery<Builder[]>({
    queryKey: ["/api/builders"],
  });

  const { data: photos = [], isLoading: isLoadingPhotos } = useQuery<Photo[]>({
    queryKey: ["/api/photos", selectedJobForPhotos?.id],
    queryFn: async () => {
      if (!selectedJobForPhotos?.id) return [];
      const response = await fetch(`/api/photos?jobId=${selectedJobForPhotos.id}`);
      if (!response.ok) throw new Error('Failed to fetch photos');
      return response.json();
    },
    enabled: !!selectedJobForPhotos?.id,
  });

  const { data: checklistItems = [], isLoading: isLoadingChecklistItems } = useQuery<ChecklistItem[]>({
    queryKey: ["/api/checklist-items", selectedJobForPhotos?.id],
    queryFn: async () => {
      if (!selectedJobForPhotos?.id) return [];
      const response = await fetch(`/api/checklist-items?jobId=${selectedJobForPhotos.id}`);
      if (!response.ok) throw new Error('Failed to fetch checklist items');
      return response.json();
    },
    enabled: !!selectedJobForPhotos?.id,
  });

  const { data: complianceData, isLoading: isLoadingCompliance } = useQuery<{
    status: string;
    violations: Array<{
      ruleId: string;
      metricType: string;
      threshold: number;
      actual: number;
      severity: string;
      description: string;
      units: string;
    }>;
    evaluatedAt: string;
  }>({
    queryKey: ["/api/compliance/jobs", selectedJobForCompliance?.id],
    queryFn: async () => {
      if (!selectedJobForCompliance?.id) return { status: "unknown", violations: [], evaluatedAt: new Date().toISOString() };
      const response = await fetch(`/api/compliance/jobs/${selectedJobForCompliance.id}`);
      if (!response.ok) throw new Error('Failed to fetch compliance data');
      return response.json();
    },
    enabled: !!selectedJobForCompliance?.id && complianceDrawerOpen,
  });

  const createJobMutation = useMutation({
    mutationFn: async (data: InsertJob) => {
      return apiRequest("POST", "/api/jobs", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      toast({
        title: "Success",
        description: "Job created successfully",
      });
      setIsJobDialogOpen(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create job",
        variant: "destructive",
      });
    },
  });

  const updateJobMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertJob> }) => {
      return apiRequest("PUT", `/api/jobs/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      toast({
        title: "Success",
        description: "Job updated successfully",
      });
      setIsJobDialogOpen(false);
      setEditingJob(null);
      setWorkflowJobId(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update job",
        variant: "destructive",
      });
    },
  });

  const deleteJobsMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const response = await apiRequest("DELETE", "/api/jobs/bulk", { ids });
      return response;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      toast({
        title: "Jobs deleted",
        description: `Successfully deleted ${data.deleted} of ${data.total} jobs`,
      });
      actions.deselectAll();
      setShowDeleteDialog(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const exportMutation = useMutation({
    mutationFn: async ({ ids, format }: { ids: string[], format: ExportFormat }) => {
      const response = await fetch("/api/jobs/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ids, format }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Export failed");
      }
      
      // Branch before consuming response body
      if (format === 'csv') {
        // For CSV, download the blob directly
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `jobs-export-${Date.now()}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        // Can't easily parse CSV count, use IDs length as approximation
        return { format, count: ids.length };
      }
      
      // JSON format - parse the response to get actual count
      const data = await response.json();
      const count = Array.isArray(data) ? data.length : ids.length;
      
      // Trigger download of JSON
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `jobs-export-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      return { format, count };
    },
    onSuccess: (data) => {
      toast({
        title: "Export successful",
        description: `Exported ${data.count} jobs as ${data.format.toUpperCase()}`,
      });
      setShowExportDialog(false);
      actions.deselectAll();
    },
    onError: (error: Error) => {
      toast({
        title: "Export failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: async ({ jobIds, updates }: { jobIds: string[]; updates: Partial<InsertJob> }) => {
      await Promise.all(jobIds.map(id => apiRequest("PUT", `/api/jobs/${id}`, updates)));
    },
    onSuccess: (_, { jobIds }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      toast({
        title: "Success",
        description: `${jobIds.length} job(s) updated successfully`,
      });
      actions.deselectAll();
      setBulkStatusDialogOpen(false);
      setBulkBuilderDialogOpen(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update jobs",
        variant: "destructive",
      });
    },
  });

  const createPhotoMutation = useMutation({
    mutationFn: async (data: InsertPhoto) => {
      return apiRequest("POST", "/api/photos", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/photos", selectedJobForPhotos?.id] });
      toast({
        title: "Success",
        description: "Photo uploaded successfully",
      });
      setPhotoCaption("");
      setSelectedPhotoTags([]);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to upload photo",
        variant: "destructive",
      });
    },
  });

  const deletePhotoMutation = useMutation({
    mutationFn: async (photoId: string) => {
      return apiRequest("DELETE", `/api/photos/${photoId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/photos", selectedJobForPhotos?.id] });
      toast({
        title: "Success",
        description: "Photo deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete photo",
        variant: "destructive",
      });
    },
  });

  const updatePhotoMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertPhoto> }) => {
      return apiRequest("PATCH", `/api/photos/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/photos", selectedJobForPhotos?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/checklist-items", selectedJobForPhotos?.id] });
      toast({
        title: "Success",
        description: "Annotations saved successfully",
      });
      setAnnotatorOpen(false);
      setPhotoToAnnotate(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save annotations",
        variant: "destructive",
      });
    },
  });

  const updateChecklistItemMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertChecklistItem> }) => {
      return apiRequest("PATCH", `/api/checklist-items/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/checklist-items", selectedJobForPhotos?.id] });
      toast({
        title: "Success",
        description: "Checklist item updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update checklist item",
        variant: "destructive",
      });
    },
  });

  const handleSignatureSave = async (signatureData: {
    signatureBlob: Blob;
    signerName: string;
    signerRole: string;
  }) => {
    if (!selectedJobForSignature) return;

    try {
      const uploadResponse = await fetch("/api/objects/upload", {
        method: "POST",
        credentials: "include",
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to get upload URL");
      }

      const { uploadURL, objectPath } = await uploadResponse.json();

      const uploadResult = await fetch(uploadURL, {
        method: "PUT",
        body: signatureData.signatureBlob,
        headers: {
          "Content-Type": "image/png",
        },
      });

      if (!uploadResult.ok) {
        throw new Error("Failed to upload signature");
      }

      const signatureResponse = await apiRequest(
        "POST",
        `/api/jobs/${selectedJobForSignature.id}/signature`,
        {
          signatureUrl: objectPath,
          signerName: signatureData.signerName,
          signerRole: signatureData.signerRole,
        }
      );

      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });

      toast({
        title: "Success",
        description: `Signature captured from ${signatureData.signerName}`,
      });

      setSignatureDialogOpen(false);
      setSelectedJobForSignature(null);
    } catch (error) {
      clientLogger.error("Error saving signature:", error);
      throw error;
    }
  };

  const handleOpenSignatureDialog = (job: Job) => {
    setSelectedJobForSignature(job);
    setSignatureDialogOpen(true);
  };

  const handleOpenComplianceDrawer = (job: Job) => {
    setSelectedJobForCompliance(job);
    setComplianceDrawerOpen(true);
  };

  const handleSaveJob = async (data: InsertJob) => {
    const jobData = {
      ...data,
      scheduledDate: data.scheduledDate ? data.scheduledDate.toISOString() : null,
    };

    if (editingJob) {
      await updateJobMutation.mutateAsync({ id: editingJob.id, data: jobData });
    } else {
      await createJobMutation.mutateAsync(jobData);
    }
  };

  const handleBulkDelete = () => {
    deleteJobsMutation.mutate(selectedIds);
  };

  const handleBulkExport = (format: ExportFormat) => {
    exportMutation.mutate({ ids: Array.from(selectedIds), format });
  };

  const handleBulkStatusUpdate = () => {
    if (bulkStatus && selectedIds.length > 0) {
      bulkUpdateMutation.mutate({
        jobIds: selectedIds,
        updates: { status: bulkStatus },
      });
    }
  };

  const handleBulkBuilderUpdate = () => {
    if (bulkBuilder && selectedIds.length > 0) {
      bulkUpdateMutation.mutate({
        jobIds: selectedIds,
        updates: { builderId: bulkBuilder },
      });
    }
  };

  const handleBuilderChange = (jobId: string, builderId: string) => {
    updateJobMutation.mutate({
      id: jobId,
      data: { builderId },
    });
  };

  const handleWorkflowAdvance = (newStatus: string) => {
    if (workflowJobId) {
      updateJobMutation.mutate({
        id: workflowJobId,
        data: { status: newStatus },
      });
    }
  };

  const handleOpenPhotosDialog = (job: Job) => {
    setSelectedJobForPhotos(job);
    setPhotosDialogOpen(true);
  };

  const handleFilterByTag = (tag: PhotoTag) => {
    setFilterTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleClearFilters = () => {
    setFilterTags([]);
  };

  const handleDeletePhoto = (photoId: string) => {
    deletePhotoMutation.mutate(photoId);
  };

  const handleOpenAnnotator = (photo: Photo) => {
    setPhotoToAnnotate(photo);
    setAnnotatorOpen(true);
  };

  const handleSaveAnnotations = (annotations: Annotation[]) => {
    if (!photoToAnnotate) return;
    updatePhotoMutation.mutate({
      id: photoToAnnotate.id,
      data: { annotationData: annotations },
    });
  };

  const handleCancelAnnotator = () => {
    setAnnotatorOpen(false);
    setPhotoToAnnotate(null);
  };

  const handleOpenOCR = (photo: Photo) => {
    setPhotoToOCR(photo);
    setOcrOpen(true);
  };

  const handleCloseOCR = () => {
    setOcrOpen(false);
    setPhotoToOCR(null);
  };

  const handleOCRAutoFill = (data: { address?: string; lotNumber?: string }) => {
    if (!selectedJobForPhotos) return;
    
    const updates: Partial<InsertJob> = {};
    if (data.address) updates.address = data.address;
    if (data.lotNumber) updates.lotNumber = data.lotNumber;

    if (Object.keys(updates).length > 0) {
      updateJobMutation.mutate({
        id: selectedJobForPhotos.id,
        data: updates,
      });
    }
  };

  const handleChecklistItemToggle = (itemId: string) => {
    const item = checklistItems.find(i => i.id === itemId);
    if (!item) return;
    
    updateChecklistItemMutation.mutate({
      id: itemId,
      data: { completed: !item.completed },
    });
  };

  const handleChecklistItemNotesChange = (itemId: string, notes: string) => {
    updateChecklistItemMutation.mutate({
      id: itemId,
      data: { notes },
    });
  };

  const handleChecklistItemPhotoAdd = (itemId: string) => {
    setSelectedChecklistItemForPhoto(itemId);
  };

  const handleValidateJobCompletion = (job: Job) => {
    const itemsToCheck = checklistItems.filter(item => item.jobId === job.id);
    const missing = itemsToCheck.filter(item => 
      item.photoRequired && (!item.photoCount || item.photoCount === 0)
    );
    
    if (missing.length > 0) {
      setMissingPhotoItems(missing);
      setCompletionValidationDialogOpen(true);
      return false;
    }
    return true;
  };

  const handleEnterSelectionMode = () => {
    setSelectionMode(true);
    setSelectedPhotoIds(new Set());
  };

  const handleExitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedPhotoIds(new Set());
  };

  const handleTogglePhotoSelection = (photoId: string) => {
    const newSelected = new Set(selectedPhotoIds);
    if (newSelected.has(photoId)) {
      newSelected.delete(photoId);
    } else {
      newSelected.add(photoId);
    }
    setSelectedPhotoIds(newSelected);
  };

  const handleSelectAllPhotos = () => {
    setSelectedPhotoIds(new Set(filteredPhotos.map(p => p.id)));
  };

  const handleDeselectAllPhotos = () => {
    setSelectedPhotoIds(new Set());
  };

  const handleAddToReport = () => {
    const count = selectedPhotoIds.size;
    toast({
      title: "Photos Ready for Report",
      description: `${count} photo${count !== 1 ? 's' : ''} ready to be added to report`,
    });
    handleExitSelectionMode();
  };

  useEffect(() => {
    setSelectionMode(false);
    setSelectedPhotoIds(new Set());
  }, [selectedJobForPhotos?.id]);

  const filteredPhotos = photos.filter(photo => {
    if (filterTags.length === 0) return true;
    if (!photo.tags || photo.tags.length === 0) return false;
    return filterTags.some(filterTag => photo.tags?.includes(filterTag));
  });

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = 
      job.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.contractor.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || job.status === statusFilter;
    const matchesBuilder = builderFilter === "all" || job.builderId === builderFilter;
    const matchesPriority = priorityFilter === "all" || job.priority === priorityFilter;
    const matchesCompliance = complianceFilter === "all" || job.complianceStatus === complianceFilter;

    return matchesSearch && matchesStatus && matchesBuilder && matchesPriority && matchesCompliance;
  });

  const sortedJobs = [...filteredJobs].sort((a, b) => {
    switch (sortBy) {
      case "date":
        const dateA = a.scheduledDate ? new Date(a.scheduledDate).getTime() : 0;
        const dateB = b.scheduledDate ? new Date(b.scheduledDate).getTime() : 0;
        return dateB - dateA;
      case "priority":
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return (priorityOrder[b.priority as keyof typeof priorityOrder] ?? 0) - 
               (priorityOrder[a.priority as keyof typeof priorityOrder] ?? 0);
      case "status":
        return a.status.localeCompare(b.status);
      case "name":
        return a.name.localeCompare(b.name);
      default:
        return 0;
    }
  });

  const stats = {
    total: jobs.length,
    pending: jobs.filter(j => j.status === "pending").length,
    inProgress: jobs.filter(j => j.status === "in-progress").length,
    completed: jobs.filter(j => j.status === "completed").length,
  };

  // Initialize bulk selection with filtered job IDs
  const filteredJobIds = filteredJobs.map(job => job.id);
  const { metadata, actions, selectedIds } = useBulkSelection(filteredJobIds);

  const workflowJob = workflowJobId ? jobs.find(j => j.id === workflowJobId) : null;

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      <OfflineBanner />
      
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Jobs Management</h1>
          <p className="text-muted-foreground text-sm">Manage and track all energy audit jobs</p>
        </div>
        <Button 
          onClick={() => {
            setEditingJob(null);
            setIsJobDialogOpen(true);
          }}
          data-testid="button-new-job"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Job
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-muted-foreground">Total Jobs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-total">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-muted-foreground">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground" data-testid="stat-pending">
              {stats.pending}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-muted-foreground">In Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-info" data-testid="stat-in-progress">
              {stats.inProgress}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-muted-foreground">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success" data-testid="stat-completed">
              {stats.completed}
            </div>
          </CardContent>
        </Card>
      </div>

      {workflowJob && (
        <Card>
          <CardHeader>
            <CardTitle>Workflow Progress: {workflowJob.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <WorkflowStepper
              currentStatus={workflowJob.status}
              onStatusChange={handleWorkflowAdvance}
              isPending={updateJobMutation.isPending}
            />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Filters & Search</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by job name, address, or contractor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger data-testid="select-status-filter">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="pre-inspection">Pre-Inspection</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="testing">Testing</SelectItem>
                <SelectItem value="review">Review</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={builderFilter} onValueChange={setBuilderFilter}>
              <SelectTrigger data-testid="select-builder-filter">
                <SelectValue placeholder="Filter by builder" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Builders</SelectItem>
                {builders.map((builder) => (
                  <SelectItem key={builder.id} value={builder.id}>
                    {builder.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger data-testid="select-priority-filter">
                <SelectValue placeholder="Filter by priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>

            <Select value={complianceFilter} onValueChange={setComplianceFilter}>
              <SelectTrigger data-testid="filter-compliance">
                <SelectValue placeholder="Filter by compliance" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="compliant">Compliant</SelectItem>
                <SelectItem value="non-compliant">Non-Compliant</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="unknown">Unknown</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
              <SelectTrigger data-testid="select-sort">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Date</SelectItem>
                <SelectItem value="priority">Priority</SelectItem>
                <SelectItem value="status">Status</SelectItem>
                <SelectItem value="name">Name</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {metadata.hasSelection && (
        <SelectionToolbar
          selectedCount={metadata.selectedCount}
          totalCount={metadata.totalCount}
          entityName="jobs"
          onClear={actions.deselectAll}
          actions={[
            commonBulkActions.delete(() => setShowDeleteDialog(true)),
            commonBulkActions.export(() => setShowExportDialog(true)),
            { 
              label: "Update Status", 
              icon: RefreshCw, 
              onClick: () => setBulkStatusDialogOpen(true),
              testId: "button-bulk-status"
            },
            { 
              label: "Reassign Builder", 
              icon: Pencil, 
              onClick: () => setBulkBuilderDialogOpen(true),
              testId: "button-bulk-builder"
            },
          ]}
        />
      )}

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">
            Jobs ({sortedJobs.length})
          </h2>
        </div>

        {isLoadingJobs ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                </CardHeader>
                <CardContent className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-4 w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : sortedJobs.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <p>No jobs found matching your filters</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {sortedJobs.map((job) => (
              <div key={job.id} className="relative">
                <JobCard
                  id={job.id}
                  name={job.name}
                  address={job.address}
                  contractor={job.contractor}
                  builderId={job.builderId}
                  builders={builders}
                  status={job.status}
                  inspectionType={job.inspectionType}
                  pricing={job.pricing}
                  scheduledDate={job.scheduledDate ? format(new Date(job.scheduledDate), "MMM d, yyyy") : undefined}
                  priority={job.priority ?? "medium"}
                  latitude={job.latitude}
                  longitude={job.longitude}
                  notes={job.notes}
                  completedItems={job.completedItems ?? 0}
                  totalItems={job.totalItems ?? 52}
                  isSelected={metadata.selectedIds.has(job.id)}
                  complianceStatus={job.complianceStatus}
                  onSelect={(id) => actions.toggle(id)}
                  onBuilderChange={handleBuilderChange}
                  onClick={() => {
                    setWorkflowJobId(job.id);
                    navigate(`/inspection/${job.id}`);
                  }}
                  onViewCompliance={() => handleOpenComplianceDrawer(job)}
                />
                <div className="absolute bottom-4 right-4 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenPhotosDialog(job);
                    }}
                    data-testid={`button-photos-${job.id}`}
                  >
                    <ImageIcon className="h-4 w-4 mr-2" />
                    Photos
                  </Button>
                  {job.builderSignatureUrl && job.builderSignerName && job.builderSignedAt ? (
                    <Badge 
                      variant="secondary" 
                      className="px-3 py-1.5"
                      data-testid={`badge-signed-${job.id}`}
                    >
                      <PenTool className="h-3 w-3 mr-1" />
                      Signed
                    </Badge>
                  ) : (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenSignatureDialog(job);
                      }}
                      data-testid={`button-signature-${job.id}`}
                    >
                      <PenTool className="h-4 w-4 mr-2" />
                      Get Signature
                    </Button>
                  )}
                </div>
                {job.builderSignatureUrl && job.builderSignerName && job.builderSignedAt && (
                  <div 
                    className="absolute top-4 right-4 text-xs text-muted-foreground bg-background/95 px-2 py-1 rounded border"
                    data-testid={`text-signature-info-${job.id}`}
                  >
                    Signed by {job.builderSignerName}
                    <br />
                    {format(new Date(job.builderSignedAt), "MMM d, yyyy 'at' h:mm a")}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <JobDialog
        open={isJobDialogOpen}
        onOpenChange={setIsJobDialogOpen}
        job={editingJob}
        builders={builders}
        onSave={handleSaveJob}
        isPending={createJobMutation.isPending || updateJobMutation.isPending}
      />

      <BulkDeleteDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={handleBulkDelete}
        selectedCount={metadata.selectedCount}
        entityName="jobs"
        isPending={deleteJobsMutation.isPending}
      />

      <BulkExportDialog
        open={showExportDialog}
        onOpenChange={setShowExportDialog}
        onConfirm={handleBulkExport}
        selectedCount={metadata.selectedCount}
        entityName="jobs"
        isPending={exportMutation.isPending}
      />

      <AlertDialog open={bulkStatusDialogOpen} onOpenChange={setBulkStatusDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Update Status</AlertDialogTitle>
            <AlertDialogDescription>
              Select a new status for {metadata.selectedCount} job(s)
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Select value={bulkStatus} onValueChange={setBulkStatus}>
            <SelectTrigger data-testid="select-bulk-status">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="pre-inspection">Pre-Inspection</SelectItem>
              <SelectItem value="in-progress">In Progress</SelectItem>
              <SelectItem value="testing">Testing</SelectItem>
              <SelectItem value="review">Review</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-bulk-status">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkStatusUpdate}
              disabled={!bulkStatus || bulkUpdateMutation.isPending}
              data-testid="button-confirm-bulk-status"
            >
              {bulkUpdateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={bulkBuilderDialogOpen} onOpenChange={setBulkBuilderDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reassign Builder</AlertDialogTitle>
            <AlertDialogDescription>
              Select a new builder for {metadata.selectedCount} job(s)
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Select value={bulkBuilder} onValueChange={setBulkBuilder}>
            <SelectTrigger data-testid="select-bulk-builder">
              <SelectValue placeholder="Select builder" />
            </SelectTrigger>
            <SelectContent>
              {builders.map((builder) => (
                <SelectItem key={builder.id} value={builder.id}>
                  {builder.name} - {builder.companyName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-bulk-builder">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkBuilderUpdate}
              disabled={!bulkBuilder || bulkUpdateMutation.isPending}
              data-testid="button-confirm-bulk-builder"
            >
              {bulkUpdateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={photosDialogOpen} onOpenChange={setPhotosDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle data-testid="text-photos-title">
              Photos: {selectedJobForPhotos?.name}
            </DialogTitle>
            <DialogDescription>
              Upload and manage photos for this job
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="checklist" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="checklist" data-testid="tab-checklist">Checklist</TabsTrigger>
              <TabsTrigger value="gallery" data-testid="tab-gallery">Gallery</TabsTrigger>
              <TabsTrigger value="upload" data-testid="tab-upload">Upload</TabsTrigger>
            </TabsList>

            <TabsContent value="checklist" className="space-y-4">
              <div className="space-y-4">
                {isLoadingChecklistItems ? (
                  <div className="space-y-2">
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                  </div>
                ) : checklistItems.length === 0 ? (
                  <Card className="p-8 text-center">
                    <p className="text-muted-foreground" data-testid="text-no-checklist-items">
                      No checklist items for this job
                    </p>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {checklistItems.map((item) => (
                      <ChecklistItemComponent
                        key={item.id}
                        id={item.id}
                        itemNumber={item.itemNumber}
                        title={item.title}
                        completed={item.completed ?? false}
                        notes={item.notes ?? ""}
                        photoCount={item.photoCount ?? 0}
                        photoRequired={item.photoRequired ?? false}
                        onToggle={handleChecklistItemToggle}
                        onNotesChange={handleChecklistItemNotesChange}
                        onPhotoAdd={handleChecklistItemPhotoAdd}
                      />
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="gallery" className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  {!selectionMode ? (
                    <>
                      <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Filter by Tags</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground" data-testid="text-photo-count">
                          {filterTags.length > 0 ? `${filteredPhotos.length} / ${photos.length}` : `${photos.length}`} photos
                        </span>
                        {filterTags.length > 0 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleClearFilters}
                            data-testid="button-clear-filters"
                          >
                            <FilterX className="h-4 w-4 mr-2" />
                            Clear Filters
                          </Button>
                        )}
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={handleEnterSelectionMode}
                          disabled={photos.length === 0}
                          data-testid="button-select-photos"
                        >
                          <CheckSquare className="h-4 w-4 mr-2" />
                          Select Photos
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" data-testid="badge-selected-photos-count">
                          {selectedPhotoIds.size} photo{selectedPhotoIds.size !== 1 ? 's' : ''} selected
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={selectedPhotoIds.size === filteredPhotos.length ? handleDeselectAllPhotos : handleSelectAllPhotos}
                          data-testid="button-toggle-select-all"
                        >
                          <CheckSquare className="h-4 w-4 mr-2" />
                          {selectedPhotoIds.size === filteredPhotos.length ? "Deselect All" : "Select All"}
                        </Button>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleExitSelectionMode}
                          data-testid="button-cancel-selection"
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleAddToReport}
                          disabled={selectedPhotoIds.size === 0}
                          data-testid="button-add-to-report"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add to Report
                        </Button>
                      </div>
                    </>
                  )}
                </div>

                {filterTags.length > 0 && (
                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex flex-wrap gap-2">
                        {filterTags.map((tag) => {
                          const config = getTagConfig(tag);
                          return (
                            <Badge
                              key={tag}
                              className={config?.color}
                              data-testid={`badge-filter-${tag}`}
                            >
                              {config?.label || tag}
                              <X
                                className="h-3 w-3 ml-1 cursor-pointer"
                                onClick={() => handleFilterByTag(tag)}
                              />
                            </Badge>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {isLoadingPhotos ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-48 w-full" data-testid={`skeleton-photo-${i}`} />
                  ))}
                </div>
              ) : photos.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    <ImageIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p data-testid="text-no-photos">No photos uploaded yet</p>
                  </CardContent>
                </Card>
              ) : filteredPhotos.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    <Filter className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p data-testid="text-no-filtered-photos">No photos match the selected filters</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {filteredPhotos.map((photo) => {
                    const isSelected = selectedPhotoIds.has(photo.id);
                    return (
                      <Card 
                        key={photo.id} 
                        className={`overflow-hidden ${isSelected ? 'ring-2 ring-primary' : ''}`} 
                        data-testid={`card-photo-${photo.id}`}
                      >
                        <div className="relative group">
                          <img
                            src={photo.filePath}
                            alt={photo.caption || "Job photo"}
                            className="w-full h-48 object-cover"
                            data-testid={`img-photo-${photo.id}`}
                          />
                          {isSelected && !selectionMode && (
                            <div className="absolute inset-0 bg-primary/10 pointer-events-none" />
                          )}
                          {selectionMode && (
                            <div 
                              className="absolute top-2 left-2 z-10"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleTogglePhotoSelection(photo.id);
                              }}
                            >
                              <div className="flex items-center justify-center w-12 h-12 cursor-pointer" data-testid={`checkbox-photo-${photo.id}`}>
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={() => handleTogglePhotoSelection(photo.id)}
                                  className="h-6 w-6 border-2 bg-white shadow-md"
                                />
                              </div>
                            </div>
                          )}
                          {!selectionMode && photo.annotationData && Array.isArray(photo.annotationData) && photo.annotationData.length > 0 ? (
                            <Badge 
                              className="absolute top-2 left-2 bg-primary text-primary-foreground"
                              data-testid={`badge-annotated-${photo.id}`}
                            >
                              <Pencil className="h-3 w-3 mr-1" />
                              Annotated
                            </Badge>
                          ) : null}
                          {!selectionMode && (
                            <div className="absolute top-2 right-2 flex gap-2">
                              <Button
                                variant="secondary"
                                size="icon"
                                className="opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => handleOpenOCR(photo)}
                                data-testid={`button-ocr-photo-${photo.id}`}
                                title="Extract Text (OCR)"
                              >
                                <ScanText className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="default"
                                size="icon"
                                className="opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => handleOpenAnnotator(photo)}
                                data-testid={`button-annotate-photo-${photo.id}`}
                                title="Annotate Photo"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="destructive"
                                size="icon"
                                className="opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => handleDeletePhoto(photo.id)}
                                disabled={deletePhotoMutation.isPending}
                                data-testid={`button-delete-photo-${photo.id}`}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      {(photo.caption ?? photo.tags) && (
                        <CardContent className="pt-3">
                          {photo.caption && (
                            <p className="text-sm text-muted-foreground mb-2" data-testid={`text-caption-${photo.id}`}>
                              {photo.caption}
                            </p>
                          )}
                          {photo.tags && photo.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {photo.tags.map((tag, idx) => {
                                const config = getTagConfig(tag);
                                return (
                                  <Badge
                                    key={idx}
                                    className={`${config?.color || 'bg-gray-500 text-white'} cursor-pointer no-default-hover-elevate`}
                                    onClick={() => handleFilterByTag(tag as PhotoTag)}
                                    data-testid={`badge-tag-${photo.id}-${idx}`}
                                  >
                                    {config?.label || tag}
                                  </Badge>
                                );
                              })}
                            </div>
                          )}
                        </CardContent>
                      )}
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="upload" className="space-y-4">
              {selectedJobForPhotos && (
                <PhotoCapture
                  jobId={selectedJobForPhotos.id}
                  onUploadComplete={() => {
                    queryClient.invalidateQueries({ queryKey: ["/api/photos", selectedJobForPhotos.id] });
                    toast({
                      title: "Success",
                      description: "Photos uploaded successfully",
                    });
                  }}
                  bucketPath="photos"
                  existingPhotos={photos}
                />
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {photoToAnnotate && (
        <PhotoAnnotator
          photoUrl={photoToAnnotate.filePath}
          existingAnnotations={photoToAnnotate.annotationData as any || []}
          onSave={handleSaveAnnotations}
          onCancel={handleCancelAnnotator}
          open={annotatorOpen}
        />
      )}

      {photoToOCR && (
        <PhotoOCR
          open={ocrOpen}
          photoUrl={photoToOCR.filePath}
          jobId={selectedJobForPhotos?.id}
          onClose={handleCloseOCR}
          onAutoFill={handleOCRAutoFill}
        />
      )}

      <AlertDialog open={completionValidationDialogOpen} onOpenChange={setCompletionValidationDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle data-testid="text-completion-validation-title">
              Missing Required Photos
            </AlertDialogTitle>
            <AlertDialogDescription>
              The following checklist items require photos before this job can be completed:
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-4">
            {missingPhotoItems.map((item) => (
              <Card key={item.id} className="p-3 border-destructive" data-testid={`card-missing-item-${item.id}`}>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs font-mono">
                    #{item.itemNumber}
                  </Badge>
                  <span className="text-sm font-medium">{item.title}</span>
                  <Badge variant="destructive" className="text-xs ml-auto">
                    Photo Required
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-completion">
              Close
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <SignatureCapture
        open={signatureDialogOpen}
        onClose={() => {
          setSignatureDialogOpen(false);
          setSelectedJobForSignature(null);
        }}
        onSave={handleSignatureSave}
        jobName={selectedJobForSignature?.name}
      />

      <Sheet open={complianceDrawerOpen} onOpenChange={setComplianceDrawerOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto" data-testid="drawer-compliance">
          <SheetHeader>
            <SheetTitle>Compliance Details</SheetTitle>
            <SheetDescription>
              {selectedJobForCompliance?.name}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {isLoadingCompliance ? (
              <div className="space-y-4">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
              </div>
            ) : complianceData ? (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      {complianceData.status === "compliant" && <CheckCircle2 className="h-5 w-5 text-success" />}
                      {complianceData.status === "non-compliant" && <AlertTriangle className="h-5 w-5 text-destructive" />}
                      {complianceData.status === "pending" && <Clock className="h-5 w-5 text-warning" />}
                      {complianceData.status === "unknown" && <HelpCircle className="h-5 w-5 text-muted-foreground" />}
                      Compliance Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Status:</span>
                        <Badge
                          variant={
                            complianceData.status === "compliant" ? "default" :
                            complianceData.status === "non-compliant" ? "destructive" :
                            complianceData.status === "pending" ? "secondary" :
                            "outline"
                          }
                        >
                          {complianceData.status === "compliant" && "Compliant"}
                          {complianceData.status === "non-compliant" && "Non-Compliant"}
                          {complianceData.status === "pending" && "Pending"}
                          {complianceData.status === "unknown" && "Unknown"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">Last Checked:</span>
                        <span>{format(new Date(complianceData.evaluatedAt), "MMM d, yyyy 'at' h:mm a")}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {complianceData.violations.length > 0 ? (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold">Violations ({complianceData.violations.length})</h3>
                    {complianceData.violations.map((violation, index) => (
                      <Card key={index} className="border-destructive">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
                              <CardTitle className="text-sm">{violation.metricType}</CardTitle>
                            </div>
                            <Badge
                              variant={
                                violation.severity === "critical" ? "destructive" :
                                violation.severity === "high" ? "destructive" :
                                violation.severity === "medium" ? "secondary" :
                                "outline"
                              }
                              className="text-xs"
                            >
                              {violation.severity === "critical" && "Critical"}
                              {violation.severity === "high" && "Major"}
                              {violation.severity === "medium" && "Minor"}
                              {violation.severity === "low" && "Minor"}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <p className="text-sm text-muted-foreground">{violation.description}</p>
                          <div className="grid grid-cols-2 gap-3 pt-2 text-sm">
                            <div>
                              <span className="text-muted-foreground">Threshold:</span>
                              <div className="font-semibold">{violation.threshold} {violation.units}</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Actual:</span>
                              <div className="font-semibold text-destructive">{violation.actual} {violation.units}</div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : complianceData.status === "compliant" ? (
                  <Card className="border-success">
                    <CardContent className="py-8 text-center">
                      <CheckCircle2 className="h-12 w-12 text-success mx-auto mb-3" />
                      <p className="font-semibold text-success">No Violations Found</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        This job meets all compliance requirements
                      </p>
                    </CardContent>
                  </Card>
                ) : complianceData.status === "pending" ? (
                  <Card>
                    <CardContent className="py-8 text-center">
                      <Clock className="h-12 w-12 text-warning mx-auto mb-3" />
                      <p className="font-semibold">Pending Evaluation</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Waiting for actual test results to be recorded
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="py-8 text-center">
                      <HelpCircle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                      <p className="font-semibold">Unknown Status</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Unable to evaluate compliance at this time
                      </p>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  <p>No compliance data available</p>
                </CardContent>
              </Card>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
