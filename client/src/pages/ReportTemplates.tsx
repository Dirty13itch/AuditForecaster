import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Plus, Copy, Edit, Trash2, Eye, GripVertical, Settings, ChevronDown, ChevronRight, Save, X } from "lucide-react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { 
  ReportTemplate, 
  TemplateSection, 
  TemplateField,
  InsertReportTemplate,
  InsertTemplateSection,
  InsertTemplateField 
} from "@shared/schema";

// Field type definitions with icons and descriptions - all 15+ field types
const FIELD_TYPES = [
  { value: "text", label: "Text", description: "Single line text input" },
  { value: "textarea", label: "Text Area", description: "Multi-line text input" },
  { value: "number", label: "Number", description: "Numeric input with optional min/max/decimals" },
  { value: "checkbox", label: "Checkbox", description: "Simple true/false checkbox" },
  { value: "select", label: "Dropdown", description: "Select one option from a list" },
  { value: "multiselect", label: "Multi-Select", description: "Select multiple options from a list" },
  { value: "yes_no_na", label: "Yes/No/NA", description: "Three-option radio choice" },
  { value: "scale", label: "Scale", description: "Rating scale (1-5, 1-10, etc.)" },
  { value: "date", label: "Date", description: "Date picker" },
  { value: "time", label: "Time", description: "Time picker" },
  { value: "datetime", label: "Date & Time", description: "Combined date and time picker" },
  { value: "photo", label: "Photo", description: "Single photo capture/upload" },
  { value: "photo_group", label: "Photo Group", description: "Multiple photos with annotations" },
  { value: "signature", label: "Signature", description: "Digital signature capture" },
  { value: "calculation", label: "Calculation", description: "Auto-calculated based on formula" },
  { value: "conditional_calculation", label: "Conditional Calc", description: "Calculated based on conditions" },
];

// Sortable field component
function SortableField({ field, onEdit, onDelete }: { 
  field: TemplateField; 
  onEdit: (field: TemplateField) => void;
  onDelete: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const fieldType = FIELD_TYPES.find(t => t.value === field.fieldType);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 p-3 bg-background border rounded-md hover-elevate"
    >
      <div {...attributes} {...listeners} className="cursor-move">
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">{field.label}</span>
          {field.isRequired && <Badge variant="secondary" className="text-xs">Required</Badge>}
          <Badge variant="outline" className="text-xs">{fieldType?.label}</Badge>
        </div>
        {field.description && (
          <p className="text-sm text-muted-foreground mt-1">{field.description}</p>
        )}
      </div>
      <Button
        size="icon"
        variant="ghost"
        onClick={() => onEdit(field)}
        data-testid={`button-edit-field-${field.id}`}
      >
        <Edit className="h-4 w-4" />
      </Button>
      <Button
        size="icon"
        variant="ghost"
        onClick={() => onDelete(field.id)}
        data-testid={`button-delete-field-${field.id}`}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

// Section component with fields
function TemplateSection({ 
  section, 
  fields,
  onUpdateSection,
  onDeleteSection,
  onAddField,
  onUpdateField,
  onDeleteField,
  onReorderFields
}: {
  section: TemplateSection;
  fields: TemplateField[];
  onUpdateSection: (section: TemplateSection) => void;
  onDeleteSection: (id: string) => void;
  onAddField: (sectionId: string) => void;
  onUpdateField: (field: TemplateField) => void;
  onDeleteField: (fieldId: string) => void;
  onReorderFields: (sectionId: string, newFields: TemplateField[]) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [editingField, setEditingField] = useState<TemplateField | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = fields.findIndex(f => f.id === active.id);
      const newIndex = fields.findIndex(f => f.id === over?.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const newFields = arrayMove(fields, oldIndex, newIndex).map((field, index) => ({
          ...field,
          order_index: index
        }));
        onReorderFields(section.id, newFields);
      }
    }
  };

  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setIsExpanded(!isExpanded)}
              data-testid={`button-toggle-section-${section.id}`}
            >
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
            <div>
              <CardTitle className="text-lg">{section.title}</CardTitle>
              {section.description && (
                <CardDescription className="text-sm mt-1">{section.description}</CardDescription>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {section.isRepeatable && (
              <Badge variant="outline">Repeatable</Badge>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => onAddField(section.id)}
              data-testid={`button-add-field-${section.id}`}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Field
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onDeleteSection(section.id)}
              data-testid={`button-delete-section-${section.id}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      {isExpanded && (
        <CardContent>
          {fields.length > 0 ? (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={fields.map(f => f.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {fields.map(field => (
                    <SortableField
                      key={field.id}
                      field={field}
                      onEdit={setEditingField}
                      onDelete={onDeleteField}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No fields in this section. Click "Add Field" to get started.
            </div>
          )}
        </CardContent>
      )}
      
      {/* Field edit dialog */}
      {editingField && (
        <FieldEditDialog
          field={editingField}
          onSave={(field) => {
            onUpdateField(field);
            setEditingField(null);
          }}
          onCancel={() => setEditingField(null)}
        />
      )}
    </Card>
  );
}

// Field edit dialog
function FieldEditDialog({ 
  field, 
  onSave, 
  onCancel 
}: { 
  field: TemplateField;
  onSave: (field: TemplateField) => void;
  onCancel: () => void;
}) {
  const [editedField, setEditedField] = useState(field);
  const [options, setOptions] = useState<string[]>(
    (field.configuration as any)?.options || []
  );

  const handleSave = () => {
    const updatedField = {
      ...editedField,
      configuration: {
        ...(editedField.configuration || {}),
        ...(["select", "multiselect"].includes(editedField.fieldType) && {
          options
        })
      }
    };
    onSave(updatedField);
  };

  return (
    <Dialog open onOpenChange={onCancel}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Field</DialogTitle>
          <DialogDescription>
            Configure the field properties and behavior
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="field-label">Label</Label>
              <Input
                id="field-label"
                value={editedField.label}
                onChange={(e) => setEditedField({...editedField, label: e.target.value})}
                data-testid="input-field-label"
              />
            </div>
            <div>
              <Label htmlFor="field-placeholder">Placeholder</Label>
              <Input
                id="field-placeholder"
                value={editedField.placeholder || ""}
                onChange={(e) => setEditedField({...editedField, placeholder: e.target.value})}
                data-testid="input-field-placeholder"
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="field-description">Description</Label>
            <Textarea
              id="field-description"
              value={editedField.description || ""}
              onChange={(e) => setEditedField({...editedField, description: e.target.value})}
              placeholder="Optional help text for this field"
              data-testid="textarea-field-description"
            />
          </div>
          
          <div>
            <Label htmlFor="field-type">Field Type</Label>
            <Select
              value={editedField.fieldType}
              onValueChange={(value) => setEditedField({...editedField, fieldType: value as any})}
            >
              <SelectTrigger id="field-type" data-testid="select-field-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FIELD_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    <div>
                      <div>{type.label}</div>
                      <div className="text-xs text-muted-foreground">{type.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Options for select fields */}
          {["select", "multiselect"].includes(editedField.fieldType) && (
            <div>
              <Label>Options</Label>
              <div className="space-y-2 mt-2">
                {options.map((option, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={option}
                      onChange={(e) => {
                        const newOptions = [...options];
                        newOptions[index] = e.target.value;
                        setOptions(newOptions);
                      }}
                      placeholder={`Option ${index + 1}`}
                      data-testid={`input-option-${index}`}
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setOptions(options.filter((_, i) => i !== index))}
                      data-testid={`button-remove-option-${index}`}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setOptions([...options, ""])}
                  data-testid="button-add-option"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Option
                </Button>
              </div>
            </div>
          )}
          
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={editedField.isRequired || false}
                onChange={(e) => setEditedField({...editedField, isRequired: e.target.checked})}
                data-testid="checkbox-required"
              />
              <span>Required field</span>
            </label>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave} data-testid="button-save-field">
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function ReportTemplatesPage() {
  const { toast } = useToast();
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newTemplate, setNewTemplate] = useState<Partial<InsertReportTemplate>>({
    name: "",
    description: "",
    category: "custom",
    status: "draft",
    isDefault: false
  });
  
  // Local state for editing template
  const [editingSections, setEditingSections] = useState<TemplateSection[]>([]);
  const [editingFields, setEditingFields] = useState<Record<string, TemplateField[]>>({});

  // Fetch templates
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["/api/report-templates"],
  });

  // Fetch sections and fields when a template is selected
  const { data: sections = [] } = useQuery({
    queryKey: ["/api/report-templates", selectedTemplate?.id, "sections"],
    enabled: !!selectedTemplate?.id,
  });

  const { data: fields = [] } = useQuery({
    queryKey: ["/api/report-templates", selectedTemplate?.id, "fields"],
    enabled: !!selectedTemplate?.id,
  });

  // Group fields by section
  useEffect(() => {
    if (sections && Array.isArray(sections) && sections.length > 0 && fields && Array.isArray(fields) && fields.length > 0) {
      setEditingSections(sections as TemplateSection[]);
      const grouped: Record<string, TemplateField[]> = {};
      (sections as TemplateSection[]).forEach(section => {
        grouped[section.id] = (fields as TemplateField[])
          .filter((f: TemplateField) => f.sectionId === section.id)
          .sort((a: TemplateField, b: TemplateField) => a.orderIndex - b.orderIndex);
      });
      setEditingFields(grouped);
    }
  }, [sections, fields]);

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
      
      return apiRequest("/api/report-templates", "POST", templateData);
    },
    onSuccess: (newTemplate) => {
      queryClient.invalidateQueries({ queryKey: ["/api/report-templates"] });
      setSelectedTemplate(newTemplate as unknown as ReportTemplate);
      setIsCreating(false);
      setNewTemplate({ name: "", description: "", category: "custom", status: "draft", isDefault: false });
      toast({
        title: "Template created",
        description: "Your report template has been created successfully.",
      });
    },
    onError: (error) => {
      console.error("Failed to create template:", error);
      toast({
        title: "Error",
        description: "Failed to create template. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update template mutation
  const updateTemplate = useMutation({
    mutationFn: ({ id, ...data }: ReportTemplate) => 
      apiRequest(`/api/report-templates/${id}`, "PATCH", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/report-templates"] });
      toast({
        title: "Template updated",
        description: "Your changes have been saved.",
      });
    },
  });

  // Delete template mutation
  const deleteTemplate = useMutation({
    mutationFn: (id: string) => 
      apiRequest(`/api/report-templates/${id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/report-templates"] });
      setSelectedTemplate(null);
      toast({
        title: "Template deleted",
        description: "The template has been deleted successfully.",
      });
    },
  });

  // Add section
  const handleAddSection = () => {
    if (!selectedTemplate) return;
    
    const newSection: TemplateSection = {
      id: `temp-${Date.now()}`,
      templateId: selectedTemplate.id,
      parentSectionId: null,
      title: "New Section",
      description: "",
      orderIndex: editingSections.length,
      isRepeatable: false,
      minRepetitions: 1,
      maxRepetitions: null,
      createdAt: null,
      updatedAt: null
    };
    
    setEditingSections([...editingSections, newSection]);
    setEditingFields({ ...editingFields, [newSection.id]: [] });
  };

  // Add field to section
  const handleAddField = (sectionId: string) => {
    const sectionFields = editingFields[sectionId] || [];
    const newField: TemplateField = {
      id: `temp-field-${Date.now()}`,
      sectionId: sectionId,
      label: "New Field",
      fieldType: "text",
      description: "",
      placeholder: null,
      isRequired: false,
      isVisible: true,
      orderIndex: sectionFields.length,
      configuration: {},
      validationRules: null,
      conditionalLogic: null,
      defaultValue: null,
      createdAt: null,
      updatedAt: null
    };
    
    setEditingFields({
      ...editingFields,
      [sectionId]: [...sectionFields, newField]
    });
  };

  // Save all changes
  const handleSaveChanges = async () => {
    if (!selectedTemplate) return;

    try {
      // Save sections
      for (const section of editingSections) {
        if (section.id.startsWith("temp-")) {
          // Create new section
          const { id, ...data } = section;
          await apiRequest("/api/report-templates/sections", "POST", data);
        } else {
          // Update existing section
          await apiRequest(`/api/report-templates/sections/${section.id}`, "PATCH", section);
        }
      }

      // Save fields
      for (const sectionId in editingFields) {
        for (const field of editingFields[sectionId]) {
          if (field.id.startsWith("temp-")) {
            // Create new field
            const { id, ...data } = field;
            await apiRequest("/api/report-templates/fields", "POST", data);
          } else {
            // Update existing field
            await apiRequest(`/api/report-templates/fields/${field.id}`, "PATCH", field);
          }
        }
      }

      queryClient.invalidateQueries({ queryKey: ["/api/report-templates"] });
      toast({
        title: "Changes saved",
        description: "All template changes have been saved successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save changes. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Report Templates</h1>
          <p className="text-muted-foreground mt-1">
            Create and manage inspection report templates
          </p>
        </div>
        <Button onClick={() => setIsCreating(true)} data-testid="button-create-template">
          <Plus className="h-4 w-4 mr-2" />
          Create Template
        </Button>
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
                        variant={selectedTemplate?.id === template.id ? "default" : "ghost"}
                        className="w-full justify-start"
                        onClick={() => setSelectedTemplate(template)}
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

        {/* Template builder */}
        <div className="col-span-9">
          {selectedTemplate ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{selectedTemplate.name}</CardTitle>
                    <CardDescription>{selectedTemplate.description}</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      onClick={handleSaveChanges}
                      data-testid="button-save-template"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        if (confirm("Are you sure you want to delete this template?")) {
                          deleteTemplate.mutate(selectedTemplate.id);
                        }
                      }}
                      data-testid="button-delete-template"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">Sections</h3>
                    <Button
                      size="sm"
                      onClick={handleAddSection}
                      data-testid="button-add-section"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Section
                    </Button>
                  </div>
                  
                  <ScrollArea className="h-[500px]">
                    {editingSections.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        No sections yet. Click "Add Section" to create your first section.
                      </div>
                    ) : (
                      editingSections.map(section => (
                        <TemplateSection
                          key={section.id}
                          section={section}
                          fields={editingFields[section.id] || []}
                          onUpdateSection={(updated) => {
                            setEditingSections(editingSections.map(s => 
                              s.id === updated.id ? updated : s
                            ));
                          }}
                          onDeleteSection={(id) => {
                            setEditingSections(editingSections.filter(s => s.id !== id));
                            const newFields = { ...editingFields };
                            delete newFields[id];
                            setEditingFields(newFields);
                          }}
                          onAddField={handleAddField}
                          onUpdateField={(field) => {
                            setEditingFields({
                              ...editingFields,
                              [field.sectionId]: editingFields[field.sectionId].map(f =>
                                f.id === field.id ? field : f
                              )
                            });
                          }}
                          onDeleteField={(fieldId) => {
                            const sectionId = Object.keys(editingFields).find(sid =>
                              editingFields[sid].some(f => f.id === fieldId)
                            );
                            if (sectionId) {
                              setEditingFields({
                                ...editingFields,
                                [sectionId]: editingFields[sectionId].filter(f => f.id !== fieldId)
                              });
                            }
                          }}
                          onReorderFields={(sectionId, newFields) => {
                            setEditingFields({
                              ...editingFields,
                              [sectionId]: newFields
                            });
                          }}
                        />
                      ))
                    )}
                  </ScrollArea>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-[600px]">
                <div className="text-center">
                  <h3 className="text-lg font-semibold mb-2">No template selected</h3>
                  <p className="text-muted-foreground">
                    Select a template from the list or create a new one to get started.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Create template dialog */}
      <Dialog open={isCreating} onOpenChange={setIsCreating}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Template</DialogTitle>
            <DialogDescription>
              Enter the basic information for your new report template.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="template-name">Template Name</Label>
              <Input
                id="template-name"
                value={newTemplate.name}
                onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                placeholder="e.g., Home Energy Audit"
                data-testid="input-template-name"
              />
            </div>
            <div>
              <Label htmlFor="template-description">Description</Label>
              <Textarea
                id="template-description"
                value={newTemplate.description || ""}
                onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                placeholder="Describe what this template is for..."
                data-testid="textarea-template-description"
              />
            </div>
            <div>
              <Label htmlFor="template-category">Category</Label>
              <Select
                value={newTemplate.category}
                onValueChange={(value) => setNewTemplate({ ...newTemplate, category: value as any })}
              >
                <SelectTrigger id="template-category" data-testid="select-template-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pre_drywall">Pre-Drywall</SelectItem>
                  <SelectItem value="final">Final</SelectItem>
                  <SelectItem value="duct_testing">Duct Testing</SelectItem>
                  <SelectItem value="blower_door">Blower Door</SelectItem>
                  <SelectItem value="pre_insulation">Pre-Insulation</SelectItem>
                  <SelectItem value="post_insulation">Post-Insulation</SelectItem>
                  <SelectItem value="rough_in">Rough In</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreating(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createTemplate.mutate(newTemplate as InsertReportTemplate)}
              disabled={!newTemplate.name || createTemplate.isPending}
              data-testid="button-create-template-confirm"
            >
              Create Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}