import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, differenceInMinutes } from "date-fns";
import {
  Calendar,
  User,
  MapPin,
  Clock,
  AlertCircle,
  TrendingUp,
  CheckCircle,
  AlertTriangle,
  Zap,
  Navigation
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { calculateDistance } from "@/lib/distanceCalculator";
import type { User as InspectorUser, Job, InspectorWorkload, InspectorPreferences } from "@shared/schema";

interface InspectorAssignmentDialogProps {
  open: boolean;
  onClose: () => void;
  jobId: string;
  jobDetails: {
    name: string;
    address: string;
    scheduledDate: Date;
    inspectionType: string;
    estimatedDuration?: number;
    latitude?: number;
    longitude?: number;
    territory?: string;
  };
  onAssign: (inspectorId: string) => Promise<void>;
}

interface InspectorWithMetrics extends InspectorUser {
  workload?: InspectorWorkload;
  preferences?: InspectorPreferences;
  currentLocation?: { lat: number; lng: number; address: string };
  distance?: number;
  travelTime?: number;
  score?: number;
  conflicts?: string[];
}

function getWorkloadColor(level: string) {
  switch (level) {
    case "light":
      return "text-green-600 bg-green-50";
    case "moderate":
      return "text-yellow-600 bg-yellow-50";
    case "heavy":
      return "text-orange-600 bg-orange-50";
    case "overbooked":
      return "text-red-600 bg-red-50";
    default:
      return "text-gray-600 bg-gray-50";
  }
}

function getWorkloadIcon(level: string) {
  switch (level) {
    case "light":
      return <CheckCircle className="w-4 h-4" />;
    case "moderate":
      return <AlertTriangle className="w-4 h-4" />;
    case "heavy":
    case "overbooked":
      return <AlertCircle className="w-4 h-4" />;
    default:
      return <Clock className="w-4 h-4" />;
  }
}

export default function InspectorAssignmentDialog({
  open,
  onClose,
  jobId,
  jobDetails,
  onAssign,
}: InspectorAssignmentDialogProps) {
  const { toast } = useToast();
  const [selectedInspector, setSelectedInspector] = useState<string | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");

  // Fetch all inspectors including admin
  const { data: inspectors = [], isLoading: loadingInspectors } = useQuery<InspectorUser[]>({
    queryKey: ["/api/users/inspectors"],
    enabled: open,
  });

  // Fetch workload for all inspectors for the scheduled date
  const { data: workloads = [] } = useQuery<InspectorWorkload[]>({
    queryKey: ["/api/inspector-workload", format(jobDetails.scheduledDate, "yyyy-MM-dd")],
    enabled: open && !!jobDetails.scheduledDate,
  });

  // Fetch inspector preferences
  const { data: preferences = [] } = useQuery<InspectorPreferences[]>({
    queryKey: ["/api/inspector-preferences"],
    enabled: open,
  });

  // Fetch jobs for the scheduled date to check conflicts
  const { data: scheduledJobs = [] } = useQuery<Job[]>({
    queryKey: ["/api/jobs/by-date", format(jobDetails.scheduledDate, "yyyy-MM-dd")],
    enabled: open && !!jobDetails.scheduledDate,
  });

  // Get optimal inspector suggestions
  const { data: suggestions = [] } = useQuery<{ inspectorId: string; score: number; reasons: string[] }[]>({
    queryKey: ["/api/jobs/suggest-inspector", jobId, format(jobDetails.scheduledDate, "yyyy-MM-dd")],
    enabled: open && !!jobId,
  });

  // Combine inspector data with metrics
  const inspectorsWithMetrics = useMemo<InspectorWithMetrics[]>(() => {
    return inspectors.map((inspector) => {
      const workload = workloads.find((w) => w.inspectorId === inspector.id);
      const preference = preferences.find((p) => p.inspectorId === inspector.id);
      const suggestion = suggestions.find((s) => s.inspectorId === inspector.id);

      // Calculate distance if locations are available
      let distance = 0;
      let travelTime = 0;
      if (jobDetails.latitude && jobDetails.longitude) {
        if (workload?.lastJobLatitude && workload?.lastJobLongitude) {
          distance = calculateDistance(
            workload.lastJobLatitude,
            workload.lastJobLongitude,
            jobDetails.latitude,
            jobDetails.longitude
          );
          travelTime = Math.ceil(distance / 30 * 60); // Assume 30mph average
        } else if (preference?.homeBaseLatitude && preference?.homeBaseLongitude) {
          distance = calculateDistance(
            preference.homeBaseLatitude,
            preference.homeBaseLongitude,
            jobDetails.latitude,
            jobDetails.longitude
          );
          travelTime = Math.ceil(distance / 30 * 60);
        }
      }

      // Check for conflicts
      const conflicts: string[] = [];
      const inspectorJobs = scheduledJobs.filter((j) => j.assignedTo === inspector.id);
      
      // Check if inspector is overbooked
      if (workload && preference) {
        if (workload.jobCount >= preference.maxDailyJobs) {
          conflicts.push("Daily job limit reached");
        }
        if (workload.scheduledMinutes + (jobDetails.estimatedDuration || 60) > 480) { // 8 hours
          conflicts.push("Schedule full");
        }
      }

      // Check for time conflicts
      inspectorJobs.forEach((job) => {
        if (job.scheduledDate) {
          const jobTime = new Date(job.scheduledDate);
          const newJobTime = jobDetails.scheduledDate;
          const timeDiff = Math.abs(differenceInMinutes(jobTime, newJobTime));
          
          if (timeDiff < (jobDetails.estimatedDuration || 60) + travelTime) {
            conflicts.push(`Conflicts with ${job.name}`);
          }
        }
      });

      // Check territory preferences
      if (preference?.preferredTerritories && jobDetails.territory) {
        if (!preference.preferredTerritories.includes(jobDetails.territory)) {
          conflicts.push("Outside preferred territory");
        }
      }

      return {
        ...inspector,
        workload,
        preferences: preference,
        distance,
        travelTime,
        score: suggestion?.score || 0,
        conflicts,
        currentLocation: workload?.lastJobLocation ? {
          lat: workload.lastJobLatitude || 0,
          lng: workload.lastJobLongitude || 0,
          address: workload.lastJobLocation,
        } : undefined,
      };
    });
  }, [inspectors, workloads, preferences, scheduledJobs, suggestions, jobDetails]);

  // Sort inspectors by score (best first)
  const sortedInspectors = useMemo(() => {
    return [...inspectorsWithMetrics].sort((a, b) => {
      // Prioritize by score if available
      if (a.score !== b.score) return (b.score || 0) - (a.score || 0);
      
      // Then by conflicts (fewer is better)
      if (a.conflicts?.length !== b.conflicts?.length) {
        return (a.conflicts?.length || 0) - (b.conflicts?.length || 0);
      }
      
      // Then by workload
      const workloadOrder = { light: 0, moderate: 1, heavy: 2, overbooked: 3 };
      const aWorkload = workloadOrder[a.workload?.workloadLevel as keyof typeof workloadOrder] || 4;
      const bWorkload = workloadOrder[b.workload?.workloadLevel as keyof typeof workloadOrder] || 4;
      if (aWorkload !== bWorkload) return aWorkload - bWorkload;
      
      // Finally by distance
      return (a.distance || 999) - (b.distance || 999);
    });
  }, [inspectorsWithMetrics]);

  const handleAssign = async () => {
    if (!selectedInspector) {
      toast({
        title: "No inspector selected",
        description: "Please select an inspector to assign this job to",
        variant: "destructive",
      });
      return;
    }

    setIsAssigning(true);
    try {
      await onAssign(selectedInspector);
      toast({
        title: "Job assigned",
        description: "The job has been successfully assigned to the inspector",
      });
      onClose();
    } catch (error) {
      toast({
        title: "Assignment failed",
        description: "Failed to assign the job. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAssigning(false);
    }
  };

  const bestInspector = sortedInspectors[0];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Assign Inspector to Job</DialogTitle>
          <DialogDescription>
            Select the best inspector for {jobDetails.name} on{" "}
            {format(jobDetails.scheduledDate, "MMMM d, yyyy")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <Tabs defaultValue="inspectors" className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="inspectors">Inspectors</TabsTrigger>
              <TabsTrigger value="recommendation">AI Recommendation</TabsTrigger>
              <TabsTrigger value="details">Job Details</TabsTrigger>
            </TabsList>

            <TabsContent value="inspectors" className="flex-1 overflow-hidden">
              <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-3">
                  {loadingInspectors ? (
                    <>
                      <Skeleton className="h-24 w-full" />
                      <Skeleton className="h-24 w-full" />
                      <Skeleton className="h-24 w-full" />
                    </>
                  ) : (
                    sortedInspectors.map((inspector) => (
                      <Card
                        key={inspector.id}
                        className={`cursor-pointer transition-all ${
                          selectedInspector === inspector.id
                            ? "ring-2 ring-primary"
                            : "hover-elevate"
                        }`}
                        onClick={() => setSelectedInspector(inspector.id)}
                        data-testid={`card-inspector-${inspector.id}`}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-4">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={inspector.profileImageUrl || undefined} />
                              <AvatarFallback>
                                {inspector.firstName?.[0]}{inspector.lastName?.[0]}
                              </AvatarFallback>
                            </Avatar>

                            <div className="flex-1 space-y-2">
                              <div className="flex items-center justify-between">
                                <div>
                                  <h4 className="font-semibold">
                                    {inspector.firstName} {inspector.lastName}
                                  </h4>
                                  <p className="text-sm text-muted-foreground">
                                    {inspector.role === "admin" ? "Admin / Inspector" : "Inspector"}
                                  </p>
                                </div>

                                <div className="flex items-center gap-2">
                                  {inspector.score && inspector.score > 80 && (
                                    <Badge variant="default" className="bg-green-600">
                                      <Zap className="w-3 h-3 mr-1" />
                                      Recommended
                                    </Badge>
                                  )}
                                  {inspector.workload && (
                                    <Badge className={getWorkloadColor(inspector.workload.workloadLevel)}>
                                      {getWorkloadIcon(inspector.workload.workloadLevel)}
                                      <span className="ml-1">{inspector.workload.workloadLevel}</span>
                                    </Badge>
                                  )}
                                </div>
                              </div>

                              <div className="grid grid-cols-3 gap-4 text-sm">
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3 text-muted-foreground" />
                                  <span>
                                    {inspector.workload?.jobCount || 0} jobs today
                                  </span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-muted-foreground" />
                                  <span>
                                    {Math.floor((inspector.workload?.scheduledMinutes || 0) / 60)}h booked
                                  </span>
                                </div>
                                {inspector.distance > 0 && (
                                  <div className="flex items-center gap-1">
                                    <Navigation className="w-3 h-3 text-muted-foreground" />
                                    <span>
                                      {inspector.distance.toFixed(1)} mi ({inspector.travelTime} min)
                                    </span>
                                  </div>
                                )}
                              </div>

                              {inspector.conflicts && inspector.conflicts.length > 0 && (
                                <Alert className="py-2">
                                  <AlertCircle className="h-3 w-3" />
                                  <AlertDescription className="text-xs">
                                    {inspector.conflicts.join(", ")}
                                  </AlertDescription>
                                </Alert>
                              )}

                              {inspector.preferences && (
                                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                  <span>
                                    Max daily: {inspector.preferences.maxDailyJobs} jobs
                                  </span>
                                  {inspector.preferences.preferredTerritories && (
                                    <span>
                                      Territories: {inspector.preferences.preferredTerritories.join(", ")}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="recommendation" className="flex-1 overflow-auto">
              <Card>
                <CardHeader>
                  <CardTitle>AI Recommendation</CardTitle>
                </CardHeader>
                <CardContent>
                  {bestInspector ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-4 p-4 bg-primary/5 rounded-lg">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={bestInspector.profileImageUrl || undefined} />
                          <AvatarFallback>
                            {bestInspector.firstName?.[0]}{bestInspector.lastName?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-semibold text-lg">
                            {bestInspector.firstName} {bestInspector.lastName}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            Best match with {bestInspector.score}% confidence
                          </p>
                        </div>
                        <Button 
                          className="ml-auto" 
                          onClick={() => setSelectedInspector(bestInspector.id)}
                        >
                          Select Inspector
                        </Button>
                      </div>

                      <Separator />

                      <div className="space-y-3">
                        <h4 className="font-medium">Why this inspector?</h4>
                        <div className="space-y-2">
                          {suggestions
                            .find((s) => s.inspectorId === bestInspector.id)
                            ?.reasons.map((reason, idx) => (
                              <div key={idx} className="flex items-start gap-2">
                                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                                <span className="text-sm">{reason}</span>
                              </div>
                            ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <h5 className="text-sm font-medium">Current Workload</h5>
                          <Progress 
                            value={(bestInspector.workload?.jobCount || 0) / (bestInspector.preferences?.maxDailyJobs || 5) * 100} 
                            className="h-2"
                          />
                          <p className="text-xs text-muted-foreground">
                            {bestInspector.workload?.jobCount || 0} of {bestInspector.preferences?.maxDailyJobs || 5} jobs
                          </p>
                        </div>

                        <div className="space-y-2">
                          <h5 className="text-sm font-medium">Travel Time</h5>
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm">
                              {bestInspector.travelTime} minutes ({bestInspector.distance?.toFixed(1)} miles)
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No recommendations available</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="details" className="flex-1 overflow-auto">
              <Card>
                <CardHeader>
                  <CardTitle>Job Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Job Name</label>
                      <p className="text-sm text-muted-foreground">{jobDetails.name}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Inspection Type</label>
                      <p className="text-sm text-muted-foreground">{jobDetails.inspectionType}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Address</label>
                      <p className="text-sm text-muted-foreground">{jobDetails.address}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Scheduled Date</label>
                      <p className="text-sm text-muted-foreground">
                        {format(jobDetails.scheduledDate, "MMMM d, yyyy h:mm a")}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Estimated Duration</label>
                      <p className="text-sm text-muted-foreground">
                        {jobDetails.estimatedDuration || 60} minutes
                      </p>
                    </div>
                    {jobDetails.territory && (
                      <div>
                        <label className="text-sm font-medium">Territory</label>
                        <p className="text-sm text-muted-foreground">{jobDetails.territory}</p>
                      </div>
                    )}
                  </div>

                  {jobDetails.latitude && jobDetails.longitude && (
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <h5 className="text-sm font-medium mb-2">Location</h5>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {jobDetails.latitude.toFixed(6)}, {jobDetails.longitude.toFixed(6)}
                        </span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleAssign} 
            disabled={!selectedInspector || isAssigning}
            data-testid="button-confirm-assignment"
          >
            {isAssigning ? "Assigning..." : "Assign Inspector"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}