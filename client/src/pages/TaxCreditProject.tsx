import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
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
import { ErrorBoundary } from "@/components/ErrorBoundary";
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
  ChevronLeft,
  Save,
  Plus,
  Trash2,
  Download,
  Wind,
  Droplets,
  ThermometerSun,
  Zap,
  FileCheck,
  RefreshCw
} from "lucide-react";
import { format } from "date-fns";
import type { 
  TaxCreditProject, 
  TaxCreditRequirement,
  TaxCreditDocument,
  UnitCertification,
  Builder
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

function TaxCreditProjectContent() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const isNew = id === "new";
  const [activeTab, setActiveTab] = useState("details");

  // Fetch project data if editing
  const { 
    data: project, 
    isLoading: projectLoading, 
    error: projectError,
    refetch: refetchProject
  } = useQuery<TaxCreditProject>({
    queryKey: [`/api/tax-credit-projects/${id}`],
    enabled: !isNew && !!id,
    retry: 2,
  });

  // Fetch requirements for this project
  const { 
    data: requirements = [], 
    isLoading: requirementsLoading,
    error: requirementsError,
    refetch: refetchRequirements
  } = useQuery<TaxCreditRequirement[]>({
    queryKey: [`/api/tax-credit-requirements/project/${id}`],
    enabled: !isNew && !!id,
    retry: 2,
  });

  // Fetch documents for this project
  const { 
    data: documents = [], 
    isLoading: documentsLoading,
    error: documentsError,
    refetch: refetchDocuments
  } = useQuery<TaxCreditDocument[]>({
    queryKey: [`/api/tax-credit-documents/project/${id}`],
    enabled: !isNew && !!id,
    retry: 2,
  });

  // Fetch unit certifications for this project
  const { 
    data: certifications = [], 
    isLoading: certificationsLoading,
    error: certificationsError,
    refetch: refetchCertifications
  } = useQuery<UnitCertification[]>({
    queryKey: [`/api/unit-certifications/project/${id}`],
    enabled: !isNew && !!id,
    retry: 2,
  });

  // Fetch builders for dropdown
  const { 
    data: buildersData,
    error: buildersError,
    refetch: refetchBuilders
  } = useQuery<{ data: Builder[] }>({
    queryKey: ["/api/builders"],
    retry: 2,
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

  // Phase 3 - OPTIMIZE: Memoized status color function
  const getStatusColor = useMemo(() => {
    return (status: string) => {
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
  }, []);

  // Phase 3 - OPTIMIZE: Memoized requirement status lookup
  const getRequirementStatus = useCallback((type: string) => {
    const requirement = requirements.find(r => r.requirementType === type);
    return requirement?.status || "pending";
  }, [requirements]);

  // Phase 3 - OPTIMIZE: Memoized requirement toggle handler
  const handleRequirementToggle = useCallback((type: string, checked: boolean) => {
    requirementMutation.mutate({
      requirementType: type,
      status: checked ? "completed" : "pending",
    });
  }, [requirementMutation]);

  // Phase 3 - OPTIMIZE: Memoized progress calculations
  const completedRequirements = useMemo(() => 
    requirements.filter(r => r.status === "completed").length,
    [requirements]
  );

  const totalRequirements = useMemo(() => requirementTypes.length, []);

  const progressPercentage = useMemo(() => 
    totalRequirements > 0 ? (completedRequirements / totalRequirements) * 100 : 0,
    [completedRequirements, totalRequirements]
  );

  const qualifiedUnits = useMemo(() => 
    certifications.filter(c => c.qualified).length,
    [certifications]
  );

  const unitsProgress = useMemo(() => 
    project?.totalUnits ? (qualifiedUnits / project.totalUnits) * 100 : 0,
    [project?.totalUnits, qualifiedUnits]
  );

  const avgHersIndex = useMemo(() => {
    if (certifications.length === 0) return null;
    return Math.round(certifications.reduce((sum, c) => sum + (c.hersIndex || 0), 0) / certifications.length);
  }, [certifications]);

  const avgSavings = useMemo(() => {
    if (certifications.length === 0) return null;
    return Math.round(certifications.reduce((sum, c) => sum + (c.percentSavings || 0), 0) / certifications.length);
  }, [certifications]);

  const potentialCredit = useMemo(() => 
    qualifiedUnits * 2500,
    [qualifiedUnits]
  );

  const onSubmit = (data: ProjectFormValues) => {
    projectMutation.mutate(data);
  };

  const isLoading = projectLoading || requirementsLoading || documentsLoading || certificationsLoading;

  // Phase 5 - HARDEN: Error states for all queries
  const hasError = projectError || requirementsError || documentsError || certificationsError || buildersError;

  if (!isNew && hasError) {
    return (
      <div className="container mx-auto p-6 space-y-6" data-testid="container-error">
        <Alert variant="destructive" data-testid="alert-error">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Project</AlertTitle>
          <AlertDescription>
            {(projectError as Error)?.message || 
             (requirementsError as Error)?.message || 
             (documentsError as Error)?.message || 
             (certificationsError as Error)?.message ||
             (buildersError as Error)?.message ||
             "Failed to load project data. Please try again."}
          </AlertDescription>
        </Alert>
        <div className="flex gap-4">
          <Button 
            onClick={() => {
              refetchProject();
              refetchRequirements();
              refetchDocuments();
              refetchCertifications();
              refetchBuilders();
            }}
            data-testid="button-retry-all"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setLocation("/tax-credits")}
            data-testid="button-back-from-error"
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to Tax Credits
          </Button>
        </div>
      </div>
    );
  }

  // Phase 2 - BUILD: Skeleton loading states
  if (!isNew && isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6" data-testid="container-loading">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between" data-testid="skeleton-header">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-48" />
            </div>
          </div>
          <Skeleton className="h-6 w-24" />
        </div>

        {/* Progress Cards Skeleton */}
        <div className="grid gap-4 md:grid-cols-2" data-testid="skeleton-progress-cards">
          {[1, 2].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-40" />
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <Skeleton className="h-2 flex-1" />
                  <Skeleton className="h-4 w-12" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Form Skeleton */}
        <Card data-testid="skeleton-form">
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-96" />
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6" data-testid="container-tax-credit-project">
      {/* Header */}
      <div className="flex items-center justify-between" data-testid="header-project">
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
              <p className="text-muted-foreground mt-1" data-testid="text-project-meta">
                Tax Year {project?.taxYear} • {project?.totalUnits} Total Units
              </p>
            )}
          </div>
        </div>
        {!isNew && (
          <Badge 
            className={project?.status === "certified" ? "bg-green-500" : "bg-yellow-500"}
            data-testid="badge-project-status"
          >
            {project?.status || "pending"}
          </Badge>
        )}
      </div>

      {/* Progress Overview (only show when editing) */}
      {!isNew && (
        <div className="grid gap-4 md:grid-cols-2" data-testid="section-progress">
          <Card data-testid="card-requirements-progress">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Requirements Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Progress value={progressPercentage} className="flex-1" data-testid="progress-requirements" />
                <span className="text-sm font-medium" data-testid="text-requirements-progress">
                  {completedRequirements}/{totalRequirements}
                </span>
              </div>
            </CardContent>
          </Card>
          
          <Card data-testid="card-units-progress">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Qualified Units</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Progress value={unitsProgress} className="flex-1" data-testid="progress-units" />
                <span className="text-sm font-medium" data-testid="text-units-progress">
                  {qualifiedUnits}/{project?.totalUnits || 0}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} data-testid="tabs-project">
        <TabsList data-testid="tabs-list">
          <TabsTrigger value="details" data-testid="tab-details">Project Details</TabsTrigger>
          {!isNew && (
            <>
              <TabsTrigger value="requirements" data-testid="tab-requirements">Requirements</TabsTrigger>
              <TabsTrigger value="units" data-testid="tab-units">Units</TabsTrigger>
              <TabsTrigger value="documents" data-testid="tab-documents">Documents</TabsTrigger>
            </>
          )}
        </TabsList>

        <TabsContent value="details" className="space-y-4" data-testid="tab-content-details">
          <Card data-testid="card-project-form">
            <CardHeader>
              <CardTitle data-testid="text-form-title">Project Information</CardTitle>
              <CardDescription data-testid="text-form-description">
                Enter the basic information for this 45L tax credit project
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" data-testid="form-project">
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="builderId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel data-testid="label-builder">Builder</FormLabel>
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
                            <SelectContent data-testid="select-content-builder">
                              {builders.map((builder) => (
                                <SelectItem key={builder.id} value={builder.id} data-testid={`select-item-builder-${builder.id}`}>
                                  {builder.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage data-testid="error-builder" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="projectName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel data-testid="label-project-name">Project Name</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., Sunrise Development Phase 2" data-testid="input-project-name" />
                          </FormControl>
                          <FormMessage data-testid="error-project-name" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="projectType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel data-testid="label-project-type">Project Type</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-project-type">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent data-testid="select-content-project-type">
                              <SelectItem value="single-family" data-testid="select-item-single-family">Single Family</SelectItem>
                              <SelectItem value="multifamily" data-testid="select-item-multifamily">Multifamily</SelectItem>
                              <SelectItem value="manufactured" data-testid="select-item-manufactured">Manufactured Home</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage data-testid="error-project-type" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="totalUnits"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel data-testid="label-total-units">Total Units</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                              min={1}
                              data-testid="input-total-units"
                            />
                          </FormControl>
                          <FormDescription data-testid="description-total-units">
                            Number of dwelling units in this project
                          </FormDescription>
                          <FormMessage data-testid="error-total-units" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="taxYear"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel data-testid="label-tax-year">Tax Year</FormLabel>
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
                          <FormMessage data-testid="error-tax-year" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="softwareTool"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel data-testid="label-software">Software Tool</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-software">
                                <SelectValue placeholder="Select software" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent data-testid="select-content-software">
                              <SelectItem value="REM/Rate" data-testid="select-item-remrate">REM/Rate</SelectItem>
                              <SelectItem value="EnergyGauge" data-testid="select-item-energygauge">EnergyGauge</SelectItem>
                              <SelectItem value="HERS" data-testid="select-item-hers">HERS</SelectItem>
                              <SelectItem value="Other" data-testid="select-item-other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription data-testid="description-software">
                            Energy modeling software used
                          </FormDescription>
                          <FormMessage data-testid="error-software" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="softwareVersion"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel data-testid="label-software-version">Software Version</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., v2.9.7" data-testid="input-software-version" />
                          </FormControl>
                          <FormMessage data-testid="error-software-version" />
                        </FormItem>
                      )}
                    />

                    {!isNew && (
                      <FormField
                        control={form.control}
                        name="status"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel data-testid="label-status">Status</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-status">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent data-testid="select-content-status">
                                <SelectItem value="pending" data-testid="select-item-pending">Pending</SelectItem>
                                <SelectItem value="certified" data-testid="select-item-certified">Certified</SelectItem>
                                <SelectItem value="claimed" data-testid="select-item-claimed">Claimed</SelectItem>
                                <SelectItem value="denied" data-testid="select-item-denied">Denied</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage data-testid="error-status" />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>

                  <div className="flex justify-end gap-4" data-testid="section-form-actions">
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
            <TabsContent value="requirements" className="space-y-4" data-testid="tab-content-requirements">
              <Card data-testid="card-requirements">
                <CardHeader>
                  <CardTitle data-testid="text-requirements-title">Requirements Checklist</CardTitle>
                  <CardDescription data-testid="text-requirements-description">
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
                          data-testid={`checkbox-requirement-${type.id}`}
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4 text-muted-foreground" />
                            <Label className="text-base font-medium" data-testid={`label-requirement-${type.id}`}>
                              {type.label}
                            </Label>
                            <Badge 
                              variant="outline" 
                              className={getStatusColor(status)}
                              data-testid={`badge-requirement-status-${type.id}`}
                            >
                              {status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1" data-testid={`text-requirement-description-${type.id}`}>
                            {type.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              <Alert data-testid="alert-requirements-info">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription data-testid="text-requirements-info">
                  All requirements must be completed and documented before the project can be certified for the 45L tax credit.
                </AlertDescription>
              </Alert>
            </TabsContent>

            <TabsContent value="units" className="space-y-4" data-testid="tab-content-units">
              <Card data-testid="card-units">
                <CardHeader>
                  <CardTitle data-testid="text-units-title">Unit Certifications</CardTitle>
                  <CardDescription data-testid="text-units-description">
                    Track individual unit test results and qualification status
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {certifications.length === 0 ? (
                    <div className="text-center py-8" data-testid="empty-units">
                      <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground mb-4" data-testid="text-empty-units">No units certified yet</p>
                      <Button data-testid="button-add-unit">
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
                              <div className="font-medium" data-testid={`text-unit-address-${cert.id}`}>
                                {cert.unitAddress}
                              </div>
                              <div className="text-sm text-muted-foreground" data-testid={`text-unit-meta-${cert.id}`}>
                                Unit {cert.unitNumber} • HERS {cert.hersIndex || "N/A"}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {cert.qualified ? (
                              <Badge 
                                className="bg-green-500 text-white"
                                data-testid={`badge-unit-qualified-${cert.id}`}
                              >
                                <CheckCircle className="mr-1 h-3 w-3" />
                                Qualified
                              </Badge>
                            ) : (
                              <Badge 
                                className="bg-red-500 text-white"
                                data-testid={`badge-unit-not-qualified-${cert.id}`}
                              >
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

              <Card data-testid="card-units-summary">
                <CardHeader>
                  <CardTitle data-testid="text-summary-title">Summary Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div data-testid="stat-avg-hers">
                      <Label className="text-sm text-muted-foreground">Average HERS Index</Label>
                      <p className="text-2xl font-bold" data-testid="text-avg-hers">
                        {avgHersIndex ?? "N/A"}
                      </p>
                    </div>
                    <div data-testid="stat-avg-savings">
                      <Label className="text-sm text-muted-foreground">Average Savings</Label>
                      <p className="text-2xl font-bold" data-testid="text-avg-savings">
                        {avgSavings !== null ? `${avgSavings}%` : "N/A"}
                      </p>
                    </div>
                    <div data-testid="stat-potential-credit">
                      <Label className="text-sm text-muted-foreground">Potential Credit</Label>
                      <p className="text-2xl font-bold text-green-600" data-testid="text-potential-credit">
                        ${potentialCredit.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="documents" className="space-y-4" data-testid="tab-content-documents">
              <Card data-testid="card-documents">
                <CardHeader>
                  <CardTitle data-testid="text-documents-title">Project Documents</CardTitle>
                  <CardDescription data-testid="text-documents-description">
                    Upload and manage all required documentation for 45L certification
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {documents.length === 0 ? (
                    <div className="text-center py-8" data-testid="empty-documents">
                      <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground mb-4" data-testid="text-empty-documents">No documents uploaded yet</p>
                      <Button data-testid="button-upload-document">
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
                              <div className="font-medium" data-testid={`text-document-name-${doc.id}`}>
                                {doc.fileName}
                              </div>
                              <div className="text-sm text-muted-foreground" data-testid={`text-document-meta-${doc.id}`}>
                                {doc.documentType} • Uploaded {format(new Date(doc.uploadDate), "MMM d, yyyy")}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="icon" data-testid={`button-download-document-${doc.id}`}>
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" data-testid={`button-delete-document-${doc.id}`}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Alert data-testid="alert-documents-info">
                <FileCheck className="h-4 w-4" />
                <AlertDescription data-testid="text-documents-info">
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

export default function TaxCreditProject() {
  return (
    <ErrorBoundary>
      <TaxCreditProjectContent />
    </ErrorBoundary>
  );
}
