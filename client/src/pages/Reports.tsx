import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
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
import { FileText, Plus, Search, Eye, Edit, Trash2, Mail, Download, Printer, ChevronUp, ChevronDown, GripVertical, Calendar, Play } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ReportTemplate, ReportInstance, Job, Builder, ScoreSummary } from "@shared/schema";
import { DynamicForm } from "@/components/DynamicForm";
import type { FormSection } from "@shared/types";
import { getComplianceBadgeVariant, getComplianceBadgeClassName, getComplianceBadgeText } from "@/lib/compliance";
import { safeToFixed } from "@shared/numberUtils";

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

export default function Reports() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [complianceFilter, setComplianceFilter] = useState("all");
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [generationDialogOpen, setGenerationDialogOpen] = useState(false);
  const [viewerDialogOpen, setViewerDialogOpen] = useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [conditionalFormDialogOpen, setConditionalFormDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);
  const [selectedReport, setSelectedReport] = useState<ReportInstance | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<ReportTemplate | null>(null);
  const [conditionalFormData, setConditionalFormData] = useState<Record<string, any>>({});

  const { data: templates = [], isLoading: templatesLoading } = useQuery<ReportTemplate[]>({
    queryKey: ["/api/report-templates"],
  });

  const { data: jobs = [] } = useQuery<Job[]>({
    queryKey: ["/api/jobs"],
  });

  const { data: builders = [] } = useQuery<Builder[]>({
    queryKey: ["/api/builders"],
  });

  const { data: allReportInstances = [] } = useQuery<ReportInstance[]>({
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

  const filteredTemplates = templates.filter(template =>
    template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (template.description?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleEditTemplate = (template: ReportTemplate) => {
    setEditingTemplate(template);
    setTemplateDialogOpen(true);
  };

  const handleDeleteTemplate = (id: string) => {
    if (confirm("Are you sure you want to delete this template?")) {
      deleteTemplateMutation.mutate(id);
    }
  };

  const handleViewReport = (report: ReportInstance) => {
    setSelectedReport(report);
    setViewerDialogOpen(true);
  };

  const handleEmailReport = (report: ReportInstance) => {
    setSelectedReport(report);
    setEmailDialogOpen(true);
  };

  const getReportStatus = (report: ReportInstance): string => {
    if (report.emailedTo) return "Sent";
    if (report.pdfUrl) return "Finalized";
    return "Draft";
  };

  const getReportStatusBadgeVariant = (status: string) => {
    if (status === "Sent") return "default";
    if (status === "Finalized") return "secondary";
    return "outline";
  };

  const getScoreBadgeVariant = (passRate: number) => {
    if (passRate >= 90) return "default";
    if (passRate >= 70) return "secondary";
    return "destructive";
  };

  const handleTestConditionalForm = (template: ReportTemplate) => {
    setSelectedTemplate(template);
    setConditionalFormData({});
    setConditionalFormDialogOpen(true);
  };

  const isConditionalTemplate = (template: ReportTemplate): boolean => {
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
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <FileText className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Reports</h1>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={() => setGenerationDialogOpen(true)}
            data-testid="button-generate-report"
          >
            <Plus className="h-4 w-4 mr-2" />
            Generate Report
          </Button>
        </div>
      </div>

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
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search-templates"
              />
            </div>
            <Button
              onClick={() => {
                setEditingTemplate(null);
                setTemplateDialogOpen(true);
              }}
              data-testid="button-create-template"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create New Template
            </Button>
          </div>

          {templatesLoading ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map(i => (
                <Card key={i} className="animate-pulse">
                  <CardHeader className="h-32 bg-muted" />
                  <CardContent className="h-24 bg-muted/50" />
                </Card>
              ))}
            </div>
          ) : filteredTemplates.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-center">
                  {searchQuery ? "No templates found matching your search." : "No templates yet. Create your first template to get started."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredTemplates.map((template) => {
                const sections = JSON.parse(template.sections) as ReportSection[];
                return (
                  <Card key={template.id} className="hover-elevate" data-testid={`card-template-${template.id}`}>
                    <CardHeader className="space-y-0 pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-lg">{template.name}</CardTitle>
                        {template.isDefault && (
                          <Badge variant="default" data-testid={`badge-default-${template.id}`}>Default</Badge>
                        )}
                      </div>
                      <CardDescription className="line-clamp-2 mt-2">
                        {template.description || "No description provided"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <FileText className="h-4 w-4" />
                        <span>{sections.length} sections</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>Created {format(new Date(template.createdAt!), "MMM d, yyyy")}</span>
                      </div>
                      {isConditionalTemplate(template) && (
                        <Badge variant="secondary" data-testid={`badge-conditional-${template.id}`}>
                          Conditional Logic
                        </Badge>
                      )}
                    </CardContent>
                    <CardFooter className="flex flex-wrap gap-2 pt-4">
                      {isConditionalTemplate(template) && (
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
                        onClick={() => {
                          setSelectedTemplate(template);
                          setViewerDialogOpen(true);
                        }}
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
                        data-testid={`button-delete-${template.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="instances" className="space-y-6">
          {allReportInstances.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-center mb-4">
                  No reports generated yet. Generate your first report from a job inspection.
                </p>
                <Button onClick={() => setGenerationDialogOpen(true)} data-testid="button-generate-first-report">
                  <Plus className="h-4 w-4 mr-2" />
                  Generate Report
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="flex items-center gap-4">
                <Select value={complianceFilter} onValueChange={setComplianceFilter}>
                  <SelectTrigger className="w-64" data-testid="filter-report-compliance">
                    <SelectValue placeholder="Filter by compliance" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="compliant">Compliant</SelectItem>
                    <SelectItem value="non-compliant">Non-Compliant</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="unknown">Unknown</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                {allReportInstances.filter(report => {
                  if (complianceFilter === "all") return true;
                  const reportCompliance = report.complianceStatus || "unknown";
                  return reportCompliance === complianceFilter;
                }).map((report) => {
                const job = jobs.find(j => j.id === report.jobId);
                const template = templates.find(t => t.id === report.templateId);
                const status = getReportStatus(report);
                const score = (report as any).scoreSummary as ScoreSummary | null;

                return (
                  <Card key={report.id} className="hover-elevate" data-testid={`card-report-${report.id}`}>
                    <CardHeader>
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1 flex-1">
                          <CardTitle className="text-lg">{job?.name || "Unknown Job"}</CardTitle>
                          <CardDescription>{job?.address}</CardDescription>
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
                            data-testid={`badge-report-compliance-${report.id}`}
                          >
                            {getComplianceBadgeText(report.complianceStatus)}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">Template:</span>
                        <span className="font-medium">{template?.name || "Unknown"}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Generated {format(new Date(report.createdAt!), "MMM d, yyyy")}</span>
                      </div>
                      {report.emailedTo && (
                        <div className="flex items-center gap-2 text-sm">
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
                    description: "Check the console for form data",
                  });
                  console.log("Form Data:", data);
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
    </div>
  );
}

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
  const [sections, setSections] = useState<ReportSection[]>([]);

  const form = useForm<TemplateFormValues>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: {
      name: "",
      description: "",
      isDefault: false,
      sections: [],
    },
  });

  useState(() => {
    if (editingTemplate) {
      const parsedSections = JSON.parse(editingTemplate.sections) as ReportSection[];
      form.reset({
        name: editingTemplate.name,
        description: editingTemplate.description || "",
        isDefault: editingTemplate.isDefault || false,
        sections: parsedSections,
      });
      setSections(parsedSections);
    } else {
      form.reset({
        name: "",
        description: "",
        isDefault: false,
        sections: [],
      });
      setSections([]);
    }
  });

  const createTemplateMutation = useMutation({
    mutationFn: (data: TemplateFormValues) =>
      apiRequest("/api/report-templates", "POST", {
        name: data.name,
        description: data.description,
        isDefault: data.isDefault,
        sections: JSON.stringify(data.sections),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/report-templates"] });
      toast({ title: "Template created successfully" });
      onOpenChange(false);
      form.reset();
      setSections([]);
    },
    onError: () => {
      toast({ title: "Failed to create template", variant: "destructive" });
    },
  });

  const updateTemplateMutation = useMutation({
    mutationFn: (data: TemplateFormValues) =>
      apiRequest(`/api/report-templates/${editingTemplate!.id}`, "PUT", {
        name: data.name,
        description: data.description,
        isDefault: data.isDefault,
        sections: JSON.stringify(data.sections),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/report-templates"] });
      toast({ title: "Template updated successfully" });
      onOpenChange(false);
      form.reset();
      setSections([]);
    },
    onError: () => {
      toast({ title: "Failed to update template", variant: "destructive" });
    },
  });

  const onSubmit = (data: TemplateFormValues) => {
    const formattedData = {
      ...data,
      sections: sections,
    };
    
    if (editingTemplate) {
      updateTemplateMutation.mutate(formattedData);
    } else {
      createTemplateMutation.mutate(formattedData);
    }
  };

  const addSection = () => {
    const newSection: ReportSection = {
      id: Date.now().toString(),
      title: "",
      type: "Text",
      order: sections.length + 1,
    };
    setSections([...sections, newSection]);
  };

  const updateSection = (id: string, updates: Partial<ReportSection>) => {
    setSections(sections.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const deleteSection = (id: string) => {
    const filtered = sections.filter(s => s.id !== id);
    setSections(filtered.map((s, idx) => ({ ...s, order: idx + 1 })));
  };

  const moveSection = (id: string, direction: "up" | "down") => {
    const index = sections.findIndex(s => s.id === id);
    if (index === -1) return;
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === sections.length - 1) return;

    const newSections = [...sections];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    [newSections[index], newSections[targetIndex]] = [newSections[targetIndex], newSections[index]];
    setSections(newSections.map((s, idx) => ({ ...s, order: idx + 1 })));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle data-testid="text-dialog-title">
            {editingTemplate ? "Edit Template" : "Create New Template"}
          </DialogTitle>
          <DialogDescription>
            Build a custom report template with sections for different types of data.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <ScrollArea className="max-h-[60vh] pr-4">
              <div className="space-y-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Template Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Thermal Bypass Inspection Report" {...field} data-testid="input-template-name" />
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
                          placeholder="Describe what this template is used for..."
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
                          Use this template as the default for new reports
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-default-template"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <Separator />

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">Sections</h3>
                      <p className="text-sm text-muted-foreground">Add and organize report sections</p>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={addSection} data-testid="button-add-section">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Section
                    </Button>
                  </div>

                  {sections.length === 0 ? (
                    <Card>
                      <CardContent className="flex flex-col items-center justify-center py-8">
                        <FileText className="h-10 w-10 text-muted-foreground mb-3" />
                        <p className="text-sm text-muted-foreground">No sections yet. Add a section to get started.</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-3">
                      {sections.map((section, index) => (
                        <Card key={section.id} data-testid={`section-${section.id}`}>
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <div className="flex flex-col gap-1 pt-2">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => moveSection(section.id, "up")}
                                  disabled={index === 0}
                                  data-testid={`button-move-up-${section.id}`}
                                >
                                  <ChevronUp className="h-4 w-4" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => moveSection(section.id, "down")}
                                  disabled={index === sections.length - 1}
                                  data-testid={`button-move-down-${section.id}`}
                                >
                                  <ChevronDown className="h-4 w-4" />
                                </Button>
                              </div>

                              <div className="flex-1 space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                  <div className="space-y-2">
                                    <label className="text-sm font-medium">Section Title</label>
                                    <Input
                                      value={section.title}
                                      onChange={(e) => updateSection(section.id, { title: e.target.value })}
                                      placeholder="e.g., Overview"
                                      data-testid={`input-section-title-${section.id}`}
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <label className="text-sm font-medium">Type</label>
                                    <Select
                                      value={section.type}
                                      onValueChange={(value) => updateSection(section.id, { type: value as any })}
                                    >
                                      <SelectTrigger data-testid={`select-section-type-${section.id}`}>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="Text">Text</SelectItem>
                                        <SelectItem value="Photos">Photos</SelectItem>
                                        <SelectItem value="Checklist">Checklist</SelectItem>
                                        <SelectItem value="Forecast">Forecast</SelectItem>
                                        <SelectItem value="Signature">Signature</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                              </div>

                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => deleteSection(section.id)}
                                data-testid={`button-delete-section-${section.id}`}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </ScrollArea>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel">
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createTemplateMutation.isPending || updateTemplateMutation.isPending}
                data-testid="button-save-template"
              >
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
          <DialogTitle>{template.name}</DialogTitle>
          <DialogDescription>{template.description}</DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileText className="h-4 w-4" />
              <span>{sections.length} sections</span>
              {template.isDefault && <Badge variant="default">Default</Badge>}
            </div>

            <Separator />

            <div className="space-y-3">
              <h3 className="font-semibold">Sections</h3>
              {sections.map((section, index) => (
                <Card key={section.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">{index + 1}</Badge>
                      <div className="flex-1">
                        <p className="font-medium">{section.title}</p>
                        <p className="text-sm text-muted-foreground">{section.type}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
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
  const form = useForm<ReportGenerationValues>({
    resolver: zodResolver(reportGenerationSchema),
    defaultValues: {
      jobId: "",
      templateId: "",
      overview: "",
      finalNotes: "",
      inspector: "John Doe, HERS Rater",
    },
  });

  const selectedJobId = form.watch("jobId");
  const selectedJob = jobs.find(j => j.id === selectedJobId);

  const generateReportMutation = useMutation({
    mutationFn: (data: ReportGenerationValues) => {
      const job = jobs.find(j => j.id === data.jobId);
      const reportData = {
        overview: data.overview || `Inspection report for ${job?.name}`,
        checklistSummary: `${job?.completedItems || 0}/${job?.totalItems || 52} items completed`,
        forecast: {
          predictedTDL: "125.0",
          predictedDLO: "8.5",
        },
        finalNotes: data.finalNotes || "",
        inspector: data.inspector || "John Doe, HERS Rater",
      };

      return apiRequest("/api/report-instances", "POST", {
        jobId: data.jobId,
        templateId: data.templateId,
        data: JSON.stringify(reportData),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/report-instances"] });
      toast({ title: "Report generated successfully" });
      onOpenChange(false);
      form.reset();
    },
    onError: () => {
      toast({ title: "Failed to generate report", variant: "destructive" });
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
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Job Preview</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Job:</span> {selectedJob.name}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Address:</span> {selectedJob.address}
                      </div>
                      <div>
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

  const generatePdfMutation = useMutation({
    mutationFn: async (reportId: string) => {
      const response = await apiRequest(
        'POST',
        `/api/report-instances/${reportId}/generate-pdf`
      );
      return await response.json() as { success: boolean; pdfUrl: string };
    },
    onSuccess: (data, reportId) => {
      // Download the PDF via our API endpoint instead of opening signed URL
      const downloadUrl = `/api/report-instances/${reportId}/download-pdf`;
      window.open(downloadUrl, '_blank');
      
      toast({ title: "PDF generated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/report-instances"] });
    },
    onError: () => {
      toast({ 
        title: "PDF generation failed",
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
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Job Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div><span className="font-medium">Job:</span> {job?.name}</div>
                <div><span className="font-medium">Address:</span> {job?.address}</div>
                <div><span className="font-medium">Template:</span> {template?.name}</div>
                <div><span className="font-medium">Status:</span> {job?.status}</div>
              </CardContent>
            </Card>

            {data.overview && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{data.overview}</p>
                </CardContent>
              </Card>
            )}

            {data.checklistSummary && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Checklist Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm font-medium">{data.checklistSummary}</p>
                </CardContent>
              </Card>
            )}

            {data.forecast && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Duct Leakage Forecast</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Predicted TDL</p>
                      <p className="text-2xl font-bold">{data.forecast.predictedTDL} CFM25</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Predicted DLO</p>
                      <p className="text-2xl font-bold">{data.forecast.predictedDLO}%</p>
                    </div>
                  </div>
                  {data.forecast.actualTDL && (
                    <div className="grid grid-cols-2 gap-4 pt-3 border-t">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Actual TDL</p>
                        <p className="text-2xl font-bold">{data.forecast.actualTDL} CFM25</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Actual DLO</p>
                        <p className="text-2xl font-bold">{data.forecast.actualDLO}%</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {data.finalNotes && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Final Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{data.finalNotes}</p>
                </CardContent>
              </Card>
            )}

            {data.inspector && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Inspector Signature</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm font-medium">{data.inspector}</p>
                  <p className="text-xs text-muted-foreground mt-1">
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
            <Download className="h-4 w-4 mr-2" />
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
