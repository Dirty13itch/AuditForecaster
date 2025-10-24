import { useState } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Download, RefreshCw, Calendar, AlertCircle } from "lucide-react";
import { format, parseISO } from "date-fns";
import TopBar from "@/components/TopBar";
import ForecastCard from "@/components/ForecastCard";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { Job, Forecast as ForecastType } from "@shared/schema";

export default function Forecast() {
  const { id: jobId } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<"dashboard" | "inspection" | "photos" | "forecast">("forecast");

  const { data: job, isLoading: isLoadingJob } = useQuery<Job>({
    queryKey: ["/api/jobs", jobId],
    queryFn: async () => {
      if (!jobId) throw new Error("Job ID is required");
      const response = await fetch(`/api/jobs/${jobId}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch job");
      return response.json();
    },
    enabled: !!jobId,
  });

  const { data: forecast } = useQuery<ForecastType | null>({
    queryKey: ["/api/forecasts", jobId],
    queryFn: async () => {
      if (!jobId) throw new Error("Job ID is required");
      const response = await fetch(`/api/forecasts?jobId=${jobId}`, {
        credentials: "include",
      });
      if (!response.ok) return null;
      const data = await response.json();
      return data.length > 0 ? data[0] : null;
    },
    enabled: !!jobId,
  });

  const isRescheduled = job?.originalScheduledDate 
    && job?.scheduledDate 
    && job.originalScheduledDate !== job.scheduledDate 
    && !job?.isCancelled;
  const formattedOriginalDate = job?.originalScheduledDate 
    ? format(parseISO(job.originalScheduledDate), "MMM d, yyyy h:mm a")
    : null;
  const formattedCurrentDate = job?.scheduledDate 
    ? format(parseISO(job.scheduledDate), "MMM d, yyyy h:mm a")
    : null;

  if (isLoadingJob) {
    return (
      <div className="min-h-screen bg-background pb-20 md:pb-6">
        <TopBar 
          title="Loading..."
          isOnline={true}
        />
        <main className="pt-20 px-4 md:px-6 lg:px-8 max-w-6xl mx-auto">
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <Skeleton className="h-9 w-9 rounded-md" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-64" />
              </div>
            </div>
            <Skeleton className="h-48 w-full rounded-md" />
          </div>
        </main>
        <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-6">
      <TopBar 
        title="Duct Leakage Forecast"
        isOnline={true}
      />
      
      <main className="pt-20 px-4 md:px-6 lg:px-8 max-w-6xl mx-auto">
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <h2 className="text-xl font-bold" data-testid="text-page-title">{job?.name ?? "Forecast"}</h2>
              <p className="text-sm text-muted-foreground">{job?.address}</p>
            </div>
            <Button variant="outline" data-testid="button-generate-report">
              <Download className="h-4 w-4 mr-2" />
              Report
            </Button>
          </div>

          {/* Rescheduled Indicator */}
          {isRescheduled && (
            <div className="bg-warning/10 border border-warning/20 rounded-md p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-warning mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-warning">Schedule Changed</h3>
                  <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
                    Rescheduled
                  </Badge>
                </div>
                <div className="text-sm space-y-1">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Originally:</span>
                    <span className="font-medium">{formattedOriginalDate}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-warning" />
                    <span className="text-muted-foreground">Now scheduled:</span>
                    <span className="font-medium text-warning">{formattedCurrentDate}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Cancelled Indicator */}
          {job?.isCancelled && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-md p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-destructive">Calendar Event Cancelled</h3>
                  <Badge variant="destructive">
                    Cancelled
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  The Google Calendar event for this job has been cancelled or deleted.
                </p>
              </div>
            </div>
          )}

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <h3 className="text-lg font-semibold">Building Information</h3>
                <Badge variant="outline" data-testid="badge-contractor">{job?.contractor}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground mb-1">Inspection Type</p>
                  <p className="font-medium">{job?.inspectionType ?? "N/A"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Status</p>
                  <p className="font-medium capitalize">{job?.status ?? "N/A"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Scheduled</p>
                  <p className="font-medium">
                    {job?.scheduledDate ? format(parseISO(job.scheduledDate), "MMM d, yyyy") : "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Priority</p>
                  <p className="font-medium capitalize">{job?.priority ?? "N/A"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Leakage Predictions</h3>
              <Button variant="outline" size="sm" data-testid="button-recalculate">
                <RefreshCw className="h-4 w-4 mr-2" />
                Recalculate
              </Button>
            </div>
            {forecast ? (
              <div className="grid gap-6 md:grid-cols-2">
                <ForecastCard
                  title="Total Duct Leakage (TDL)"
                  predicted={forecast.predictedTdl ?? 0}
                  actual={forecast.actualTdl ?? undefined}
                  unit="CFM25"
                  confidence={forecast.confidenceTdl ?? 0}
                  threshold={200}
                />
                <ForecastCard
                  title="Duct Leakage to Outside (DLO)"
                  predicted={forecast.predictedDlo ?? 0}
                  actual={forecast.actualDlo ?? undefined}
                  unit="CFM25"
                  confidence={forecast.confidenceDlo ?? 0}
                  threshold={50}
                />
              </div>
            ) : (
              <div className="bg-muted/30 border border-muted rounded-md p-8 text-center">
                <p className="text-muted-foreground">
                  No forecast data available for this job yet. Complete the inspection to generate predictions.
                </p>
              </div>
            )}
          </div>

          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">Analysis & Recommendations</h3>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-success"></span>
                  Total Duct Leakage (TDL)
                </h4>
                <p className="text-sm text-muted-foreground">
                  The system passed with actual TDL of 148.7 CFM25, which is 4.9% below the prediction and well within the 200 CFM25 threshold. This indicates excellent duct sealing work.
                </p>
              </div>
              <div>
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-warning"></span>
                  Duct Leakage to Outside (DLO)
                </h4>
                <p className="text-sm text-muted-foreground">
                  The system passed with actual DLO of 51.2 CFM25, slightly above the 50 CFM25 threshold. The result was 19.6% higher than predicted. Consider additional sealing at connection points to conditioned space.
                </p>
              </div>
              <div className="pt-4 border-t">
                <h4 className="font-medium mb-2">Contractor Performance</h4>
                <p className="text-sm text-muted-foreground">
                  Acme HVAC Solutions has an 89% forecast accuracy rate over the last 12 jobs, with an average variance of ±8.3%. This job's results align with their historical performance.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}
