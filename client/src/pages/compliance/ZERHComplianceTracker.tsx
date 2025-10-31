import { useState, useEffect } from "react";
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
  Package
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
import TopBar from "@/components/TopBar";
import BottomNav from "@/components/BottomNav";
import { ObjectUploader } from "@/components/ObjectUploader";
import type { Job } from "@shared/schema";

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

export default function ZERHComplianceTracker() {
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

  const { data: job, isLoading: loadingJob } = useQuery<Job>({
    queryKey: ["/api/jobs", jobId],
    enabled: !!jobId,
  });

  // Load from localStorage
  useEffect(() => {
    const savedData = localStorage.getItem(`zerh-tracker-${jobId}`);
    if (savedData) {
      try {
        setTracker(JSON.parse(savedData));
      } catch (error) {
        console.error("Failed to load saved tracker:", error);
      }
    }
  }, [jobId]);

  // Auto-save every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      localStorage.setItem(`zerh-tracker-${jobId}`, JSON.stringify(tracker));
    }, 30000);
    return () => clearInterval(interval);
  }, [jobId, tracker]);

  const saveDraft = () => {
    localStorage.setItem(`zerh-tracker-${jobId}`, JSON.stringify(tracker));
    toast({
      title: "Draft saved",
      description: "Tracker saved to local storage.",
    });
  };

  const handleUpdatePrerequisite = (id: string, status: Prerequisite["status"]) => {
    setTracker(prev => ({
      ...prev,
      prerequisites: prev.prerequisites.map(p =>
        p.id === id ? { ...p, status } : p
      ),
    }));
  };

  const handleUpdateMeasure = (id: string, status: EfficiencyMeasure["status"]) => {
    setTracker(prev => ({
      ...prev,
      efficiencyMeasures: prev.efficiencyMeasures.map(m =>
        m.id === id ? { ...m, status } : m
      ),
    }));
  };

  const handleAddMeasure = () => {
    if (!newMeasureName.trim()) return;

    const newMeasure: EfficiencyMeasure = {
      id: Date.now().toString(),
      measure: newMeasureName,
      required: false,
      status: "not_started",
      points: parseInt(newMeasurePoints) || 0,
    };

    setTracker(prev => ({
      ...prev,
      efficiencyMeasures: [...prev.efficiencyMeasures, newMeasure],
    }));

    setNewMeasureName("");
    setNewMeasurePoints("");
  };

  const handleRemoveMeasure = (id: string) => {
    setTracker(prev => ({
      ...prev,
      efficiencyMeasures: prev.efficiencyMeasures.filter(m => m.id !== id),
    }));
  };

  const calculate45LCredit = (units: number): number => {
    const perUnitCredit = 2500;
    const buildingCap = 15000;
    return Math.min(units * perUnitCredit, buildingCap);
  };

  const handleAddBuilding = () => {
    if (!newBuildingName.trim() || !newBuildingUnits) return;

    const units = parseInt(newBuildingUnits);
    const credit = calculate45LCredit(units);

    const newBuilding: Building = {
      id: Date.now().toString(),
      name: newBuildingName,
      units,
      credit,
    };

    setTracker(prev => ({
      ...prev,
      buildings: [...prev.buildings, newBuilding],
    }));

    setNewBuildingName("");
    setNewBuildingUnits("");
  };

  const handleRemoveBuilding = (id: string) => {
    setTracker(prev => ({
      ...prev,
      buildings: prev.buildings.filter(b => b.id !== id),
    }));
  };

  const handleDocumentUpload = async (docType: string, result: any) => {
    try {
      if (!result.successful || result.successful.length === 0) {
        throw new Error("No files uploaded");
      }

      const uploadedFile = result.successful[0];
      const docUrl = uploadedFile.uploadURL || uploadedFile.url;

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
      toast({
        title: "Upload failed",
        description: "Failed to upload document. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploadingDoc(null);
      setShowUploadModal(false);
    }
  };

  const handleRemoveDocument = (id: string) => {
    setTracker(prev => ({
      ...prev,
      documents: prev.documents.filter(doc => doc.id !== id),
    }));
  };

  const handleSubmit = () => {
    const completedPrereqs = tracker.prerequisites.filter(p => p.status === "complete").length;
    if (completedPrereqs < tracker.prerequisites.length) {
      toast({
        title: "Prerequisites incomplete",
        description: "Please complete all prerequisites before submitting.",
        variant: "destructive",
      });
      return;
    }

    saveDraft();
    setTracker(prev => ({ ...prev, certificationStatus: "submitted" }));
    toast({
      title: "Submitted for certification",
      description: "ZERH compliance tracker submitted.",
    });
  };

  const handleMarkCertified = () => {
    setTracker(prev => ({ ...prev, certificationStatus: "certified" }));
    toast({
      title: "Marked as certified",
      description: "ZERH certification complete.",
    });
  };

  const handleGeneratePackage = () => {
    toast({
      title: "Package generation",
      description: "45L submission package generation coming soon.",
    });
  };

  // Calculate totals
  const completedPrereqs = tracker.prerequisites.filter(p => p.status === "complete").length;
  const totalPrereqs = tracker.prerequisites.length;
  const prerequisitesMet = completedPrereqs === totalPrereqs;

  const totalPoints = tracker.efficiencyMeasures
    .filter(m => m.status === "complete")
    .reduce((sum, m) => sum + m.points, 0);

  const totalCredit = tracker.buildings.reduce((sum, b) => sum + b.credit, 0);

  const is45LEligible = prerequisitesMet && totalPoints >= 10; // Example threshold

  if (loadingJob) {
    return (
      <div className="flex flex-col h-screen">
        <TopBar title="ZERH Compliance Tracker" />
        <main className="flex-1 overflow-auto p-4 pb-20">
          <div className="max-w-5xl mx-auto space-y-4">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-96 w-full" />
          </div>
        </main>
        <BottomNav activeTab="dashboard" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="flex flex-col h-screen">
        <TopBar title="ZERH Compliance Tracker" />
        <main className="flex-1 overflow-auto p-4 pb-20">
          <Alert variant="destructive">
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

  return (
    <div className="flex flex-col h-screen">
      <TopBar title="ZERH Compliance Tracker" />

      <main className="flex-1 overflow-auto p-4 pb-20">
        <div className="max-w-5xl mx-auto space-y-6">

          {/* Header */}
          <Card>
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
          <Card>
            <CardHeader>
              <CardTitle data-testid="text-prerequisites-title">Prerequisites Checklist</CardTitle>
              <CardDescription data-testid="text-prerequisites-description">
                Complete all prerequisites for ZERH certification
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border p-4 bg-muted/50">
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
                          <SelectItem value="not_started">Not Started</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="complete">Complete</SelectItem>
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
          <Card>
            <CardHeader>
              <CardTitle data-testid="text-measures-title">Additional Efficiency Measures</CardTitle>
              <CardDescription data-testid="text-measures-description">
                Track additional measures beyond ZERH requirements
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border p-4 bg-muted/50">
                <div className="text-sm font-medium mb-1">Total Points Earned</div>
                <div className="text-2xl font-bold" data-testid="text-total-points">
                  {totalPoints} points
                </div>
              </div>

              <Table data-testid="table-measures">
                <TableHeader>
                  <TableRow>
                    <TableHead>Measure</TableHead>
                    <TableHead>Required?</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Points</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tracker.efficiencyMeasures.map((measure) => (
                    <TableRow key={measure.id} data-testid={`measure-row-${measure.id}`}>
                      <TableCell data-testid={`text-measure-name-${measure.id}`}>
                        {measure.measure}
                      </TableCell>
                      <TableCell>
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
                            <SelectItem value="not_started">Not Started</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="complete">Complete</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell data-testid={`text-measure-points-${measure.id}`}>
                        {measure.points}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveMeasure(measure.id)}
                          data-testid={`button-remove-measure-${measure.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="flex gap-2">
                <Input
                  placeholder="Measure name"
                  value={newMeasureName}
                  onChange={(e) => setNewMeasureName(e.target.value)}
                  data-testid="input-new-measure-name"
                />
                <Input
                  type="number"
                  placeholder="Points"
                  className="w-24"
                  value={newMeasurePoints}
                  onChange={(e) => setNewMeasurePoints(e.target.value)}
                  data-testid="input-new-measure-points"
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
          <Card>
            <CardHeader>
              <CardTitle data-testid="text-45l-title">45L Tax Credit Calculator</CardTitle>
              <CardDescription data-testid="text-45l-description">
                Calculate Section 45L tax credits for ZERH-certified buildings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="rounded-lg border p-4 bg-muted/50">
                <div className="text-sm font-medium mb-2">Credit Per Unit</div>
                <div className="text-2xl font-bold" data-testid="text-credit-per-unit">
                  $2,500
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Building cap: $15,000 maximum per building
                </div>
              </div>

              {tracker.buildings.length > 0 && (
                <div className="space-y-3">
                  <Label className="text-base font-semibold">Buildings</Label>
                  <Table data-testid="table-buildings">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Building Name</TableHead>
                        <TableHead>Units</TableHead>
                        <TableHead>Credit Calculation</TableHead>
                        <TableHead>Tax Credit</TableHead>
                        <TableHead></TableHead>
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
                              {building.units} × $2,500 = ${building.units * 2500}
                              <br />
                              MIN(${building.units * 2500}, $15,000)
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

                  <div className="rounded-lg border p-4 bg-primary/5">
                    <div className="text-sm font-medium mb-1">Total Tax Credit (All Buildings)</div>
                    <div className="text-3xl font-bold" data-testid="text-total-credit">
                      ${totalCredit.toLocaleString()}
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <Label className="text-sm font-medium">Add Building</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Building name"
                    value={newBuildingName}
                    onChange={(e) => setNewBuildingName(e.target.value)}
                    data-testid="input-new-building-name"
                  />
                  <Input
                    type="number"
                    placeholder="Units"
                    className="w-32"
                    value={newBuildingUnits}
                    onChange={(e) => setNewBuildingUnits(e.target.value)}
                    data-testid="input-new-building-units"
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
          <Card>
            <CardHeader>
              <CardTitle data-testid="text-documents-title">Compliance Documentation</CardTitle>
              <CardDescription data-testid="text-documents-description">
                Upload certification documents
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                <div className="space-y-2">
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
                            <div className="text-sm font-medium">{doc.name}</div>
                            <div className="text-xs text-muted-foreground">{doc.type}</div>
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
          <Card>
            <CardHeader>
              <CardTitle data-testid="text-package-title">45L Submission Package</CardTitle>
              <CardDescription data-testid="text-package-description">
                Generate complete submission package with all certificates and calculations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
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
          <div className="flex gap-3 justify-end flex-wrap pb-4">
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
