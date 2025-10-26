import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Building2,
  FileText,
  CheckCircle,
  XCircle,
  Upload,
  Package,
  Home,
  AlertCircle,
  Calendar,
  MapPin,
  Hash,
  ChevronLeft,
  Save,
  Plus,
  Trash2,
  Download,
  Clock,
  Wind,
  Droplets,
  ThermometerSun,
  Zap,
  ClipboardCheck,
  FileCheck
} from "lucide-react";
import { format } from "date-fns";
import type { 
  TaxCreditProject, 
  TaxCreditRequirement,
  TaxCreditDocument,
  UnitCertification,
  Builder,
  Job
} from "@shared/schema";
import { insertTaxCreditProjectSchema } from "@shared/schema";

const requirementTypes = [
  { id: "hers-index", label: "HERS Index ≤ 55", description: "Home Energy Rating System score verification", icon: ThermometerSun },
  { id: "blower-door", label: "Blower Door Test", description: "Air tightness testing for all units", icon: Wind },
  { id: "duct-leakage", label: "Duct Leakage Test", description: "Duct system leakage testing", icon: Droplets },
  { id: "hvac-commissioning", label: "HVAC Commissioning", description: "HVAC system commissioning reports", icon: ThermometerSun },
  { id: "insulation-grade", label: "Insulation Grade", description: "Insulation installation grade documentation", icon: Package },
  { id: "window-specs", label: "Window Specifications", description: "Window and door U-factor and SHGC values", icon: Home },
  { id: "equipment-ahri", label: "Equipment AHRI", description: "Equipment model numbers and AHRI certificates", icon: Zap },
  { id: "software-report", label: "Software Report", description: "Energy modeling software report", icon: FileText },
];

const projectFormSchema = insertTaxCreditProjectSchema.extend({
  builderId: z.string().min(1, "Builder is required"),
  projectName: z.string().min(1, "Project name is required"),
  projectType: z.enum(["single-family", "multifamily", "manufactured"]),
  totalUnits: z.number().min(1, "Must have at least 1 unit"),
  taxYear: z.number().min(2020).max(2030),
  softwareTool: z.string().min(1, "Software tool is required"),
  softwareVersion: z.string().optional(),
});

type ProjectFormValues = z.infer<typeof projectFormSchema>;

export default function TaxCreditProject() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const isNew = id === "new";
  const [activeTab, setActiveTab] = useState("details");

  // Fetch project data if editing
  const { data: project, isLoading: projectLoading } = useQuery<TaxCreditProject>({
    queryKey: [`/api/tax-credit-projects/${id}`],
    enabled: !isNew && !!id,
  });

  // Fetch requirements for this project
  const { data: requirements = [], isLoading: requirementsLoading } = useQuery<TaxCreditRequirement[]>({
    queryKey: [`/api/tax-credit-requirements/project/${id}`],
    enabled: !isNew && !!id,
  });

  // Fetch documents for this project
  const { data: documents = [], isLoading: documentsLoading } = useQuery<TaxCreditDocument[]>({
    queryKey: [`/api/tax-credit-documents/project/${id}`],
    enabled: !isNew && !!id,
  });

  // Fetch unit certifications for this project
  const { data: certifications = [], isLoading: certificationsLoading } = useQuery<UnitCertification[]>({
    queryKey: [`/api/unit-certifications/project/${id}`],
    enabled: !isNew && !!id,
  });

  // Fetch builders for dropdown
  const { data: buildersData } = useQuery<{ data: Builder[] }>({
    queryKey: ["/api/builders"],
  });

  const builders = buildersData?.data || [];

  // Form setup
  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      builderId: "",
      projectName: "",
      projectType: "single-family",
      totalUnits: 1,
      taxYear: new Date().getFullYear(),
      softwareTool: "",
      softwareVersion: "",
      status: "pending",
    },
  });

  // Load project data into form when editing
  useEffect(() => {
    if (project && !isNew) {
      form.reset({
        builderId: project.builderId,
        projectName: project.projectName,
        projectType: project.projectType as "single-family" | "multifamily" | "manufactured",
        totalUnits: project.totalUnits || 1,
        taxYear: project.taxYear,
        softwareTool: project.softwareTool || "",
        softwareVersion: project.softwareVersion || "",
        status: project.status,
      });
    }
  }, [project, isNew, form]);

  // Create/Update project mutation
  const projectMutation = useMutation({
    mutationFn: async (data: ProjectFormValues) => {
      if (isNew) {
        return apiRequest("/api/tax-credit-projects", "POST", data);
      } else {
        return apiRequest(`/api/tax-credit-projects/${id}`, "PATCH", data);
      }
    },
    onSuccess: (data) => {
      toast({
        title: isNew ? "Project Created" : "Project Updated",
        description: `${data.projectName} has been ${isNew ? "created" : "updated"} successfully.`,
      });
      
      if (isNew) {
        setLocation(`/tax-credits/projects/${data.id}`);
      } else {
        queryClient.invalidateQueries({ queryKey: [`/api/tax-credit-projects/${id}`] });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/tax-credit-summary"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save project",
        variant: "destructive",
      });
    },
  });

  // Create/Update requirement mutation
  const requirementMutation = useMutation({
    mutationFn: async (data: { requirementType: string; status: string; notes?: string }) => {
      const existing = requirements.find(r => r.requirementType === data.requirementType);
      
      if (existing) {
        return apiRequest(`/api/tax-credit-requirements/${existing.id}`, "PATCH", {
          status: data.status,
          notes: data.notes,
          completedDate: data.status === "completed" ? new Date().toISOString() : null,
        });
      } else {
        return apiRequest("/api/tax-credit-requirements", "POST", {
          projectId: id,
          requirementType: data.requirementType,
          description: requirementTypes.find(t => t.id === data.requirementType)?.description || "",
          status: data.status,
          notes: data.notes,
          completedDate: data.status === "completed" ? new Date().toISOString() : null,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tax-credit-requirements/project/${id}`] });
      toast({
        title: "Requirement Updated",
        description: "The requirement status has been updated.",
      });
    },
  });

  // Calculate progress
  const completedRequirements = requirements.filter(r => r.status === "completed").length;
  const totalRequirements = requirementTypes.length;
  const progressPercentage = totalRequirements > 0 ? (completedRequirements / totalRequirements) * 100 : 0;

  const qualifiedUnits = certifications.filter(c => c.qualified).length;
  const unitsProgress = project?.totalUnits ? (qualifiedUnits / project.totalUnits) * 100 : 0;

  const onSubmit = (data: ProjectFormValues) => {
    projectMutation.mutate(data);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "text-green-600";
      case "failed":
        return "text-red-600";
      case "pending":
        return "text-yellow-600";
      default:
        return "text-gray-600";
    }
  };

  const getRequirementStatus = (type: string) => {
    const requirement = requirements.find(r => r.requirementType === type);
    return requirement?.status || "pending";
  };

  const handleRequirementToggle = (type: string, checked: boolean) => {
    requirementMutation.mutate({
      requirementType: type,
      status: checked ? "completed" : "pending",
    });
  };

  const isLoading = projectLoading || requirementsLoading || documentsLoading || certificationsLoading;

  if (!isNew && isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-8">Loading project details...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/tax-credits")}
            data-testid="button-back"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold" data-testid="text-page-title">
              {isNew ? "New 45L Project" : project?.projectName || "45L Project"}
            </h1>
            {!isNew && (
              <p className="text-muted-foreground mt-1">
                Tax Year {project?.taxYear} • {project?.totalUnits} Total Units
              </p>
            )}
          </div>
        </div>
        {!isNew && (
          <Badge className={project?.status === "certified" ? "bg-green-500" : "bg-yellow-500"}>
            {project?.status || "pending"}
          </Badge>
        )}
      </div>

      {/* Progress Overview (only show when editing) */}
      {!isNew && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Requirements Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Progress value={progressPercentage} className="flex-1" />
                <span className="text-sm font-medium" data-testid="text-requirements-progress">
                  {completedRequirements}/{totalRequirements}
                </span>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Qualified Units</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Progress value={unitsProgress} className="flex-1" />
                <span className="text-sm font-medium" data-testid="text-units-progress">
                  {qualifiedUnits}/{project?.totalUnits || 0}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="details" data-testid="tab-details">Project Details</TabsTrigger>
          {!isNew && (
            <>
              <TabsTrigger value="requirements" data-testid="tab-requirements">Requirements</TabsTrigger>
              <TabsTrigger value="units" data-testid="tab-units">Units</TabsTrigger>
              <TabsTrigger value="documents" data-testid="tab-documents">Documents</TabsTrigger>
            </>
          )}
        </TabsList>

        <TabsContent value="details" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Project Information</CardTitle>
              <CardDescription>
                Enter the basic information for this 45L tax credit project
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="builderId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Builder</FormLabel>
                          <Select
                            disabled={!isNew}
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger data-testid="select-builder">
                                <SelectValue placeholder="Select a builder" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {builders.map((builder) => (
                                <SelectItem key={builder.id} value={builder.id}>
                                  {builder.name}
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
                      name="projectName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Project Name</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., Sunrise Development Phase 2" data-testid="input-project-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="projectType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Project Type</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-project-type">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="single-family">Single Family</SelectItem>
                              <SelectItem value="multifamily">Multifamily</SelectItem>
                              <SelectItem value="manufactured">Manufactured Home</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="totalUnits"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Total Units</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                              min={1}
                              data-testid="input-total-units"
                            />
                          </FormControl>
                          <FormDescription>
                            Number of dwelling units in this project
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="taxYear"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tax Year</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                              min={2020}
                              max={2030}
                              data-testid="input-tax-year"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="softwareTool"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Software Tool</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-software">
                                <SelectValue placeholder="Select software" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="REM/Rate">REM/Rate</SelectItem>
                              <SelectItem value="EnergyGauge">EnergyGauge</SelectItem>
                              <SelectItem value="HERS">HERS</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Energy modeling software used
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="softwareVersion"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Software Version</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., v2.9.7" data-testid="input-software-version" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {!isNew && (
                      <FormField
                        control={form.control}
                        name="status"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Status</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-status">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="certified">Certified</SelectItem>
                                <SelectItem value="claimed">Claimed</SelectItem>
                                <SelectItem value="denied">Denied</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>

                  <div className="flex justify-end gap-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setLocation("/tax-credits")}
                      data-testid="button-cancel"
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={projectMutation.isPending} data-testid="button-save">
                      <Save className="mr-2 h-4 w-4" />
                      {projectMutation.isPending ? "Saving..." : isNew ? "Create Project" : "Save Changes"}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        {!isNew && (
          <>
            <TabsContent value="requirements" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Requirements Checklist</CardTitle>
                  <CardDescription>
                    Track all IRS 45L requirements for this project
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {requirementTypes.map((type) => {
                    const status = getRequirementStatus(type.id);
                    const Icon = type.icon;
                    
                    return (
                      <div
                        key={type.id}
                        className="flex items-start space-x-3 p-4 border rounded-lg"
                        data-testid={`requirement-${type.id}`}
                      >
                        <Checkbox
                          checked={status === "completed"}
                          onCheckedChange={(checked) => handleRequirementToggle(type.id, !!checked)}
                          disabled={requirementMutation.isPending}
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4 text-muted-foreground" />
                            <Label className="text-base font-medium">{type.label}</Label>
                            <Badge variant="outline" className={getStatusColor(status)}>
                              {status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {type.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  All requirements must be completed and documented before the project can be certified for the 45L tax credit.
                </AlertDescription>
              </Alert>
            </TabsContent>

            <TabsContent value="units" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Unit Certifications</CardTitle>
                  <CardDescription>
                    Track individual unit test results and qualification status
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {certifications.length === 0 ? (
                    <div className="text-center py-8">
                      <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground mb-4">No units certified yet</p>
                      <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Unit Certification
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {certifications.map((cert) => (
                        <div
                          key={cert.id}
                          className="flex items-center justify-between p-4 border rounded-lg"
                          data-testid={`unit-${cert.id}`}
                        >
                          <div className="flex items-center gap-4">
                            <div className="p-2 bg-muted rounded-lg">
                              <Home className="h-4 w-4" />
                            </div>
                            <div>
                              <div className="font-medium">{cert.unitAddress}</div>
                              <div className="text-sm text-muted-foreground">
                                Unit {cert.unitNumber} • HERS {cert.hersIndex || "N/A"}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {cert.qualified ? (
                              <Badge className="bg-green-500 text-white">
                                <CheckCircle className="mr-1 h-3 w-3" />
                                Qualified
                              </Badge>
                            ) : (
                              <Badge className="bg-red-500 text-white">
                                <XCircle className="mr-1 h-3 w-3" />
                                Not Qualified
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Summary Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <Label className="text-sm text-muted-foreground">Average HERS Index</Label>
                      <p className="text-2xl font-bold">
                        {certifications.length > 0 
                          ? Math.round(certifications.reduce((sum, c) => sum + (c.hersIndex || 0), 0) / certifications.length)
                          : "N/A"}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground">Average Savings</Label>
                      <p className="text-2xl font-bold">
                        {certifications.length > 0
                          ? `${Math.round(certifications.reduce((sum, c) => sum + (c.percentSavings || 0), 0) / certifications.length)}%`
                          : "N/A"}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground">Potential Credit</Label>
                      <p className="text-2xl font-bold text-green-600">
                        ${(qualifiedUnits * 2500).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="documents" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Project Documents</CardTitle>
                  <CardDescription>
                    Upload and manage all required documentation for 45L certification
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {documents.length === 0 ? (
                    <div className="text-center py-8">
                      <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground mb-4">No documents uploaded yet</p>
                      <Button>
                        <Upload className="mr-2 h-4 w-4" />
                        Upload Document
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {documents.map((doc) => (
                        <div
                          key={doc.id}
                          className="flex items-center justify-between p-4 border rounded-lg"
                          data-testid={`document-${doc.id}`}
                        >
                          <div className="flex items-center gap-4">
                            <div className="p-2 bg-muted rounded-lg">
                              <FileText className="h-4 w-4" />
                            </div>
                            <div>
                              <div className="font-medium">{doc.fileName}</div>
                              <div className="text-sm text-muted-foreground">
                                {doc.documentType} • Uploaded {format(new Date(doc.uploadDate), "MMM d, yyyy")}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="icon">
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Alert>
                <FileCheck className="h-4 w-4" />
                <AlertDescription>
                  Required documents: Energy modeling reports, test results, equipment specifications, and AHRI certificates.
                </AlertDescription>
              </Alert>
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}