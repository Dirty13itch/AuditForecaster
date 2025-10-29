import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Edit, FileText, Package, Calendar, User } from "lucide-react";
import type { ReportTemplate } from "@shared/schema";

export default function ReportTemplateDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: template, isLoading, error } = useQuery<ReportTemplate>({
    queryKey: ["/api/report-templates", id],
  });

  const createReportMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/report-instances", {
        templateId: template.id,
        templateVersion: template.version || 1,
        status: "draft"
      });
      return response;
    },
    onSuccess: (data: any) => {
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading template...</p>
        </div>
      </div>
    );
  }

  if (error || !template) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Template Not Found</CardTitle>
            <CardDescription>
              The report template you're looking for doesn't exist or has been deleted.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setLocation("/report-templates")} data-testid="button-back-to-templates">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Templates
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const components = (template.components as any[] | null) || [];
  const categoryLabel = template.category
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  const statusColor = {
    draft: "bg-yellow-500",
    published: "bg-green-500",
    archived: "bg-gray-500",
  }[template.status] || "bg-gray-500";

  return (
    <div className="h-screen flex flex-col">
      <div className="border-b bg-card p-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/report-templates")}
              data-testid="button-back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold" data-testid="text-template-name">
                {template.name}
              </h1>
              <p className="text-sm text-muted-foreground">Version {template.version}</p>
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
            <Card>
              <CardHeader>
                <CardTitle>Template Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 text-sm font-medium mb-1">
                    <FileText className="h-4 w-4" />
                    Description
                  </div>
                  <p className="text-sm text-muted-foreground" data-testid="text-description">
                    {template.description || "No description provided"}
                  </p>
                </div>

                <Separator />

                <div>
                  <div className="flex items-center gap-2 text-sm font-medium mb-1">
                    <Package className="h-4 w-4" />
                    Inspection Type
                  </div>
                  <p className="text-sm" data-testid="text-inspection-type">
                    {categoryLabel}
                  </p>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-medium mb-1">
                      <Calendar className="h-4 w-4" />
                      Created
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {new Date(template.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 text-sm font-medium mb-1">
                      <Calendar className="h-4 w-4" />
                      Updated
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {new Date(template.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Manage this template or create a new report</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  className="w-full"
                  onClick={() => createReportMutation.mutate()}
                  disabled={createReportMutation.isPending}
                  data-testid="button-create-report"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  {createReportMutation.isPending ? "Creating..." : "Create Report from This Template"}
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setLocation(`/report-template-designer/${template.id}`)}
                  data-testid="button-edit-template"
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Template
                </Button>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Template Components</CardTitle>
              <CardDescription>
                {components.length === 0
                  ? "This template uses the legacy fields system"
                  : `${components.length} component${components.length !== 1 ? "s" : ""} defined`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {components.length > 0 ? (
                <ScrollArea className="h-96">
                  <div className="space-y-3" data-testid="list-components">
                    {components.map((component: any, index: number) => (
                      <Card key={component.id || index} className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-xs">
                                {component.type}
                              </Badge>
                              {component.properties?.required && (
                                <Badge variant="destructive" className="text-xs">
                                  Required
                                </Badge>
                              )}
                            </div>
                            <p className="font-medium" data-testid={`text-component-${index}`}>
                              {component.properties?.label || `Component ${index + 1}`}
                            </p>
                            {component.properties?.description && (
                              <p className="text-sm text-muted-foreground mt-1">
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
                <div className="text-center py-12 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>This template uses the legacy fields system.</p>
                  <p className="text-sm mt-2">
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
