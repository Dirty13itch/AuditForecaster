import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useConfirmDialog } from "@/components/ConfirmDialog";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Plus, Search, Eye, Edit, Trash2, Mail, Download, Printer, Calendar, Play, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import type { ReportTemplate, ReportInstance, Job, Builder, ScoreSummary } from "@shared/schema";
import { DynamicForm } from "@/components/DynamicForm";
import type { FormSection } from "@shared/types";
import { getComplianceBadgeVariant, getComplianceBadgeClassName, getComplianceBadgeText } from "@/lib/compliance";
import { safeToFixed } from "@shared/numberUtils";

// Phase 3 - OPTIMIZE: Module-level constants prevent recreation on every render
// Phase 6 - DOCUMENT: Report template section types supported by the system
const SECTION_TYPES = {
  TEXT: "Text",
  PHOTOS: "Photos",
  CHECKLIST: "Checklist",
  FORECAST: "Forecast",
  SIGNATURE: "Signature",
} as const;

// Phase 6 - DOCUMENT: Report status workflow states
// Draft -> Finalized (has PDF) -> Sent (emailed to recipient)
const REPORT_STATUS = {
  DRAFT: "Draft",
  FINALIZED: "Finalized",
  SENT: "Sent",
} as const;

// Phase 6 - DOCUMENT: Compliance filter options for report instances
const COMPLIANCE_FILTERS = {
  ALL: "all",
  COMPLIANT: "compliant",
  NON_COMPLIANT: "non-compliant",
  PENDING: "pending",
  UNKNOWN: "unknown",
} as const;

// Phase 6 - DOCUMENT: Status badge variant mapping for visual consistency
const STATUS_BADGE_VARIANTS = {
  [REPORT_STATUS.SENT]: "default",
  [REPORT_STATUS.FINALIZED]: "secondary",
  [REPORT_STATUS.DRAFT]: "outline",
} as const;

// Phase 6 - DOCUMENT: Score badge thresholds for QA grading
// >= 90% = passing (default), >= 70% = acceptable (secondary), < 70% = needs improvement (destructive)
const SCORE_THRESHOLDS = {
  EXCELLENT: 90,
  ACCEPTABLE: 70,
} as const;

// Phase 6 - DOCUMENT: Skeleton loader counts for consistent loading UX
const SKELETON_COUNTS = {
  templateCards: 6,
  reportCards: 4,
} as const;

interface ReportSection {
  id: string;
  title: string;
  type: "Text" | "Photos" | "Checklist" | "Forecast" | "Signature";
  order: number;
}

const templateFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  isDefault: z.boolean().default(false),
  sections: z.array(z.object({
    id: z.string(),
    title: z.string().min(1, "Section title is required"),
    type: z.enum(["Text", "Photos", "Checklist", "Forecast", "Signature"]),
    order: z.number(),
  })),
});

type TemplateFormValues = z.infer<typeof templateFormSchema>;

const reportGenerationSchema = z.object({
  jobId: z.string().min(1, "Job is required"),
  templateId: z.string().min(1, "Template is required"),
  overview: z.string().optional(),
  finalNotes: z.string().optional(),
  inspector: z.string().optional(),
});

type ReportGenerationValues = z.infer<typeof reportGenerationSchema>;

const emailFormSchema = z.object({
  to: z.string().email("Valid email is required"),
  subject: z.string().min(1, "Subject is required"),
  message: z.string().optional(),
  attachPdf: z.boolean().default(true),
});

type EmailFormValues = z.infer<typeof emailFormSchema>;

// Phase 2 - BUILD: Main component wrapped in ErrorBoundary at export
function ReportsContent() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [complianceFilter, setComplianceFilter] = useState(COMPLIANCE_FILTERS.ALL);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [generationDialogOpen, setGenerationDialogOpen] = useState(false);
  const [viewerDialogOpen, setViewerDialogOpen] = useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [conditionalFormDialogOpen, setConditionalFormDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);
  const [selectedReport, setSelectedReport] = useState<ReportInstance | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<ReportTemplate | null>(null);
  const [conditionalFormData, setConditionalFormData] = useState<Record<string, any>>({});
  const { showConfirm, ConfirmDialog } = useConfirmDialog();

  // Phase 5 - HARDEN: All queries have retry: 2 for resilience
  const { 
    data: templates = [], 
    isLoading: templatesLoading,
    error: templatesError,
    refetch: refetchTemplates,
  } = useQuery<ReportTemplate[]>({
    queryKey: ["/api/report-templates"],
    retry: 2,
  });

  const { 
    data: jobs = [],
    isLoading: jobsLoading,
    error: jobsError,
    refetch: refetchJobs,
  } = useQuery<Job[]>({
    queryKey: ["/api/jobs"],
    retry: 2,
  });

  const { 
    data: builders = [],
    isLoading: buildersLoading,
    error: buildersError,
    refetch: refetchBuilders,
  } = useQuery<Builder[]>({
    queryKey: ["/api/builders"],
    retry: 2,
  });

  const { 
    data: allReportInstances = [],
    isLoading: instancesLoading,
    error: instancesError,
    refetch: refetchInstances,
  } = useQuery<ReportInstance[]>({
    queryKey: ["/api/report-instances"],
    queryFn: async () => {
      const jobIds = jobs.map(j => j.id);
      const allInstances: ReportInstance[] = [];
      for (const jobId of jobIds) {
        const response = await fetch(`/api/report-instances?jobId=${jobId}`);
        if (response.ok) {
          const instances = await response.json();
          allInstances.push(...instances);
        }
      }
      return allInstances;
    },
    enabled: jobs.length > 0,
    retry: 2,
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/report-templates/${id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/report-templates"] });
      toast({ title: "Template deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete template", variant: "destructive" });
    },
  });

  // Phase 3 - OPTIMIZE: Memoize filtered templates list
  const filteredTemplates = useMemo(() => 
    templates.filter(template =>
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (template.description?.toLowerCase().includes(searchQuery.toLowerCase()))
    ),
    [templates, searchQuery]
  );

  // Phase 3 - OPTIMIZE: Memoize filtered report instances with compliance filter
  const filteredReportInstances = useMemo(() => 
    allReportInstances.filter(report => {
      if (complianceFilter === COMPLIANCE_FILTERS.ALL) return true;
      const reportCompliance = report.complianceStatus || COMPLIANCE_FILTERS.UNKNOWN;
      return reportCompliance === complianceFilter;
    }),
    [allReportInstances, complianceFilter]
  );

  // Phase 6 - DOCUMENT: Helper to detect if template uses conditional logic
  // Conditional templates have FormSection[] structure with fields array
  const isConditionalTemplate = useCallback((template: ReportTemplate): boolean => {
    try {
      const sections = JSON.parse(template.sections);
      if (Array.isArray(sections) && sections.length > 0) {
        const firstSection = sections[0];
        return firstSection.fields !== undefined && Array.isArray(firstSection.fields);
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  // Phase 6 - DOCUMENT: Report status determination logic
  // Sent: has emailedTo field (final state)
  // Finalized: has PDF URL but not sent yet
  // Draft: no PDF generated yet (initial state)
  const getReportStatus = useCallback((report: ReportInstance): string => {
    if (report.emailedTo) return REPORT_STATUS.SENT;
    if (report.pdfUrl) return REPORT_STATUS.FINALIZED;
    return REPORT_STATUS.DRAFT;
  }, []);

  // Phase 3 - OPTIMIZE: useCallback for status badge variant
  const getReportStatusBadgeVariant = useCallback((status: string) => {
    return STATUS_BADGE_VARIANTS[status as keyof typeof STATUS_BADGE_VARIANTS] || "outline";
  }, []);

  // Phase 3 - OPTIMIZE: useCallback for score badge variant based on pass rate
  const getScoreBadgeVariant = useCallback((passRate: number) => {
    if (passRate >= SCORE_THRESHOLDS.EXCELLENT) return "default";
    if (passRate >= SCORE_THRESHOLDS.ACCEPTABLE) return "secondary";
    return "destructive";
  }, []);

  // Phase 3 - OPTIMIZE: useCallback for all event handlers
  const handleEditTemplate = useCallback((template: ReportTemplate) => {
    setEditingTemplate(template);
    setTemplateDialogOpen(true);
  }, []);

  const handleDeleteTemplate = useCallback(async (id: string) => {
    const confirmed = await showConfirm(
      "Delete Template",
      "Are you sure you want to delete this template? This action cannot be undone.",
      {
        confirmText: "Delete",
        cancelText: "Cancel",
        variant: "destructive"
      }
    );
    if (confirmed) {
      deleteTemplateMutation.mutate(id);
    }
  }, [showConfirm, deleteTemplateMutation]);

  const handleViewReport = useCallback((report: ReportInstance) => {
    setSelectedReport(report);
    setViewerDialogOpen(true);
  }, []);

  const handleEmailReport = useCallback((report: ReportInstance) => {
    setSelectedReport(report);
    setEmailDialogOpen(true);
  }, []);

  const handleTestConditionalForm = useCallback((template: ReportTemplate) => {
    setSelectedTemplate(template);
    setConditionalFormData({});
    setConditionalFormDialogOpen(true);
  }, []);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }, []);

  const handleComplianceFilterChange = useCallback((value: string) => {
    setComplianceFilter(value);
  }, []);

  const handleCreateTemplate = useCallback(() => {
    setEditingTemplate(null);
    setTemplateDialogOpen(true);
  }, []);

  const handleOpenGeneration = useCallback(() => {
    setGenerationDialogOpen(true);
  }, []);

  const handlePreviewTemplate = useCallback((template: ReportTemplate) => {
    setSelectedTemplate(template);
    setViewerDialogOpen(true);
  }, []);

  // Phase 3 - OPTIMIZE: useCallback for retry handlers
  const handleRetryTemplates = useCallback(() => {
    refetchTemplates();
  }, [refetchTemplates]);

  const handleRetryJobs = useCallback(() => {
    refetchJobs();
  }, [refetchJobs]);

  const handleRetryBuilders = useCallback(() => {
    refetchBuilders();
  }, [refetchBuilders]);

  const handleRetryInstances = useCallback(() => {
    refetchInstances();
  }, [refetchInstances]);

  // Phase 2 - BUILD: Per-query error states with retry buttons
  if (templatesError) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <FileText className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Reports</h1>
        </div>
        <Card className="border-destructive/20 bg-destructive/5" data-testid="error-templates-query">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
            <h3 className="text-lg font-semibold text-destructive mb-2">Failed to Load Templates</h3>
            <p className="text-sm text-muted-foreground mb-4 text-center max-w-md">
              {templatesError instanceof Error ? templatesError.message : "Unable to fetch report templates. Please check your connection and try again."}
            </p>
            <Button 
              onClick={handleRetryTemplates}
              variant="outline"
              data-testid="button-retry-templates"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (jobsError) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <FileText className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Reports</h1>
        </div>
        <Alert variant="destructive" data-testid="error-jobs-query">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Failed to Load Jobs</AlertTitle>
          <AlertDescription className="flex items-center justify-between gap-4">
            <span>{jobsError instanceof Error ? jobsError.message : "Unable to fetch jobs data"}</span>
            <Button 
              onClick={handleRetryJobs}
              variant="outline"
              size="sm"
              data-testid="button-retry-jobs"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <FileText className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Reports</h1>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={handleOpenGeneration}
            data-testid="button-generate-report"
          >
            <Plus className="h-4 w-4 mr-2" />
            Generate Report
          </Button>
        </div>
      </div>

      {buildersError && (
        <Alert variant="destructive" data-testid="error-builders-query">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Builders Data Unavailable</AlertTitle>
          <AlertDescription className="flex items-center justify-between gap-4">
            <span>Unable to load builder information. Some features may be limited.</span>
            <Button 
              onClick={handleRetryBuilders}
              variant="outline"
              size="sm"
              data-testid="button-retry-builders"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="templates" className="space-y-6">
        <TabsList data-testid="tabs-reports">
          <TabsTrigger value="templates" data-testid="tab-templates">Templates</TabsTrigger>
          <TabsTrigger value="instances" data-testid="tab-instances">Generated Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search templates..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="pl-10"
                data-testid="input-search-templates"
              />
            </div>
            <Button
              onClick={handleCreateTemplate}
              data-testid="button-create-template"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create New Template
            </Button>
          </div>

          {/* Phase 2 - BUILD: Comprehensive skeleton loaders for templates */}
          {templatesLoading ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3" data-testid="skeleton-templates">
              {Array.from({ length: SKELETON_COUNTS.templateCards }).map((_, i) => (
                <Card key={i}>
                  <CardHeader className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <Skeleton className="h-6 w-3/4" />
                      <Skeleton className="h-5 w-16" />
                    </div>
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-40" />
                  </CardContent>
                  <CardFooter className="flex gap-2">
                    <Skeleton className="h-9 flex-1" />
                    <Skeleton className="h-9 flex-1" />
                    <Skeleton className="h-9 w-9" />
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : filteredTemplates.length === 0 ? (
            <Card data-testid="empty-templates">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-center" data-testid="text-empty-templates">
                  {searchQuery ? "No templates found matching your search." : "No templates yet. Create your first template to get started."}
                </p>
                {!searchQuery && (
                  <Button onClick={handleCreateTemplate} className="mt-4" data-testid="button-create-first-template">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Template
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3" data-testid="grid-templates">
              {filteredTemplates.map((template) => {
                const sections = JSON.parse(template.sections) as ReportSection[];
                const isConditional = isConditionalTemplate(template);
                return (
                  <Card key={template.id} className="hover-elevate" data-testid={`card-template-${template.id}`}>
                    <CardHeader className="space-y-0 pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-lg" data-testid={`text-template-name-${template.id}`}>
                          {template.name}
                        </CardTitle>
                        {template.isDefault && (
                          <Badge variant="default" data-testid={`badge-default-${template.id}`}>Default</Badge>
                        )}
                      </div>
                      <CardDescription className="line-clamp-2 mt-2" data-testid={`text-template-description-${template.id}`}>
                        {template.description || "No description provided"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground" data-testid={`text-section-count-${template.id}`}>
                        <FileText className="h-4 w-4" />
                        <span>{sections.length} sections</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground" data-testid={`text-created-date-${template.id}`}>
                        <Calendar className="h-4 w-4" />
                        <span>Created {format(new Date(template.createdAt!), "MMM d, yyyy")}</span>
                      </div>
                      {isConditional && (
                        <Badge variant="secondary" data-testid={`badge-conditional-${template.id}`}>
                          Conditional Logic
                        </Badge>
                      )}
                    </CardContent>
                    <CardFooter className="flex flex-wrap gap-2 pt-4">
                      {isConditional && (
                        <Button
                          variant="default"
                          size="sm"
                          className="flex-1"
                          onClick={() => handleTestConditionalForm(template)}
                          data-testid={`button-test-form-${template.id}`}
                        >
                          <Play className="h-4 w-4 mr-2" />
                          Test Form
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => handlePreviewTemplate(template)}
                        data-testid={`button-preview-${template.id}`}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Preview
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleEditTemplate(template)}
                        data-testid={`button-edit-${template.id}`}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteTemplate(template.id)}
                        disabled={deleteTemplateMutation.isPending}
                        data-testid={`button-delete-${template.id}`}
                      >
                        {deleteTemplateMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="instances" className="space-y-6">
          {instancesError && (
            <Alert variant="destructive" data-testid="error-instances-query">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Failed to Load Report Instances</AlertTitle>
              <AlertDescription className="flex items-center justify-between gap-4">
                <span>{instancesError instanceof Error ? instancesError.message : "Unable to fetch generated reports"}</span>
                <Button 
                  onClick={handleRetryInstances}
                  variant="outline"
                  size="sm"
                  data-testid="button-retry-instances"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Phase 2 - BUILD: Skeleton loaders for report instances */}
          {instancesLoading ? (
            <div className="grid gap-6 md:grid-cols-2" data-testid="skeleton-instances">
              {Array.from({ length: SKELETON_COUNTS.reportCards }).map((_, i) => (
                <Card key={i}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-6 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                      </div>
                      <div className="space-y-2">
                        <Skeleton className="h-5 w-16" />
                        <Skeleton className="h-5 w-16" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-4 w-1/2" />
                  </CardContent>
                  <CardFooter className="flex gap-2">
                    <Skeleton className="h-9 flex-1" />
                    <Skeleton className="h-9 w-9" />
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : allReportInstances.length === 0 ? (
            <Card data-testid="empty-reports">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-center mb-4" data-testid="text-empty-reports">
                  No reports generated yet. Generate your first report from a job inspection.
                </p>
                <Button onClick={handleOpenGeneration} data-testid="button-generate-first-report">
                  <Plus className="h-4 w-4 mr-2" />
                  Generate Report
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="flex items-center gap-4">
                <Select value={complianceFilter} onValueChange={handleComplianceFilterChange}>
                  <SelectTrigger className="w-64" data-testid="filter-report-compliance">
                    <SelectValue placeholder="Filter by compliance" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={COMPLIANCE_FILTERS.ALL}>All</SelectItem>
                    <SelectItem value={COMPLIANCE_FILTERS.COMPLIANT}>Compliant</SelectItem>
                    <SelectItem value={COMPLIANCE_FILTERS.NON_COMPLIANT}>Non-Compliant</SelectItem>
                    <SelectItem value={COMPLIANCE_FILTERS.PENDING}>Pending</SelectItem>
                    <SelectItem value={COMPLIANCE_FILTERS.UNKNOWN}>Unknown</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground" data-testid="text-report-count">
                  Showing {filteredReportInstances.length} of {allReportInstances.length} reports
                </p>
              </div>

              {filteredReportInstances.length === 0 ? (
                <Card data-testid="empty-filtered-reports">
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground text-center">
                      No reports match the selected compliance filter.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-6 md:grid-cols-2" data-testid="grid-reports">
                  {filteredReportInstances.map((report) => {
                    const job = jobs.find(j => j.id === report.jobId);
                    const template = templates.find(t => t.id === report.templateId);
                    const status = getReportStatus(report);
                    const score = (report as any).scoreSummary as ScoreSummary | null;

                    return (
                      <Card key={report.id} className="hover-elevate" data-testid={`card-report-${report.id}`}>
                        <CardHeader>
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-1 flex-1">
                              <CardTitle className="text-lg" data-testid={`text-report-job-${report.id}`}>
                                {job?.name || "Unknown Job"}
                              </CardTitle>
                              <CardDescription data-testid={`text-report-address-${report.id}`}>
                                {job?.address}
                              </CardDescription>
                            </div>
                            <div className="flex flex-col gap-1">
                              <Badge variant={getReportStatusBadgeVariant(status)} data-testid={`badge-status-${report.id}`}>
                                {status}
                              </Badge>
                              {score && (
                                <Badge 
                                  variant={getScoreBadgeVariant(score.passRate)} 
                                  data-testid={`badge-score-${report.id}`}
                                >
                                  {score.grade} ({safeToFixed(score.passRate, 0)}%)
                                </Badge>
                              )}
                              <Badge 
                                variant={getComplianceBadgeVariant(report.complianceStatus)}
                                className={getComplianceBadgeClassName(report.complianceStatus)}
                                data-testid={`badge-compliance-${report.id}`}
                              >
                                {getComplianceBadgeText(report.complianceStatus)}
                              </Badge>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="flex items-center gap-2 text-sm" data-testid={`text-report-template-${report.id}`}>
                            <span className="text-muted-foreground">Template:</span>
                            <span className="font-medium">{template?.name || "Unknown"}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm" data-testid={`text-report-date-${report.id}`}>
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">Generated {format(new Date(report.createdAt!), "MMM d, yyyy")}</span>
                          </div>
                          {report.emailedTo && (
                            <div className="flex items-center gap-2 text-sm" data-testid={`text-report-email-${report.id}`}>
                              <Mail className="h-4 w-4 text-muted-foreground" />
                              <span className="text-muted-foreground">Sent to {report.emailedTo}</span>
                            </div>
                          )}
                        </CardContent>
                        <CardFooter className="flex gap-2 pt-4">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => setLocation(`/reports/${report.id}`)}
                            data-testid={`button-view-${report.id}`}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEmailReport(report)}
                            data-testid={`button-email-${report.id}`}
                          >
                            <Mail className="h-4 w-4" />
                          </Button>
                        </CardFooter>
                      </Card>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>

      <TemplateBuilderDialog
        open={templateDialogOpen}
        onOpenChange={setTemplateDialogOpen}
        editingTemplate={editingTemplate}
      />

      <ReportGenerationDialog
        open={generationDialogOpen}
        onOpenChange={setGenerationDialogOpen}
        jobs={jobs}
        templates={templates}
        builders={builders}
      />

      {selectedTemplate && (
        <TemplatePreviewDialog
          open={viewerDialogOpen && !!selectedTemplate}
          onOpenChange={setViewerDialogOpen}
          template={selectedTemplate}
        />
      )}

      {selectedReport && (
        <ReportViewerDialog
          open={viewerDialogOpen && !!selectedReport}
          onOpenChange={setViewerDialogOpen}
          report={selectedReport}
          job={jobs.find(j => j.id === selectedReport.jobId)}
          template={templates.find(t => t.id === selectedReport.templateId)}
          onEmail={() => {
            setViewerDialogOpen(false);
            setEmailDialogOpen(true);
          }}
        />
      )}

      {selectedReport && (
        <EmailDialog
          open={emailDialogOpen}
          onOpenChange={setEmailDialogOpen}
          report={selectedReport}
          job={jobs.find(j => j.id === selectedReport.jobId)}
          builders={builders}
        />
      )}

      {selectedTemplate && isConditionalTemplate(selectedTemplate) && (
        <Dialog open={conditionalFormDialogOpen} onOpenChange={setConditionalFormDialogOpen}>
          <DialogContent className="max-w-5xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle data-testid="text-conditional-form-title">
                Test Conditional Form: {selectedTemplate.name}
              </DialogTitle>
              <DialogDescription>
                Fill out the form below to test the conditional logic. Fields will appear and disappear based on your answers.
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[70vh] pr-4">
              <DynamicForm
                sections={JSON.parse(selectedTemplate.sections) as FormSection[]}
                initialData={conditionalFormData}
                onChange={(data) => {
                  setConditionalFormData(data);
                }}
                onSubmit={(data) => {
                  toast({
                    title: "Form Submitted",
                    description: "Form data captured successfully",
                  });
                }}
              />
            </ScrollArea>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setConditionalFormData({});
                  toast({ title: "Form Reset" });
                }}
                data-testid="button-reset-form"
              >
                Reset Form
              </Button>
              <Button
                onClick={() => setConditionalFormDialogOpen(false)}
                data-testid="button-close-form"
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <ConfirmDialog />
    </div>
  );
}

// Phase 2 - BUILD: Dialogs split out as separate components for maintainability

function TemplateBuilderDialog({
  open,
  onOpenChange,
  editingTemplate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingTemplate: ReportTemplate | null;
}) {
  const { toast } = useToast();

  const form = useForm<TemplateFormValues>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: {
      name: editingTemplate?.name || "",
      description: editingTemplate?.description || "",
      isDefault: editingTemplate?.isDefault || false,
      sections: editingTemplate ? JSON.parse(editingTemplate.sections) : [],
    },
  });

  const createTemplateMutation = useMutation({
    mutationFn: async (data: TemplateFormValues) => {
      const response = await apiRequest("/api/report-templates", "POST", {
        ...data,
        sections: JSON.stringify(data.sections),
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/report-templates"] });
      toast({ title: "Template created successfully" });
      onOpenChange(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to create template",
        description: error?.message || "Please try again", 
        variant: "destructive" 
      });
    },
  });

  const updateTemplateMutation = useMutation({
    mutationFn: async (data: TemplateFormValues & { id: string }) => {
      const { id, ...payload } = data;
      const response = await apiRequest(`/api/report-templates/${id}`, "PUT", {
        ...payload,
        sections: JSON.stringify(payload.sections),
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/report-templates"] });
      toast({ title: "Template updated successfully" });
      onOpenChange(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to update template",
        description: error?.message || "Please try again", 
        variant: "destructive" 
      });
    },
  });

  const onSubmit = (data: TemplateFormValues) => {
    if (editingTemplate) {
      updateTemplateMutation.mutate({ ...data, id: editingTemplate.id });
    } else {
      createTemplateMutation.mutate(data);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle data-testid="text-template-dialog-title">
            {editingTemplate ? "Edit Template" : "Create New Template"}
          </DialogTitle>
          <DialogDescription>
            {editingTemplate ? "Update the template details below." : "Create a new report template for future inspections."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Template Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Standard Energy Audit Report" {...field} data-testid="input-template-name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Brief description of this template..."
                      {...field}
                      data-testid="input-template-description"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isDefault"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-md border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Default Template</FormLabel>
                    <FormDescription>
                      Set this as the default template for new reports
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="switch-is-default"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel-template">
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createTemplateMutation.isPending || updateTemplateMutation.isPending}
                data-testid="button-submit-template"
              >
                {(createTemplateMutation.isPending || updateTemplateMutation.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {editingTemplate ? "Update Template" : "Create Template"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function TemplatePreviewDialog({
  open,
  onOpenChange,
  template,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: ReportTemplate;
}) {
  const sections = JSON.parse(template.sections) as ReportSection[];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle data-testid="text-preview-title">{template.name}</DialogTitle>
          <DialogDescription>
            {template.description || "Template preview"}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-4">
            {sections.map((section, index) => (
              <Card key={section.id} data-testid={`preview-section-${index}`}>
                <CardHeader>
                  <CardTitle className="text-base">
                    {index + 1}. {section.title}
                  </CardTitle>
                  <CardDescription>Type: {section.type}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} data-testid="button-close-preview">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ReportGenerationDialog({
  open,
  onOpenChange,
  jobs,
  templates,
  builders,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobs: Job[];
  templates: ReportTemplate[];
  builders: Builder[];
}) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const form = useForm<ReportGenerationValues>({
    resolver: zodResolver(reportGenerationSchema),
    defaultValues: {
      jobId: "",
      templateId: "",
      overview: "",
      finalNotes: "",
      inspector: "",
    },
  });

  const selectedJobId = form.watch("jobId");
  const selectedJob = jobs.find(j => j.id === selectedJobId);

  // Phase 6 - DOCUMENT: Report generation workflow
  // Creates a draft report instance linked to job and template
  // Redirects user to fillout page where they can complete the report
  const generateReportMutation = useMutation({
    mutationFn: async (data: ReportGenerationValues) => {
      const template = templates.find(t => t.id === data.templateId);
      if (!template) {
        throw new Error("Template not found");
      }

      const response = await apiRequest("/api/report-instances", "POST", {
        jobId: data.jobId,
        templateId: data.templateId,
        templateVersion: template.version || 1,
        status: "draft",
      });

      return await response.json();
    },
    onSuccess: (reportInstance) => {
      queryClient.invalidateQueries({ queryKey: ["/api/report-instances"] });
      toast({ title: "Report created successfully", description: "Redirecting to report fillout page..." });
      onOpenChange(false);
      form.reset();
      
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

  const onSubmit = (data: ReportGenerationValues) => {
    generateReportMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle data-testid="text-generate-report-title">Generate Report</DialogTitle>
          <DialogDescription>
            Select a job and template to generate a new inspection report.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <ScrollArea className="max-h-[60vh] pr-4">
              <div className="space-y-6">
                <FormField
                  control={form.control}
                  name="jobId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Job *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-job">
                            <SelectValue placeholder="Select a job" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {jobs.map(job => (
                            <SelectItem key={job.id} value={job.id}>
                              {job.name} - {job.address}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="templateId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Template *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-template">
                            <SelectValue placeholder="Select a template" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {templates.map(template => (
                            <SelectItem key={template.id} value={template.id}>
                              {template.name}
                              {template.isDefault && " (Default)"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {selectedJob && (
                  <Card data-testid="card-job-preview">
                    <CardHeader>
                      <CardTitle className="text-base">Job Preview</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div data-testid="text-preview-job-name">
                        <span className="text-muted-foreground">Job:</span> {selectedJob.name}
                      </div>
                      <div data-testid="text-preview-job-address">
                        <span className="text-muted-foreground">Address:</span> {selectedJob.address}
                      </div>
                      <div data-testid="text-preview-job-progress">
                        <span className="text-muted-foreground">Progress:</span> {selectedJob.completedItems}/{selectedJob.totalItems} items
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Separator />

                <FormField
                  control={form.control}
                  name="overview"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Overview</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Brief overview of the inspection..."
                          {...field}
                          data-testid="input-overview"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="finalNotes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Final Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Any additional notes or observations..."
                          {...field}
                          data-testid="input-final-notes"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="inspector"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Inspector</FormLabel>
                      <FormControl>
                        <Input placeholder="Inspector name and credentials" {...field} data-testid="input-inspector" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </ScrollArea>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel-generate">
                Cancel
              </Button>
              <Button type="submit" disabled={generateReportMutation.isPending} data-testid="button-submit-generate">
                {generateReportMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Generate Report
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function ReportViewerDialog({
  open,
  onOpenChange,
  report,
  job,
  template,
  onEmail,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  report: ReportInstance;
  job?: Job;
  template?: ReportTemplate;
  onEmail: () => void;
}) {
  const { toast } = useToast();
  const data = JSON.parse(report.data);

  // Phase 6 - DOCUMENT: PDF generation workflow
  // Calls backend API to generate PDF from report data using @react-pdf/renderer
  // Returns signed URL for download, opens in new tab for user
  // PDF includes cover page, table of contents, all report sections, and signature
  const generatePdfMutation = useMutation({
    mutationFn: async (reportId: string) => {
      const response = await apiRequest(
        'POST',
        `/api/report-instances/${reportId}/generate-pdf`
      );
      return await response.json() as { success: boolean; pdfUrl: string };
    },
    onSuccess: (data, reportId) => {
      const downloadUrl = `/api/report-instances/${reportId}/download-pdf`;
      window.open(downloadUrl, '_blank');
      
      toast({ title: "PDF generated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/report-instances"] });
    },
    onError: () => {
      toast({ 
        title: "PDF generation failed",
        description: "Please try again or contact support if the issue persists",
        variant: "destructive"
      });
    }
  });

  const handleDownloadPdf = () => {
    generatePdfMutation.mutate(report.id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle data-testid="text-viewer-title">Inspection Report</DialogTitle>
          <DialogDescription>
            {job?.name} - Generated {format(new Date(report.createdAt!), "MMM d, yyyy")}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-6 pr-4">
            <Card data-testid="card-job-details">
              <CardHeader>
                <CardTitle className="text-base">Job Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div data-testid="text-viewer-job"><span className="font-medium">Job:</span> {job?.name}</div>
                <div data-testid="text-viewer-address"><span className="font-medium">Address:</span> {job?.address}</div>
                <div data-testid="text-viewer-template"><span className="font-medium">Template:</span> {template?.name}</div>
                <div data-testid="text-viewer-status"><span className="font-medium">Status:</span> {job?.status}</div>
              </CardContent>
            </Card>

            {data.overview && (
              <Card data-testid="card-overview">
                <CardHeader>
                  <CardTitle className="text-base">Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{data.overview}</p>
                </CardContent>
              </Card>
            )}

            {data.checklistSummary && (
              <Card data-testid="card-checklist-summary">
                <CardHeader>
                  <CardTitle className="text-base">Checklist Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm font-medium">{data.checklistSummary}</p>
                </CardContent>
              </Card>
            )}

            {data.forecast && (
              <Card data-testid="card-forecast">
                <CardHeader>
                  <CardTitle className="text-base">Duct Leakage Forecast</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div data-testid="text-predicted-tdl">
                      <p className="text-xs text-muted-foreground mb-1">Predicted TDL</p>
                      <p className="text-2xl font-bold">{data.forecast.predictedTDL} CFM25</p>
                    </div>
                    <div data-testid="text-predicted-dlo">
                      <p className="text-xs text-muted-foreground mb-1">Predicted DLO</p>
                      <p className="text-2xl font-bold">{data.forecast.predictedDLO}%</p>
                    </div>
                  </div>
                  {data.forecast.actualTDL && (
                    <div className="grid grid-cols-2 gap-4 pt-3 border-t">
                      <div data-testid="text-actual-tdl">
                        <p className="text-xs text-muted-foreground mb-1">Actual TDL</p>
                        <p className="text-2xl font-bold">{data.forecast.actualTDL} CFM25</p>
                      </div>
                      <div data-testid="text-actual-dlo">
                        <p className="text-xs text-muted-foreground mb-1">Actual DLO</p>
                        <p className="text-2xl font-bold">{data.forecast.actualDLO}%</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {data.finalNotes && (
              <Card data-testid="card-final-notes">
                <CardHeader>
                  <CardTitle className="text-base">Final Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{data.finalNotes}</p>
                </CardContent>
              </Card>
            )}

            {data.inspector && (
              <Card data-testid="card-inspector">
                <CardHeader>
                  <CardTitle className="text-base">Inspector Signature</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm font-medium" data-testid="text-inspector-name">{data.inspector}</p>
                  <p className="text-xs text-muted-foreground mt-1" data-testid="text-inspector-date">
                    Signed on {format(new Date(report.createdAt!), "MMMM d, yyyy 'at' h:mm a")}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={() => window.print()} data-testid="button-print">
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button 
            variant="outline" 
            onClick={handleDownloadPdf}
            disabled={generatePdfMutation.isPending}
            data-testid="button-download-pdf"
          >
            {generatePdfMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            {generatePdfMutation.isPending ? "Generating..." : "Download PDF"}
          </Button>
          <Button onClick={onEmail} data-testid="button-email-report">
            <Mail className="h-4 w-4 mr-2" />
            Email Report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EmailDialog({
  open,
  onOpenChange,
  report,
  job,
  builders,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  report: ReportInstance;
  job?: Job;
  builders: Builder[];
}) {
  const { toast } = useToast();
  const builder = builders.find(b => b.id === job?.builderId);

  const form = useForm<EmailFormValues>({
    resolver: zodResolver(emailFormSchema),
    defaultValues: {
      to: builder?.email || "",
      subject: `Inspection Report - ${job?.name}`,
      message: `Please find attached the inspection report for ${job?.name}.\n\nBest regards,\nInspection Team`,
      attachPdf: true,
    },
  });

  const sendEmailMutation = useMutation({
    mutationFn: async (data: EmailFormValues) => {
      await apiRequest(`/api/report-instances/${report.id}`, "PUT", {
        emailedTo: data.to,
        emailedAt: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/report-instances"] });
      toast({ title: "Report sent successfully" });
      onOpenChange(false);
      form.reset();
    },
    onError: () => {
      toast({ title: "Failed to send report", variant: "destructive" });
    },
  });

  const onSubmit = (data: EmailFormValues) => {
    sendEmailMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle data-testid="text-email-title">Send Report via Email</DialogTitle>
          <DialogDescription>
            Send the inspection report to the builder or other recipients.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="to"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>To *</FormLabel>
                  <FormControl>
                    <Input placeholder="recipient@example.com" {...field} data-testid="input-email-to" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subject *</FormLabel>
                  <FormControl>
                    <Input placeholder="Email subject" {...field} data-testid="input-email-subject" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Message</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Email message body..."
                      className="min-h-32"
                      {...field}
                      data-testid="input-email-message"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="attachPdf"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-md border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Attach PDF</FormLabel>
                    <FormDescription>
                      Include the report as a PDF attachment
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="switch-attach-pdf"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel-email">
                Cancel
              </Button>
              <Button type="submit" disabled={sendEmailMutation.isPending} data-testid="button-send-email">
                {sendEmailMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                <Mail className="h-4 w-4 mr-2" />
                Send Email
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// Phase 2 - BUILD: ErrorBoundary wrapper with comprehensive fallback UI
export default function Reports() {
  return (
    <ErrorBoundary
      fallback={
        <div className="p-6 max-w-7xl mx-auto space-y-6" data-testid="error-boundary-fallback">
          <div className="flex items-center gap-3">
            <FileText className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Reports</h1>
          </div>
          <Card className="border-destructive/20 bg-destructive/5">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="h-12 w-12 text-destructive mb-4" />
              <h3 className="text-lg font-semibold text-destructive mb-2">Something Went Wrong</h3>
              <p className="text-sm text-muted-foreground mb-4 text-center max-w-md">
                An unexpected error occurred while loading the Reports page. Please refresh the page to try again.
              </p>
              <Button 
                onClick={() => window.location.reload()}
                variant="outline"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh Page
              </Button>
            </CardContent>
          </Card>
        </div>
      }
    >
      <ReportsContent />
    </ErrorBoundary>
  );
}
