import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Save, Send, Download, ExternalLink, AlertCircle, Clock, Upload } from "lucide-react";
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
import TopBar from "@/components/TopBar";
import BottomNav from "@/components/BottomNav";
import { ObjectUploader } from "@/components/ObjectUploader";
import type { Job } from "@shared/schema";

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

export default function BenchmarkingDeadlineTracker() {
  const { buildingId } = useParams<{ buildingId: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [data, setData] = useState<BenchmarkingData>(DEFAULT_DATA);
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);

  const uploadArtifact = useUploadComplianceArtifact();

  const { data: job, isLoading: loadingJob } = useQuery<Job>({
    queryKey: ["/api/jobs", buildingId],
    enabled: !!buildingId,
  });

  // Load from localStorage
  useEffect(() => {
    const savedData = localStorage.getItem(`benchmarking-${buildingId}`);
    if (savedData) {
      try {
        setData(JSON.parse(savedData));
      } catch (error) {
        console.error("Failed to load saved data:", error);
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

  // Auto-save every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      localStorage.setItem(`benchmarking-${buildingId}`, JSON.stringify(data));
    }, 30000);
    return () => clearInterval(interval);
  }, [buildingId, data]);

  // Calculate compliance class and deadline
  const getComplianceClass = (sqft: number | null): { class: string; deadline: Date | null } => {
    if (!sqft || sqft < 50000) {
      return { class: "Not Subject", deadline: null };
    }
    if (sqft >= 100000) {
      return { class: "Class 1", deadline: new Date(2025, 5, 1) }; // June 1, 2025
    }
    return { class: "Class 2", deadline: new Date(2026, 5, 1) }; // June 1, 2026
  };

  const { class: complianceClass, deadline } = getComplianceClass(data.squareFootage);

  // Calculate countdown
  const getCountdown = (deadline: Date | null) => {
    if (!deadline) return null;
    const days = differenceInDays(deadline, new Date());
    return days;
  };

  const countdown = getCountdown(deadline);

  const getCountdownColor = (days: number | null): string => {
    if (days === null) return "text-muted-foreground";
    if (days < 0) return "text-destructive";
    if (days < 30) return "text-destructive";
    if (days < 90) return "text-warning";
    return "text-success";
  };

  const getCountdownBadgeVariant = (days: number | null): "default" | "secondary" | "destructive" => {
    if (days === null || days < 0 || days < 30) return "destructive";
    if (days < 90) return "secondary";
    return "default";
  };

  const handleSave = () => {
    localStorage.setItem(`benchmarking-${buildingId}`, JSON.stringify(data));
    toast({
      title: "Saved",
      description: "Benchmarking tracker data saved successfully.",
    });
  };

  const handleMarkSubmitted = () => {
    const newData = { ...data, reportingStatus: "submitted" as const };
    setData(newData);
    localStorage.setItem(`benchmarking-${buildingId}`, JSON.stringify(newData));
    toast({
      title: "Marked as Submitted",
      description: "Benchmarking report marked as submitted.",
    });
  };

  const handleDownloadSummary = () => {
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
  };

  const handleDocumentUpload = async (docType: keyof BenchmarkingData["documents"], objectPath: string) => {
    try {
      await uploadArtifact.mutateAsync({
        jobId: buildingId!,
        programType: "benchmarking",
        artifactType: docType.includes("Report") || docType.includes("Doc") || docType.includes("Proof") ? "certificate" : "photo",
        documentPath: objectPath,
        uploadedBy: "current-user", // This should come from auth context
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
      toast({
        title: "Error",
        description: "Failed to upload document. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploadingDoc(null);
    }
  };

  if (loadingJob) {
    return (
      <div className="flex flex-col h-screen">
        <TopBar title="Benchmarking Deadline Tracker" />
        <main className="flex-1 overflow-auto p-4 pb-20">
          <div className="max-w-4xl mx-auto space-y-6">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  const nextReportDue = deadline ? addYears(deadline, 1) : null;

  return (
    <div className="flex flex-col h-screen">
      <TopBar title="Benchmarking Deadline Tracker" />
      
      <main className="flex-1 overflow-auto p-4 pb-20">
        <div className="max-w-4xl mx-auto space-y-6">
          
          {/* Header Card */}
          <Card>
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
                Square Footage: <span className="font-semibold text-foreground" data-testid="text-square-footage">
                  {data.squareFootage?.toLocaleString() || "Not set"}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Building Size Input */}
          <Card>
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
                  onChange={(e) => setData(prev => ({
                    ...prev,
                    squareFootage: e.target.value ? parseInt(e.target.value) : null,
                  }))}
                  data-testid="input-square-footage"
                />
              </div>

              <Alert data-testid="alert-classification">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {!data.squareFootage && "Enter square footage to see classification"}
                  {data.squareFootage && data.squareFootage < 50000 && (
                    "Not subject to benchmarking requirements (< 50,000 sq ft)"
                  )}
                  {data.squareFootage && data.squareFootage >= 50000 && data.squareFootage < 100000 && (
                    <span><strong>Class 2:</strong> Buildings 50,000-99,999 sq ft. First report due June 1, 2026.</span>
                  )}
                  {data.squareFootage && data.squareFootage >= 100000 && (
                    <span><strong>Class 1:</strong> Buildings ≥100,000 sq ft. First report due June 1, 2025.</span>
                  )}
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* Deadline Display with Countdown */}
          {deadline && countdown !== null && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
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

                {countdown < 0 && (
                  <Alert variant="destructive" data-testid="alert-overdue">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Overdue:</strong> This report is {Math.abs(countdown)} days past the deadline.
                    </AlertDescription>
                  </Alert>
                )}

                {countdown >= 0 && countdown < 30 && (
                  <Alert variant="destructive" data-testid="alert-urgent">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Urgent:</strong> Less than 30 days until deadline.
                    </AlertDescription>
                  </Alert>
                )}

                {countdown >= 30 && countdown < 90 && (
                  <Alert data-testid="alert-upcoming">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Upcoming:</strong> Deadline approaching in {countdown} days.
                    </AlertDescription>
                  </Alert>
                )}

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

          {/* Reporting Status Tracking */}
          <Card>
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
                    <SelectItem value="not_started">Not Started</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="submitted">Submitted</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
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

          {/* ENERGY STAR Portfolio Manager Integration */}
          <Card>
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

          {/* Compliance Document Upload */}
          <Card>
            <CardHeader>
              <CardTitle>Compliance Documents</CardTitle>
              <CardDescription>
                Upload required benchmarking and disclosure documentation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              
              {/* Benchmarking Report */}
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

              {/* Portfolio Manager Screenshot */}
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

              {/* Disclosure Documentation */}
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

              {/* Public Disclosure Proof */}
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

          {/* Actions */}
          <Card>
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
