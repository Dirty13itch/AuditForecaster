import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useMemo, useCallback } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ArrowLeft, Edit, FileText, Package, Calendar, AlertCircle, RefreshCw } from "lucide-react";
import type { ReportTemplate } from "@shared/schema";

function ReportTemplateDetailContent() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { 
    data: template, 
    isLoading,
    error,
    refetch
  } = useQuery<ReportTemplate>({
    queryKey: ["/api/report-templates", id],
    retry: 2,
  });

  const createReportMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/report-instances", {
        templateId: template?.id,
        templateVersion: template?.version || 1,
        status: "draft"
      });
      return response;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/report-instances"] });
      setLocation(`/reports/fillout/${data.id}`);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create report instance. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Memoized callbacks
  const handleBackToTemplates = useCallback(() => {
    setLocation("/report-templates");
  }, [setLocation]);

  const handleEditTemplate = useCallback(() => {
    if (template) {
      setLocation(`/report-template-designer/${template.id}`);
    }
  }, [template, setLocation]);

  const handleCreateReport = useCallback(() => {
    createReportMutation.mutate();
  }, [createReportMutation]);

  // Memoized computed values
  const components = useMemo(() => 
    (template?.components as any[] | null) || [],
    [template]
  );

  const categoryLabel = useMemo(() => 
    template?.category
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ") || "",
    [template?.category]
  );

  const statusColor = useMemo(() => {
    if (!template) return "bg-gray-500";
    return {
      draft: "bg-yellow-500",
      published: "bg-green-500",
      archived: "bg-gray-500",
    }[template.status] || "bg-gray-500";
  }, [template]);

  const formattedCreatedDate = useMemo(() =>
    template ? new Date(template.createdAt).toLocaleDateString() : "",
    [template?.createdAt]
  );

  const formattedUpdatedDate = useMemo(() =>
    template ? new Date(template.updatedAt).toLocaleDateString() : "",
    [template?.updatedAt]
  );

  // Loading state with skeleton loaders
  if (isLoading) {
    return (
      <div className="h-screen flex flex-col" data-testid="skeleton-detail">
        <div className="border-b bg-card p-4">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <div className="flex items-center gap-4">
              <Skeleton className="h-10 w-10 rounded" />
              <div>
                <Skeleton className="h-8 w-64 mb-2" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-20" />
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto p-6 space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Skeleton className="h-64" />
              <Skeleton className="h-64" />
            </div>
            <Skeleton className="h-96" />
          </div>
        </div>
      </div>
    );
  }

  // Error state with retry button
  if (error || !template) {
    return (
      <div className="flex items-center justify-center h-screen p-4" data-testid="error-detail">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Template Not Found</AlertTitle>
          <AlertDescription className="space-y-4">
            <p>
              {error 
                ? error instanceof Error 
                  ? error.message 
                  : "Failed to load template"
                : "The template you're looking for doesn't exist or has been deleted."}
            </p>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => refetch()}
                className="flex-1"
                data-testid="button-retry-template"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
              <Button 
                variant="outline"
                onClick={handleBackToTemplates} 
                className="flex-1"
                data-testid="button-back-to-templates"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col" data-testid="page-detail">
      <div className="border-b bg-card p-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBackToTemplates}
              data-testid="button-back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold" data-testid="text-template-name">
                {template.name}
              </h1>
              <p className="text-sm text-muted-foreground" data-testid="text-template-version">
                Version {template.version}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={statusColor} data-testid="badge-status">
              {template.status.charAt(0).toUpperCase() + template.status.slice(1)}
            </Badge>
            {template.isDefault && (
              <Badge variant="outline" data-testid="badge-default">
                Default
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-6 space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card data-testid="card-template-info">
              <CardHeader>
                <CardTitle data-testid="text-info-title">Template Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 text-sm font-medium mb-1" data-testid="label-description">
                    <FileText className="h-4 w-4" />
                    Description
                  </div>
                  <p className="text-sm text-muted-foreground" data-testid="text-description">
                    {template.description || "No description provided"}
                  </p>
                </div>

                <Separator data-testid="separator-1" />

                <div>
                  <div className="flex items-center gap-2 text-sm font-medium mb-1" data-testid="label-inspection-type">
                    <Package className="h-4 w-4" />
                    Inspection Type
                  </div>
                  <p className="text-sm" data-testid="text-inspection-type">
                    {categoryLabel}
                  </p>
                </div>

                <Separator data-testid="separator-2" />

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-medium mb-1" data-testid="label-created">
                      <Calendar className="h-4 w-4" />
                      Created
                    </div>
                    <p className="text-sm text-muted-foreground" data-testid="text-created-date">
                      {formattedCreatedDate}
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 text-sm font-medium mb-1" data-testid="label-updated">
                      <Calendar className="h-4 w-4" />
                      Updated
                    </div>
                    <p className="text-sm text-muted-foreground" data-testid="text-updated-date">
                      {formattedUpdatedDate}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-quick-actions">
              <CardHeader>
                <CardTitle data-testid="text-actions-title">Quick Actions</CardTitle>
                <CardDescription data-testid="text-actions-description">
                  Manage this template or create a new report
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  className="w-full"
                  onClick={handleCreateReport}
                  disabled={createReportMutation.isPending}
                  data-testid="button-create-report"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  {createReportMutation.isPending ? "Creating..." : "Create Report from This Template"}
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleEditTemplate}
                  data-testid="button-edit-template"
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Template
                </Button>
              </CardContent>
            </Card>
          </div>

          <Card data-testid="card-components">
            <CardHeader>
              <CardTitle data-testid="text-components-title">Template Components</CardTitle>
              <CardDescription data-testid="text-components-description">
                {components.length === 0
                  ? "This template uses the legacy fields system"
                  : `${components.length} component${components.length !== 1 ? "s" : ""} defined`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {components.length > 0 ? (
                <ScrollArea className="h-96" data-testid="scroll-components">
                  <div className="space-y-3" data-testid="list-components">
                    {components.map((component: any, index: number) => (
                      <Card key={component.id || index} className="p-4" data-testid={`card-component-${index}`}>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-xs" data-testid={`badge-type-${index}`}>
                                {component.type}
                              </Badge>
                              {component.properties?.required && (
                                <Badge variant="destructive" className="text-xs" data-testid={`badge-required-${index}`}>
                                  Required
                                </Badge>
                              )}
                            </div>
                            <p className="font-medium" data-testid={`text-component-label-${index}`}>
                              {component.properties?.label || `Component ${index + 1}`}
                            </p>
                            {component.properties?.description && (
                              <p className="text-sm text-muted-foreground mt-1" data-testid={`text-component-desc-${index}`}>
                                {component.properties.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-12 text-muted-foreground" data-testid="empty-components">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p data-testid="text-empty-message">This template uses the legacy fields system.</p>
                  <p className="text-sm mt-2" data-testid="text-empty-explanation">
                    Components are stored in the fields table instead of the JSON components field.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function ReportTemplateDetail() {
  return (
    <ErrorBoundary>
      <ReportTemplateDetailContent />
    </ErrorBoundary>
  );
}
