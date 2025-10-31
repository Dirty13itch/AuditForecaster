import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Save, Send, Upload, Check, AlertCircle, Loader2, FileText } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useEnergyStarChecklist, useUploadComplianceArtifact } from "@/lib/compliance";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import TopBar from "@/components/TopBar";
import BottomNav from "@/components/BottomNav";
import { ObjectUploader } from "@/components/ObjectUploader";
import type { Job } from "@shared/schema";

interface ChecklistItemData {
  id: string;
  itemNumber: string;
  description: string;
  required: boolean;
  status: "not_started" | "in_progress" | "complete" | "failed";
  notes: string;
  photos: string[];
}

interface ChecklistSection {
  id: string;
  title: string;
  items: ChecklistItemData[];
}

// Mock checklist data - in production, this would come from useEnergyStarChecklist hook
const MOCK_CHECKLIST_SECTIONS: ChecklistSection[] = [
  {
    id: "thermal-enclosure",
    title: "Thermal Enclosure System",
    items: [
      {
        id: "te-1",
        itemNumber: "1.1",
        description: "Insulation installed at rated R-value per plans",
        required: true,
        status: "not_started",
        notes: "",
        photos: [],
      },
      {
        id: "te-2",
        itemNumber: "1.2",
        description: "Air barrier continuity verified",
        required: true,
        status: "not_started",
        notes: "",
        photos: [],
      },
      {
        id: "te-3",
        itemNumber: "1.3",
        description: "Windows and doors properly sealed",
        required: true,
        status: "not_started",
        notes: "",
        photos: [],
      },
    ],
  },
  {
    id: "hvac-system",
    title: "HVAC System Quality Installation",
    items: [
      {
        id: "hvac-1",
        itemNumber: "2.1",
        description: "HVAC equipment meets efficiency requirements",
        required: true,
        status: "not_started",
        notes: "",
        photos: [],
      },
      {
        id: "hvac-2",
        itemNumber: "2.2",
        description: "Duct system sealed and insulated",
        required: true,
        status: "not_started",
        notes: "",
        photos: [],
      },
      {
        id: "hvac-3",
        itemNumber: "2.3",
        description: "Refrigerant charge verified",
        required: false,
        status: "not_started",
        notes: "",
        photos: [],
      },
    ],
  },
  {
    id: "water-management",
    title: "Water Management System",
    items: [
      {
        id: "wm-1",
        itemNumber: "3.1",
        description: "Flashing installed at all penetrations",
        required: true,
        status: "not_started",
        notes: "",
        photos: [],
      },
      {
        id: "wm-2",
        itemNumber: "3.2",
        description: "Drainage plane verified",
        required: true,
        status: "not_started",
        notes: "",
        photos: [],
      },
    ],
  },
  {
    id: "indoor-airplus",
    title: "Indoor airPLUS Verification",
    items: [
      {
        id: "iap-1",
        itemNumber: "4.1",
        description: "Whole-building ventilation system installed",
        required: false,
        status: "not_started",
        notes: "",
        photos: [],
      },
      {
        id: "iap-2",
        itemNumber: "4.2",
        description: "MERV 8+ filters installed",
        required: false,
        status: "not_started",
        notes: "",
        photos: [],
      },
    ],
  },
];

export default function EnergyStarMFNCChecklist() {
  const { jobId } = useParams<{ jobId: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [sections, setSections] = useState<ChecklistSection[]>(MOCK_CHECKLIST_SECTIONS);
  const [uploadingItemId, setUploadingItemId] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);

  const uploadArtifact = useUploadComplianceArtifact();

  const { data: job, isLoading: loadingJob } = useQuery<Job>({
    queryKey: ["/api/jobs", jobId],
    enabled: !!jobId,
  });

  // In production, use this hook to fetch actual checklist data
  // const { data: checklistData, isLoading: loadingChecklist } = useEnergyStarChecklist(
  //   "1.2",
  //   job?.multifamilyPath || null
  // );

  useEffect(() => {
    const savedData = localStorage.getItem(`energy-star-checklist-${jobId}`);
    if (savedData) {
      try {
        setSections(JSON.parse(savedData));
      } catch (error) {
        // Invalid saved data format
      }
    }
  }, [jobId]);

  const saveDraft = () => {
    localStorage.setItem(`energy-star-checklist-${jobId}`, JSON.stringify(sections));
    toast({
      title: "Draft saved",
      description: "Checklist progress saved to local storage.",
    });
  };

  const handleUpdateItem = (
    sectionId: string,
    itemId: string,
    field: keyof ChecklistItemData,
    value: any
  ) => {
    setSections(prev =>
      prev.map(section =>
        section.id === sectionId
          ? {
              ...section,
              items: section.items.map(item =>
                item.id === itemId ? { ...item, [field]: value } : item
              ),
            }
          : section
      )
    );
  };

  const handlePhotoUpload = async (sectionId: string, itemId: string, result: any) => {
    try {
      if (!result.successful || result.successful.length === 0) {
        throw new Error("No files uploaded");
      }

      const uploadedFile = result.successful[0];
      const photoUrl = uploadedFile.uploadURL || uploadedFile.url;

      await uploadArtifact.mutateAsync({
        jobId: jobId!,
        programType: "energy_star_mfnc",
        artifactType: "photo",
        documentPath: photoUrl,
        uploadedBy: "current-user-id",
      });

      // Add photo to item's photo array
      setSections(prev =>
        prev.map(section =>
          section.id === sectionId
            ? {
                ...section,
                items: section.items.map(item =>
                  item.id === itemId
                    ? { ...item, photos: [...item.photos, photoUrl] }
                    : item
                ),
              }
            : section
        )
      );

      toast({
        title: "Photo uploaded",
        description: "Photo evidence uploaded successfully.",
      });
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "Failed to upload photo. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploadingItemId(null);
      setShowUploadModal(false);
    }
  };

  const handleSubmitToMRO = async () => {
    // Check all required items are complete
    const requiredItems = sections.flatMap(s => s.items.filter(i => i.required));
    const incompleteRequired = requiredItems.filter(i => i.status !== "complete");

    if (incompleteRequired.length > 0) {
      toast({
        title: "Incomplete checklist",
        description: `${incompleteRequired.length} required item(s) are not complete.`,
        variant: "destructive",
      });
      return;
    }

    // Save final version
    saveDraft();

    // In production, this would:
    // 1. Generate PDF or ZIP of all artifacts
    // 2. Send notification to admin/MRO
    // 3. Update job status
    toast({
      title: "Submitted to MRO",
      description: "Checklist and artifacts submitted for review.",
    });

    setTimeout(() => {
      setLocation(`/inspection/${jobId}`);
    }, 1500);
  };

  // Calculate completion statistics
  const totalItems = sections.reduce((sum, s) => sum + s.items.length, 0);
  const completedItems = sections.reduce(
    (sum, s) => sum + s.items.filter(i => i.status === "complete").length,
    0
  );
  const requiredItems = sections.reduce(
    (sum, s) => sum + s.items.filter(i => i.required).length,
    0
  );
  const completedRequired = sections.reduce(
    (sum, s) => sum + s.items.filter(i => i.required && i.status === "complete").length,
    0
  );
  const completionPercentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
  const allRequiredComplete = completedRequired === requiredItems;

  if (loadingJob) {
    return (
      <div className="flex flex-col h-screen">
        <TopBar title="ENERGY STAR MFNC Checklist" />
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
        <TopBar title="ENERGY STAR MFNC Checklist" />
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
      <TopBar title="ENERGY STAR MFNC Checklist" />

      <main className="flex-1 overflow-auto p-4 pb-20">
        <div className="max-w-5xl mx-auto space-y-6">

          {/* Checklist Header */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="space-y-1">
                  <CardTitle data-testid="text-job-name">
                    Job: {job.name}
                  </CardTitle>
                  <CardDescription data-testid="text-job-address">
                    {job.address}
                  </CardDescription>
                </div>
                <Badge variant="secondary" data-testid="badge-program-version">
                  ENERGY STAR MFNC 1.2 Rev. 05
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Completion Progress */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground" data-testid="text-completion-label">
                    Overall Progress
                  </span>
                  <span className="font-medium" data-testid="text-completion-stats">
                    {completedItems} of {totalItems} items complete ({completionPercentage}%)
                  </span>
                </div>
                <Progress value={completionPercentage} data-testid="progress-completion" />
              </div>

              {/* Required Items Status */}
              <div className="flex items-center gap-2">
                {allRequiredComplete ? (
                  <Check className="w-5 h-5 text-green-600" data-testid="icon-required-complete" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-yellow-600" data-testid="icon-required-incomplete" />
                )}
                <span className="text-sm" data-testid="text-required-status">
                  Required items: {completedRequired} of {requiredItems} complete
                </span>
              </div>

              {/* Certification Path Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t">
                <div>
                  <div className="text-sm text-muted-foreground">Certification Path</div>
                  <div className="font-medium" data-testid="text-certification-path">
                    {job.multifamilyPath || "Not specified"}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Inspector</div>
                  <div className="font-medium" data-testid="text-inspector">
                    {job.assignedTo || "Not assigned"}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Checklist Sections */}
          <Card>
            <CardHeader>
              <CardTitle data-testid="text-checklist-title">
                Certification Checklist
              </CardTitle>
              <CardDescription data-testid="text-checklist-description">
                Complete all required items for ENERGY STAR MFNC certification
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="multiple" defaultValue={sections.map(s => s.id)}>
                {sections.map((section) => {
                  const sectionComplete = section.items.filter(i => i.status === "complete").length;
                  const sectionTotal = section.items.length;

                  return (
                    <AccordionItem
                      key={section.id}
                      value={section.id}
                      data-testid={`section-${section.id}`}
                    >
                      <AccordionTrigger data-testid={`trigger-${section.id}`}>
                        <div className="flex items-center gap-3 flex-1">
                          <span className="font-medium">{section.title}</span>
                          <Badge variant="secondary" data-testid={`badge-section-progress-${section.id}`}>
                            {sectionComplete}/{sectionTotal}
                          </Badge>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-4 pt-2">
                          {section.items.map((item) => (
                            <div
                              key={item.id}
                              className="border rounded-lg p-4 space-y-3"
                              data-testid={`item-${item.id}`}
                            >
                              {/* Item Header */}
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span
                                      className="font-medium text-sm"
                                      data-testid={`text-item-number-${item.id}`}
                                    >
                                      {item.itemNumber}
                                    </span>
                                    <Badge
                                      variant={item.required ? "default" : "outline"}
                                      data-testid={`badge-required-${item.id}`}
                                    >
                                      {item.required ? "Required" : "Optional"}
                                    </Badge>
                                  </div>
                                  <div
                                    className="mt-1 text-sm"
                                    data-testid={`text-description-${item.id}`}
                                  >
                                    {item.description}
                                  </div>
                                </div>
                              </div>

                              {/* Status Dropdown */}
                              <div className="space-y-1">
                                <label
                                  className="text-sm font-medium"
                                  data-testid={`label-status-${item.id}`}
                                >
                                  Status
                                </label>
                                <Select
                                  value={item.status}
                                  onValueChange={(value) =>
                                    handleUpdateItem(section.id, item.id, "status", value)
                                  }
                                  data-testid={`select-status-${item.id}`}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="not_started" data-testid="status-not-started">
                                      Not Started
                                    </SelectItem>
                                    <SelectItem value="in_progress" data-testid="status-in-progress">
                                      In Progress
                                    </SelectItem>
                                    <SelectItem value="complete" data-testid="status-complete">
                                      Complete
                                    </SelectItem>
                                    <SelectItem value="failed" data-testid="status-failed">
                                      Failed
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              {/* Notes Textarea */}
                              <div className="space-y-1">
                                <label
                                  className="text-sm font-medium"
                                  data-testid={`label-notes-${item.id}`}
                                >
                                  Notes
                                </label>
                                <Textarea
                                  value={item.notes}
                                  onChange={(e) =>
                                    handleUpdateItem(section.id, item.id, "notes", e.target.value)
                                  }
                                  placeholder="Add notes or observations..."
                                  rows={2}
                                  data-testid={`textarea-notes-${item.id}`}
                                />
                              </div>

                              {/* Photo Attachments */}
                              <div className="space-y-2">
                                <label
                                  className="text-sm font-medium"
                                  data-testid={`label-photos-${item.id}`}
                                >
                                  Photo Evidence
                                </label>
                                <div className="flex items-center gap-2 flex-wrap">
                                  {item.photos.map((photoUrl, index) => (
                                    <div
                                      key={index}
                                      className="w-20 h-20 rounded border overflow-hidden"
                                      data-testid={`thumbnail-${item.id}-${index}`}
                                    >
                                      <img
                                        src={photoUrl}
                                        alt={`Photo ${index + 1}`}
                                        className="w-full h-full object-cover"
                                      />
                                    </div>
                                  ))}
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
                                    onComplete={(result) =>
                                      handlePhotoUpload(section.id, item.id, result)
                                    }
                                    buttonClassName="w-20 h-20"
                                  >
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      className="w-20 h-20"
                                      onClick={() => {
                                        setUploadingItemId(item.id);
                                        setShowUploadModal(true);
                                      }}
                                      data-testid={`button-upload-photo-${item.id}`}
                                    >
                                      <div className="flex flex-col items-center gap-1">
                                        <Upload className="w-5 h-5" />
                                        <span className="text-xs">Add</span>
                                      </div>
                                    </Button>
                                  </ObjectUploader>
                                </div>
                                <div className="text-xs text-muted-foreground" data-testid={`text-photo-count-${item.id}`}>
                                  {item.photos.length} photo(s) attached
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </CardContent>
          </Card>

          {/* Validation Warning */}
          {!allRequiredComplete && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription data-testid="text-validation-warning">
                {requiredItems - completedRequired} required item(s) must be completed before
                submitting to MRO.
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end flex-wrap">
            <Button
              variant="outline"
              onClick={saveDraft}
              data-testid="button-save-draft"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Draft
            </Button>
            <Button
              onClick={handleSubmitToMRO}
              disabled={!allRequiredComplete || uploadArtifact.isPending}
              data-testid="button-submit-mro"
            >
              {uploadArtifact.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Submit to MRO
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
