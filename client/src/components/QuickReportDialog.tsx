import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, CheckCircle2, Loader2, FileSignature } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ReportTemplate, Job } from "@shared/schema";

interface QuickReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job: Job;
}

export function QuickReportDialog({ open, onOpenChange, job }: QuickReportDialogProps) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  const { data: templates = [], isLoading } = useQuery<ReportTemplate[]>({
    queryKey: ["/api/report-templates"],
    enabled: open,
  });

  const publishedTemplates = templates.filter(t => t.status === "published");

  const createReportMutation = useMutation({
    mutationFn: async (templateId: string) => {
      const template = templates.find(t => t.id === templateId);
      if (!template) {
        throw new Error("Template not found");
      }

      const response = await apiRequest("/api/report-instances", "POST", {
        jobId: job.id,
        templateId: templateId,
        templateVersion: template.version || 1,
        status: "draft",
      });

      if (!response.ok) {
        throw new Error("Failed to create report");
      }

      return await response.json();
    },
    onSuccess: (reportInstance) => {
      queryClient.invalidateQueries({ queryKey: ["/api/report-instances"] });
      toast({ 
        title: "Report created successfully", 
        description: "Redirecting to report fillout page..." 
      });
      onOpenChange(false);
      setLocation(`/reports/fillout/${reportInstance.id}`);
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to create report", 
        description: error?.message || "Please try again",
        variant: "destructive" 
      });
    },
  });

  const handleTemplateSelect = (templateId: string) => {
    createReportMutation.mutate(templateId);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2" data-testid="text-dialog-title">
            <FileSignature className="h-5 w-5" />
            Generate Report for Job
          </DialogTitle>
          <DialogDescription>
            <div className="space-y-1 text-sm">
              <div><span className="font-semibold">{job.name}</span></div>
              <div className="text-muted-foreground">{job.address}</div>
              <div className="text-muted-foreground">{job.inspectionType}</div>
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-sm font-medium">Select a template to begin:</div>
          
          <ScrollArea className="max-h-[50vh]">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : publishedTemplates.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <FileText className="h-12 w-12 text-muted-foreground mb-3" />
                  <p className="text-muted-foreground text-center">
                    No published templates available. Create a template first.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3">
                {publishedTemplates.map((template) => {
                  const sections = typeof template.sections === 'string' 
                    ? (() => {
                        try {
                          return JSON.parse(template.sections);
                        } catch (e) {
                          return [];
                        }
                      })()
                    : template.sections || [];
                  
                  return (
                    <Card 
                      key={template.id}
                      className={`hover-elevate active-elevate-2 border-2 transition-colors ${
                        createReportMutation.isPending ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                      }`}
                      onClick={() => !createReportMutation.isPending && handleTemplateSelect(template.id)}
                      data-testid={`card-template-${template.id}`}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="text-base">
                            {template.name}
                          </CardTitle>
                          {template.isDefault && (
                            <Badge variant="default" data-testid={`badge-default-${template.id}`}>
                              Default
                            </Badge>
                          )}
                        </div>
                        {template.description && (
                          <CardDescription className="text-sm line-clamp-2">
                            {template.description}
                          </CardDescription>
                        )}
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <FileText className="h-3 w-3" />
                          <span>{Array.isArray(sections) ? sections.length : 0} sections</span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>

        {createReportMutation.isPending && (
          <div className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Creating report...
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={createReportMutation.isPending}
            data-testid="button-cancel"
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
