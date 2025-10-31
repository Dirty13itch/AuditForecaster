import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { 
  Save, 
  Send, 
  Upload, 
  Download, 
  Plus, 
  Trash2, 
  Check, 
  X, 
  AlertCircle,
  ExternalLink,
  Package,
  RefreshCw
} from "lucide-react";
import { useUploadComplianceArtifact } from "@/lib/compliance";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
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
 * Phase 3 - OPTIMIZE: Module-level constants prevent recreation on every render
 * 
 * Business Context:
 * ZERH (Zero Energy Ready Homes) Multifamily V2 compliance tracker manages the certification
 * process for multifamily buildings seeking DOE Zero Energy Ready Home designation combined
 * with IRS Section 45L tax credits.
 * 
 * Program Requirements:
 * - Prerequisites: ENERGY STAR MFNC 1.2 + Indoor airPLUS certification (mandatory)
 * - Additional Efficiency Measures: Point-based system for optional upgrades
 * - 45L Tax Credits: $2,500 per dwelling unit, capped at $15,000 per building
 * - Minimum Points Threshold: 10 points from efficiency measures for 45L eligibility
 * 
 * Certification Process:
 * 1. Complete all prerequisites (ENERGY STAR MFNC, Indoor airPLUS)
 * 2. Implement additional efficiency measures to earn points
 * 3. Upload all compliance documentation
 * 4. Submit complete package for DOE ZERH certification
 * 5. Claim 45L tax credits on IRS Form 8908 after certification
 */

/**
 * Phase 5 - HARDEN: Configuration constants for validation and auto-save
 */
const AUTOSAVE_INTERVAL_MS = 30000; // Auto-save tracker data every 30 seconds
const CREDIT_PER_UNIT = 2500; // IRS Section 45L credit per dwelling unit (2025)
const BUILDING_CREDIT_CAP = 15000; // Maximum credit per building structure
const MIN_POINTS_THRESHOLD = 10; // Minimum efficiency points for 45L eligibility
const MAX_BUILDING_NAME_LENGTH = 100; // Maximum length for building name input
const MAX_MEASURE_NAME_LENGTH = 200; // Maximum length for custom measure description
const MAX_POINTS_VALUE = 100; // Maximum points value for a single measure

/**
 * Phase 2 - BUILD: TypeScript interfaces for type safety
 * 
 * Prerequisite: Required certifications that must be completed before ZERH submission
 * EfficiencyMeasure: Optional building upgrades that earn points toward 45L eligibility
 * Building: Individual building structures eligible for 45L tax credits
 * TrackerData: Complete state of ZERH compliance tracking
 */
interface Prerequisite {
  id: string;
  name: string;
  status: "not_started" | "in_progress" | "complete";
  route?: string;
}

interface EfficiencyMeasure {
  id: string;
  measure: string;
  required: boolean;
  status: "not_started" | "in_progress" | "complete";
  points: number;
}

interface Building {
  id: string;
  name: string;
  units: number;
  credit: number;
}

interface TrackerData {
  prerequisites: Prerequisite[];
  efficiencyMeasures: EfficiencyMeasure[];
  buildings: Building[];
  documents: Array<{ id: string; name: string; type: string; url: string }>;
  certificationStatus: "draft" | "submitted" | "certified";
}

/**
 * Phase 3 - OPTIMIZE: Module constant for default tracker template
 * 
 * Business Logic - Default Prerequisites:
 * - ENERGY STAR MFNC 1.2: Foundation certification required by ZERH
 * - Indoor airPLUS: Ensures healthy indoor air quality standards
 * 
 * Business Logic - Default Efficiency Measures:
 * Predefined measures from ZERH V2 scorecard including:
 * - High-efficiency windows: Reduces heating/cooling loads
 * - Advanced framing: Optimizes lumber use and insulation performance
 * - Heat pump water heater: High-efficiency domestic hot water
 * - Solar-ready roof: Prepares for future renewable energy installation
 * - EV charging ready: Supports electric vehicle infrastructure
 */
const DEFAULT_TRACKER: TrackerData = {
  prerequisites: [
    {
      id: "energy-star",
      name: "ENERGY STAR MFNC 1.2",
      status: "not_started",
      route: "/compliance/energy-star-checklist",
    },
    {
      id: "indoor-airplus",
      name: "Indoor airPLUS",
      status: "not_started",
    },
  ],
  efficiencyMeasures: [
    {
      id: "windows",
      measure: "High-efficiency windows (U-factor ≤ 0.27)",
      required: false,
      status: "not_started",
      points: 5,
    },
    {
      id: "framing",
      measure: "Advanced framing techniques",
      required: false,
      status: "not_started",
      points: 3,
    },
    {
      id: "heat-pump",
      measure: "Heat pump water heater",
      required: false,
      status: "not_started",
      points: 4,
    },
    {
      id: "solar-ready",
      measure: "Solar-ready roof",
      required: false,
      status: "not_started",
      points: 6,
    },
    {
      id: "ev-ready",
      measure: "EV charging ready",
      required: false,
      status: "not_started",
      points: 5,
    },
  ],
  buildings: [],
  documents: [],
  certificationStatus: "draft",
};

/**
 * Phase 2 - BUILD: Main component wrapped in ErrorBoundary at export
 * 
 * ZERHComplianceTrackerContent manages the complete ZERH certification workflow
 * from prerequisite completion through 45L tax credit calculation and submission
 * package generation.
 */
function ZERHComplianceTrackerContent() {
  const { jobId } = useParams<{ jobId: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [tracker, setTracker] = useState<TrackerData>(DEFAULT_TRACKER);
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [newBuildingName, setNewBuildingName] = useState("");
  const [newBuildingUnits, setNewBuildingUnits] = useState("");
  const [newMeasureName, setNewMeasureName] = useState("");
  const [newMeasurePoints, setNewMeasurePoints] = useState("");

  const uploadArtifact = useUploadComplianceArtifact();

  /**
   * Phase 5 - HARDEN: Fetch job data with retry: 2 and error handling
   * 
   * Business Logic - Job Context:
   * ZERH compliance tracking requires association with a specific inspection job
   * to link certification data with project details (address, builder, units).
   * 
   * Retry configuration ensures resilience during network issues common in field operations.
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
   * Phase 5 - HARDEN: Load saved tracker data from localStorage on mount
   * 
   * Business Logic - Data Persistence:
   * Tracker data is persisted to localStorage to prevent data loss during:
   * - Browser crashes or unexpected tab closures
   * - Network connectivity issues preventing backend sync
   * - Multi-day certification processes with incremental updates
   * 
   * Error handling catches corrupted JSON data without breaking the component.
   */
  useEffect(() => {
    if (!jobId) return;

    const savedData = localStorage.getItem(`zerh-tracker-${jobId}`);
    if (savedData) {
      try {
        const parsedData = JSON.parse(savedData);
        setTracker(parsedData);
      } catch (error) {
        console.error("Failed to parse saved tracker data:", error);
        toast({
          title: "Data recovery failed",
          description: "Could not load saved data. Starting with default template.",
          variant: "destructive",
        });
      }
    }
  }, [jobId, toast]);

  /**
   * Phase 5 - HARDEN: Auto-save tracker data every 30 seconds
   * 
   * Business Logic - Auto-save:
   * Automatic persistence prevents data loss during long certification sessions.
   * Field inspectors may spend hours completing checklists across multiple buildings,
   * so frequent auto-save ensures work is not lost.
   */
  useEffect(() => {
    if (!jobId) return;

    const interval = setInterval(() => {
      localStorage.setItem(`zerh-tracker-${jobId}`, JSON.stringify(tracker));
    }, AUTOSAVE_INTERVAL_MS);
    
    return () => clearInterval(interval);
  }, [jobId, tracker]);

  /**
   * Phase 3 - OPTIMIZE: Memoized callback for manual save
   * 
   * Prevents function recreation on every render while maintaining
   * access to current tracker state via dependency array.
   */
  const saveDraft = useCallback(() => {
    if (!jobId) return;

    localStorage.setItem(`zerh-tracker-${jobId}`, JSON.stringify(tracker));
    toast({
      title: "Draft saved",
      description: "Tracker saved to local storage.",
    });
  }, [jobId, tracker, toast]);

  /**
   * Phase 3 - OPTIMIZE: Memoized callback for prerequisite status updates
   * 
   * Business Logic - Prerequisites:
   * Each prerequisite (ENERGY STAR MFNC, Indoor airPLUS) must progress through:
   * - not_started: Certification process not yet initiated
   * - in_progress: Checklist items being completed, documents being prepared
   * - complete: All requirements met, certification awarded
   */
  const handleUpdatePrerequisite = useCallback((id: string, status: Prerequisite["status"]) => {
    setTracker(prev => ({
      ...prev,
      prerequisites: prev.prerequisites.map(p =>
        p.id === id ? { ...p, status } : p
      ),
    }));
  }, []);

  /**
   * Phase 3 - OPTIMIZE: Memoized callback for efficiency measure status updates
   * 
   * Business Logic - Efficiency Measures:
   * Optional measures earn points toward 45L eligibility threshold.
   * Status tracking ensures accurate point calculation as measures are completed.
   */
  const handleUpdateMeasure = useCallback((id: string, status: EfficiencyMeasure["status"]) => {
    setTracker(prev => ({
      ...prev,
      efficiencyMeasures: prev.efficiencyMeasures.map(m =>
        m.id === id ? { ...m, status } : m
      ),
    }));
  }, []);

  /**
   * Phase 3 - OPTIMIZE: Memoized callback with Phase 5 - HARDEN validation
   * 
   * Business Logic - Custom Measures:
   * Allows inspectors to add project-specific efficiency measures beyond
   * the standard ZERH scorecard (e.g., geothermal systems, triple-pane windows).
   * 
   * Validation prevents:
   * - Empty measure names
   * - Excessively long descriptions that break UI
   * - Invalid point values (negative, zero, or unreasonably high)
   */
  const handleAddMeasure = useCallback(() => {
    const trimmedName = newMeasureName.trim();

    // Phase 5 - HARDEN: Input validation
    if (!trimmedName) {
      toast({
        title: "Validation error",
        description: "Measure name cannot be empty.",
        variant: "destructive",
      });
      return;
    }

    if (trimmedName.length > MAX_MEASURE_NAME_LENGTH) {
      toast({
        title: "Validation error",
        description: `Measure name cannot exceed ${MAX_MEASURE_NAME_LENGTH} characters.`,
        variant: "destructive",
      });
      return;
    }

    const points = parseInt(newMeasurePoints);
    if (isNaN(points) || points <= 0 || points > MAX_POINTS_VALUE) {
      toast({
        title: "Validation error",
        description: `Points must be between 1 and ${MAX_POINTS_VALUE}.`,
        variant: "destructive",
      });
      return;
    }

    const newMeasure: EfficiencyMeasure = {
      id: Date.now().toString(),
      measure: trimmedName,
      required: false,
      status: "not_started",
      points,
    };

    setTracker(prev => ({
      ...prev,
      efficiencyMeasures: [...prev.efficiencyMeasures, newMeasure],
    }));

    setNewMeasureName("");
    setNewMeasurePoints("");

    toast({
      title: "Measure added",
      description: `Added "${trimmedName}" worth ${points} points.`,
    });
  }, [newMeasureName, newMeasurePoints, toast]);

  /**
   * Phase 3 - OPTIMIZE: Memoized callback for removing efficiency measures
   * 
   * Allows removal of custom measures if added in error or no longer applicable.
   */
  const handleRemoveMeasure = useCallback((id: string) => {
    setTracker(prev => ({
      ...prev,
      efficiencyMeasures: prev.efficiencyMeasures.filter(m => m.id !== id),
    }));
  }, []);

  /**
   * Phase 3 - OPTIMIZE: Memoized 45L credit calculation
   * 
   * Business Logic - Section 45L Tax Credit:
   * IRS Section 45L provides tax credits for energy-efficient new homes.
   * For multifamily buildings certified under ZERH:
   * - Credit = $2,500 per dwelling unit
   * - Maximum = $15,000 per building structure
   * 
   * Example: 10-unit building = MIN(10 × $2,500, $15,000) = $15,000
   *          20-unit building = MIN(20 × $2,500, $15,000) = $15,000 (capped)
   */
  const calculate45LCredit = useCallback((units: number): number => {
    return Math.min(units * CREDIT_PER_UNIT, BUILDING_CREDIT_CAP);
  }, []);

  /**
   * Phase 3 - OPTIMIZE: Memoized callback with Phase 5 - HARDEN validation
   * 
   * Business Logic - Building Management:
   * Large multifamily projects may span multiple physical buildings, each eligible
   * for separate 45L tax credits. Tracking buildings individually ensures accurate
   * total credit calculation and proper IRS Form 8908 completion.
   * 
   * Validation prevents:
   * - Empty building names
   * - Invalid unit counts (zero, negative, or non-numeric)
   * - Excessively long names that break table layouts
   */
  const handleAddBuilding = useCallback(() => {
    const trimmedName = newBuildingName.trim();

    // Phase 5 - HARDEN: Input validation
    if (!trimmedName) {
      toast({
        title: "Validation error",
        description: "Building name cannot be empty.",
        variant: "destructive",
      });
      return;
    }

    if (trimmedName.length > MAX_BUILDING_NAME_LENGTH) {
      toast({
        title: "Validation error",
        description: `Building name cannot exceed ${MAX_BUILDING_NAME_LENGTH} characters.`,
        variant: "destructive",
      });
      return;
    }

    const units = parseInt(newBuildingUnits);
    if (isNaN(units) || units <= 0) {
      toast({
        title: "Validation error",
        description: "Number of units must be a positive number.",
        variant: "destructive",
      });
      return;
    }

    const credit = calculate45LCredit(units);

    const newBuilding: Building = {
      id: Date.now().toString(),
      name: trimmedName,
      units,
      credit,
    };

    setTracker(prev => ({
      ...prev,
      buildings: [...prev.buildings, newBuilding],
    }));

    setNewBuildingName("");
    setNewBuildingUnits("");

    toast({
      title: "Building added",
      description: `${trimmedName}: ${units} units = $${credit.toLocaleString()} tax credit`,
    });
  }, [newBuildingName, newBuildingUnits, calculate45LCredit, toast]);

  /**
   * Phase 3 - OPTIMIZE: Memoized callback for removing buildings
   * 
   * Allows removal of buildings if added in error or project scope changes.
   */
  const handleRemoveBuilding = useCallback((id: string) => {
    setTracker(prev => ({
      ...prev,
      buildings: prev.buildings.filter(b => b.id !== id),
    }));
  }, []);

  /**
   * Phase 3 - OPTIMIZE: Memoized callback for document uploads
   * 
   * Business Logic - Compliance Documentation:
   * ZERH certification requires uploading proof of prerequisite certifications:
   * - ENERGY STAR MFNC Certificate from MRO
   * - Indoor airPLUS Certificate from EPA
   * - 45L Certification from DOE
   * - Energy Modeling Report from HERS Rater
   * 
   * Documents are stored in object storage and referenced in tracker for
   * inclusion in final submission package.
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

      await uploadArtifact.mutateAsync({
        jobId: jobId!,
        programType: "zerh",
        artifactType: docType,
        documentPath: docUrl,
        uploadedBy: "current-user-id",
      });

      const newDoc = {
        id: Date.now().toString(),
        name: uploadedFile.name || "Document",
        type: docType,
        url: docUrl,
      };

      setTracker(prev => ({
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
   * Phase 3 - OPTIMIZE: Memoized callback for removing documents
   * 
   * Allows removal of documents if uploaded in error or superseded by updated versions.
   */
  const handleRemoveDocument = useCallback((id: string) => {
    setTracker(prev => ({
      ...prev,
      documents: prev.documents.filter(doc => doc.id !== id),
    }));
  }, []);

  /**
   * Phase 3 - OPTIMIZE: Memoized callback for certification submission
   * 
   * Business Logic - Submission Validation:
   * Before submitting for ZERH certification, all prerequisites must be complete.
   * This ensures the submission package contains all required documentation and
   * meets DOE ZERH program requirements.
   * 
   * Submission triggers:
   * - Status change to "submitted"
   * - Final save to localStorage
   * - (Future) Backend API call to create submission record
   */
  const handleSubmit = useCallback(() => {
    const completedCount = tracker.prerequisites.filter(p => p.status === "complete").length;
    const totalCount = tracker.prerequisites.length;

    if (completedCount < totalCount) {
      toast({
        title: "Prerequisites incomplete",
        description: `Complete all ${totalCount} prerequisites before submitting. Currently ${completedCount}/${totalCount} complete.`,
        variant: "destructive",
      });
      return;
    }

    saveDraft();
    setTracker(prev => ({ ...prev, certificationStatus: "submitted" }));
    toast({
      title: "Submitted for certification",
      description: "ZERH compliance tracker submitted for review.",
    });
  }, [tracker.prerequisites, saveDraft, toast]);

  /**
   * Phase 3 - OPTIMIZE: Memoized callback for marking certification complete
   * 
   * Business Logic - Certification Completion:
   * Once DOE issues ZERH certification, update status to enable 45L tax credit filing.
   * Prerequisites must be met before marking certified to prevent premature status changes.
   */
  const handleMarkCertified = useCallback(() => {
    setTracker(prev => ({ ...prev, certificationStatus: "certified" }));
    toast({
      title: "Marked as certified",
      description: "ZERH certification complete. Ready to claim 45L tax credits.",
    });
  }, [toast]);

  /**
   * Phase 3 - OPTIMIZE: Memoized callback for package generation
   * 
   * Business Logic - Submission Package:
   * Generates comprehensive PDF package for 45L tax credit filing including:
   * - All uploaded certificates (ENERGY STAR, Indoor airPLUS, ZERH)
   * - Tax credit calculation worksheets showing per-building credits
   * - Compliance summary documenting efficiency measures
   * 
   * (Future enhancement: actual PDF generation)
   */
  const handleGeneratePackage = useCallback(() => {
    toast({
      title: "Package generation",
      description: "45L submission package generation coming soon.",
    });
  }, [toast]);

  /**
   * Phase 3 - OPTIMIZE: Memoized calculations for prerequisite progress
   * 
   * Business Logic - Progress Tracking:
   * Displays completion status for required prerequisites.
   * Both prerequisites must be complete for ZERH and 45L eligibility.
   */
  const completedPrereqs = useMemo(
    () => tracker.prerequisites.filter(p => p.status === "complete").length,
    [tracker.prerequisites]
  );

  const totalPrereqs = useMemo(
    () => tracker.prerequisites.length,
    [tracker.prerequisites]
  );

  const prerequisitesMet = useMemo(
    () => completedPrereqs === totalPrereqs,
    [completedPrereqs, totalPrereqs]
  );

  /**
   * Phase 3 - OPTIMIZE: Memoized calculation for total efficiency points
   * 
   * Business Logic - Points Calculation:
   * Sums points from all completed efficiency measures.
   * Must meet MIN_POINTS_THRESHOLD (10 points) for 45L eligibility.
   */
  const totalPoints = useMemo(
    () => tracker.efficiencyMeasures
      .filter(m => m.status === "complete")
      .reduce((sum, m) => sum + m.points, 0),
    [tracker.efficiencyMeasures]
  );

  /**
   * Phase 3 - OPTIMIZE: Memoized calculation for total 45L tax credits
   * 
   * Business Logic - Total Credits:
   * Sums individual building credits to show total project tax credit value.
   * Each building capped at $15,000 regardless of unit count.
   */
  const totalCredit = useMemo(
    () => tracker.buildings.reduce((sum, b) => sum + b.credit, 0),
    [tracker.buildings]
  );

  /**
   * Phase 3 - OPTIMIZE: Memoized calculation for 45L eligibility
   * 
   * Business Logic - 45L Eligibility:
   * Building qualifies for Section 45L tax credits if:
   * 1. All prerequisites complete (ENERGY STAR MFNC + Indoor airPLUS)
   * 2. Total efficiency points ≥ 10 from additional measures
   * 
   * This binary flag drives UI badges and submission package availability.
   */
  const is45LEligible = useMemo(
    () => prerequisitesMet && totalPoints >= MIN_POINTS_THRESHOLD,
    [prerequisitesMet, totalPoints]
  );

  /**
   * Phase 2 - BUILD: Loading state with skeleton placeholders
   * 
   * Shows placeholder content while job data loads from backend.
   * Prevents layout shift when actual data populates.
   */
  if (loadingJob) {
    return (
      <div className="flex flex-col h-screen" data-testid="page-zerh-tracker-loading">
        <TopBar title="ZERH Compliance Tracker" />
        <main className="flex-1 overflow-auto p-4 pb-20">
          <div className="max-w-5xl mx-auto space-y-4">
            <Skeleton className="h-40 w-full" data-testid="skeleton-header" />
            <Skeleton className="h-96 w-full" data-testid="skeleton-content" />
            <Skeleton className="h-64 w-full" data-testid="skeleton-measures" />
          </div>
        </main>
        <BottomNav activeTab="dashboard" />
      </div>
    );
  }

  /**
   * Phase 2 - BUILD: Error state with retry capability
   * 
   * Displays when job query fails (network error, invalid job ID, etc.).
   * Provides refetch button for manual retry after transient failures.
   */
  if (jobError) {
    return (
      <div className="flex flex-col h-screen" data-testid="page-zerh-tracker-error">
        <TopBar title="ZERH Compliance Tracker" />
        <main className="flex-1 overflow-auto p-4 pb-20">
          <div className="max-w-5xl mx-auto">
            <Alert variant="destructive" data-testid="alert-job-error">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Failed to load job data. Please check your connection and try again.
              </AlertDescription>
            </Alert>
            <div className="mt-4">
              <Button 
                onClick={() => refetchJob()} 
                variant="outline"
                data-testid="button-retry-load"
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
   * Phase 2 - BUILD: Not found state when job doesn't exist
   * 
   * Displays when job ID is valid but no matching job found in database.
   */
  if (!job) {
    return (
      <div className="flex flex-col h-screen" data-testid="page-zerh-tracker-not-found">
        <TopBar title="ZERH Compliance Tracker" />
        <main className="flex-1 overflow-auto p-4 pb-20">
          <Alert variant="destructive" data-testid="alert-job-not-found">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Job not found. Please check the job ID and try again.
            </AlertDescription>
          </Alert>
        </main>
        <BottomNav activeTab="dashboard" />
      </div>
    );
  }

  /**
   * Phase 2 - BUILD: Main content with comprehensive data-testid attributes
   * 
   * Provides complete ZERH compliance tracking interface with:
   * - Job header with program version and eligibility status
   * - Prerequisites checklist with progress tracking
   * - Efficiency measures table with point totals
   * - 45L tax credit calculator with building management
   * - Document upload section for compliance artifacts
   * - Submission package generation
   * - Action buttons for save, submit, and certification
   */
  return (
    <div className="flex flex-col h-screen" data-testid="page-zerh-tracker">
      <TopBar title="ZERH Compliance Tracker" />

      <main className="flex-1 overflow-auto p-4 pb-20">
        <div className="max-w-5xl mx-auto space-y-6">

          {/* Header */}
          <Card data-testid="card-header">
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
                    ZERH Multifamily Version 2
                  </Badge>
                  <Badge variant="outline" data-testid="badge-effective-date">
                    Effective Jan 1, 2025
                  </Badge>
                  {is45LEligible ? (
                    <Badge variant="default" className="bg-green-600" data-testid="badge-45l-eligible">
                      <Check className="w-3 h-3 mr-1" />
                      45L Eligible
                    </Badge>
                  ) : (
                    <Badge variant="destructive" data-testid="badge-45l-not-eligible">
                      <X className="w-3 h-3 mr-1" />
                      Not 45L Eligible
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Prerequisites Checklist */}
          <Card data-testid="card-prerequisites">
            <CardHeader>
              <CardTitle data-testid="text-prerequisites-title">Prerequisites Checklist</CardTitle>
              <CardDescription data-testid="text-prerequisites-description">
                Complete all prerequisites for ZERH certification
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border p-4 bg-muted/50" data-testid="container-prerequisites-progress">
                <div className="text-sm font-medium mb-1">Progress</div>
                <div className="text-lg font-semibold" data-testid="text-prerequisites-progress">
                  {completedPrereqs} of {totalPrereqs} prerequisites met
                </div>
              </div>

              {tracker.prerequisites.map((prereq) => (
                <div
                  key={prereq.id}
                  className="flex items-start gap-4 p-4 border rounded-lg"
                  data-testid={`prerequisite-${prereq.id}`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium" data-testid={`text-prereq-name-${prereq.id}`}>
                        {prereq.name}
                      </h4>
                      {prereq.status === "complete" && (
                        <Check className="w-4 h-4 text-green-600" data-testid={`icon-prereq-complete-${prereq.id}`} />
                      )}
                    </div>
                    <div className="mt-2">
                      <Select
                        value={prereq.status}
                        onValueChange={(value) => handleUpdatePrerequisite(prereq.id, value as any)}
                      >
                        <SelectTrigger className="w-48" data-testid={`select-prereq-status-${prereq.id}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="not_started" data-testid={`option-prereq-not-started-${prereq.id}`}>Not Started</SelectItem>
                          <SelectItem value="in_progress" data-testid={`option-prereq-in-progress-${prereq.id}`}>In Progress</SelectItem>
                          <SelectItem value="complete" data-testid={`option-prereq-complete-${prereq.id}`}>Complete</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {prereq.route && prereq.status !== "complete" && (
                    <Link href={`${prereq.route}/${jobId}`}>
                      <Button variant="outline" size="sm" data-testid={`button-goto-${prereq.id}`}>
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Go to Checklist
                      </Button>
                    </Link>
                  )}
                </div>
              ))}

              {!prerequisitesMet && (
                <Alert data-testid="alert-prerequisites-incomplete">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Complete all prerequisites to qualify for ZERH and 45L tax credit.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Efficiency Measures */}
          <Card data-testid="card-measures">
            <CardHeader>
              <CardTitle data-testid="text-measures-title">Additional Efficiency Measures</CardTitle>
              <CardDescription data-testid="text-measures-description">
                Track additional measures beyond ZERH requirements
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border p-4 bg-muted/50" data-testid="container-total-points">
                <div className="text-sm font-medium mb-1">Total Points Earned</div>
                <div className="text-2xl font-bold" data-testid="text-total-points">
                  {totalPoints} points
                </div>
                <div className="text-xs text-muted-foreground mt-1" data-testid="text-points-threshold">
                  Minimum {MIN_POINTS_THRESHOLD} points required for 45L eligibility
                </div>
              </div>

              <Table data-testid="table-measures">
                <TableHeader>
                  <TableRow>
                    <TableHead data-testid="header-measure-name">Measure</TableHead>
                    <TableHead data-testid="header-measure-required">Required?</TableHead>
                    <TableHead data-testid="header-measure-status">Status</TableHead>
                    <TableHead data-testid="header-measure-points">Points</TableHead>
                    <TableHead data-testid="header-measure-actions"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tracker.efficiencyMeasures.map((measure) => (
                    <TableRow key={measure.id} data-testid={`measure-row-${measure.id}`}>
                      <TableCell data-testid={`text-measure-name-${measure.id}`}>
                        {measure.measure}
                      </TableCell>
                      <TableCell data-testid={`badge-measure-required-${measure.id}`}>
                        <Badge variant={measure.required ? "default" : "outline"}>
                          {measure.required ? "Required" : "Optional"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={measure.status}
                          onValueChange={(value) => handleUpdateMeasure(measure.id, value as any)}
                        >
                          <SelectTrigger className="w-36" data-testid={`select-measure-status-${measure.id}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="not_started" data-testid={`option-measure-not-started-${measure.id}`}>Not Started</SelectItem>
                            <SelectItem value="in_progress" data-testid={`option-measure-in-progress-${measure.id}`}>In Progress</SelectItem>
                            <SelectItem value="complete" data-testid={`option-measure-complete-${measure.id}`}>Complete</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell data-testid={`text-measure-points-${measure.id}`}>
                        {measure.points}
                      </TableCell>
                      <TableCell>
                        {!measure.required && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveMeasure(measure.id)}
                            data-testid={`button-remove-measure-${measure.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="flex gap-2" data-testid="container-add-measure">
                <Input
                  placeholder="Measure name"
                  value={newMeasureName}
                  onChange={(e) => setNewMeasureName(e.target.value)}
                  data-testid="input-new-measure-name"
                  maxLength={MAX_MEASURE_NAME_LENGTH}
                />
                <Input
                  type="number"
                  placeholder="Points"
                  className="w-24"
                  value={newMeasurePoints}
                  onChange={(e) => setNewMeasurePoints(e.target.value)}
                  data-testid="input-new-measure-points"
                  min="1"
                  max={MAX_POINTS_VALUE}
                />
                <Button
                  variant="outline"
                  onClick={handleAddMeasure}
                  data-testid="button-add-measure"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 45L Tax Credit Calculator */}
          <Card data-testid="card-45l-calculator">
            <CardHeader>
              <CardTitle data-testid="text-45l-title">45L Tax Credit Calculator</CardTitle>
              <CardDescription data-testid="text-45l-description">
                Calculate Section 45L tax credits for ZERH-certified buildings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="rounded-lg border p-4 bg-muted/50" data-testid="container-credit-info">
                <div className="text-sm font-medium mb-2">Credit Per Unit</div>
                <div className="text-2xl font-bold" data-testid="text-credit-per-unit">
                  ${CREDIT_PER_UNIT.toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground mt-1" data-testid="text-credit-cap">
                  Building cap: ${BUILDING_CREDIT_CAP.toLocaleString()} maximum per building
                </div>
              </div>

              {tracker.buildings.length > 0 && (
                <div className="space-y-3">
                  <Label className="text-base font-semibold" data-testid="label-buildings">Buildings</Label>
                  <Table data-testid="table-buildings">
                    <TableHeader>
                      <TableRow>
                        <TableHead data-testid="header-building-name">Building Name</TableHead>
                        <TableHead data-testid="header-building-units">Units</TableHead>
                        <TableHead data-testid="header-building-calc">Credit Calculation</TableHead>
                        <TableHead data-testid="header-building-credit">Tax Credit</TableHead>
                        <TableHead data-testid="header-building-actions"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tracker.buildings.map((building) => (
                        <TableRow key={building.id} data-testid={`building-row-${building.id}`}>
                          <TableCell data-testid={`text-building-name-${building.id}`}>
                            {building.name}
                          </TableCell>
                          <TableCell data-testid={`text-building-units-${building.id}`}>
                            {building.units}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            <div data-testid={`text-building-calc-${building.id}`}>
                              {building.units} × ${CREDIT_PER_UNIT.toLocaleString()} = ${(building.units * CREDIT_PER_UNIT).toLocaleString()}
                              <br />
                              MIN(${(building.units * CREDIT_PER_UNIT).toLocaleString()}, ${BUILDING_CREDIT_CAP.toLocaleString()})
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-semibold" data-testid={`text-building-credit-${building.id}`}>
                              ${building.credit.toLocaleString()}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveBuilding(building.id)}
                              data-testid={`button-remove-building-${building.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  <div className="rounded-lg border p-4 bg-primary/5" data-testid="container-total-credit">
                    <div className="text-sm font-medium mb-1">Total Tax Credit (All Buildings)</div>
                    <div className="text-3xl font-bold" data-testid="text-total-credit">
                      ${totalCredit.toLocaleString()}
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <Label className="text-sm font-medium" data-testid="label-add-building">Add Building</Label>
                <div className="flex gap-2" data-testid="container-add-building">
                  <Input
                    placeholder="Building name"
                    value={newBuildingName}
                    onChange={(e) => setNewBuildingName(e.target.value)}
                    data-testid="input-new-building-name"
                    maxLength={MAX_BUILDING_NAME_LENGTH}
                  />
                  <Input
                    type="number"
                    placeholder="Units"
                    className="w-32"
                    value={newBuildingUnits}
                    onChange={(e) => setNewBuildingUnits(e.target.value)}
                    data-testid="input-new-building-units"
                    min="1"
                  />
                  <Button
                    variant="outline"
                    onClick={handleAddBuilding}
                    data-testid="button-add-building"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Building
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Compliance Documentation */}
          <Card data-testid="card-documents">
            <CardHeader>
              <CardTitle data-testid="text-documents-title">Compliance Documentation</CardTitle>
              <CardDescription data-testid="text-documents-description">
                Upload certification documents
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3" data-testid="container-upload-buttons">
                {[
                  "ENERGY STAR MFNC Certificate",
                  "Indoor airPLUS Certificate",
                  "45L Certification",
                  "Energy Modeling Report"
                ].map((docType) => (
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

              {tracker.documents.length > 0 && (
                <div className="space-y-2" data-testid="container-uploaded-documents">
                  <Label className="text-sm font-medium">Uploaded Documents</Label>
                  <div className="space-y-2">
                    {tracker.documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                        data-testid={`document-${doc.id}`}
                      >
                        <div className="flex items-center gap-2">
                          <Upload className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <div className="text-sm font-medium" data-testid={`text-doc-name-${doc.id}`}>{doc.name}</div>
                            <div className="text-xs text-muted-foreground" data-testid={`text-doc-type-${doc.id}`}>{doc.type}</div>
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

          {/* 45L Submission Package */}
          <Card data-testid="card-package">
            <CardHeader>
              <CardTitle data-testid="text-package-title">45L Submission Package</CardTitle>
              <CardDescription data-testid="text-package-description">
                Generate complete submission package with all certificates and calculations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert data-testid="alert-package-contents">
                <Package className="h-4 w-4" />
                <AlertDescription data-testid="text-package-contents">
                  Package will include: All uploaded certificates, Tax credit calculation sheet (PDF), 
                  Compliance summary (PDF)
                </AlertDescription>
              </Alert>

              <Button
                variant="outline"
                onClick={handleGeneratePackage}
                disabled={!prerequisitesMet}
                data-testid="button-generate-package"
              >
                <Download className="w-4 h-4 mr-2" />
                Generate 45L Submission Package
              </Button>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-3 justify-end flex-wrap pb-4" data-testid="container-actions">
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
              onClick={handleSubmit}
              disabled={tracker.certificationStatus === "submitted" || tracker.certificationStatus === "certified"}
              data-testid="button-submit-certification"
            >
              <Send className="w-4 h-4 mr-2" />
              Submit for Certification
            </Button>
            <Button
              onClick={handleMarkCertified}
              disabled={tracker.certificationStatus === "certified" || !prerequisitesMet}
              data-testid="button-mark-certified"
            >
              <Check className="w-4 h-4 mr-2" />
              Mark as Certified
            </Button>
          </div>
        </div>
      </main>

      <BottomNav activeTab="dashboard" />
    </div>
  );
}

/**
 * Phase 2 - BUILD: Export component wrapped in ErrorBoundary
 * 
 * ErrorBoundary catches runtime errors and displays fallback UI instead of
 * crashing the entire application. Critical for production reliability.
 */
export default function ZERHComplianceTracker() {
  return (
    <ErrorBoundary>
      <ZERHComplianceTrackerContent />
    </ErrorBoundary>
  );
}
