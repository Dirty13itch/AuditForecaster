import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Plus, Wand2 } from "lucide-react";
import type { 
  ReportTemplate, 
  InsertReportTemplate
} from "@shared/schema";

export default function ReportTemplatesPage() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [isCreating, setIsCreating] = useState(false);
  const [newTemplate, setNewTemplate] = useState<Partial<InsertReportTemplate>>({
    name: "",
    description: "",
    category: "custom",
    status: "draft",
    isDefault: false
  });

  // Fetch templates
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["/api/report-templates"],
  });

  // Create template mutation
  const createTemplate = useMutation({
    mutationFn: async (data: Partial<InsertReportTemplate>) => {
      // Get the current user to set the userId
      const userResponse = await fetch("/api/auth/user");
      const userData = userResponse.ok ? await userResponse.json() : null;
      
      const templateData: InsertReportTemplate = {
        name: data.name || "",
        description: data.description || null,
        category: data.category || "custom",
        status: data.status || "draft",
        isDefault: data.isDefault || false,
        userId: userData?.id || null,
        sections: [],
        publishedAt: null
      };
      
      return apiRequest("POST", "/api/report-templates", templateData);
    },
    onSuccess: (newTemplate) => {
      queryClient.invalidateQueries({ queryKey: ["/api/report-templates"] });
      setIsCreating(false);
      setNewTemplate({ name: "", description: "", category: "custom", status: "draft", isDefault: false });
      toast({
        title: "Template created",
        description: "Your report template has been created successfully.",
      });
      // Navigate to the detail page for the newly created template
      navigate(`/report-templates/${(newTemplate as any).id}`);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create template. Please try again.",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Report Templates</h1>
          <p className="text-muted-foreground mt-1">
            Create and manage inspection report templates
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={() => navigate("/report-template-designer")}
            data-testid="button-visual-designer"
          >
            <Wand2 className="h-4 w-4 mr-2" />
            Visual Designer
          </Button>
          <Button onClick={() => setIsCreating(true)} data-testid="button-create-template">
            <Plus className="h-4 w-4 mr-2" />
            Create Template
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Template list */}
        <div className="col-span-3">
          <Card>
            <CardHeader>
              <CardTitle>Templates</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                {isLoading ? (
                  <div>Loading templates...</div>
                ) : !templates || (templates as ReportTemplate[]).length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    No templates yet. Create your first template to get started.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {(templates as ReportTemplate[]).map((template: ReportTemplate) => (
                      <Button
                        key={template.id}
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={() => navigate(`/report-templates/${template.id}`)}
                        data-testid={`button-template-${template.id}`}
                      >
                        <div className="text-left">
                          <div>{template.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {template.category}
                          </div>
                        </div>
                      </Button>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Placeholder message */}
        <div className="col-span-9">
          <Card>
            <CardContent className="flex items-center justify-center h-[600px]">
              <div className="text-center text-muted-foreground">
                <p className="text-lg">Select a template from the list or create a new one to get started.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Create template dialog */}
      <Dialog open={isCreating} onOpenChange={setIsCreating}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Report Template</DialogTitle>
            <DialogDescription>
              Create a new inspection report template
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="template-name">Template Name</Label>
              <Input
                id="template-name"
                value={newTemplate.name}
                onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                placeholder="Enter template name"
                data-testid="input-template-name"
              />
            </div>
            <div>
              <Label htmlFor="template-description">Description</Label>
              <Textarea
                id="template-description"
                value={newTemplate.description || ""}
                onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                placeholder="Enter template description"
                data-testid="input-template-description"
              />
            </div>
            <div>
              <Label htmlFor="template-category">Category</Label>
              <Select
                value={newTemplate.category}
                onValueChange={(value) => setNewTemplate({ ...newTemplate, category: value as any })}
              >
                <SelectTrigger data-testid="select-template-category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="energy_audit">Energy Audit</SelectItem>
                  <SelectItem value="blower_door">Blower Door Test</SelectItem>
                  <SelectItem value="duct_leakage">Duct Leakage</SelectItem>
                  <SelectItem value="final_testing">Final Testing</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreating(false)}
              data-testid="button-cancel-create"
            >
              Cancel
            </Button>
            <Button
              onClick={() => createTemplate.mutate(newTemplate)}
              disabled={!newTemplate.name || createTemplate.isPending}
              data-testid="button-confirm-create"
            >
              {createTemplate.isPending ? "Creating..." : "Create Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
