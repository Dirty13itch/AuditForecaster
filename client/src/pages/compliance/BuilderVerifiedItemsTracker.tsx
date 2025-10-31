import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Trash2, Upload, Check, X, AlertCircle, Save, Send } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useUploadComplianceArtifact } from "@/lib/compliance";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import TopBar from "@/components/TopBar";
import BottomNav from "@/components/BottomNav";
import { ObjectUploader } from "@/components/ObjectUploader";
import type { Job } from "@shared/schema";

interface BuilderVerifiedItem {
  id: string;
  itemNumber: number;
  description: string;
  status: "pending" | "verified" | "failed";
  photoUrl?: string;
  photoUploaded: boolean;
}

export default function BuilderVerifiedItemsTracker() {
  const { jobId } = useParams<{ jobId: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [items, setItems] = useState<BuilderVerifiedItem[]>([]);
  const [uploadingItemId, setUploadingItemId] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);

  const uploadArtifact = useUploadComplianceArtifact();

  const { data: job, isLoading: loadingJob } = useQuery<Job>({
    queryKey: ["/api/jobs", jobId],
    enabled: !!jobId,
  });

  useEffect(() => {
    const savedItems = localStorage.getItem(`builder-verified-items-${jobId}`);
    if (savedItems) {
      setItems(JSON.parse(savedItems));
    } else {
      setItems([]);
    }
  }, [jobId]);

  const saveDraft = () => {
    localStorage.setItem(`builder-verified-items-${jobId}`, JSON.stringify(items));
    toast({
      title: "Draft saved",
      description: "Builder-verified items saved to local storage.",
    });
  };

  const handleAddItem = () => {
    const maxCount = job?.builderVerifiedItemsCount || 8;
    
    if (items.length >= maxCount) {
      toast({
        title: "Maximum items reached",
        description: `Cannot add more than ${maxCount} builder-verified items.`,
        variant: "destructive",
      });
      return;
    }

    const newItem: BuilderVerifiedItem = {
      id: crypto.randomUUID(),
      itemNumber: items.length + 1,
      description: "",
      status: "pending",
      photoUploaded: false,
    };

    setItems([...items, newItem]);
  };

  const handleDeleteItem = (id: string) => {
    const filtered = items.filter(item => item.id !== id);
    const renumbered = filtered.map((item, index) => ({
      ...item,
      itemNumber: index + 1,
    }));
    setItems(renumbered);
  };

  const handleUpdateItem = (id: string, field: keyof BuilderVerifiedItem, value: any) => {
    setItems(items.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const handlePhotoUpload = async (itemId: string, result: any) => {
    try {
      if (!result.successful || result.successful.length === 0) {
        throw new Error("No files uploaded");
      }

      const uploadedFile = result.successful[0];
      const photoUrl = uploadedFile.uploadURL || uploadedFile.url;

      await uploadArtifact.mutateAsync({
        jobId: jobId!,
        programType: job?.multifamilyProgram || "energy_star_mfnc",
        artifactType: "photo",
        documentPath: photoUrl,
        uploadedBy: "current-user-id",
      });

      handleUpdateItem(itemId, "photoUrl", photoUrl);
      handleUpdateItem(itemId, "photoUploaded", true);

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

  const handleSubmitForReview = async () => {
    const photoRequired = job?.builderVerifiedItemsPhotoRequired;
    
    if (photoRequired) {
      const missingPhotos = items.filter(item => !item.photoUploaded);
      if (missingPhotos.length > 0) {
        toast({
          title: "Missing photos",
          description: `${missingPhotos.length} item(s) still need photo evidence.`,
          variant: "destructive",
        });
        return;
      }
    }

    const incompleteItems = items.filter(item => !item.description.trim());
    if (incompleteItems.length > 0) {
      toast({
        title: "Incomplete items",
        description: `${incompleteItems.length} item(s) are missing descriptions.`,
        variant: "destructive",
      });
      return;
    }

    saveDraft();
    
    toast({
      title: "Submitted for review",
      description: "Builder-verified items submitted successfully.",
    });

    setTimeout(() => {
      setLocation(`/inspection/${jobId}`);
    }, 1500);
  };

  if (loadingJob) {
    return (
      <div className="flex flex-col h-screen">
        <TopBar title="Builder-Verified Items Tracker" />
        <main className="flex-1 overflow-auto p-4 pb-20">
          <div className="max-w-5xl mx-auto space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </main>
        <BottomNav activeTab="dashboard" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="flex flex-col h-screen">
        <TopBar title="Builder-Verified Items Tracker" />
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

  const maxCount = job.builderVerifiedItemsCount || 8;
  const photoRequired = job.builderVerifiedItemsPhotoRequired || false;

  return (
    <div className="flex flex-col h-screen">
      <TopBar title="Builder-Verified Items Tracker" />
      
      <main className="flex-1 overflow-auto p-4 pb-20">
        <div className="max-w-5xl mx-auto space-y-6">
          
          {/* Header Card */}
          <Card>
            <CardHeader>
              <CardTitle data-testid="text-job-id">Job: {job.name}</CardTitle>
              <CardDescription data-testid="text-job-address">
                {job.address}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Program Type</div>
                  <div className="font-medium" data-testid="text-program-type">
                    {job.multifamilyProgram ? job.multifamilyProgram.toUpperCase() : "Not set"}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Builder-Verified Items Limit</div>
                  <div className="font-medium" data-testid="text-items-count">
                    {items.length} / {maxCount}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Photo Evidence</div>
                  <div className="font-medium" data-testid="text-photo-required">
                    {photoRequired ? (
                      <Badge variant="default">Required</Badge>
                    ) : (
                      <Badge variant="secondary">Not Required</Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Items Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Builder-Verified Items</CardTitle>
                  <CardDescription>
                    Track and document builder-verified compliance items
                  </CardDescription>
                </div>
                <Button
                  onClick={handleAddItem}
                  disabled={items.length >= maxCount}
                  data-testid="button-add-item"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Item
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {items.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground" data-testid="text-no-items">
                  No builder-verified items added yet. Click "Add Item" to begin.
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">Item #</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="w-32">Status</TableHead>
                        {photoRequired && <TableHead className="w-40">Photo Evidence</TableHead>}
                        <TableHead className="w-24">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item) => (
                        <TableRow key={item.id} data-testid={`row-item-${item.itemNumber}`}>
                          <TableCell className="font-medium" data-testid={`text-item-number-${item.itemNumber}`}>
                            {item.itemNumber}
                          </TableCell>
                          <TableCell>
                            <Input
                              value={item.description}
                              onChange={(e) => handleUpdateItem(item.id, "description", e.target.value)}
                              placeholder="Enter item description"
                              data-testid={`input-description-${item.itemNumber}`}
                            />
                          </TableCell>
                          <TableCell>
                            <Select
                              value={item.status}
                              onValueChange={(value) => handleUpdateItem(item.id, "status", value)}
                              data-testid={`select-status-${item.itemNumber}`}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending" data-testid="status-pending">Pending</SelectItem>
                                <SelectItem value="verified" data-testid="status-verified">Verified</SelectItem>
                                <SelectItem value="failed" data-testid="status-failed">Failed</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          {photoRequired && (
                            <TableCell>
                              {item.photoUploaded ? (
                                <div className="flex items-center gap-2">
                                  <Check className="w-4 h-4 text-green-600" />
                                  <span className="text-sm" data-testid={`text-photo-uploaded-${item.itemNumber}`}>
                                    Uploaded
                                  </span>
                                  {item.photoUrl && (
                                    <a
                                      href={item.photoUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-sm text-primary underline"
                                      data-testid={`link-view-photo-${item.itemNumber}`}
                                    >
                                      View
                                    </a>
                                  )}
                                </div>
                              ) : (
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
                                  onComplete={(result) => handlePhotoUpload(item.id, result)}
                                  buttonClassName="w-full"
                                >
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full"
                                    onClick={() => {
                                      setUploadingItemId(item.id);
                                      setShowUploadModal(true);
                                    }}
                                    data-testid={`button-upload-photo-${item.itemNumber}`}
                                  >
                                    <Upload className="w-4 h-4 mr-2" />
                                    Upload
                                  </Button>
                                </ObjectUploader>
                              )}
                            </TableCell>
                          )}
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteItem(item.id)}
                              data-testid={`button-delete-item-${item.itemNumber}`}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={saveDraft}
              data-testid="button-save-draft"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Draft
            </Button>
            <Button
              onClick={handleSubmitForReview}
              disabled={items.length === 0 || uploadArtifact.isPending}
              data-testid="button-submit-review"
            >
              {uploadArtifact.isPending ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Submit for Review
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
