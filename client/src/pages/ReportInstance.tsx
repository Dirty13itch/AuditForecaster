import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ArrowLeft, Download, Mail, FileText, Calendar, User, AlertTriangle, RefreshCw, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { InspectionScore } from "@/components/InspectionScore";
import { getComplianceBadgeVariant, getComplianceBadgeClassName, getComplianceBadgeText } from "@/lib/compliance";
import type { ReportInstance, Job, Builder, ChecklistItem } from "@shared/schema";
import { clientLogger } from "@/lib/logger";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useToast } from "@/hooks/use-toast";

// Phase 3 - OPTIMIZE: Module-level constants prevent recreation on every render
// Phase 6 - DOCUMENT: Report status workflow states
const REPORT_STATUS = {
  SENT: "Sent",
  FINALIZED: "Finalized",
  DRAFT: "Draft",
} as const;

// Phase 6 - DOCUMENT: Badge variant mapping for report status
const STATUS_BADGE_VARIANTS = {
  [REPORT_STATUS.SENT]: "default",
  [REPORT_STATUS.FINALIZED]: "secondary",
  [REPORT_STATUS.DRAFT]: "outline",
} as const;

// Phase 6 - DOCUMENT: Minnesota Energy Code compliance thresholds (2020)
const COMPLIANCE_THRESHOLDS = {
  TOTAL_DUCT_LEAKAGE: 4.0, // CFM/100 sq ft
  DUCT_LEAKAGE_OUTSIDE: 6.0, // CFM/100 sq ft
  AIR_CHANGES_PER_HOUR: 5.0, // ACH50
} as const;

// Phase 6 - DOCUMENT: Skeleton loader configuration for consistent loading UX
const SKELETON_CONFIG = {
  headerHeight: 32,
  cardHeight: 256,
  cardCount: 3,
} as const;

interface ReportInstanceWithDetails extends ReportInstance {
  job?: Job;
  builder?: Builder;
  checklistItems?: ChecklistItem[];
}

// Phase 6 - DOCUMENT: Compliance violation data structure from backend
interface ComplianceViolation {
  metric: string;
  threshold: number;
  actualValue: number;
  severity: string;
}

// Phase 6 - DOCUMENT: Parsed compliance flags structure
interface ComplianceData {
  violations?: ComplianceViolation[];
  evaluatedAt?: string;
}

// Phase 2 - BUILD: Main component wrapped in ErrorBoundary at export
function ReportInstanceContent() {
  const { toast } = useToast();
  const { id } = useParams() as { id: string };

  // Phase 5 - HARDEN: All queries have retry: 2 for network resilience
  const { 
    data: reportInstance, 
    isLoading: isLoadingReport,
    error: reportError,
    refetch: refetchReport,
  } = useQuery<ReportInstanceWithDetails>({
    queryKey: ["/api/report-instances", id],
    enabled: !!id,
    retry: 2,
  });

  // Phase 5 - HARDEN: Secondary query with retry and proper dependency
  const { 
    data: checklistItems = [],
    isLoading: isLoadingChecklist,
    error: checklistError,
    refetch: refetchChecklist,
  } = useQuery<ChecklistItem[]>({
    queryKey: ["/api/checklist-items", reportInstance?.jobId],
    queryFn: async () => {
      if (!reportInstance?.jobId) return [];
      const response = await fetch(`/api/checklist-items?jobId=${reportInstance.jobId}`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!reportInstance?.jobId,
    retry: 2,
  });

  // Phase 6 - DOCUMENT: Safe JSON parsing with validation for report data
  // Handles legacy data formats and missing fields gracefully
  const reportData = useMemo(() => {
    try {
      return reportInstance?.data ? JSON.parse(reportInstance.data) : {};
    } catch (e) {
      clientLogger.error('Failed to parse report data:', e);
      return {};
    }
  }, [reportInstance?.data]);

  // Phase 6 - DOCUMENT: Determine report status based on email and PDF state
  // Sent (final) > Finalized (has PDF) > Draft (initial state)
  const reportStatus = useMemo(() => {
    if (!reportInstance) return REPORT_STATUS.DRAFT;
    if (reportInstance.emailedTo) return REPORT_STATUS.SENT;
    if (reportInstance.pdfUrl) return REPORT_STATUS.FINALIZED;
    return REPORT_STATUS.DRAFT;
  }, [reportInstance]);

  // Phase 6 - DOCUMENT: Safe parsing of compliance flags with error handling
  // Supports both string and object formats from backend
  const complianceData = useMemo<ComplianceData | null>(() => {
    if (!reportInstance?.complianceFlags) return null;
    
    try {
      const parsed = typeof reportInstance.complianceFlags === 'string' 
        ? JSON.parse(reportInstance.complianceFlags) 
        : reportInstance.complianceFlags;
      
      // Phase 5 - HARDEN: Validate structure
      if (typeof parsed !== 'object') return null;
      
      return parsed as ComplianceData;
    } catch (e) {
      clientLogger.error('Failed to parse compliance flags:', e);
      return null;
    }
  }, [reportInstance?.complianceFlags]);

  // Phase 3 - OPTIMIZE: useCallback for status badge variant lookup
  const getStatusBadgeVariant = useCallback((status: string) => {
    return STATUS_BADGE_VARIANTS[status as keyof typeof STATUS_BADGE_VARIANTS] || "outline";
  }, []);

  // Phase 6 - DOCUMENT: PDF download handler with comprehensive error handling
  // Creates temporary blob URL and triggers browser download
  const handleDownloadPDF = useCallback(async () => {
    if (!id) return;

    try {
      const response = await fetch(`/api/reports/${id}/pdf`, {
        method: 'GET',
        credentials: 'include',
      });
      
      // Phase 5 - HARDEN: Detailed error handling with user feedback
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to generate PDF');
      }
      
      const blob = await response.blob();
      
      // Phase 5 - HARDEN: Validate blob size
      if (blob.size === 0) {
        throw new Error('Generated PDF is empty');
      }
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report-${id}-${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      // Phase 5 - HARDEN: Success toast feedback
      toast({
        title: "PDF Downloaded",
        description: "Report PDF has been downloaded successfully",
      });
    } catch (error) {
      clientLogger.error('Failed to download PDF:', error);
      
      // Phase 5 - HARDEN: Error toast with actionable message
      toast({
        title: "Download Failed",
        description: error instanceof Error ? error.message : "Unable to generate PDF. Please try again.",
        variant: "destructive",
      });
    }
  }, [id, toast]);

  // Phase 3 - OPTIMIZE: useCallback for back navigation
  const handleGoBack = useCallback(() => {
    window.history.back();
  }, []);

  // Phase 3 - OPTIMIZE: useCallback for retry handlers
  const handleRetryReport = useCallback(() => {
    refetchReport();
  }, [refetchReport]);

  const handleRetryChecklist = useCallback(() => {
    refetchChecklist();
  }, [refetchChecklist]);

  // Phase 2 - BUILD: Per-query error state with retry button
  if (reportError) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleGoBack}
            data-testid="button-back-error"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold" data-testid="text-page-title-error">Inspection Report</h1>
        </div>
        <Card className="border-destructive/20 bg-destructive/5" data-testid="error-report-query">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
            <h3 className="text-lg font-semibold mb-2" data-testid="text-error-title">Failed to Load Report</h3>
            <p className="text-sm text-muted-foreground text-center mb-4 max-w-md" data-testid="text-error-message">
              {reportError instanceof Error ? reportError.message : "Unable to fetch report details. Please check your connection and try again."}
            </p>
            <div className="flex gap-2">
              <Button 
                onClick={handleRetryReport}
                data-testid="button-retry-report"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry
              </Button>
              <Button 
                variant="outline"
                onClick={handleGoBack}
                data-testid="button-back-from-error"
              >
                Go Back
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Phase 2 - BUILD: Proper skeleton loading state with Skeleton components
  if (isLoadingReport) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6" data-testid="skeleton-loading">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10" data-testid="skeleton-back-button" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-64" data-testid="skeleton-title" />
              <Skeleton className="h-4 w-40" data-testid="skeleton-subtitle" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-16" data-testid="skeleton-badge" />
            <Skeleton className="h-9 w-32" data-testid="skeleton-download-btn" />
            <Skeleton className="h-9 w-32" data-testid="skeleton-email-btn" />
          </div>
        </div>
        
        <div className="grid gap-6 md:grid-cols-2">
          {Array.from({ length: SKELETON_CONFIG.cardCount }).map((_, i) => (
            <Card key={i} data-testid={`skeleton-card-${i}`}>
              <CardHeader>
                <Skeleton className="h-6 w-48" data-testid={`skeleton-card-title-${i}`} />
                <Skeleton className="h-4 w-32 mt-2" data-testid={`skeleton-card-desc-${i}`} />
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-4 w-full" data-testid={`skeleton-line-1-${i}`} />
                <Skeleton className="h-4 w-3/4" data-testid={`skeleton-line-2-${i}`} />
                <Skeleton className="h-4 w-5/6" data-testid={`skeleton-line-3-${i}`} />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Phase 6 - DOCUMENT: Report not found state - handles deleted or invalid IDs
  if (!reportInstance) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <Card data-testid="card-not-found">
          <CardContent className="p-12 text-center">
            <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" data-testid="icon-not-found" />
            <h3 className="text-lg font-semibold mb-2" data-testid="text-not-found-title">Report Not Found</h3>
            <p className="text-muted-foreground mb-4" data-testid="text-not-found-message">
              The report you're looking for doesn't exist or has been deleted.
            </p>
            <Button onClick={handleGoBack} data-testid="button-back-not-found">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6" data-testid="report-instance-container">
      {/* Phase 6 - DOCUMENT: Header section with navigation and actions */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleGoBack}
            data-testid="button-back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">Inspection Report</h1>
            <p className="text-sm text-muted-foreground" data-testid="text-job-subtitle">
              {reportInstance.job?.name || 'Report Details'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge 
            variant={getStatusBadgeVariant(reportStatus)} 
            data-testid="badge-status"
          >
            {reportStatus}
          </Badge>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleDownloadPDF}
            data-testid="button-download"
          >
            <Download className="w-4 h-4 mr-2" />
            Download PDF
          </Button>
          <Button variant="outline" size="sm" data-testid="button-email">
            <Mail className="w-4 h-4 mr-2" />
            Email Report
          </Button>
        </div>
      </div>

      {/* Phase 6 - DOCUMENT: Main content grid with inspection score and compliance */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Phase 6 - DOCUMENT: Inspection score card - only shown when checklist items available */}
        {checklistItems.length > 0 && (
          <InspectionScore items={checklistItems} />
        )}

        {/* Phase 2 - BUILD: Checklist error state with retry */}
        {checklistError && (
          <Alert variant="destructive" data-testid="error-checklist-query">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle data-testid="text-checklist-error-title">Failed to Load Checklist</AlertTitle>
            <AlertDescription className="flex items-center justify-between" data-testid="text-checklist-error-message">
              <span>Unable to fetch inspection checklist items.</span>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleRetryChecklist}
                data-testid="button-retry-checklist"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Phase 6 - DOCUMENT: Minnesota Energy Code compliance card */}
        <Card data-testid="card-compliance">
          <CardHeader>
            <CardTitle>Minnesota Code Compliance</CardTitle>
            <CardDescription>2020 Minnesota Energy Code</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              <Badge 
                variant={getComplianceBadgeVariant(reportInstance.complianceStatus)}
                className={getComplianceBadgeClassName(reportInstance.complianceStatus)}
                data-testid="badge-compliance-status"
              >
                {getComplianceBadgeText(reportInstance.complianceStatus)}
              </Badge>
            </div>

            {complianceData?.evaluatedAt && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Evaluated</span>
                <span className="text-sm font-medium" data-testid="text-evaluation-date">
                  {format(new Date(complianceData.evaluatedAt), 'PPP')}
                </span>
              </div>
            )}

            {/* Phase 6 - DOCUMENT: Violation details - shown when non-compliant */}
            {reportInstance.complianceStatus === "non-compliant" && complianceData?.violations && complianceData.violations.length > 0 && (
              <div className="space-y-2">
                <Separator />
                <div>
                  <h4 className="text-sm font-semibold mb-2">Code Violations</h4>
                  <div className="space-y-3" data-testid="list-violations">
                    {complianceData.violations.map((violation, index) => (
                      <div 
                        key={index} 
                        className="flex items-start gap-2 p-3 rounded-md bg-destructive/10"
                        data-testid={`violation-${index}`}
                      >
                        <AlertTriangle className="w-4 h-4 mt-0.5 text-destructive flex-shrink-0" />
                        <div className="flex-1 text-sm">
                          <div className="font-medium text-destructive" data-testid={`violation-metric-${index}`}>
                            {violation.metric}
                          </div>
                          <div className="text-muted-foreground mt-1">
                            <span>Threshold: {violation.threshold}</span>
                            <span className="mx-2">•</span>
                            <span data-testid={`violation-actual-${index}`}>Actual: {violation.actualValue}</span>
                          </div>
                          {violation.severity && (
                            <Badge 
                              variant={violation.severity === 'critical' ? 'destructive' : 'secondary'}
                              className="mt-2"
                              data-testid={`violation-severity-${index}`}
                            >
                              {violation.severity}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Phase 6 - DOCUMENT: Pending status message when awaiting test results */}
            {reportInstance.complianceStatus === "pending" && (
              <div className="text-sm text-muted-foreground" data-testid="text-pending-message">
                Awaiting actual test results to complete compliance evaluation.
              </div>
            )}

            {/* Phase 6 - DOCUMENT: Minnesota code requirements reference */}
            <div className="space-y-2">
              <Separator />
              <div>
                <h4 className="text-sm font-semibold mb-2">Minnesota Code Requirements</h4>
                <div className="text-xs text-muted-foreground space-y-1" data-testid="text-code-requirements">
                  <div>• Total Duct Leakage (TDL): ≤ {COMPLIANCE_THRESHOLDS.TOTAL_DUCT_LEAKAGE} CFM/100 sq ft</div>
                  <div>• Duct Leakage to Outside (DLO): ≤ {COMPLIANCE_THRESHOLDS.DUCT_LEAKAGE_OUTSIDE} CFM/100 sq ft</div>
                  <div>• Air Changes per Hour (ACH50): ≤ {COMPLIANCE_THRESHOLDS.AIR_CHANGES_PER_HOUR} ACH</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Phase 6 - DOCUMENT: Report metadata card */}
        <Card data-testid="card-report-info">
          <CardHeader>
            <CardTitle>Report Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {reportInstance.createdAt && (
              <div className="flex items-start gap-3">
                <Calendar className="w-4 h-4 mt-0.5 text-muted-foreground" />
                <div className="flex-1">
                  <div className="text-sm text-muted-foreground">Created Date</div>
                  <div className="font-medium" data-testid="text-created-date">
                    {format(new Date(reportInstance.createdAt), 'PPP')}
                  </div>
                </div>
              </div>
            )}

            {reportData.inspector && (
              <div className="flex items-start gap-3">
                <User className="w-4 h-4 mt-0.5 text-muted-foreground" />
                <div className="flex-1">
                  <div className="text-sm text-muted-foreground">Inspector</div>
                  <div className="font-medium" data-testid="text-inspector">
                    {reportData.inspector}
                  </div>
                </div>
              </div>
            )}

            {reportInstance.emailedTo && (
              <div className="flex items-start gap-3">
                <Mail className="w-4 h-4 mt-0.5 text-muted-foreground" />
                <div className="flex-1">
                  <div className="text-sm text-muted-foreground">Emailed To</div>
                  <div className="font-medium" data-testid="text-emailed-to">
                    {reportInstance.emailedTo}
                  </div>
                  {reportInstance.emailedAt && (
                    <div className="text-sm text-muted-foreground" data-testid="text-emailed-date">
                      on {format(new Date(reportInstance.emailedAt), 'PPP')}
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Phase 6 - DOCUMENT: Job details card - shown when job data available */}
      {reportInstance.job && (
        <Card data-testid="card-job-details">
          <CardHeader>
            <CardTitle>Job Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Job Name</div>
                <div className="font-medium" data-testid="text-job-name">
                  {reportInstance.job.name}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Address</div>
                <div className="font-medium" data-testid="text-job-address">
                  {reportInstance.job.address}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Contractor</div>
                <div className="font-medium" data-testid="text-contractor">
                  {reportInstance.job.contractor}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Inspection Type</div>
                <div className="font-medium" data-testid="text-inspection-type">
                  {reportInstance.job.inspectionType}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Phase 6 - DOCUMENT: Overview section - optional narrative text */}
      {reportData.overview && (
        <Card data-testid="card-overview">
          <CardHeader>
            <CardTitle>Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed" data-testid="text-overview">
              {reportData.overview}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Phase 6 - DOCUMENT: Forecast comparison - predicted vs actual duct leakage */}
      {reportData.forecast && (
        <Card data-testid="card-forecast">
          <CardHeader>
            <CardTitle>Duct Leakage Forecast</CardTitle>
            <CardDescription>Predicted vs Actual Results</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {reportData.forecast.predictedTDL !== undefined && (
                <div>
                  <div className="text-xs text-muted-foreground">Predicted TDL</div>
                  <div className="text-2xl font-bold" data-testid="text-predicted-tdl">
                    {reportData.forecast.predictedTDL}
                  </div>
                  <div className="text-xs text-muted-foreground">CFM25</div>
                </div>
              )}
              {reportData.forecast.predictedDLO !== undefined && (
                <div>
                  <div className="text-xs text-muted-foreground">Predicted DLO</div>
                  <div className="text-2xl font-bold" data-testid="text-predicted-dlo">
                    {reportData.forecast.predictedDLO}
                  </div>
                  <div className="text-xs text-muted-foreground">CFM25</div>
                </div>
              )}
              {reportData.forecast.actualTDL !== undefined && (
                <div>
                  <div className="text-xs text-muted-foreground">Actual TDL</div>
                  <div className="text-2xl font-bold text-green-600" data-testid="text-actual-tdl">
                    {reportData.forecast.actualTDL}
                  </div>
                  <div className="text-xs text-muted-foreground">CFM25</div>
                </div>
              )}
              {reportData.forecast.actualDLO !== undefined && (
                <div>
                  <div className="text-xs text-muted-foreground">Actual DLO</div>
                  <div className="text-2xl font-bold text-green-600" data-testid="text-actual-dlo">
                    {reportData.forecast.actualDLO}
                  </div>
                  <div className="text-xs text-muted-foreground">CFM25</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Phase 6 - DOCUMENT: Final notes section - inspector observations and recommendations */}
      {reportData.finalNotes && (
        <Card data-testid="card-final-notes">
          <CardHeader>
            <CardTitle>Final Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed whitespace-pre-wrap" data-testid="text-final-notes">
              {reportData.finalNotes}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Phase 2 - BUILD: Export component wrapped in ErrorBoundary
export default function ReportInstancePage() {
  return (
    <ErrorBoundary>
      <ReportInstanceContent />
    </ErrorBoundary>
  );
}
