import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { Plus, Search, Filter, Trash2, RefreshCw, CheckSquare, Image as ImageIcon, X, FilterX, Pencil } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { PhotoAnnotator } from "@/components/PhotoAnnotator";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Job, Builder, Photo } from "@shared/schema";
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
  const [sortBy, setSortBy] = useState<SortOption>("date");
  const [selectedJobs, setSelectedJobs] = useState<Set<string>>(new Set());
  const [isJobDialogOpen, setIsJobDialogOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [bulkStatusDialogOpen, setBulkStatusDialogOpen] = useState(false);
  const [bulkBuilderDialogOpen, setBulkBuilderDialogOpen] = useState(false);
  const [bulkStatus, setBulkStatus] = useState("");
  const [bulkBuilder, setBulkBuilder] = useState("");
  const [workflowJobId, setWorkflowJobId] = useState<string | null>(null);
  const [photosDialogOpen, setPhotosDialogOpen] = useState(false);
  const [selectedJobForPhotos, setSelectedJobForPhotos] = useState<Job | null>(null);
  const [photoCaption, setPhotoCaption] = useState("");
  const [selectedPhotoTags, setSelectedPhotoTags] = useState<PhotoTag[]>([]);
  const [filterTags, setFilterTags] = useState<PhotoTag[]>([]);
  const [uploadedObjectPath, setUploadedObjectPath] = useState<string>("");
  const [annotatorOpen, setAnnotatorOpen] = useState(false);
  const [photoToAnnotate, setPhotoToAnnotate] = useState<Photo | null>(null);

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

  const createJobMutation = useMutation({
    mutationFn: async (data: any) => {
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
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
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
    mutationFn: async (jobIds: string[]) => {
      await Promise.all(jobIds.map(id => apiRequest("DELETE", `/api/jobs/${id}`)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      toast({
        title: "Success",
        description: `${selectedJobs.size} job(s) deleted successfully`,
      });
      setSelectedJobs(new Set());
      setDeleteDialogOpen(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete jobs",
        variant: "destructive",
      });
    },
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: async ({ jobIds, updates }: { jobIds: string[]; updates: any }) => {
      await Promise.all(jobIds.map(id => apiRequest("PUT", `/api/jobs/${id}`, updates)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      toast({
        title: "Success",
        description: `${selectedJobs.size} job(s) updated successfully`,
      });
      setSelectedJobs(new Set());
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
    mutationFn: async (data: any) => {
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
    onError: (error: any) => {
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
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return apiRequest("PATCH", `/api/photos/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/photos", selectedJobForPhotos?.id] });
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

  const handleSaveJob = async (data: any) => {
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

  const handleJobSelect = (id: string, selected: boolean) => {
    const newSelected = new Set(selectedJobs);
    if (selected) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedJobs(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedJobs.size === filteredJobs.length) {
      setSelectedJobs(new Set());
    } else {
      setSelectedJobs(new Set(filteredJobs.map(j => j.id)));
    }
  };

  const handleBulkStatusUpdate = () => {
    if (bulkStatus && selectedJobs.size > 0) {
      bulkUpdateMutation.mutate({
        jobIds: Array.from(selectedJobs),
        updates: { status: bulkStatus },
      });
    }
  };

  const handleBulkBuilderUpdate = () => {
    if (bulkBuilder && selectedJobs.size > 0) {
      bulkUpdateMutation.mutate({
        jobIds: Array.from(selectedJobs),
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

  const handlePhotoUpload = async () => {
    try {
      const response = await fetch('/api/objects/upload', { method: 'POST' });
      if (!response.ok) {
        throw new Error('Failed to get upload URL');
      }
      const { uploadURL, objectPath } = await response.json();
      setUploadedObjectPath(objectPath);
      return { method: 'PUT' as const, url: uploadURL };
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to get upload URL",
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleUploadComplete = async (result: any) => {
    if (!selectedJobForPhotos || !uploadedObjectPath) return;
    
    await createPhotoMutation.mutateAsync({
      jobId: selectedJobForPhotos.id,
      filePath: uploadedObjectPath,
      caption: photoCaption || undefined,
      tags: selectedPhotoTags.length > 0 ? selectedPhotoTags : undefined,
    });
    
    setUploadedObjectPath("");
  };

  const handleToggleTag = (tag: PhotoTag) => {
    setSelectedPhotoTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
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

  const handleSaveAnnotations = (annotations: any[]) => {
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

    return matchesSearch && matchesStatus && matchesBuilder && matchesPriority;
  });

  const sortedJobs = [...filteredJobs].sort((a, b) => {
    switch (sortBy) {
      case "date":
        const dateA = a.scheduledDate ? new Date(a.scheduledDate).getTime() : 0;
        const dateB = b.scheduledDate ? new Date(b.scheduledDate).getTime() : 0;
        return dateB - dateA;
      case "priority":
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return (priorityOrder[b.priority as keyof typeof priorityOrder] || 0) - 
               (priorityOrder[a.priority as keyof typeof priorityOrder] || 0);
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

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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

      {selectedJobs.size > 0 && (
        <Card className="border-primary">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" data-testid="badge-selected-count">
                  {selectedJobs.size} selected
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                  data-testid="button-select-all"
                >
                  <CheckSquare className="h-4 w-4 mr-2" />
                  {selectedJobs.size === filteredJobs.length ? "Deselect All" : "Select All"}
                </Button>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setBulkStatusDialogOpen(true)}
                  data-testid="button-bulk-status"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Update Status
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setBulkBuilderDialogOpen(true)}
                  data-testid="button-bulk-builder"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reassign Builder
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setDeleteDialogOpen(true)}
                  data-testid="button-bulk-delete"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
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
                  scheduledDate={job.scheduledDate ? format(new Date(job.scheduledDate), "MMM d, yyyy") : undefined}
                  priority={job.priority || "medium"}
                  latitude={job.latitude}
                  longitude={job.longitude}
                  notes={job.notes}
                  completedItems={job.completedItems || 0}
                  totalItems={job.totalItems || 52}
                  isSelected={selectedJobs.has(job.id)}
                  onSelect={handleJobSelect}
                  onBuilderChange={handleBuilderChange}
                  onClick={() => {
                    setWorkflowJobId(job.id);
                    navigate(`/inspection/${job.id}`);
                  }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="absolute bottom-4 right-4"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenPhotosDialog(job);
                  }}
                  data-testid={`button-photos-${job.id}`}
                >
                  <ImageIcon className="h-4 w-4 mr-2" />
                  Photos
                </Button>
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

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Jobs</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedJobs.size} job(s)? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteJobsMutation.mutate(Array.from(selectedJobs))}
              className="bg-destructive text-destructive-foreground"
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={bulkStatusDialogOpen} onOpenChange={setBulkStatusDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Update Status</AlertDialogTitle>
            <AlertDialogDescription>
              Select a new status for {selectedJobs.size} job(s)
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
              disabled={!bulkStatus}
              data-testid="button-confirm-bulk-status"
            >
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
              Select a new builder for {selectedJobs.size} job(s)
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
              disabled={!bulkBuilder}
              data-testid="button-confirm-bulk-builder"
            >
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
          
          <Tabs defaultValue="gallery" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="gallery" data-testid="tab-gallery">Gallery</TabsTrigger>
              <TabsTrigger value="upload" data-testid="tab-upload">Upload</TabsTrigger>
            </TabsList>
            
            <TabsContent value="gallery" className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-4 flex-wrap">
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
                  </div>
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
                  {filteredPhotos.map((photo) => (
                    <Card key={photo.id} className="overflow-hidden" data-testid={`card-photo-${photo.id}`}>
                      <div className="relative group">
                        <img
                          src={photo.filePath}
                          alt={photo.caption || "Job photo"}
                          className="w-full h-48 object-cover"
                          data-testid={`img-photo-${photo.id}`}
                        />
                        {photo.annotationData && Array.isArray(photo.annotationData) && photo.annotationData.length > 0 && (
                          <Badge 
                            className="absolute top-2 left-2 bg-primary text-primary-foreground"
                            data-testid={`badge-annotated-${photo.id}`}
                          >
                            <Pencil className="h-3 w-3 mr-1" />
                            Annotated
                          </Badge>
                        )}
                        <div className="absolute top-2 right-2 flex gap-2">
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
                      </div>
                      {(photo.caption || photo.tags) && (
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
                  ))}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="upload" className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="caption">Caption (optional)</Label>
                  <Input
                    id="caption"
                    placeholder="Enter a caption for the photo"
                    value={photoCaption}
                    onChange={(e) => setPhotoCaption(e.target.value)}
                    data-testid="input-caption"
                  />
                </div>
                
                <div className="space-y-4">
                  <Label>Tags (select all that apply)</Label>
                  
                  {selectedPhotoTags.length > 0 && (
                    <div className="flex flex-wrap gap-2 p-3 bg-muted rounded-md">
                      {selectedPhotoTags.map((tag) => {
                        const config = getTagConfig(tag);
                        return (
                          <Badge
                            key={tag}
                            className={config?.color}
                            data-testid={`badge-selected-${tag}`}
                          >
                            {config?.label || tag}
                            <X
                              className="h-3 w-3 ml-1 cursor-pointer"
                              onClick={() => handleToggleTag(tag)}
                            />
                          </Badge>
                        );
                      })}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm">{getCategoryLabel(TAG_CATEGORIES.INSPECTION)}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {INSPECTION_TAGS.map((tag) => {
                          const config = getTagConfig(tag);
                          return (
                            <div key={tag} className="flex items-center space-x-2">
                              <Checkbox
                                id={`tag-${tag}`}
                                checked={selectedPhotoTags.includes(tag)}
                                onCheckedChange={() => handleToggleTag(tag)}
                                data-testid={`checkbox-${tag}`}
                              />
                              <label
                                htmlFor={`tag-${tag}`}
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                              >
                                {config?.label || tag}
                              </label>
                            </div>
                          );
                        })}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm">{getCategoryLabel(TAG_CATEGORIES.STATUS)}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {STATUS_TAGS.map((tag) => {
                          const config = getTagConfig(tag);
                          return (
                            <div key={tag} className="flex items-center space-x-2">
                              <Checkbox
                                id={`tag-${tag}`}
                                checked={selectedPhotoTags.includes(tag)}
                                onCheckedChange={() => handleToggleTag(tag)}
                                data-testid={`checkbox-${tag}`}
                              />
                              <label
                                htmlFor={`tag-${tag}`}
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                              >
                                {config?.label || tag}
                              </label>
                            </div>
                          );
                        })}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm">{getCategoryLabel(TAG_CATEGORIES.PRIORITY)}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {PRIORITY_TAGS.map((tag) => {
                          const config = getTagConfig(tag);
                          return (
                            <div key={tag} className="flex items-center space-x-2">
                              <Checkbox
                                id={`tag-${tag}`}
                                checked={selectedPhotoTags.includes(tag)}
                                onCheckedChange={() => handleToggleTag(tag)}
                                data-testid={`checkbox-${tag}`}
                              />
                              <label
                                htmlFor={`tag-${tag}`}
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                              >
                                {config?.label || tag}
                              </label>
                            </div>
                          );
                        })}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm">{getCategoryLabel(TAG_CATEGORIES.LOCATION)}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {LOCATION_TAGS.map((tag) => {
                          const config = getTagConfig(tag);
                          return (
                            <div key={tag} className="flex items-center space-x-2">
                              <Checkbox
                                id={`tag-${tag}`}
                                checked={selectedPhotoTags.includes(tag)}
                                onCheckedChange={() => handleToggleTag(tag)}
                                data-testid={`checkbox-${tag}`}
                              />
                              <label
                                htmlFor={`tag-${tag}`}
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                              >
                                {config?.label || tag}
                              </label>
                            </div>
                          );
                        })}
                      </CardContent>
                    </Card>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Upload Photo</Label>
                  <ObjectUploader
                    maxNumberOfFiles={1}
                    maxFileSize={10485760}
                    onGetUploadParameters={handlePhotoUpload}
                    onComplete={handleUploadComplete}
                  >
                    <ImageIcon className="h-4 w-4 mr-2" />
                    Upload Photo
                  </ObjectUploader>
                </div>
                
                {createPhotoMutation.isPending && (
                  <Card className="bg-muted">
                    <CardContent className="py-4 text-center text-sm">
                      <p>Processing upload...</p>
                    </CardContent>
                  </Card>
                )}
              </div>
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
    </div>
  );
}
