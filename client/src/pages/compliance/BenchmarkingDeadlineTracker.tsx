import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Save, Send, Download, ExternalLink, AlertCircle, Clock, Upload, RefreshCw } from "lucide-react";
import { differenceInDays, format, addYears } from "date-fns";
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
import { Progress } from "@/components/ui/progress";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import TopBar from "@/components/TopBar";
import BottomNav from "@/components/BottomNav";
import { ObjectUploader } from "@/components/ObjectUploader";
import type { Job } from "@shared/schema";

/**
 * Phase 3 - OPTIMIZE: Module-level constants prevent recreation on every render
 * 
 * Business Context:
 * BenchmarkingDeadlineTracker manages compliance with Minnesota's 2024 Building Energy
 * Benchmarking law, which requires buildings >=50,000 sq ft to report energy usage annually
 * through EPA's ENERGY STAR Portfolio Manager.
 * 
 * Compliance Classes:
 * - Class 1: Buildings >=100,000 sq ft - First report due June 1, 2025
 * - Class 2: Buildings 50,000-99,999 sq ft - First report due June 1, 2026
 * - Not Subject: Buildings <50,000 sq ft - No reporting required
 */

// Type definition for benchmarking tracking data structure
interface BenchmarkingData {
  buildingName: string;
  buildingAddress: string;
  squareFootage: number | null;
  reportingStatus: "not_started" | "in_progress" | "submitted" | "approved";
  portfolioManagerId: string;
  enableAnnualReminder: boolean;
  documents: {
    benchmarkingReport: string | null;
    portfolioManagerScreenshot: string | null;
    disclosureDoc: string | null;
    publicDisclosureProof: string | null;
  };
}

// Default data structure for new buildings
const DEFAULT_DATA: BenchmarkingData = {
  buildingName: "",
  buildingAddress: "",
  squareFootage: null,
  reportingStatus: "not_started",
  portfolioManagerId: "",
  enableAnnualReminder: false,
  documents: {
    benchmarkingReport: null,
    portfolioManagerScreenshot: null,
    disclosureDoc: null,
    publicDisclosureProof: null,
  },
};

// Compliance classification thresholds (Minnesota 2024 law)
const SQFT_CLASS_1_THRESHOLD = 100000; // >=100,000 sq ft
const SQFT_CLASS_2_THRESHOLD = 50000; // 50,000-99,999 sq ft
const SQFT_NOT_SUBJECT_THRESHOLD = 50000; // <50,000 sq ft

// Deadline configuration for compliance reporting
const CLASS_1_DEADLINE = new Date(2025, 5, 1); // June 1, 2025
const CLASS_2_DEADLINE = new Date(2026, 5, 1); // June 1, 2026

// Countdown alert thresholds (days)
const COUNTDOWN_URGENT_THRESHOLD = 30; // Red alert: <30 days
const COUNTDOWN_WARNING_THRESHOLD = 90; // Yellow alert: <90 days

// Auto-save interval (30 seconds)
const AUTO_SAVE_INTERVAL_MS = 30000;

// Skeleton count for loading states
const SKELETON_CARD_COUNT = 4;

/**
 * Phase 3 - OPTIMIZE: Pure helper function for compliance classification
 * 
 * Business Logic - Compliance Classification:
 * Determines which compliance class a building falls into based on square footage.
 * This directly impacts reporting deadlines and requirements.
 * 
 * @param sqft - Building square footage (null if not yet entered)
 * @returns Compliance class and corresponding deadline
 */
const getComplianceClass = (sqft: number | null): { class: string; deadline: Date | null } => {
  if (!sqft || sqft < SQFT_NOT_SUBJECT_THRESHOLD) {
    return { class: "Not Subject", deadline: null };
  }
  if (sqft >= SQFT_CLASS_1_THRESHOLD) {
    return { class: "Class 1", deadline: CLASS_1_DEADLINE };
  }
  return { class: "Class 2", deadline: CLASS_2_DEADLINE };
};

/**
 * Phase 3 - OPTIMIZE: Pure helper function for countdown calculation
 * 
 * Business Logic - Deadline Tracking:
 * Calculates days remaining until compliance deadline for visual countdown
 * and alert generation.
 * 
 * @param deadline - Compliance deadline date (null if not applicable)
 * @returns Days until deadline (negative if overdue, null if no deadline)
 */
const getCountdown = (deadline: Date | null): number | null => {
  if (!deadline) return null;
  return differenceInDays(deadline, new Date());
};

/**
 * Phase 3 - OPTIMIZE: Pure helper function for countdown color styling
 * 
 * Visual Hierarchy:
 * - Overdue: Destructive red
 * - <30 days: Destructive red (urgent)
 * - <90 days: Warning yellow
 * - >=90 days: Success green
 * 
 * @param days - Days until deadline (null if not applicable)
 * @returns Tailwind color class
 */
const getCountdownColor = (days: number | null): string => {
  if (days === null) return "text-muted-foreground";
  if (days < 0) return "text-destructive";
  if (days < COUNTDOWN_URGENT_THRESHOLD) return "text-destructive";
  if (days < COUNTDOWN_WARNING_THRESHOLD) return "text-warning";
  return "text-success";
};

/**
 * Phase 3 - OPTIMIZE: Pure helper function for countdown badge variant
 * 
 * Badge Styling Based on Urgency:
 * - Overdue or <30 days: Destructive (red)
 * - <90 days: Secondary (yellow/warning)
 * - >=90 days: Default (blue)
 * 
 * @param days - Days until deadline (null if not applicable)
 * @returns Badge variant for styling
 */
const getCountdownBadgeVariant = (days: number | null): "default" | "secondary" | "destructive" => {
  if (days === null || days < 0 || days < COUNTDOWN_URGENT_THRESHOLD) return "destructive";
  if (days < COUNTDOWN_WARNING_THRESHOLD) return "secondary";
  return "default";
};

/**
 * Phase 5 - HARDEN: Input validation for square footage
 * 
 * Validation Rules:
 * - Must be a positive integer
 * - Cannot exceed 10,000,000 sq ft (reasonable maximum for commercial building)
 * - Minimum 0 (allows for entry state)
 * 
 * @param value - Input value from square footage field
 * @returns Validated number or null if invalid
 */
const validateSquareFootage = (value: string): number | null => {
  if (!value) return null;
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) return null;
  if (parsed < 0) return null;
  if (parsed > 10000000) return null; // Reasonable max
  return parsed;
};

/**
 * Phase 2 - BUILD: Main component wrapped in ErrorBoundary at export
 * 
 * Minnesota Building Energy Benchmarking compliance tracker per 2024 law.
 * Provides deadline tracking, document management, and ENERGY STAR Portfolio
 * Manager integration for multifamily buildings.
 */
function BenchmarkingDeadlineTrackerContent() {
  const { buildingId } = useParams<{ buildingId: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Local state for benchmarking data (persisted to localStorage)
  const [data, setData] = useState<BenchmarkingData>(DEFAULT_DATA);
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);

  // Phase 2 - BUILD: Compliance artifact upload mutation
  const uploadArtifact = useUploadComplianceArtifact();

  /**
   * Phase 5 - HARDEN: Fetch job details with retry: 2
   * 
   * Business Logic - Job Context:
   * Job data provides building name and address for display and initial
   * data population. Retry configuration ensures resilience during network
   * issues common in field operations.
   */
  const { 
    data: job, 
    isLoading: loadingJob, 
    error: jobError,
    refetch: refetchJob 
  } = useQuery<Job>({
    queryKey: ["/api/jobs", buildingId],
    enabled: !!buildingId,
    retry: 2,
  });

  /**
   * Phase 3 - OPTIMIZE: Memoized compliance classification
   * 
   * Business Logic:
   * Classification is recalculated only when square footage changes,
   * preventing unnecessary computation on every render.
   */
  const { class: complianceClass, deadline } = useMemo(
    () => getComplianceClass(data.squareFootage),
    [data.squareFootage]
  );

  /**
   * Phase 3 - OPTIMIZE: Memoized countdown calculation
   * 
   * Countdown is recalculated only when deadline changes,
   * preventing unnecessary date calculations on every render.
   */
  const countdown = useMemo(
    () => getCountdown(deadline),
    [deadline]
  );

  /**
   * Phase 3 - OPTIMIZE: Memoized next report due date
   * 
   * Next annual report is calculated only when deadline changes,
   * supporting annual reminder feature.
   */
  const nextReportDue = useMemo(
    () => deadline ? addYears(deadline, 1) : null,
    [deadline]
  );

  /**
   * Business Logic - Local Storage Persistence:
   * Load saved benchmarking data from localStorage when component mounts
   * or when buildingId/job changes. Falls back to job data if no saved data exists.
   */
  useEffect(() => {
    const savedData = localStorage.getItem(`benchmarking-${buildingId}`);
    if (savedData) {
      try {
        setData(JSON.parse(savedData));
      } catch (error) {
        console.error("Failed to parse saved benchmarking data:", error);
      }
    } else if (job) {
      // Initialize from job data if available
      setData(prev => ({
        ...prev,
        buildingName: job.jobName || "",
        buildingAddress: job.address || "",
      }));
    }
  }, [buildingId, job]);

  /**
   * Business Logic - Auto-Save:
   * Automatically persist data to localStorage every 30 seconds
   * to prevent data loss during field operations with intermittent connectivity.
   */
  useEffect(() => {
    const interval = setInterval(() => {
      if (buildingId && data) {
        localStorage.setItem(`benchmarking-${buildingId}`, JSON.stringify(data));
      }
    }, AUTO_SAVE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [buildingId, data]);

  /**
   * Phase 3 - OPTIMIZE: Memoized save handler prevents recreation on every render
   * 
   * Business Logic - Manual Save:
   * Explicitly saves current data to localStorage and shows confirmation toast.
   * Used for user-initiated save actions (vs. auto-save).
   */
  const handleSave = useCallback(() => {
    if (!buildingId) return;
    localStorage.setItem(`benchmarking-${buildingId}`, JSON.stringify(data));
    toast({
      title: "Saved",
      description: "Benchmarking tracker data saved successfully.",
    });
  }, [buildingId, data, toast]);

  /**
   * Phase 3 - OPTIMIZE: Memoized submit handler prevents recreation on every render
   * 
   * Business Logic - Submission Tracking:
   * Marks report as submitted and persists state. This status change is important
   * for compliance tracking and prevents accidental re-submission.
   */
  const handleMarkSubmitted = useCallback(() => {
    if (!buildingId) return;
    const newData = { ...data, reportingStatus: "submitted" as const };
    setData(newData);
    localStorage.setItem(`benchmarking-${buildingId}`, JSON.stringify(newData));
    toast({
      title: "Marked as Submitted",
      description: "Benchmarking report marked as submitted.",
    });
  }, [buildingId, data, toast]);

  /**
   * Phase 3 - OPTIMIZE: Memoized download handler prevents recreation on every render
   * 
   * Business Logic - Summary Export:
   * Generates plain text summary of benchmarking status for offline reference
   * or record-keeping. Useful for compliance audits.
   */
  const handleDownloadSummary = useCallback(() => {
    const summary = `
MN Building Energy Benchmarking Summary
Building: ${data.buildingName}
Address: ${data.buildingAddress}
Square Footage: ${data.squareFootage?.toLocaleString() || "N/A"}
Compliance Class: ${complianceClass}
Deadline: ${deadline ? format(deadline, "MMMM d, yyyy") : "N/A"}
Days Until Deadline: ${countdown !== null ? countdown : "N/A"}
Reporting Status: ${data.reportingStatus}
Portfolio Manager ID: ${data.portfolioManagerId || "N/A"}
Annual Reminder: ${data.enableAnnualReminder ? "Enabled" : "Disabled"}
    `.trim();

    const blob = new Blob([summary], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `benchmarking-summary-${buildingId}.txt`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Downloaded",
      description: "Compliance summary downloaded successfully.",
    });
  }, [buildingId, data, complianceClass, deadline, countdown, toast]);

  /**
   * Phase 3 - OPTIMIZE: Memoized document upload handler prevents recreation on every render
   * 
   * Business Logic - Compliance Document Management:
   * Uploads compliance documents to object storage and records artifact metadata.
   * Documents include:
   * - Benchmarking report (annual energy usage report)
   * - Portfolio Manager screenshot (proof of submission)
   * - Disclosure documentation (required by MN law)
   * - Public disclosure proof (proof of public availability)
   */
  const handleDocumentUpload = useCallback(async (docType: keyof BenchmarkingData["documents"], objectPath: string) => {
    if (!buildingId) return;
    
    try {
      await uploadArtifact.mutateAsync({
        jobId: buildingId,
        programType: "benchmarking",
        artifactType: docType.includes("Report") || docType.includes("Doc") || docType.includes("Proof") ? "certificate" : "photo",
        documentPath: objectPath,
        uploadedBy: "current-user",
      });

      setData(prev => ({
        ...prev,
        documents: {
          ...prev.documents,
          [docType]: objectPath,
        },
      }));

      toast({
        title: "Uploaded",
        description: "Document uploaded successfully.",
      });
    } catch (error) {
      console.error("Document upload failed:", error);
      toast({
        title: "Error",
        description: "Failed to upload document. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploadingDoc(null);
    }
  }, [buildingId, uploadArtifact, toast]);

  /**
   * Phase 5 - HARDEN: Memoized square footage change handler with validation
   * 
   * Input validation ensures data integrity and prevents invalid classifications.
   */
  const handleSquareFootageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const validated = validateSquareFootage(e.target.value);
    setData(prev => ({
      ...prev,
      squareFootage: validated,
    }));
  }, []);

  /**
   * Phase 2 - BUILD: Enhanced loading state with skeleton placeholders
   * 
   * Provides visual feedback during job data fetch, improving perceived
   * performance and user experience.
   */
  if (loadingJob) {
    return (
      <div className="flex flex-col h-screen" data-testid="page-benchmarking-loading">
        <TopBar title="Benchmarking Deadline Tracker" />
        <main className="flex-1 overflow-auto p-4 pb-20">
          <div className="max-w-4xl mx-auto space-y-6">
            {Array.from({ length: SKELETON_CARD_COUNT }).map((_, idx) => (
              <Card key={idx} data-testid={`skeleton-card-${idx}`}>
                <CardHeader>
                  <Skeleton className="h-6 w-48" data-testid={`skeleton-title-${idx}`} />
                  <Skeleton className="h-4 w-64 mt-2" data-testid={`skeleton-description-${idx}`} />
                </CardHeader>
                <CardContent className="space-y-4">
                  <Skeleton className="h-12 w-full" data-testid={`skeleton-input-${idx}`} />
                  <Skeleton className="h-12 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  /**
   * Phase 2 - BUILD: Error state with retry capability
   * 
   * Phase 5 - HARDEN: Comprehensive error handling with retry option
   * Provides clear error messaging and recovery path for network failures.
   */
  if (jobError) {
    return (
      <div className="flex flex-col h-screen" data-testid="page-benchmarking-error">
        <TopBar title="Benchmarking Deadline Tracker" />
        <main className="flex-1 overflow-auto p-4 pb-20">
          <div className="max-w-4xl mx-auto">
            <Alert variant="destructive" data-testid="alert-job-error">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="flex flex-col gap-2">
                  <p className="font-semibold">Failed to load building information</p>
                  <p className="text-sm">{jobError instanceof Error ? jobError.message : "An unknown error occurred"}</p>
                  <Button 
                    onClick={() => refetchJob()} 
                    variant="outline" 
                    size="sm"
                    className="w-fit mt-2"
                    data-testid="button-retry-job"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Retry
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen" data-testid="page-benchmarking-tracker">
      <TopBar title="Benchmarking Deadline Tracker" />
      
      <main className="flex-1 overflow-auto p-4 pb-20">
        <div className="max-w-4xl mx-auto space-y-6">
          
          {/* Header Card: Building Overview */}
          <Card data-testid="card-building-header">
            <CardHeader>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-2">
                  <Badge variant="default" className="w-fit" data-testid="badge-program">
                    MN Building Energy Benchmarking (2024 Law)
                  </Badge>
                  <CardTitle data-testid="text-building-name">
                    {data.buildingName || "Building Name"}
                  </CardTitle>
                  <CardDescription data-testid="text-building-address">
                    {data.buildingAddress || "Building Address"}
                  </CardDescription>
                </div>
                {complianceClass !== "Not Subject" && (
                  <Badge 
                    variant={complianceClass === "Class 1" ? "default" : "secondary"}
                    className="w-fit"
                    data-testid="badge-compliance-class"
                  >
                    {complianceClass}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                Square Footage: <span className="font-semibold text-foreground" data-testid="text-square-footage-display">
                  {data.squareFootage?.toLocaleString() || "Not set"}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Building Size Classification Card */}
          <Card data-testid="card-classification">
            <CardHeader>
              <CardTitle>Building Size Classification</CardTitle>
              <CardDescription>
                Enter building square footage to determine compliance requirements
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="square-footage">Square Footage</Label>
                <Input
                  id="square-footage"
                  type="number"
                  placeholder="Enter square footage"
                  value={data.squareFootage || ""}
                  onChange={handleSquareFootageChange}
                  min="0"
                  max="10000000"
                  data-testid="input-square-footage"
                />
              </div>

              {/* Phase 2 - BUILD: Enhanced classification feedback with detailed explanations */}
              <Alert data-testid="alert-classification">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {!data.squareFootage && "Enter square footage to see classification"}
                  {data.squareFootage && data.squareFootage < SQFT_NOT_SUBJECT_THRESHOLD && (
                    "Not subject to benchmarking requirements (< 50,000 sq ft)"
                  )}
                  {data.squareFootage && data.squareFootage >= SQFT_CLASS_2_THRESHOLD && data.squareFootage < SQFT_CLASS_1_THRESHOLD && (
                    <span><strong>Class 2:</strong> Buildings 50,000-99,999 sq ft. First report due June 1, 2026.</span>
                  )}
                  {data.squareFootage && data.squareFootage >= SQFT_CLASS_1_THRESHOLD && (
                    <span><strong>Class 1:</strong> Buildings ≥100,000 sq ft. First report due June 1, 2025.</span>
                  )}
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* Deadline Countdown Card: Only shown when building is subject to compliance */}
          {deadline && countdown !== null && (
            <Card data-testid="card-deadline-countdown">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" data-testid="icon-countdown" />
                  Deadline Countdown
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>First Report Due Date</Label>
                    <div className="text-2xl font-bold" data-testid="text-deadline-date">
                      {format(deadline, "MMMM d, yyyy")}
                    </div>
                  </div>
                  <div>
                    <Label>Days Until Deadline</Label>
                    <div className={`text-2xl font-bold ${getCountdownColor(countdown)}`} data-testid="text-countdown-days">
                      {countdown < 0 ? `${Math.abs(countdown)} days overdue` : `${countdown} days`}
                    </div>
                  </div>
                </div>

                {/* Phase 2 - BUILD: Contextual alerts based on countdown status */}
                {countdown < 0 && (
                  <Alert variant="destructive" data-testid="alert-overdue">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Overdue:</strong> This report is {Math.abs(countdown)} days past the deadline.
                    </AlertDescription>
                  </Alert>
                )}

                {countdown >= 0 && countdown < COUNTDOWN_URGENT_THRESHOLD && (
                  <Alert variant="destructive" data-testid="alert-urgent">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Urgent:</strong> Less than {COUNTDOWN_URGENT_THRESHOLD} days until deadline.
                    </AlertDescription>
                  </Alert>
                )}

                {countdown >= COUNTDOWN_URGENT_THRESHOLD && countdown < COUNTDOWN_WARNING_THRESHOLD && (
                  <Alert data-testid="alert-upcoming">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Upcoming:</strong> Deadline approaching in {countdown} days.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Visual progress bar showing time elapsed toward deadline */}
                <div className="space-y-2">
                  <Label>Progress to Deadline</Label>
                  <Progress 
                    value={Math.max(0, Math.min(100, 100 - (countdown / 365) * 100))} 
                    className="h-2"
                    data-testid="progress-deadline"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Reporting Status Tracking Card */}
          <Card data-testid="card-reporting-status">
            <CardHeader>
              <CardTitle>Reporting Status</CardTitle>
              <CardDescription>
                Track the status of your benchmarking report
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reporting-status">Current Status</Label>
                <Select
                  value={data.reportingStatus}
                  onValueChange={(value) => setData(prev => ({
                    ...prev,
                    reportingStatus: value as BenchmarkingData["reportingStatus"],
                  }))}
                >
                  <SelectTrigger id="reporting-status" data-testid="select-reporting-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="not_started" data-testid="option-not-started">Not Started</SelectItem>
                    <SelectItem value="in_progress" data-testid="option-in-progress">In Progress</SelectItem>
                    <SelectItem value="submitted" data-testid="option-submitted">Submitted</SelectItem>
                    <SelectItem value="approved" data-testid="option-approved">Approved</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {deadline && (
                <div className="space-y-2">
                  <Label>First Report Due</Label>
                  <div className="text-sm font-medium" data-testid="text-first-report-due">
                    {format(deadline, "MMMM d, yyyy")}
                  </div>
                </div>
              )}

              {/* Annual reminder checkbox for recurring reporting */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="annual-reminder"
                  checked={data.enableAnnualReminder}
                  onCheckedChange={(checked) => setData(prev => ({
                    ...prev,
                    enableAnnualReminder: checked === true,
                  }))}
                  data-testid="checkbox-annual-reminder"
                />
                <Label htmlFor="annual-reminder" className="text-sm">
                  Enable annual reporting reminders
                </Label>
              </div>

              {/* Show next annual report date when reminders are enabled */}
              {nextReportDue && data.enableAnnualReminder && (
                <div className="space-y-2">
                  <Label>Next Report Due</Label>
                  <div className="text-sm font-medium" data-testid="text-next-report-due">
                    {format(nextReportDue, "MMMM d, yyyy")} (Annual)
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ENERGY STAR Portfolio Manager Integration Card */}
          <Card data-testid="card-portfolio-manager">
            <CardHeader>
              <CardTitle>ENERGY STAR Portfolio Manager</CardTitle>
              <CardDescription>
                Track your building in EPA's Portfolio Manager tool (optional)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="portfolio-manager-id">Property ID</Label>
                <Input
                  id="portfolio-manager-id"
                  placeholder="Enter Portfolio Manager Property ID"
                  value={data.portfolioManagerId}
                  onChange={(e) => setData(prev => ({
                    ...prev,
                    portfolioManagerId: e.target.value,
                  }))}
                  data-testid="input-portfolio-manager-id"
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={() => window.open("https://portfoliomanager.energystar.gov/", "_blank")}
                  data-testid="button-portfolio-manager-link"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open Portfolio Manager
                </Button>
                {data.portfolioManagerId && (
                  <Badge variant="secondary" className="w-fit" data-testid="badge-sync-status">
                    Manual Entry Mode
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Compliance Document Upload Card */}
          <Card data-testid="card-documents">
            <CardHeader>
              <CardTitle>Compliance Documents</CardTitle>
              <CardDescription>
                Upload required benchmarking and disclosure documentation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              
              {/* Benchmarking Report Upload */}
              <div className="space-y-2">
                <Label>Energy Benchmarking Report (PDF)</Label>
                <div className="flex gap-2">
                  <ObjectUploader
                    maxNumberOfFiles={1}
                    bucketPath="compliance"
                    onComplete={(result) => {
                      if (result.successful[0]) {
                        handleDocumentUpload("benchmarkingReport", result.successful[0].uploadURL || "");
                      }
                    }}
                  >
                    <Button 
                      variant="outline" 
                      className="w-full"
                      disabled={uploadingDoc === "benchmarkingReport"}
                      data-testid="button-upload-benchmarking-report"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {data.documents.benchmarkingReport ? "Replace Report" : "Upload Report"}
                    </Button>
                  </ObjectUploader>
                  {data.documents.benchmarkingReport && (
                    <Badge variant="default" data-testid="badge-report-uploaded">Uploaded</Badge>
                  )}
                </div>
              </div>

              {/* Portfolio Manager Screenshot Upload */}
              <div className="space-y-2">
                <Label>Portfolio Manager Screenshot (Image)</Label>
                <div className="flex gap-2">
                  <ObjectUploader
                    maxNumberOfFiles={1}
                    bucketPath="compliance"
                    enableWebcam={true}
                    onComplete={(result) => {
                      if (result.successful[0]) {
                        handleDocumentUpload("portfolioManagerScreenshot", result.successful[0].uploadURL || "");
                      }
                    }}
                  >
                    <Button 
                      variant="outline" 
                      className="w-full"
                      disabled={uploadingDoc === "portfolioManagerScreenshot"}
                      data-testid="button-upload-portfolio-screenshot"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {data.documents.portfolioManagerScreenshot ? "Replace Screenshot" : "Upload Screenshot"}
                    </Button>
                  </ObjectUploader>
                  {data.documents.portfolioManagerScreenshot && (
                    <Badge variant="default" data-testid="badge-screenshot-uploaded">Uploaded</Badge>
                  )}
                </div>
              </div>

              {/* Disclosure Documentation Upload */}
              <div className="space-y-2">
                <Label>Disclosure Documentation (PDF)</Label>
                <div className="flex gap-2">
                  <ObjectUploader
                    maxNumberOfFiles={1}
                    bucketPath="compliance"
                    onComplete={(result) => {
                      if (result.successful[0]) {
                        handleDocumentUpload("disclosureDoc", result.successful[0].uploadURL || "");
                      }
                    }}
                  >
                    <Button 
                      variant="outline" 
                      className="w-full"
                      disabled={uploadingDoc === "disclosureDoc"}
                      data-testid="button-upload-disclosure-doc"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {data.documents.disclosureDoc ? "Replace Documentation" : "Upload Documentation"}
                    </Button>
                  </ObjectUploader>
                  {data.documents.disclosureDoc && (
                    <Badge variant="default" data-testid="badge-disclosure-uploaded">Uploaded</Badge>
                  )}
                </div>
              </div>

              {/* Public Disclosure Proof Upload */}
              <div className="space-y-2">
                <Label>Public Disclosure Proof (PDF)</Label>
                <div className="flex gap-2">
                  <ObjectUploader
                    maxNumberOfFiles={1}
                    bucketPath="compliance"
                    onComplete={(result) => {
                      if (result.successful[0]) {
                        handleDocumentUpload("publicDisclosureProof", result.successful[0].uploadURL || "");
                      }
                    }}
                  >
                    <Button 
                      variant="outline" 
                      className="w-full"
                      disabled={uploadingDoc === "publicDisclosureProof"}
                      data-testid="button-upload-public-disclosure"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {data.documents.publicDisclosureProof ? "Replace Proof" : "Upload Proof"}
                    </Button>
                  </ObjectUploader>
                  {data.documents.publicDisclosureProof && (
                    <Badge variant="default" data-testid="badge-disclosure-proof-uploaded">Uploaded</Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions Card: Save, Submit, Download */}
          <Card data-testid="card-actions">
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-2">
                <Button 
                  onClick={handleSave}
                  className="w-full sm:w-auto"
                  data-testid="button-save"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Draft
                </Button>
                <Button 
                  onClick={handleMarkSubmitted}
                  variant="default"
                  className="w-full sm:w-auto"
                  disabled={data.reportingStatus === "submitted" || data.reportingStatus === "approved"}
                  data-testid="button-mark-submitted"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Mark as Submitted
                </Button>
                <Button 
                  onClick={handleDownloadSummary}
                  variant="outline"
                  className="w-full sm:w-auto"
                  data-testid="button-download-summary"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Summary
                </Button>
              </div>
            </CardContent>
          </Card>

        </div>
      </main>
      
      <BottomNav />
    </div>
  );
}

/**
 * Phase 2 - BUILD: Export wrapped in ErrorBoundary for production resilience
 * 
 * ErrorBoundary catches and displays React errors gracefully, preventing
 * the entire application from crashing and providing clear error feedback.
 */
export default function BenchmarkingDeadlineTracker() {
  return (
    <ErrorBoundary>
      <BenchmarkingDeadlineTrackerContent />
    </ErrorBoundary>
  );
}
