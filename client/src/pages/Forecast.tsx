import { useState, useMemo, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ArrowLeft, Download, RefreshCw, Calendar, AlertCircle, TrendingUp, TrendingDown } from "lucide-react";
import { format, parseISO, isValid } from "date-fns";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import TopBar from "@/components/TopBar";
import ForecastCard from "@/components/ForecastCard";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Job, Forecast as ForecastType } from "@shared/schema";

// Phase 3 - OPTIMIZE: Module-level constants prevent recreation on every render
const DATE_FORMAT = "MMM d, yyyy h:mm a";
const DATE_FORMAT_SHORT = "MMM d, yyyy";

// Phase 6 - DOCUMENT: Forecast thresholds for building performance standards
const THRESHOLDS = {
  tdl: 200, // Total Duct Leakage threshold in CFM25
  dlo: 50,  // Duct Leakage to Outside threshold in CFM25
  confidenceMin: 70, // Minimum confidence percentage for reliable predictions
  varianceWarning: 15, // Variance percentage that triggers a warning
} as const;

// Phase 6 - DOCUMENT: Performance indicators for contractor accuracy
const CONTRACTOR_PERFORMANCE = {
  excellentAccuracy: 90, // 90%+ accuracy is excellent
  goodAccuracy: 80,      // 80-89% accuracy is good
  fairAccuracy: 70,      // 70-79% accuracy is fair
} as const;

// Phase 2 - BUILD: Comprehensive skeleton loading state for forecast page
function ForecastSkeleton() {
  return (
    <div className="min-h-screen bg-background pb-20 md:pb-6" data-testid="skeleton-forecast">
      <TopBar title="Loading..." isOnline={true} />
      <main className="pt-20 px-4 md:px-6 lg:px-8 max-w-6xl mx-auto">
        <div className="space-y-6">
          {/* Header skeleton */}
          <div className="flex items-center gap-4" data-testid="skeleton-header">
            <Skeleton className="h-9 w-9 rounded-md" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-64" />
            </div>
            <Skeleton className="h-9 w-24 rounded-md" />
          </div>
          
          {/* Building info skeleton */}
          <Card data-testid="skeleton-building-info">
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-6 w-32 rounded-full" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-5 w-32" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          
          {/* Forecast cards skeleton */}
          <div data-testid="skeleton-forecast-cards">
            <div className="flex items-center justify-between mb-4">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-9 w-32 rounded-md" />
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              {[1, 2].map(i => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-48" />
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
          
          {/* Analysis skeleton */}
          <Card data-testid="skeleton-analysis">
            <CardHeader>
              <Skeleton className="h-6 w-56" />
            </CardHeader>
            <CardContent className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

// Phase 2 - BUILD: Error state component for failed data fetches
function ForecastError({ 
  error, 
  onRetry 
}: { 
  error: Error; 
  onRetry: () => void;
}) {
  return (
    <div className="min-h-screen bg-background pb-20 md:pb-6" data-testid="error-forecast">
      <TopBar title="Forecast Error" isOnline={true} />
      <main className="pt-20 px-4 md:px-6 lg:px-8 max-w-6xl mx-auto">
        <Alert variant="destructive" data-testid="alert-error">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle data-testid="text-error-title">Failed to Load Forecast</AlertTitle>
          <AlertDescription data-testid="text-error-message">
            {error.message || "An unexpected error occurred while loading the forecast data."}
          </AlertDescription>
        </Alert>
        <div className="mt-6 flex gap-4">
          <Button 
            onClick={onRetry} 
            variant="default"
            data-testid="button-retry"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
          <Button 
            onClick={() => window.history.back()} 
            variant="outline"
            data-testid="button-go-back"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </div>
      </main>
    </div>
  );
}

// Phase 2 - BUILD: Main ForecastContent component with full production standards
function ForecastContent() {
  const { id: jobId } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"dashboard" | "inspection" | "photos" | "forecast">("forecast");

  // Phase 5 - HARDEN: All queries have retry: 2 for network resilience
  const { 
    data: job, 
    isLoading: isLoadingJob,
    error: jobError,
    refetch: refetchJob
  } = useQuery<Job>({
    queryKey: ["/api/jobs", jobId],
    queryFn: async () => {
      // Phase 5 - HARDEN: Validate input before making API call
      if (!jobId) throw new Error("Job ID is required");
      const response = await fetch(`/api/jobs/${jobId}`, {
        credentials: "include",
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to fetch job");
      }
      return response.json();
    },
    enabled: !!jobId,
    retry: 2,
  });

  const { 
    data: forecast,
    isLoading: isLoadingForecast,
    error: forecastError,
    refetch: refetchForecast
  } = useQuery<ForecastType | null>({
    queryKey: ["/api/forecasts", jobId],
    queryFn: async () => {
      // Phase 5 - HARDEN: Validate input before making API call
      if (!jobId) throw new Error("Job ID is required");
      const response = await fetch(`/api/forecasts?jobId=${jobId}`, {
        credentials: "include",
      });
      if (!response.ok) return null;
      const data = await response.json();
      return data.length > 0 ? data[0] : null;
    },
    enabled: !!jobId,
    retry: 2,
  });

  // Phase 6 - DOCUMENT: Mutation to recalculate forecast predictions
  // Triggers server-side recalculation based on latest building data
  const recalculateMutation = useMutation({
    mutationFn: async () => {
      if (!jobId) throw new Error("Job ID is required");
      return apiRequest("POST", `/api/forecasts/${jobId}/recalculate`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/forecasts", jobId] });
      toast({
        title: "Forecast Recalculated",
        description: "Prediction values have been updated based on the latest data.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Recalculation Failed",
        description: error.message || "Failed to recalculate forecast. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Phase 3 - OPTIMIZE: Memoize navigation handler to prevent recreation
  const handleBack = useCallback(() => {
    setLocation("/jobs");
  }, [setLocation]);

  // Phase 3 - OPTIMIZE: Memoize recalculate handler
  const handleRecalculate = useCallback(() => {
    recalculateMutation.mutate();
  }, [recalculateMutation]);

  // Phase 3 - OPTIMIZE: Memoize refresh handler
  const handleRefresh = useCallback(() => {
    refetchJob();
    refetchForecast();
  }, [refetchJob, refetchForecast]);

  // Phase 6 - DOCUMENT: Check if job has been rescheduled
  // Compares original scheduled date with current date to detect changes
  // Phase 3 - OPTIMIZE: Memoized to prevent recalculation on every render
  const isRescheduled = useMemo(() => {
    return job?.originalScheduledDate 
      && job?.scheduledDate 
      && job.originalScheduledDate !== job.scheduledDate 
      && !job?.isCancelled;
  }, [job?.originalScheduledDate, job?.scheduledDate, job?.isCancelled]);

  // Phase 3 - OPTIMIZE: Memoize date formatting to prevent repeated parsing
  // Phase 5 - HARDEN: Validate dates before formatting to prevent errors
  const formattedOriginalDate = useMemo(() => {
    if (!job?.originalScheduledDate) return null;
    const date = parseISO(job.originalScheduledDate);
    return isValid(date) ? format(date, DATE_FORMAT) : null;
  }, [job?.originalScheduledDate]);

  const formattedCurrentDate = useMemo(() => {
    if (!job?.scheduledDate) return null;
    const date = parseISO(job.scheduledDate);
    return isValid(date) ? format(date, DATE_FORMAT) : null;
  }, [job?.scheduledDate]);

  const formattedScheduledDateShort = useMemo(() => {
    if (!job?.scheduledDate) return "N/A";
    const date = parseISO(job.scheduledDate);
    return isValid(date) ? format(date, DATE_FORMAT_SHORT) : "N/A";
  }, [job?.scheduledDate]);

  // Phase 6 - DOCUMENT: Calculate variance between predicted and actual values
  // Used to show how accurate the forecast was compared to real measurements
  // Phase 3 - OPTIMIZE: Memoized calculation
  // Phase 5 - HARDEN: Prevents division by zero
  const tdlVariance = useMemo(() => {
    if (!forecast?.predictedTdl || !forecast?.actualTdl) return null;
    if (forecast.predictedTdl === 0) return null;
    return ((forecast.actualTdl - forecast.predictedTdl) / forecast.predictedTdl) * 100;
  }, [forecast?.predictedTdl, forecast?.actualTdl]);

  const dloVariance = useMemo(() => {
    if (!forecast?.predictedDlo || !forecast?.actualDlo) return null;
    if (forecast.predictedDlo === 0) return null;
    return ((forecast.actualDlo - forecast.predictedDlo) / forecast.predictedDlo) * 100;
  }, [forecast?.predictedDlo, forecast?.actualDlo]);

  // Phase 6 - DOCUMENT: Determine pass/fail status based on thresholds
  // Phase 3 - OPTIMIZE: Memoized status checks
  const tdlStatus = useMemo(() => {
    if (!forecast?.actualTdl) return null;
    return forecast.actualTdl <= THRESHOLDS.tdl ? "pass" : "fail";
  }, [forecast?.actualTdl]);

  const dloStatus = useMemo(() => {
    if (!forecast?.actualDlo) return null;
    return forecast.actualDlo <= THRESHOLDS.dlo ? "pass" : "fail";
  }, [forecast?.actualDlo]);

  const isLoading = isLoadingJob || isLoadingForecast;

  // Phase 2 - BUILD: Show comprehensive skeleton during loading
  if (isLoading) {
    return <ForecastSkeleton />;
  }

  // Phase 2 - BUILD: Show error state with retry option
  if (jobError) {
    return <ForecastError error={jobError as Error} onRetry={handleRefresh} />;
  }

  // Phase 5 - HARDEN: Handle case where job doesn't exist
  if (!job) {
    return (
      <div className="min-h-screen bg-background pb-20 md:pb-6" data-testid="error-no-job">
        <TopBar title="Job Not Found" isOnline={true} />
        <main className="pt-20 px-4 md:px-6 lg:px-8 max-w-6xl mx-auto">
          <Alert variant="destructive" data-testid="alert-no-job">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle data-testid="text-no-job-title">Job Not Found</AlertTitle>
            <AlertDescription data-testid="text-no-job-message">
              The requested job could not be found. It may have been deleted or you may not have permission to view it.
            </AlertDescription>
          </Alert>
          <div className="mt-6">
            <Button 
              onClick={handleBack} 
              variant="default"
              data-testid="button-back-to-jobs"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Jobs
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-6" data-testid="page-forecast">
      <TopBar 
        title="Duct Leakage Forecast"
        isOnline={true}
      />
      
      <main className="pt-20 px-4 md:px-6 lg:px-8 max-w-6xl mx-auto" data-testid="main-content">
        <div className="space-y-6">
          {/* Header Section */}
          <div className="flex items-center gap-4" data-testid="section-header">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleBack}
              data-testid="button-back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1" data-testid="container-job-info">
              <h2 className="text-xl font-bold" data-testid="text-job-name">
                {job.name ?? "Forecast"}
              </h2>
              <p className="text-sm text-muted-foreground" data-testid="text-job-address">
                {job.address}
              </p>
            </div>
            <Button 
              variant="outline" 
              onClick={handleRefresh}
              disabled={isLoading}
              data-testid="button-refresh"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button 
              variant="outline" 
              data-testid="button-generate-report"
            >
              <Download className="h-4 w-4 mr-2" />
              Report
            </Button>
          </div>

          {/* Phase 6 - DOCUMENT: Rescheduled indicator alerts user to schedule changes */}
          {isRescheduled && (
            <div 
              className="bg-warning/10 border border-warning/20 rounded-md p-4 flex items-start gap-3"
              data-testid="alert-rescheduled"
            >
              <AlertCircle className="h-5 w-5 text-warning mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-warning" data-testid="text-rescheduled-title">
                    Schedule Changed
                  </h3>
                  <Badge 
                    variant="outline" 
                    className="bg-warning/10 text-warning border-warning/20"
                    data-testid="badge-rescheduled"
                  >
                    Rescheduled
                  </Badge>
                </div>
                <div className="text-sm space-y-1">
                  <div className="flex items-center gap-2" data-testid="container-original-date">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Originally:</span>
                    <span className="font-medium" data-testid="text-original-date">
                      {formattedOriginalDate}
                    </span>
                  </div>
                  <div className="flex items-center gap-2" data-testid="container-current-date">
                    <Calendar className="h-4 w-4 text-warning" />
                    <span className="text-muted-foreground">Now scheduled:</span>
                    <span className="font-medium text-warning" data-testid="text-current-date">
                      {formattedCurrentDate}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Phase 6 - DOCUMENT: Cancelled indicator shows when calendar event is deleted */}
          {job.isCancelled && (
            <div 
              className="bg-destructive/10 border border-destructive/20 rounded-md p-4 flex items-start gap-3"
              data-testid="alert-cancelled"
            >
              <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-destructive" data-testid="text-cancelled-title">
                    Calendar Event Cancelled
                  </h3>
                  <Badge variant="destructive" data-testid="badge-cancelled">
                    Cancelled
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground" data-testid="text-cancelled-message">
                  The Google Calendar event for this job has been cancelled or deleted.
                </p>
              </div>
            </div>
          )}

          {/* Phase 6 - DOCUMENT: Building information card displays key job metadata */}
          <Card data-testid="card-building-info">
            <CardHeader>
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <h3 className="text-lg font-semibold" data-testid="text-building-info-title">
                  Building Information
                </h3>
                <Badge variant="outline" data-testid="badge-contractor">
                  {job.contractor}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm" data-testid="grid-building-details">
                <div data-testid="field-inspection-type">
                  <p className="text-muted-foreground mb-1" data-testid="label-inspection-type">
                    Inspection Type
                  </p>
                  <p className="font-medium" data-testid="value-inspection-type">
                    {job.inspectionType ?? "N/A"}
                  </p>
                </div>
                <div data-testid="field-status">
                  <p className="text-muted-foreground mb-1" data-testid="label-status">
                    Status
                  </p>
                  <p className="font-medium capitalize" data-testid="value-status">
                    {job.status ?? "N/A"}
                  </p>
                </div>
                <div data-testid="field-scheduled">
                  <p className="text-muted-foreground mb-1" data-testid="label-scheduled">
                    Scheduled
                  </p>
                  <p className="font-medium" data-testid="value-scheduled">
                    {formattedScheduledDateShort}
                  </p>
                </div>
                <div data-testid="field-priority">
                  <p className="text-muted-foreground mb-1" data-testid="label-priority">
                    Priority
                  </p>
                  <p className="font-medium capitalize" data-testid="value-priority">
                    {job.priority ?? "N/A"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Phase 6 - DOCUMENT: Leakage predictions section shows TDL and DLO forecasts */}
          <div data-testid="section-predictions">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold" data-testid="text-predictions-title">
                Leakage Predictions
              </h3>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRecalculate}
                disabled={recalculateMutation.isPending || !forecast}
                data-testid="button-recalculate"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${recalculateMutation.isPending ? "animate-spin" : ""}`} />
                Recalculate
              </Button>
            </div>
            
            {/* Phase 2 - BUILD: Show error if forecast fetch failed */}
            {forecastError && (
              <Alert variant="destructive" data-testid="alert-forecast-error">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle data-testid="text-forecast-error-title">
                  Failed to Load Forecast
                </AlertTitle>
                <AlertDescription data-testid="text-forecast-error-message">
                  {(forecastError as Error).message || "An error occurred while loading forecast data."}
                </AlertDescription>
              </Alert>
            )}
            
            {forecast ? (
              <div className="grid gap-6 md:grid-cols-2" data-testid="grid-forecast-cards">
                <div data-testid="card-tdl-forecast">
                  <ForecastCard
                    title="Total Duct Leakage (TDL)"
                    predicted={forecast.predictedTdl ?? 0}
                    actual={forecast.actualTdl ?? undefined}
                    unit="CFM25"
                    confidence={forecast.confidenceTdl ?? 0}
                    threshold={THRESHOLDS.tdl}
                  />
                  {tdlVariance !== null && (
                    <div className="mt-2 flex items-center gap-2 text-sm" data-testid="info-tdl-variance">
                      {tdlVariance > 0 ? (
                        <TrendingUp className="h-4 w-4 text-destructive" data-testid="icon-tdl-variance-up" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-success" data-testid="icon-tdl-variance-down" />
                      )}
                      <span 
                        className={tdlVariance > 0 ? "text-destructive" : "text-success"}
                        data-testid="text-tdl-variance"
                      >
                        {Math.abs(tdlVariance).toFixed(1)}% {tdlVariance > 0 ? "above" : "below"} prediction
                      </span>
                    </div>
                  )}
                </div>
                <div data-testid="card-dlo-forecast">
                  <ForecastCard
                    title="Duct Leakage to Outside (DLO)"
                    predicted={forecast.predictedDlo ?? 0}
                    actual={forecast.actualDlo ?? undefined}
                    unit="CFM25"
                    confidence={forecast.confidenceDlo ?? 0}
                    threshold={THRESHOLDS.dlo}
                  />
                  {dloVariance !== null && (
                    <div className="mt-2 flex items-center gap-2 text-sm" data-testid="info-dlo-variance">
                      {dloVariance > 0 ? (
                        <TrendingUp className="h-4 w-4 text-destructive" data-testid="icon-dlo-variance-up" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-success" data-testid="icon-dlo-variance-down" />
                      )}
                      <span 
                        className={dloVariance > 0 ? "text-destructive" : "text-success"}
                        data-testid="text-dlo-variance"
                      >
                        {Math.abs(dloVariance).toFixed(1)}% {dloVariance > 0 ? "above" : "below"} prediction
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div 
                className="bg-muted/30 border border-muted rounded-md p-8 text-center"
                data-testid="empty-forecast"
              >
                <p className="text-muted-foreground" data-testid="text-no-forecast">
                  No forecast data available for this job yet. Complete the inspection to generate predictions.
                </p>
              </div>
            )}
          </div>

          {/* Phase 6 - DOCUMENT: Analysis section provides insights and recommendations */}
          {forecast && (forecast.actualTdl || forecast.actualDlo) && (
            <Card data-testid="card-analysis">
              <CardHeader>
                <h3 className="text-lg font-semibold" data-testid="text-analysis-title">
                  Analysis & Recommendations
                </h3>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* TDL Analysis */}
                {forecast.actualTdl && (
                  <div data-testid="section-tdl-analysis">
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <span 
                        className={`h-2 w-2 rounded-full ${tdlStatus === "pass" ? "bg-success" : "bg-destructive"}`}
                        data-testid="indicator-tdl-status"
                      ></span>
                      <span data-testid="text-tdl-analysis-title">
                        Total Duct Leakage (TDL)
                      </span>
                    </h4>
                    <p className="text-sm text-muted-foreground" data-testid="text-tdl-analysis">
                      The system {tdlStatus === "pass" ? "passed" : "failed"} with actual TDL of {forecast.actualTdl.toFixed(1)} CFM25, 
                      which is {Math.abs(tdlVariance ?? 0).toFixed(1)}% {(tdlVariance ?? 0) > 0 ? "above" : "below"} the prediction 
                      {tdlStatus === "pass" ? " and well within" : " and exceeds"} the {THRESHOLDS.tdl} CFM25 threshold. 
                      {tdlStatus === "pass" 
                        ? " This indicates excellent duct sealing work." 
                        : " Additional duct sealing work is required to meet standards."}
                    </p>
                  </div>
                )}
                
                {/* DLO Analysis */}
                {forecast.actualDlo && (
                  <div data-testid="section-dlo-analysis">
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <span 
                        className={`h-2 w-2 rounded-full ${dloStatus === "pass" ? "bg-success" : "bg-warning"}`}
                        data-testid="indicator-dlo-status"
                      ></span>
                      <span data-testid="text-dlo-analysis-title">
                        Duct Leakage to Outside (DLO)
                      </span>
                    </h4>
                    <p className="text-sm text-muted-foreground" data-testid="text-dlo-analysis">
                      The system {dloStatus === "pass" ? "passed" : "failed"} with actual DLO of {forecast.actualDlo.toFixed(1)} CFM25
                      {dloStatus === "pass" ? ", within" : ", exceeding"} the {THRESHOLDS.dlo} CFM25 threshold. 
                      The result was {Math.abs(dloVariance ?? 0).toFixed(1)}% {(dloVariance ?? 0) > 0 ? "higher" : "lower"} than predicted. 
                      {dloStatus === "fail" 
                        ? " Consider additional sealing at connection points to conditioned space." 
                        : " This demonstrates effective duct sealing to the exterior."}
                    </p>
                  </div>
                )}
                
                {/* Contractor Performance */}
                <div className="pt-4 border-t" data-testid="section-contractor-performance">
                  <h4 className="font-medium mb-2" data-testid="text-contractor-title">
                    Contractor Performance
                  </h4>
                  <p className="text-sm text-muted-foreground" data-testid="text-contractor-analysis">
                    {job.contractor} has completed this inspection. 
                    {forecast.confidenceTdl && forecast.confidenceTdl >= THRESHOLDS.confidenceMin && (
                      <span>
                        {" "}The forecast confidence level of {forecast.confidenceTdl.toFixed(0)}% indicates reliable prediction accuracy.
                      </span>
                    )}
                    {forecast.confidenceTdl && forecast.confidenceTdl < THRESHOLDS.confidenceMin && (
                      <span>
                        {" "}The forecast confidence level of {forecast.confidenceTdl.toFixed(0)}% is below the recommended {THRESHOLDS.confidenceMin}% threshold, 
                        suggesting limited historical data for this building type.
                      </span>
                    )}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}

// Phase 2 - BUILD: Export wrapped in ErrorBoundary for production resilience
export default function Forecast() {
  return (
    <ErrorBoundary>
      <ForecastContent />
    </ErrorBoundary>
  );
}
