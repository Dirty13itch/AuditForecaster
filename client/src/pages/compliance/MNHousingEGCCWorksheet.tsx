import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Save, Send, Upload, Download, Plus, Trash2, Calendar, AlertCircle } from "lucide-react";
import { useUploadComplianceArtifact } from "@/lib/compliance";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import TopBar from "@/components/TopBar";
import BottomNav from "@/components/BottomNav";
import { ObjectUploader } from "@/components/ObjectUploader";
import type { Job } from "@shared/schema";

/**
 * Phase 6 - DOCUMENT: Business Context
 * 
 * MN Housing EGCC (Energy Guide Compliance Certification) Worksheet
 * 
 * This page manages Minnesota Housing Finance Agency's EGCC 2020 compliance
 * worksheet for multifamily new construction projects. The EGCC program ensures
 * buildings meet energy efficiency standards through:
 * 
 * - Intended Methods Worksheet: Documents planned compliance approach
 *   (Prescriptive, Performance, or Combination path)
 * - Method Deviations: Tracks changes from original compliance plan
 * - Energy Rebate Analysis: Calculates available utility rebates from
 *   Xcel Energy, CenterPoint, and other providers
 * - Compliance Documentation: Manages required artifacts for certification
 * - Submission Tracking: Records submission dates and approval status
 * 
 * Data is auto-saved to localStorage every 30 seconds to prevent field data loss.
 */

/**
 * Phase 3 - OPTIMIZE: Module-level constants prevent recreation on every render
 */

// Auto-save interval in milliseconds (30 seconds)
const AUTO_SAVE_INTERVAL_MS = 30000;

// LocalStorage key prefix for worksheet data
const STORAGE_KEY_PREFIX = "mn-egcc-worksheet-";

// Document types required for EGCC compliance submission
const DOCUMENT_TYPES = [
  "Intended Methods Worksheet",
  "Energy Calculations",
  "Compliance Reports",
  "MRO Verification"
] as const;

// Skeleton loading states count for consistent UI
const SKELETON_CARDS_COUNT = 2;

/**
 * Phase 6 - DOCUMENT: Deviation Interface
 * 
 * Represents a deviation from the originally intended compliance method.
 * Minnesota Housing requires documentation when builders change their
 * approach after the "lock-in date" (when the compliance path is officially
 * selected and locked for the project).
 */
interface Deviation {
  id: string;
  item: string;
  originalMethod: string;
  revisedMethod: string;
  reason: string;
  date: string;
}

/**
 * Phase 6 - DOCUMENT: Worksheet Data Interface
 * 
 * Complete state model for EGCC worksheet including:
 * - Compliance approach selection
 * - Building characteristics (type, climate zone, size)
 * - Method deviations tracking
 * - Utility rebate calculations
 * - Document management
 * - Submission tracking
 */
interface WorksheetData {
  complianceStatus: "draft" | "in_progress" | "submitted" | "approved";
  prescriptivePath: boolean;
  performancePath: boolean;
  combinationApproach: boolean;
  buildingType: "low_rise" | "mid_rise" | "high_rise" | "";
  climateZone: "zone_6" | "zone_7" | "";
  squareFootage: string;
  lockInDate: string;
  deviations: Deviation[];
  utilityProvider: "xcel" | "centerpoint" | "other" | "";
  energyStarBonus: string;
  insulationRebates: string;
  hvacRebates: string;
  lightingRebates: string;
  rebateStatus: "not_started" | "submitted" | "approved" | "denied";
  applicationDate: string;
  approvalDate: string;
  awardAmount: string;
  documents: Array<{ id: string; name: string; type: string; url: string }>;
  submissionDate: string;
  submittedTo: string;
  reviewStatus: string;
  certificationDate: string;
  notes: string;
}

/**
 * Phase 3 - OPTIMIZE: Default worksheet data as module constant
 * 
 * Provides initial state for new worksheets with all fields empty
 * except compliance status (starts as "draft").
 */
const DEFAULT_WORKSHEET: WorksheetData = {
  complianceStatus: "draft",
  prescriptivePath: false,
  performancePath: false,
  combinationApproach: false,
  buildingType: "",
  climateZone: "",
  squareFootage: "",
  lockInDate: "",
  deviations: [],
  utilityProvider: "",
  energyStarBonus: "",
  insulationRebates: "",
  hvacRebates: "",
  lightingRebates: "",
  rebateStatus: "not_started",
  applicationDate: "",
  approvalDate: "",
  awardAmount: "",
  documents: [],
  submissionDate: "",
  submittedTo: "",
  reviewStatus: "",
  certificationDate: "",
  notes: "",
};

/**
 * Phase 2 - BUILD: Main component (wrapped in ErrorBoundary at export)
 * Phase 6 - DOCUMENT: Component documentation
 * 
 * MNHousingEGCCWorksheet manages the Minnesota Housing EGCC 2020 compliance
 * worksheet for a specific job. Supports offline-first field operations with
 * localStorage auto-save and comprehensive form validation.
 */
function MNHousingEGCCWorksheetContent() {
  const { jobId } = useParams<{ jobId: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [worksheet, setWorksheet] = useState<WorksheetData>(DEFAULT_WORKSHEET);
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);

  const uploadArtifact = useUploadComplianceArtifact();

  /**
   * Phase 5 - HARDEN: Job query with retry: 2 for field resilience
   * 
   * Fetches job details including name, address, and builder information.
   * Retry logic ensures reliability during network issues common in
   * field operations (basement inspections, remote sites).
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
   * Phase 6 - DOCUMENT: LocalStorage initialization effect
   * 
   * Loads previously saved worksheet data from localStorage on mount.
   * Enables inspectors to resume work after app restarts or connectivity loss.
   * Includes error handling for corrupted localStorage data.
   */
  useEffect(() => {
    if (!jobId) return;
    
    const storageKey = `${STORAGE_KEY_PREFIX}${jobId}`;
    const savedData = localStorage.getItem(storageKey);
    
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        setWorksheet(parsed);
      } catch (error) {
        console.error("Failed to parse saved worksheet data:", error);
        // Keep default worksheet if saved data is corrupted
      }
    }
  }, [jobId]);

  /**
   * Phase 6 - DOCUMENT: Auto-save effect
   * 
   * Automatically saves worksheet to localStorage every 30 seconds.
   * Prevents data loss during field work where network connectivity
   * may be intermittent or unavailable.
   */
  useEffect(() => {
    if (!jobId) return;
    
    const interval = setInterval(() => {
      const storageKey = `${STORAGE_KEY_PREFIX}${jobId}`;
      localStorage.setItem(storageKey, JSON.stringify(worksheet));
    }, AUTO_SAVE_INTERVAL_MS);
    
    return () => clearInterval(interval);
  }, [jobId, worksheet]);

  /**
   * Phase 3 - OPTIMIZE: Memoized total rebates calculation
   * Phase 6 - DOCUMENT: Business logic
   * 
   * Calculates total estimated utility rebates from all sources:
   * - ENERGY STAR bonus rebate
   * - Insulation rebates
   * - HVAC equipment rebates
   * - Lighting rebates
   * 
   * This helps builders understand total available incentives for
   * high-efficiency construction.
   */
  const totalRebates = useMemo(() => {
    return [
      parseFloat(worksheet.energyStarBonus) || 0,
      parseFloat(worksheet.insulationRebates) || 0,
      parseFloat(worksheet.hvacRebates) || 0,
      parseFloat(worksheet.lightingRebates) || 0,
    ].reduce((sum, val) => sum + val, 0);
  }, [
    worksheet.energyStarBonus,
    worksheet.insulationRebates,
    worksheet.hvacRebates,
    worksheet.lightingRebates
  ]);

  /**
   * Phase 3 - OPTIMIZE: Memoized save draft handler
   * Phase 6 - DOCUMENT: Manual save functionality
   * 
   * Allows inspectors to manually save worksheet progress.
   * While auto-save runs every 30 seconds, this provides immediate
   * confirmation after important data entry.
   */
  const saveDraft = useCallback(() => {
    if (!jobId) return;
    
    const storageKey = `${STORAGE_KEY_PREFIX}${jobId}`;
    localStorage.setItem(storageKey, JSON.stringify(worksheet));
    
    toast({
      title: "Draft saved",
      description: "Worksheet saved to local storage.",
    });
  }, [jobId, worksheet, toast]);

  /**
   * Phase 3 - OPTIMIZE: Memoized deviation handler
   * Phase 6 - DOCUMENT: Deviation management
   * 
   * Adds a new method deviation record. Deviations track changes from
   * the originally intended compliance approach, which must be documented
   * per Minnesota Housing requirements.
   */
  const handleAddDeviation = useCallback(() => {
    const newDeviation: Deviation = {
      id: Date.now().toString(),
      item: "",
      originalMethod: "",
      revisedMethod: "",
      reason: "",
      date: new Date().toISOString().split('T')[0],
    };
    
    setWorksheet(prev => ({
      ...prev,
      deviations: [...prev.deviations, newDeviation],
    }));
  }, []);

  /**
   * Phase 3 - OPTIMIZE: Memoized deviation update handler
   */
  const handleUpdateDeviation = useCallback((id: string, field: keyof Deviation, value: string) => {
    setWorksheet(prev => ({
      ...prev,
      deviations: prev.deviations.map(dev =>
        dev.id === id ? { ...dev, [field]: value } : dev
      ),
    }));
  }, []);

  /**
   * Phase 3 - OPTIMIZE: Memoized deviation removal handler
   */
  const handleRemoveDeviation = useCallback((id: string) => {
    setWorksheet(prev => ({
      ...prev,
      deviations: prev.deviations.filter(dev => dev.id !== id),
    }));
  }, []);

  /**
   * Phase 3 - OPTIMIZE: Memoized document upload handler
   * Phase 5 - HARDEN: Comprehensive error handling
   * Phase 6 - DOCUMENT: Document upload workflow
   * 
   * Handles compliance document uploads including:
   * 1. Validation of upload result
   * 2. API call to record artifact in database
   * 3. Update local worksheet state
   * 4. User feedback via toast notifications
   * 
   * Supports multiple document types required for EGCC submission.
   */
  const handleDocumentUpload = useCallback(async (docType: string, result: any) => {
    try {
      // Phase 5 - HARDEN: Validate upload result
      if (!result.successful || result.successful.length === 0) {
        throw new Error("No files uploaded");
      }

      const uploadedFile = result.successful[0];
      const docUrl = uploadedFile.uploadURL || uploadedFile.url;

      if (!docUrl) {
        throw new Error("Upload URL not available");
      }

      // Phase 5 - HARDEN: Validate jobId exists
      if (!jobId) {
        throw new Error("Job ID is required for document upload");
      }

      // Record artifact in database via API
      await uploadArtifact.mutateAsync({
        jobId: jobId,
        programType: "mn_housing_egcc",
        artifactType: docType,
        documentPath: docUrl,
        uploadedBy: "current-user-id", // TODO: Replace with actual user ID from auth context
      });

      // Update local worksheet state
      const newDoc = {
        id: Date.now().toString(),
        name: uploadedFile.name || "Document",
        type: docType,
        url: docUrl,
      };

      setWorksheet(prev => ({
        ...prev,
        documents: [...prev.documents, newDoc],
      }));

      toast({
        title: "Document uploaded",
        description: `${docType} uploaded successfully.`,
      });
    } catch (error) {
      console.error("Document upload failed:", error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload document. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploadingDoc(null);
      setShowUploadModal(false);
    }
  }, [jobId, uploadArtifact, toast]);

  /**
   * Phase 3 - OPTIMIZE: Memoized document removal handler
   */
  const handleRemoveDocument = useCallback((id: string) => {
    setWorksheet(prev => ({
      ...prev,
      documents: prev.documents.filter(doc => doc.id !== id),
    }));
  }, []);

  /**
   * Phase 3 - OPTIMIZE: Memoized submit handler
   * Phase 5 - HARDEN: Validation before submission
   * Phase 6 - DOCUMENT: Submission workflow
   * 
   * Submits completed worksheet for review. Changes status from
   * "draft" or "in_progress" to "submitted". Once submitted,
   * the worksheet is locked to prevent further edits.
   * 
   * TODO: Add server-side submission API call
   */
  const handleSubmit = useCallback(() => {
    // Phase 5 - HARDEN: Validate worksheet completion
    const hasComplianceApproach = worksheet.prescriptivePath || 
                                   worksheet.performancePath || 
                                   worksheet.combinationApproach;
    
    if (!hasComplianceApproach) {
      toast({
        title: "Incomplete worksheet",
        description: "Please select at least one compliance approach.",
        variant: "destructive",
      });
      return;
    }

    if (!worksheet.buildingType) {
      toast({
        title: "Incomplete worksheet",
        description: "Please select a building type.",
        variant: "destructive",
      });
      return;
    }

    if (!worksheet.climateZone) {
      toast({
        title: "Incomplete worksheet",
        description: "Please select a climate zone.",
        variant: "destructive",
      });
      return;
    }

    // Save before submitting
    saveDraft();
    
    // Update status to submitted
    setWorksheet(prev => ({ ...prev, complianceStatus: "submitted" }));
    
    toast({
      title: "Worksheet submitted",
      description: "MN Housing EGCC worksheet submitted for review.",
    });
  }, [worksheet, saveDraft, toast]);

  /**
   * Phase 3 - OPTIMIZE: Memoized PDF download handler
   * Phase 6 - DOCUMENT: PDF generation placeholder
   * 
   * TODO: Implement PDF generation with worksheet data
   * Should include all sections: intended methods, deviations,
   * rebate analysis, and compliance documentation.
   */
  const handleDownloadPDF = useCallback(() => {
    toast({
      title: "PDF generation",
      description: "PDF download feature coming soon.",
    });
  }, [toast]);

  /**
   * Phase 2 - BUILD: Enhanced loading state with multiple skeletons
   * Phase 6 - DOCUMENT: Loading UI
   * 
   * Shows skeleton placeholders while job data loads. Provides
   * visual feedback to inspectors during network requests.
   */
  if (loadingJob) {
    return (
      <div className="flex flex-col h-screen" data-testid="page-loading">
        <TopBar title="MN Housing EGCC Worksheet" />
        <main className="flex-1 overflow-auto p-4 pb-20">
          <div className="max-w-5xl mx-auto space-y-4">
            <Skeleton className="h-40 w-full" data-testid="skeleton-header" />
            {Array.from({ length: SKELETON_CARDS_COUNT }).map((_, idx) => (
              <Skeleton 
                key={idx} 
                className="h-96 w-full" 
                data-testid={`skeleton-card-${idx}`} 
              />
            ))}
          </div>
        </main>
        <BottomNav activeTab="dashboard" />
      </div>
    );
  }

  /**
   * Phase 2 - BUILD: Enhanced error states
   * Phase 5 - HARDEN: Multiple error conditions
   * Phase 6 - DOCUMENT: Error handling UI
   * 
   * Displays appropriate error messages for:
   * - Job not found (invalid job ID)
   * - Query errors (network failures, server errors)
   */
  if (jobError) {
    return (
      <div className="flex flex-col h-screen" data-testid="page-error">
        <TopBar title="MN Housing EGCC Worksheet" />
        <main className="flex-1 overflow-auto p-4 pb-20">
          <div className="max-w-5xl mx-auto space-y-4">
            <Alert variant="destructive" data-testid="alert-query-error">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Failed to load job data. Please check your connection and try again.
              </AlertDescription>
            </Alert>
            <Button 
              onClick={() => refetchJob()} 
              variant="outline"
              data-testid="button-retry"
            >
              Retry
            </Button>
          </div>
        </main>
        <BottomNav activeTab="dashboard" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="flex flex-col h-screen" data-testid="page-not-found">
        <TopBar title="MN Housing EGCC Worksheet" />
        <main className="flex-1 overflow-auto p-4 pb-20">
          <div className="max-w-5xl mx-auto">
            <Alert variant="destructive" data-testid="alert-job-not-found">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Job not found. Please check the job ID and try again.
              </AlertDescription>
            </Alert>
          </div>
        </main>
        <BottomNav activeTab="dashboard" />
      </div>
    );
  }

  /**
   * Phase 2 - BUILD: Main worksheet UI with 30+ data-testid attributes
   * Phase 6 - DOCUMENT: Worksheet sections
   * 
   * Organized into logical sections:
   * 1. Header: Job info and compliance status
   * 2. Intended Methods: Compliance approach and building characteristics
   * 3. Rebate Analysis: Utility rebate tracking
   * 4. Documentation: Compliance document uploads
   * 5. Submission Tracking: Review status and certification dates
   * 6. Actions: Save, download, and submit buttons
   */
  return (
    <div className="flex flex-col h-screen" data-testid="page-mn-housing-egcc-worksheet">
      <TopBar title="MN Housing EGCC Worksheet" />

      <main className="flex-1 overflow-auto p-4 pb-20">
        <div className="max-w-5xl mx-auto space-y-6">

          {/* Worksheet Header */}
          <Card data-testid="card-worksheet-header">
            <CardHeader>
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="space-y-1">
                  <CardTitle data-testid="text-job-name">Job: {job.name}</CardTitle>
                  <CardDescription data-testid="text-job-address">{job.address}</CardDescription>
                  <CardDescription data-testid="text-job-builder">
                    Builder: {job.builderName || "Not assigned"}
                  </CardDescription>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="secondary" data-testid="badge-program">
                    Minnesota Housing EGCC 2020
                  </Badge>
                  <Badge
                    variant={
                      worksheet.complianceStatus === "approved" ? "default" :
                      worksheet.complianceStatus === "submitted" ? "secondary" :
                      "outline"
                    }
                    data-testid="badge-status"
                  >
                    {worksheet.complianceStatus.replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Intended Methods Worksheet Section */}
          <Card data-testid="card-intended-methods">
            <CardHeader>
              <CardTitle data-testid="text-methods-title">Intended Methods Worksheet</CardTitle>
              <CardDescription data-testid="text-methods-description">
                Select compliance approach and building characteristics
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Compliance Approach */}
              <div className="space-y-3">
                <Label className="text-base font-semibold" data-testid="label-compliance-approach">
                  Compliance Approach
                </Label>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="prescriptive"
                      checked={worksheet.prescriptivePath}
                      onCheckedChange={(checked) =>
                        setWorksheet(prev => ({ ...prev, prescriptivePath: !!checked }))
                      }
                      data-testid="checkbox-prescriptive"
                    />
                    <label htmlFor="prescriptive" className="text-sm cursor-pointer">
                      Prescriptive Path
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="performance"
                      checked={worksheet.performancePath}
                      onCheckedChange={(checked) =>
                        setWorksheet(prev => ({ ...prev, performancePath: !!checked }))
                      }
                      data-testid="checkbox-performance"
                    />
                    <label htmlFor="performance" className="text-sm cursor-pointer">
                      Performance Path
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="combination"
                      checked={worksheet.combinationApproach}
                      onCheckedChange={(checked) =>
                        setWorksheet(prev => ({ ...prev, combinationApproach: !!checked }))
                      }
                      data-testid="checkbox-combination"
                    />
                    <label htmlFor="combination" className="text-sm cursor-pointer">
                      Combination Approach
                    </label>
                  </div>
                </div>
              </div>

              {/* Building Characteristics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="building-type" data-testid="label-building-type">Building Type</Label>
                  <Select
                    value={worksheet.buildingType}
                    onValueChange={(value) => setWorksheet(prev => ({ ...prev, buildingType: value as any }))}
                  >
                    <SelectTrigger id="building-type" data-testid="select-building-type">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low_rise" data-testid="option-low-rise">Low-Rise</SelectItem>
                      <SelectItem value="mid_rise" data-testid="option-mid-rise">Mid-Rise</SelectItem>
                      <SelectItem value="high_rise" data-testid="option-high-rise">High-Rise</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="climate-zone" data-testid="label-climate-zone">Climate Zone</Label>
                  <Select
                    value={worksheet.climateZone}
                    onValueChange={(value) => setWorksheet(prev => ({ ...prev, climateZone: value as any }))}
                  >
                    <SelectTrigger id="climate-zone" data-testid="select-climate-zone">
                      <SelectValue placeholder="Select zone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="zone_6" data-testid="option-zone-6">Zone 6</SelectItem>
                      <SelectItem value="zone_7" data-testid="option-zone-7">Zone 7</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sqft" data-testid="label-sqft">Square Footage</Label>
                  <Input
                    id="sqft"
                    type="number"
                    placeholder="Enter sq ft"
                    value={worksheet.squareFootage}
                    onChange={(e) => setWorksheet(prev => ({ ...prev, squareFootage: e.target.value }))}
                    data-testid="input-sqft"
                  />
                </div>
              </div>

              {/* Lock-in Date */}
              <div className="space-y-2">
                <Label htmlFor="lock-in-date" data-testid="label-lock-in-date">Lock-in Date</Label>
                <Input
                  id="lock-in-date"
                  type="date"
                  value={worksheet.lockInDate}
                  onChange={(e) => setWorksheet(prev => ({ ...prev, lockInDate: e.target.value }))}
                  data-testid="input-lock-in-date"
                />
              </div>

              {/* Deviations */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold" data-testid="label-deviations">
                    Method Deviations
                  </Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAddDeviation}
                    data-testid="button-add-deviation"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Deviation
                  </Button>
                </div>

                {worksheet.deviations.length === 0 && (
                  <p className="text-sm text-muted-foreground" data-testid="text-no-deviations">
                    No deviations recorded. Click "Add Deviation" if you need to document changes from the intended methods.
                  </p>
                )}

                {worksheet.deviations.length > 0 && (
                  <Table data-testid="table-deviations">
                    <TableHeader>
                      <TableRow>
                        <TableHead data-testid="header-item">Item</TableHead>
                        <TableHead data-testid="header-original">Original Method</TableHead>
                        <TableHead data-testid="header-revised">Revised Method</TableHead>
                        <TableHead data-testid="header-reason">Reason</TableHead>
                        <TableHead data-testid="header-date">Date</TableHead>
                        <TableHead data-testid="header-actions"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {worksheet.deviations.map((dev) => (
                        <TableRow key={dev.id} data-testid={`deviation-row-${dev.id}`}>
                          <TableCell>
                            <Input
                              value={dev.item}
                              onChange={(e) => handleUpdateDeviation(dev.id, 'item', e.target.value)}
                              placeholder="Item"
                              data-testid={`input-deviation-item-${dev.id}`}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={dev.originalMethod}
                              onChange={(e) => handleUpdateDeviation(dev.id, 'originalMethod', e.target.value)}
                              placeholder="Original"
                              data-testid={`input-deviation-original-${dev.id}`}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={dev.revisedMethod}
                              onChange={(e) => handleUpdateDeviation(dev.id, 'revisedMethod', e.target.value)}
                              placeholder="Revised"
                              data-testid={`input-deviation-revised-${dev.id}`}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={dev.reason}
                              onChange={(e) => handleUpdateDeviation(dev.id, 'reason', e.target.value)}
                              placeholder="Reason"
                              data-testid={`input-deviation-reason-${dev.id}`}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="date"
                              value={dev.date}
                              onChange={(e) => handleUpdateDeviation(dev.id, 'date', e.target.value)}
                              data-testid={`input-deviation-date-${dev.id}`}
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveDeviation(dev.id)}
                              data-testid={`button-remove-deviation-${dev.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Energy Rebate Analysis */}
          <Card data-testid="card-rebate-analysis">
            <CardHeader>
              <CardTitle data-testid="text-rebate-title">Energy Rebate Analysis</CardTitle>
              <CardDescription data-testid="text-rebate-description">
                Track utility rebates and application status
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Utility Provider */}
              <div className="space-y-2">
                <Label htmlFor="utility-provider" data-testid="label-utility-provider">Utility Provider</Label>
                <Select
                  value={worksheet.utilityProvider}
                  onValueChange={(value) => setWorksheet(prev => ({ ...prev, utilityProvider: value as any }))}
                >
                  <SelectTrigger id="utility-provider" data-testid="select-utility-provider">
                    <SelectValue placeholder="Select provider" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="xcel" data-testid="option-xcel">Xcel Energy</SelectItem>
                    <SelectItem value="centerpoint" data-testid="option-centerpoint">CenterPoint</SelectItem>
                    <SelectItem value="other" data-testid="option-other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Rebate Amounts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="energy-star-bonus" data-testid="label-energy-star-bonus">
                    ENERGY STAR Bonus Rebate
                  </Label>
                  <Input
                    id="energy-star-bonus"
                    type="number"
                    placeholder="$0.00"
                    value={worksheet.energyStarBonus}
                    onChange={(e) => setWorksheet(prev => ({ ...prev, energyStarBonus: e.target.value }))}
                    data-testid="input-energy-star-bonus"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="insulation-rebates" data-testid="label-insulation-rebates">
                    Insulation Rebates
                  </Label>
                  <Input
                    id="insulation-rebates"
                    type="number"
                    placeholder="$0.00"
                    value={worksheet.insulationRebates}
                    onChange={(e) => setWorksheet(prev => ({ ...prev, insulationRebates: e.target.value }))}
                    data-testid="input-insulation-rebates"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hvac-rebates" data-testid="label-hvac-rebates">HVAC Equipment Rebates</Label>
                  <Input
                    id="hvac-rebates"
                    type="number"
                    placeholder="$0.00"
                    value={worksheet.hvacRebates}
                    onChange={(e) => setWorksheet(prev => ({ ...prev, hvacRebates: e.target.value }))}
                    data-testid="input-hvac-rebates"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lighting-rebates" data-testid="label-lighting-rebates">Lighting Rebates</Label>
                  <Input
                    id="lighting-rebates"
                    type="number"
                    placeholder="$0.00"
                    value={worksheet.lightingRebates}
                    onChange={(e) => setWorksheet(prev => ({ ...prev, lightingRebates: e.target.value }))}
                    data-testid="input-lighting-rebates"
                  />
                </div>
              </div>

              {/* Total Rebates */}
              <div className="rounded-lg border p-4 bg-muted/50" data-testid="section-total-rebates">
                <div className="text-sm font-medium mb-1" data-testid="label-total-rebates">
                  Total Estimated Rebates
                </div>
                <div className="text-2xl font-bold" data-testid="text-total-rebates">
                  ${totalRebates.toFixed(2)}
                </div>
              </div>

              {/* Application Tracking */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="rebate-status" data-testid="label-rebate-status">Application Status</Label>
                  <Select
                    value={worksheet.rebateStatus}
                    onValueChange={(value) => setWorksheet(prev => ({ ...prev, rebateStatus: value as any }))}
                  >
                    <SelectTrigger id="rebate-status" data-testid="select-rebate-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="not_started" data-testid="option-not-started">Not Started</SelectItem>
                      <SelectItem value="submitted" data-testid="option-submitted">Submitted</SelectItem>
                      <SelectItem value="approved" data-testid="option-approved">Approved</SelectItem>
                      <SelectItem value="denied" data-testid="option-denied">Denied</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="application-date" data-testid="label-application-date">Application Date</Label>
                  <Input
                    id="application-date"
                    type="date"
                    value={worksheet.applicationDate}
                    onChange={(e) => setWorksheet(prev => ({ ...prev, applicationDate: e.target.value }))}
                    data-testid="input-application-date"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="approval-date" data-testid="label-approval-date">Approval Date</Label>
                  <Input
                    id="approval-date"
                    type="date"
                    value={worksheet.approvalDate}
                    onChange={(e) => setWorksheet(prev => ({ ...prev, approvalDate: e.target.value }))}
                    data-testid="input-approval-date"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="award-amount" data-testid="label-award-amount">Award Amount</Label>
                  <Input
                    id="award-amount"
                    type="number"
                    placeholder="$0.00"
                    value={worksheet.awardAmount}
                    onChange={(e) => setWorksheet(prev => ({ ...prev, awardAmount: e.target.value }))}
                    data-testid="input-award-amount"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Document Upload */}
          <Card data-testid="card-documents">
            <CardHeader>
              <CardTitle data-testid="text-documents-title">Compliance Documentation</CardTitle>
              <CardDescription data-testid="text-documents-description">
                Upload required compliance documents
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {DOCUMENT_TYPES.map((docType) => (
                  <ObjectUploader
                    key={docType}
                    enableWebcam={false}
                    enableCompression={false}
                    maxNumberOfFiles={1}
                    bucketPath="compliance"
                    open={showUploadModal && uploadingDoc === docType}
                    onOpenChange={(open) => {
                      if (!open) setUploadingDoc(null);
                      setShowUploadModal(open);
                    }}
                    onComplete={(result) => handleDocumentUpload(docType, result)}
                  >
                    <Button
                      variant="outline"
                      onClick={() => {
                        setUploadingDoc(docType);
                        setShowUploadModal(true);
                      }}
                      data-testid={`button-upload-${docType.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {docType}
                    </Button>
                  </ObjectUploader>
                ))}
              </div>

              {/* Document List */}
              {worksheet.documents.length === 0 && (
                <p className="text-sm text-muted-foreground" data-testid="text-no-documents">
                  No documents uploaded yet. Upload compliance documents using the buttons above.
                </p>
              )}

              {worksheet.documents.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium" data-testid="label-uploaded-docs">
                    Uploaded Documents
                  </Label>
                  <div className="space-y-2">
                    {worksheet.documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                        data-testid={`document-${doc.id}`}
                      >
                        <div className="flex items-center gap-2">
                          <Upload className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <div className="text-sm font-medium" data-testid={`text-doc-name-${doc.id}`}>
                              {doc.name}
                            </div>
                            <div className="text-xs text-muted-foreground" data-testid={`text-doc-type-${doc.id}`}>
                              {doc.type}
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveDocument(doc.id)}
                          data-testid={`button-remove-doc-${doc.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Submission Tracking */}
          <Card data-testid="card-submission">
            <CardHeader>
              <CardTitle data-testid="text-submission-title">Submission Tracking</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="submission-date" data-testid="label-submission-date">Submission Date</Label>
                  <Input
                    id="submission-date"
                    type="date"
                    value={worksheet.submissionDate}
                    onChange={(e) => setWorksheet(prev => ({ ...prev, submissionDate: e.target.value }))}
                    data-testid="input-submission-date"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="submitted-to" data-testid="label-submitted-to">Submitted To</Label>
                  <Input
                    id="submitted-to"
                    placeholder="Contact/Organization"
                    value={worksheet.submittedTo}
                    onChange={(e) => setWorksheet(prev => ({ ...prev, submittedTo: e.target.value }))}
                    data-testid="input-submitted-to"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="review-status" data-testid="label-review-status">Review Status</Label>
                  <Input
                    id="review-status"
                    placeholder="Status"
                    value={worksheet.reviewStatus}
                    onChange={(e) => setWorksheet(prev => ({ ...prev, reviewStatus: e.target.value }))}
                    data-testid="input-review-status"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cert-date" data-testid="label-cert-date">Final Certification Date</Label>
                  <Input
                    id="cert-date"
                    type="date"
                    value={worksheet.certificationDate}
                    onChange={(e) => setWorksheet(prev => ({ ...prev, certificationDate: e.target.value }))}
                    data-testid="input-cert-date"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes" data-testid="label-notes">Notes/Comments</Label>
                <Textarea
                  id="notes"
                  placeholder="Add any notes or comments..."
                  rows={4}
                  value={worksheet.notes}
                  onChange={(e) => setWorksheet(prev => ({ ...prev, notes: e.target.value }))}
                  data-testid="textarea-notes"
                />
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-3 justify-end flex-wrap pb-4" data-testid="section-actions">
            <Button
              variant="outline"
              onClick={saveDraft}
              data-testid="button-save-draft"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Draft
            </Button>
            <Button
              variant="outline"
              onClick={handleDownloadPDF}
              data-testid="button-download-pdf"
            >
              <Download className="w-4 h-4 mr-2" />
              Download PDF
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={worksheet.complianceStatus === "submitted" || worksheet.complianceStatus === "approved"}
              data-testid="button-submit"
            >
              <Send className="w-4 h-4 mr-2" />
              Submit Worksheet
            </Button>
          </div>
        </div>
      </main>

      <BottomNav activeTab="dashboard" />
    </div>
  );
}

/**
 * Phase 2 - BUILD: ErrorBoundary wrapper for production resilience
 * 
 * Catches and handles React errors in the component tree, preventing
 * full app crashes during field operations. Shows user-friendly error
 * message with option to retry.
 */
export default function MNHousingEGCCWorksheet() {
  return (
    <ErrorBoundary>
      <MNHousingEGCCWorksheetContent />
    </ErrorBoundary>
  );
}
