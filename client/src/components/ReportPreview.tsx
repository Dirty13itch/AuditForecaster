import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PDFViewer } from '@react-pdf/renderer';
import { FileText, Download, Send } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Job, ReportTemplate, ConstructionManager, Development } from "@shared/schema";
import { SimpleReportPDF } from "./SimpleReportPDF";

interface ReportPreviewProps {
  jobId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ReportPreviewData {
  job: Job;
  template: ReportTemplate | null;
  populatedData: {
    address: string;
    builderName: string;
    developmentName: string;
    planName: string;
    lotNumber: string;
    floorArea: number;
    volume: number;
    surfaceArea: number;
    stories: number;
    inspectorName: string;
    scheduledDate: string;
    completedDate: string;
    inspectionType: string;
    status: string;
    blowerDoorResults: any | null;
    ductLeakageResults: any | null;
  };
  availableTemplates: ReportTemplate[];
}

interface CMData {
  constructionManagers: (ConstructionManager & { isPrimary?: boolean })[];
  development: Development | null;
  recommendedCM: ConstructionManager | null;
}

export function ReportPreview({ jobId, open, onOpenChange }: ReportPreviewProps) {
  const { toast } = useToast();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [selectedCMs, setSelectedCMs] = useState<string[]>([]);

  // Fetch report preview data
  const { data, isLoading } = useQuery<ReportPreviewData>({
    queryKey: [`/api/jobs/${jobId}/report-preview`, { templateId: selectedTemplateId }],
    enabled: open && !!jobId,
  });

  // Fetch construction managers
  const { data: cmData } = useQuery<CMData>({
    queryKey: [`/api/jobs/${jobId}/construction-managers`],
    enabled: open && !!jobId,
  });

  // Auto-select primary CM when data loads
  useEffect(() => {
    if (cmData?.recommendedCM && selectedCMs.length === 0) {
      setSelectedCMs([cmData.recommendedCM.id]);
    }
  }, [cmData?.recommendedCM]);

  // Reset selections when dialog closes
  useEffect(() => {
    if (!open) {
      setSelectedTemplateId(null);
      setSelectedCMs([]);
    }
  }, [open]);

  // Send report mutation
  const sendReportMutation = useMutation({
    mutationFn: async (payload: { templateId: string | null; constructionManagerIds: string[]; sendNow: boolean }) => {
      const response = await apiRequest('POST', `/api/jobs/${jobId}/schedule-report`, payload);
      return response.json();
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: [`/api/jobs/${jobId}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/jobs'] });
      toast({
        title: 'Report sent successfully',
        description: result.message || `Report sent to ${selectedCMs.length} construction manager(s)`,
      });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to send report',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    },
  });

  const handleSendNow = () => {
    if (selectedCMs.length === 0) {
      toast({
        title: 'No recipients selected',
        description: 'Please select at least one construction manager',
        variant: 'destructive',
      });
      return;
    }
    
    sendReportMutation.mutate({
      templateId: selectedTemplateId || data?.template?.id || null,
      constructionManagerIds: selectedCMs,
      sendNow: true,
    });
  };

  const handleDownload = () => {
    toast({
      title: 'Download feature',
      description: 'PDF download functionality coming soon',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden" data-testid="dialog-report-preview">
        <DialogHeader>
          <DialogTitle>Report Preview & Send</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(90vh-120px)]">
          {/* Left Panel - Controls */}
          <div className="space-y-4 overflow-y-auto pr-2">
            {/* Template Selection */}
            <div>
              <Label>Report Template</Label>
              <Select 
                value={selectedTemplateId || data?.template?.id || ''} 
                onValueChange={setSelectedTemplateId}
                disabled={isLoading}
              >
                <SelectTrigger data-testid="select-template" className="mt-1">
                  <SelectValue placeholder="Select template" />
                </SelectTrigger>
                <SelectContent>
                  {data?.availableTemplates?.map(template => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Construction Manager Selection */}
            <div>
              <Label>Send To (Construction Managers)</Label>
              {cmData?.constructionManagers && cmData.constructionManagers.length > 0 ? (
                <div className="space-y-2 mt-2">
                  {cmData.constructionManagers.map(cm => (
                    <div key={cm.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`cm-${cm.id}`}
                        checked={selectedCMs.includes(cm.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedCMs([...selectedCMs, cm.id]);
                          } else {
                            setSelectedCMs(selectedCMs.filter(id => id !== cm.id));
                          }
                        }}
                        data-testid={`checkbox-cm-${cm.id}`}
                      />
                      <label 
                        htmlFor={`cm-${cm.id}`} 
                        className="text-sm cursor-pointer flex items-center gap-2"
                      >
                        <span>{cm.name}</span>
                        {cm.isPrimary && (
                          <Badge variant="default" className="text-xs">
                            Primary
                          </Badge>
                        )}
                      </label>
                    </div>
                  ))}
                </div>
              ) : (
                <Alert className="mt-2">
                  <AlertDescription>
                    No construction managers found for this development. 
                    Please assign construction managers to the development first.
                  </AlertDescription>
                </Alert>
              )}

              {/* Recommended CM tip */}
              {cmData?.recommendedCM && !selectedCMs.includes(cmData.recommendedCM.id) && (
                <Alert className="mt-2">
                  <AlertDescription>
                    Tip: {cmData.recommendedCM.name} is the primary CM for this development
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {/* Send Options */}
            <div className="flex gap-2 pt-4">
              <Button
                onClick={handleSendNow}
                disabled={selectedCMs.length === 0 || sendReportMutation.isPending}
                data-testid="button-send-now"
                className="flex-1"
              >
                <Send className="w-4 h-4 mr-2" />
                Send Now
              </Button>
              <Button
                variant="outline"
                onClick={handleDownload}
                data-testid="button-download-pdf"
                disabled={isLoading}
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            </div>
          </div>

          {/* Right Panel - PDF Preview */}
          <div 
            className="lg:col-span-2 border rounded-lg p-4 bg-gray-50 dark:bg-gray-900 overflow-hidden" 
            data-testid="container-pdf-preview"
          >
            {isLoading ? (
              <Skeleton className="h-full w-full" />
            ) : data?.template && data?.populatedData ? (
              <PDFViewer width="100%" height="100%" className="border-0">
                <SimpleReportPDF
                  template={data.template}
                  data={data.populatedData}
                  job={data.job}
                />
              </PDFViewer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <div className="text-center">
                  <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No template available for preview</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
