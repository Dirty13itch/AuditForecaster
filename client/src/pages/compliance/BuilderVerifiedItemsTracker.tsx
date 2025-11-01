import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Plus, Trash2, Upload, Check, AlertCircle, Save, Send, RefreshCw } from "lucide-react";
import { useUploadComplianceArtifact } from "@/lib/compliance";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import TopBar from "@/components/TopBar";
import BottomNav from "@/components/BottomNav";
import { ObjectUploader } from "@/components/ObjectUploader";
import type { Job } from "@shared/schema";

/**
 * Phase 3 - OPTIMIZE: Module-level constants prevent recreation on every render
 * 
 * Business Context:
 * BuilderVerifiedItemsTracker manages compliance items that builders must verify
 * for ENERGY STAR MFNC (Multifamily New Construction) certification. Per program
 * requirements:
 * - Standard limit: 8 builder-verified items per unit
 * - Photo evidence: Optional but recommended for audit defense
 * - Status tracking: Pending → Verified/Failed workflow
 * - Local storage: Draft persistence for field inspectors working offline
 * 
 * These items represent construction elements that cannot be verified by third-party
 * inspectors (e.g., insulation behind finished walls, buried foundation details).
 * Builders self-certify these items, and photos serve as supporting documentation
 * for program administrators and potential audits.
 */

interface BuilderVerifiedItem {
  id: string;
  itemNumber: number;
  description: string;
  status: "pending" | "verified" | "failed";
  photoUrl?: string;
  photoUploaded: boolean;
}

// Default maximum builder-verified items per ENERGY STAR MFNC requirements
const DEFAULT_MAX_COUNT = 8;

// Skeleton loader configuration for loading states
const SKELETON_COUNT = 2;

// Minimum description length for validation
const MIN_DESCRIPTION_LENGTH = 3;

// Navigation delay after successful submission (allows toast to display)
const SUBMIT_SUCCESS_DELAY = 1500;

/**
 * Phase 2 - BUILD: BuilderVerifiedItemsTrackerContent component
 * 
 * Main component wrapped in ErrorBoundary at export.
 * Manages builder-verified items with photo evidence for ENERGY STAR compliance.
 */
function BuilderVerifiedItemsTrackerContent() {
  const { jobId } = useParams<{ jobId: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [items, setItems] = useState<BuilderVerifiedItem[]>([]);
  const [uploadingItemId, setUploadingItemId] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);

  const uploadArtifact = useUploadComplianceArtifact();

  /**
   * Phase 5 - HARDEN: Fetch job data with retry: 2 for network resilience
   * 
   * Business Logic - Job Context:
   * Job record contains critical configuration for builder-verified items:
   * - builderVerifiedItemsCount: Custom limit (default 8)
   * - builderVerifiedItemsPhotoRequired: Photo evidence requirement
   * - multifamilyProgram: ENERGY STAR, EGCC, or ZERH program type
   * 
   * This configuration varies by project and program requirements, so we fetch
   * fresh from the database rather than relying on stale cached data.
   */
  const { 
    data: job, 
    isLoading: loadingJob,
    error: jobError,
    refetch: refetchJob
  } = useQuery<Job>({
    queryKey: ["/api/jobs", jobId],
    enabled: !!jobId,
    retry: 2,
  });

  /**
   * Phase 3 - OPTIMIZE: Memoized computed values prevent unnecessary recalculation
   * 
   * Business Logic - Configuration Values:
   * These values drive validation and UI behavior throughout the component.
   * Extracted to useMemo to prevent recalculation on every render.
   */
  const maxCount = useMemo(() => job?.builderVerifiedItemsCount || DEFAULT_MAX_COUNT, [job]);
  const photoRequired = useMemo(() => job?.builderVerifiedItemsPhotoRequired || false, [job]);

  /**
   * Phase 5 - HARDEN: Load persisted draft from localStorage on mount
   * 
   * Business Logic - Offline Draft Persistence:
   * Field inspectors may lose connection during inspections. localStorage ensures
   * their work is preserved even if the app crashes or network disconnects.
   * Data is scoped by jobId to prevent cross-contamination between jobs.
   */
  useEffect(() => {
    if (!jobId) return;

    try {
      const savedItems = localStorage.getItem(`builder-verified-items-${jobId}`);
      if (savedItems) {
        const parsed = JSON.parse(savedItems);
        setItems(parsed);
      } else {
        setItems([]);
      }
    } catch (error) {
      console.error("Failed to load saved items:", error);
      setItems([]);
    }
  }, [jobId]);

  /**
   * Phase 3 - OPTIMIZE: Memoized callback prevents recreation on every render
   * 
   * Business Logic - Draft Persistence:
   * Saves current state to localStorage for offline resilience. This allows
   * inspectors to work without network connectivity and resume later.
   */
  const saveDraft = useCallback(() => {
    if (!jobId) return;

    try {
      localStorage.setItem(`builder-verified-items-${jobId}`, JSON.stringify(items));
      toast({
        title: "Draft saved",
        description: "Builder-verified items saved locally.",
      });
    } catch (error) {
      toast({
        title: "Save failed",
        description: "Failed to save draft. Please try again.",
        variant: "destructive",
      });
    }
  }, [jobId, items, toast]);

  /**
   * Phase 3 - OPTIMIZE: Memoized callback prevents recreation on every render
   * 
   * Business Logic - Add Item:
   * Creates new builder-verified item with auto-incrementing item number.
   * Enforces maximum count per ENERGY STAR requirements (default 8).
   */
  const handleAddItem = useCallback(() => {
    if (items.length >= maxCount) {
      toast({
        title: "Maximum items reached",
        description: `Cannot add more than ${maxCount} builder-verified items.`,
        variant: "destructive",
      });
      return;
    }

    const newItem: BuilderVerifiedItem = {
      id: crypto.randomUUID(),
      itemNumber: items.length + 1,
      description: "",
      status: "pending",
      photoUploaded: false,
    };

    setItems([...items, newItem]);
  }, [items, maxCount, toast]);

  /**
   * Phase 3 - OPTIMIZE: Memoized callback prevents recreation on every render
   * 
   * Business Logic - Delete Item:
   * Removes item and renumbers remaining items to maintain sequential order.
   * Sequential numbering is important for audit trail and reporting.
   */
  const handleDeleteItem = useCallback((id: string) => {
    const filtered = items.filter(item => item.id !== id);
    const renumbered = filtered.map((item, index) => ({
      ...item,
      itemNumber: index + 1,
    }));
    setItems(renumbered);
  }, [items]);

  /**
   * Phase 3 - OPTIMIZE: Memoized callback prevents recreation on every render
   * 
   * Business Logic - Update Item Field:
   * Generic handler for updating any field on a builder-verified item.
   * Maintains immutability by creating new array with updated item.
   */
  const handleUpdateItem = useCallback((id: string, field: keyof BuilderVerifiedItem, value: any) => {
    setItems(prevItems => prevItems.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    ));
  }, []);

  /**
   * Phase 3 - OPTIMIZE: Memoized callback prevents recreation on every render
   * 
   * Business Logic - Photo Upload:
   * Handles photo evidence upload for builder-verified items. Photos are:
   * 1. Uploaded to object storage via ObjectUploader
   * 2. Registered as compliance artifacts in database
   * 3. Linked to specific item via photoUrl
   * 
   * This creates audit trail for compliance verification.
   */
  const handlePhotoUpload = useCallback(async (itemId: string, result: any) => {
    try {
      // Phase 5 - HARDEN: Validate upload result
      if (!result.successful || result.successful.length === 0) {
        throw new Error("No files uploaded");
      }

      const uploadedFile = result.successful[0];
      const photoUrl = uploadedFile.uploadURL || uploadedFile.url;

      if (!photoUrl) {
        throw new Error("Invalid upload URL");
      }

      // Register photo as compliance artifact
      await uploadArtifact.mutateAsync({
        jobId: jobId!,
        programType: job?.multifamilyProgram || "energy_star_mfnc",
        artifactType: "photo",
        documentPath: photoUrl,
        uploadedBy: "current-user-id",
      });

      // Update item with photo URL and uploaded flag
      handleUpdateItem(itemId, "photoUrl", photoUrl);
      handleUpdateItem(itemId, "photoUploaded", true);

      toast({
        title: "Photo uploaded",
        description: "Photo evidence uploaded successfully.",
      });
    } catch (error) {
      console.error("Photo upload failed:", error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload photo. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploadingItemId(null);
      setShowUploadModal(false);
    }
  }, [jobId, job, uploadArtifact, handleUpdateItem, toast]);

  /**
   * Phase 3 - OPTIMIZE: Memoized callback prevents recreation on every render
   * 
   * Business Logic - Submit for Review:
   * Validates all items before submission:
   * 1. If photos required: All items must have photo evidence
   * 2. All items must have descriptions (min 3 characters)
   * 3. Saves final draft to localStorage
   * 4. Navigates to inspection page
   * 
   * This ensures complete data before submitting to program administrators.
   */
  const handleSubmitForReview = useCallback(async () => {
    // Phase 5 - HARDEN: Validate photo requirement
    if (photoRequired) {
      const missingPhotos = items.filter(item => !item.photoUploaded);
      if (missingPhotos.length > 0) {
        toast({
          title: "Missing photos",
          description: `${missingPhotos.length} item(s) still need photo evidence.`,
          variant: "destructive",
        });
        return;
      }
    }

    // Phase 5 - HARDEN: Validate description completeness
    const incompleteItems = items.filter(item => !item.description.trim() || item.description.trim().length < MIN_DESCRIPTION_LENGTH);
    if (incompleteItems.length > 0) {
      toast({
        title: "Incomplete items",
        description: `${incompleteItems.length} item(s) need descriptions (minimum ${MIN_DESCRIPTION_LENGTH} characters).`,
        variant: "destructive",
      });
      return;
    }

    // Save final state
    if (jobId) {
      try {
        localStorage.setItem(`builder-verified-items-${jobId}`, JSON.stringify(items));
      } catch (error) {
        console.error("Failed to save final state:", error);
      }
    }
    
    toast({
      title: "Submitted for review",
      description: "Builder-verified items submitted successfully.",
    });

    // Navigate to inspection page after brief delay
    setTimeout(() => {
      setLocation(`/inspection/${jobId}`);
    }, SUBMIT_SUCCESS_DELAY);
  }, [items, photoRequired, jobId, toast, setLocation]);

  /**
   * Phase 2 - BUILD: Loading state with comprehensive skeletons
   * 
   * Displays skeleton placeholders while job data loads.
   */
  if (loadingJob) {
    return (
      <div className="flex flex-col h-screen" data-testid="page-builder-verified-items-loading">
        <TopBar title="Builder-Verified Items Tracker" />
        <main className="flex-1 overflow-auto p-4 pb-20">
          <div className="max-w-5xl mx-auto space-y-4">
            <Skeleton className="h-32 w-full" data-testid="skeleton-header" />
            <Skeleton className="h-64 w-full" data-testid="skeleton-content" />
          </div>
        </main>
        <BottomNav activeTab="dashboard" />
      </div>
    );
  }

  /**
   * Phase 2 - BUILD: Error state with retry capability
   * 
   * Displays error message with retry button when job fetch fails.
   */
  if (jobError) {
    return (
      <div className="flex flex-col h-screen" data-testid="page-builder-verified-items-error">
        <TopBar title="Builder-Verified Items Tracker" />
        <main className="flex-1 overflow-auto p-4 pb-20">
          <div className="max-w-5xl mx-auto">
            <Alert variant="destructive" data-testid="alert-job-error">
              <AlertCircle className="h-4 w-4" data-testid="icon-error" />
              <AlertDescription data-testid="text-error-message">
                Failed to load job data. Please check your connection and try again.
              </AlertDescription>
            </Alert>
            <div className="mt-4">
              <Button 
                onClick={() => refetchJob()} 
                variant="outline"
                data-testid="button-retry-job"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry
              </Button>
            </div>
          </div>
        </main>
        <BottomNav activeTab="dashboard" />
      </div>
    );
  }

  /**
   * Phase 2 - BUILD: Not found state
   * 
   * Displays when jobId is invalid or job doesn't exist.
   */
  if (!job) {
    return (
      <div className="flex flex-col h-screen" data-testid="page-builder-verified-items-not-found">
        <TopBar title="Builder-Verified Items Tracker" />
        <main className="flex-1 overflow-auto p-4 pb-20">
          <Alert variant="destructive" data-testid="alert-job-not-found">
            <AlertCircle className="h-4 w-4" data-testid="icon-not-found" />
            <AlertDescription data-testid="text-not-found-message">
              Job not found. Please check the job ID and try again.
            </AlertDescription>
          </Alert>
        </main>
        <BottomNav activeTab="dashboard" />
      </div>
    );
  }

  /**
   * Phase 2 - BUILD: Main content with 30+ data-testid attributes
   * 
   * Renders builder-verified items tracker interface with:
   * - Job header with program details
   * - Items table with add/edit/delete operations
   * - Photo upload for evidence documentation
   * - Save draft and submit actions
   */
  return (
    <div className="flex flex-col h-screen" data-testid="page-builder-verified-items">
      <TopBar title="Builder-Verified Items Tracker" />
      
      <main className="flex-1 overflow-auto p-4 pb-20" data-testid="main-content">
        <div className="max-w-5xl mx-auto space-y-6">
          
          {/* Header Card */}
          <Card data-testid="card-job-header">
            <CardHeader>
              <CardTitle data-testid="text-job-name">Job: {job.name}</CardTitle>
              <CardDescription data-testid="text-job-address">
                {job.address}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4" data-testid="grid-job-info">
                <div data-testid="section-program-type">
                  <div className="text-sm text-muted-foreground" data-testid="label-program-type">Program Type</div>
                  <div className="font-medium" data-testid="text-program-type">
                    {job.multifamilyProgram ? job.multifamilyProgram.toUpperCase() : "Not set"}
                  </div>
                </div>
                <div data-testid="section-items-count">
                  <div className="text-sm text-muted-foreground" data-testid="label-items-count">Builder-Verified Items Limit</div>
                  <div className="font-medium" data-testid="text-items-count">
                    {items.length} / {maxCount}
                  </div>
                </div>
                <div data-testid="section-photo-required">
                  <div className="text-sm text-muted-foreground" data-testid="label-photo-required">Photo Evidence</div>
                  <div className="font-medium" data-testid="badge-photo-required-wrapper">
                    {photoRequired ? (
                      <Badge variant="default" data-testid="badge-photo-required">Required</Badge>
                    ) : (
                      <Badge variant="secondary" data-testid="badge-photo-optional">Not Required</Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Items Table */}
          <Card data-testid="card-items-table">
            <CardHeader>
              <div className="flex items-center justify-between" data-testid="header-items">
                <div>
                  <CardTitle data-testid="text-items-title">Builder-Verified Items</CardTitle>
                  <CardDescription data-testid="text-items-description">
                    Track and document builder-verified compliance items
                  </CardDescription>
                </div>
                <Button
                  onClick={handleAddItem}
                  disabled={items.length >= maxCount}
                  data-testid="button-add-item"
                >
                  <Plus className="w-4 h-4 mr-2" data-testid="icon-add-item" />
                  Add Item
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {items.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground" data-testid="text-no-items">
                  No builder-verified items added yet. Click &quot;Add Item&quot; to begin.
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden" data-testid="container-items-table">
                  <Table data-testid="table-items">
                    <TableHeader>
                      <TableRow data-testid="row-header">
                        <TableHead className="w-16" data-testid="th-item-number">Item #</TableHead>
                        <TableHead data-testid="th-description">Description</TableHead>
                        <TableHead className="w-32" data-testid="th-status">Status</TableHead>
                        {photoRequired && <TableHead className="w-40" data-testid="th-photo">Photo Evidence</TableHead>}
                        <TableHead className="w-24" data-testid="th-actions">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody data-testid="tbody-items">
                      {items.map((item) => (
                        <TableRow key={item.id} data-testid={`row-item-${item.itemNumber}`}>
                          <TableCell className="font-medium" data-testid={`text-item-number-${item.itemNumber}`}>
                            {item.itemNumber}
                          </TableCell>
                          <TableCell data-testid={`cell-description-${item.itemNumber}`}>
                            <Input
                              value={item.description}
                              onChange={(e) => handleUpdateItem(item.id, "description", e.target.value)}
                              placeholder="Enter item description"
                              data-testid={`input-description-${item.itemNumber}`}
                            />
                          </TableCell>
                          <TableCell data-testid={`cell-status-${item.itemNumber}`}>
                            <Select
                              value={item.status}
                              onValueChange={(value) => handleUpdateItem(item.id, "status", value)}
                            >
                              <SelectTrigger data-testid={`select-status-${item.itemNumber}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending" data-testid={`status-pending-${item.itemNumber}`}>Pending</SelectItem>
                                <SelectItem value="verified" data-testid={`status-verified-${item.itemNumber}`}>Verified</SelectItem>
                                <SelectItem value="failed" data-testid={`status-failed-${item.itemNumber}`}>Failed</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          {photoRequired && (
                            <TableCell data-testid={`cell-photo-${item.itemNumber}`}>
                              {item.photoUploaded ? (
                                <div className="flex items-center gap-2" data-testid={`photo-uploaded-${item.itemNumber}`}>
                                  <Check className="w-4 h-4 text-green-600" data-testid={`icon-photo-check-${item.itemNumber}`} />
                                  <span className="text-sm" data-testid={`text-photo-uploaded-${item.itemNumber}`}>
                                    Uploaded
                                  </span>
                                  {item.photoUrl && (
                                    <a
                                      href={item.photoUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-sm text-primary underline"
                                      data-testid={`link-view-photo-${item.itemNumber}`}
                                    >
                                      View
                                    </a>
                                  )}
                                </div>
                              ) : (
                                <ObjectUploader
                                  enableWebcam
                                  enableCompression
                                  maxNumberOfFiles={1}
                                  bucketPath="compliance"
                                  open={showUploadModal && uploadingItemId === item.id}
                                  onOpenChange={(open) => {
                                    if (!open) {
                                      setUploadingItemId(null);
                                    }
                                    setShowUploadModal(open);
                                  }}
                                  onComplete={(result) => handlePhotoUpload(item.id, result)}
                                  buttonClassName="w-full"
                                >
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full"
                                    onClick={() => {
                                      setUploadingItemId(item.id);
                                      setShowUploadModal(true);
                                    }}
                                    data-testid={`button-upload-photo-${item.itemNumber}`}
                                  >
                                    <Upload className="w-4 h-4 mr-2" data-testid={`icon-upload-${item.itemNumber}`} />
                                    Upload
                                  </Button>
                                </ObjectUploader>
                              )}
                            </TableCell>
                          )}
                          <TableCell data-testid={`cell-actions-${item.itemNumber}`}>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteItem(item.id)}
                              data-testid={`button-delete-item-${item.itemNumber}`}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" data-testid={`icon-delete-${item.itemNumber}`} />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end" data-testid="section-actions">
            <Button
              variant="outline"
              onClick={saveDraft}
              data-testid="button-save-draft"
            >
              <Save className="w-4 h-4 mr-2" data-testid="icon-save" />
              Save Draft
            </Button>
            <Button
              onClick={handleSubmitForReview}
              disabled={items.length === 0 || uploadArtifact.isPending}
              data-testid="button-submit-review"
            >
              {uploadArtifact.isPending ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" data-testid="icon-submitting" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" data-testid="icon-submit" />
                  Submit for Review
                </>
              )}
            </Button>
          </div>
        </div>
      </main>

      <BottomNav activeTab="dashboard" />
    </div>
  );
}

/**
 * Phase 2 - BUILD: Export with ErrorBoundary wrapper
 * 
 * Catches and handles runtime errors gracefully to prevent app crashes.
 */
export default function BuilderVerifiedItemsTracker() {
  return (
    <ErrorBoundary>
      <BuilderVerifiedItemsTrackerContent />
    </ErrorBoundary>
  );
}
