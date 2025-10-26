import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Camera, Save, Send, ChevronDown, ChevronRight, Signature, FileText, CheckCircle, Clock, AlertCircle, Calculator, Eye, EyeOff, WifiOff, Cloud, CloudOff } from "lucide-react";
import { indexedDB } from "@/utils/indexedDB";
import { syncQueue } from "@/utils/syncQueue";
import { format } from "date-fns";
import { ConditionalLogicEngine } from "@/utils/conditionalLogic";
import type { 
  ReportInstance,
  ReportFieldValue,
  TemplateSection,
  TemplateField,
  FieldDependency
} from "@shared/schema";

interface SectionInstanceData {
  sectionId: string;
  instanceIndex: number;
  fieldValues: Record<string, any>;
}

function FieldInput({ 
  field, 
  value, 
  onChange, 
  disabled = false 
}: { 
  field: TemplateField;
  value: any;
  onChange: (value: any) => void;
  disabled?: boolean;
}) {
  const [date, setDate] = useState<Date | undefined>(value ? new Date(value) : undefined);

  switch (field.fieldType) {
    case "text":
      return (
        <Input
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder || ""}
          disabled={disabled}
          data-testid={`input-field-${field.id}`}
        />
      );

    case "textarea":
      return (
        <Textarea
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder || ""}
          disabled={disabled}
          rows={4}
          data-testid={`textarea-field-${field.id}`}
        />
      );

    case "number":
      return (
        <Input
          type="number"
          value={value || ""}
          onChange={(e) => onChange(e.target.value ? parseFloat(e.target.value) : null)}
          placeholder={field.placeholder || ""}
          disabled={disabled}
          data-testid={`input-number-${field.id}`}
        />
      );

    case "select":
      return (
        <Select
          value={value || ""}
          onValueChange={onChange}
          disabled={disabled}
        >
          <SelectTrigger data-testid={`select-field-${field.id}`}>
            <SelectValue placeholder={field.placeholder || "Select an option"} />
          </SelectTrigger>
          <SelectContent>
            {(field.configuration as any)?.options?.map((option: string) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );

    case "multiselect":
      const selectedValues = value ? (Array.isArray(value) ? value : [value]) : [];
      return (
        <div className="space-y-2">
          {(field.configuration as any)?.options?.map((option: string) => (
            <label key={option} className="flex items-center gap-2">
              <Checkbox
                checked={selectedValues.includes(option)}
                onCheckedChange={(checked) => {
                  if (checked) {
                    onChange([...selectedValues, option]);
                  } else {
                    onChange(selectedValues.filter((v: string) => v !== option));
                  }
                }}
                disabled={disabled}
                data-testid={`checkbox-option-${field.id}-${option}`}
              />
              <span>{option}</span>
            </label>
          ))}
        </div>
      );

    case "yes_no_na":
      return (
        <RadioGroup
          value={value || ""}
          onValueChange={onChange}
          disabled={disabled}
        >
          <div className="flex items-center space-x-4">
            <label className="flex items-center gap-2">
              <RadioGroupItem value="yes" />
              <span>Yes</span>
            </label>
            <label className="flex items-center gap-2">
              <RadioGroupItem value="no" />
              <span>No</span>
            </label>
            <label className="flex items-center gap-2">
              <RadioGroupItem value="na" />
              <span>N/A</span>
            </label>
          </div>
        </RadioGroup>
      );

    case "scale":
      const scaleMin = (field.configuration as any)?.min || 1;
      const scaleMax = (field.configuration as any)?.max || 5;
      return (
        <RadioGroup
          value={value?.toString() || ""}
          onValueChange={(v) => onChange(parseInt(v))}
          disabled={disabled}
        >
          <div className="flex items-center space-x-2">
            {Array.from({ length: scaleMax - scaleMin + 1 }, (_, i) => scaleMin + i).map(n => (
              <label key={n} className="flex items-center gap-1">
                <RadioGroupItem value={n.toString()} />
                <span>{n}</span>
              </label>
            ))}
          </div>
        </RadioGroup>
      );

    case "date":
      return (
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-start text-left font-normal"
              disabled={disabled}
              data-testid={`button-date-${field.id}`}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {date ? format(date, "PPP") : <span>Pick a date</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={date}
              onSelect={(newDate) => {
                setDate(newDate);
                onChange(newDate?.toISOString());
              }}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      );

    case "time":
      return (
        <Input
          type="time"
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          data-testid={`input-time-${field.id}`}
        />
      );

    case "datetime":
      return (
        <Input
          type="datetime-local"
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          data-testid={`input-datetime-${field.id}`}
        />
      );

    case "photo":
      return (
        <div className="space-y-2">
          <Button
            variant="outline"
            className="w-full"
            disabled={disabled}
            data-testid={`button-photo-${field.id}`}
          >
            <Camera className="mr-2 h-4 w-4" />
            Capture/Upload Photo
          </Button>
          {value && (
            <div className="text-sm text-muted-foreground">
              {Array.isArray(value) ? `${value.length} photos attached` : "1 photo attached"}
            </div>
          )}
        </div>
      );

    case "signature":
      return (
        <div className="space-y-2">
          <Button
            variant="outline"
            className="w-full"
            disabled={disabled}
            data-testid={`button-signature-${field.id}`}
          >
            <Signature className="mr-2 h-4 w-4" />
            Add Signature
          </Button>
          {value && (
            <div className="text-sm text-muted-foreground">
              Signature captured
            </div>
          )}
        </div>
      );

    case "calculation":
      return (
        <div className="p-3 bg-muted rounded-md">
          <span className="font-mono">{value || "—"}</span>
        </div>
      );

    default:
      return (
        <div className="text-muted-foreground">
          Unsupported field type: {field.fieldType}
        </div>
      );
  }
}

function SectionInstance({
  section,
  fields,
  instanceData,
  fieldStates,
  onFieldChange,
  isExpanded,
  onToggleExpanded
}: {
  section: TemplateSection;
  fields: TemplateField[];
  instanceData: SectionInstanceData;
  fieldStates: Record<string, { visible: boolean; required: boolean; enabled: boolean; value: any }>;
  onFieldChange: (sectionId: string, instanceIndex: number, fieldId: string, value: any) => void;
  isExpanded: boolean;
  onToggleExpanded: () => void;
}) {
  // Filter fields based on visibility
  const visibleFields = fields.filter(field => {
    const state = fieldStates[field.id];
    return !state || state.visible !== false;
  });

  return (
    <Card className="mb-4">
      <CardHeader
        className="cursor-pointer"
        onClick={onToggleExpanded}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button size="icon" variant="ghost">
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
            <div>
              <CardTitle className="text-lg">{section.title}</CardTitle>
              {section.description && (
                <CardDescription className="text-sm mt-1">{section.description}</CardDescription>
              )}
            </div>
          </div>
          {section.isRepeatable && (
            <Badge variant="outline">Instance {instanceData.instanceIndex + 1}</Badge>
          )}
        </div>
      </CardHeader>
      
      {isExpanded && (
        <CardContent>
          <div className="space-y-4">
            {visibleFields.map(field => {
              const state = fieldStates[field.id] || { visible: true, required: field.isRequired, enabled: true, value: null };
              const isCalculated = field.fieldType === "calculation" || field.fieldType === "conditional_calculation";
              
              return (
                <div 
                  key={field.id} 
                  className={`transition-all duration-200 ${state.visible ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}`}
                >
                  <Label htmlFor={`field-${field.id}`} className="flex items-center gap-2">
                    {field.label}
                    {state.required && <span className="text-destructive">*</span>}
                    {isCalculated && <Calculator className="h-3 w-3 text-muted-foreground" />}
                    {!state.enabled && <EyeOff className="h-3 w-3 text-muted-foreground" />}
                  </Label>
                  {field.description && (
                    <p className="text-sm text-muted-foreground mb-2">{field.description}</p>
                  )}
                  <FieldInput
                    field={field}
                    value={isCalculated ? state.value : instanceData.fieldValues[field.id]}
                    onChange={(value) => onFieldChange(section.id, instanceData.instanceIndex, field.id, value)}
                    disabled={!state.enabled || isCalculated}
                  />
                  {field.conditions && (
                    <p className="text-xs text-muted-foreground mt-1">
                      <Eye className="inline h-3 w-3 mr-1" />
                      This field has conditional visibility
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

export default function ReportFilloutPage() {
  const { toast } = useToast();
  const { id } = useParams<{ id: string }>();
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [sectionInstances, setSectionInstances] = useState<SectionInstanceData[]>([]);
  const [fieldValues, setFieldValues] = useState<Record<string, any>>({});
  const [fieldStates, setFieldStates] = useState<Record<string, { visible: boolean; required: boolean; enabled: boolean; value: any }>>({});
  const [conditionalEngine, setConditionalEngine] = useState<ConditionalLogicEngine | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [unsavedChanges, setUnsavedChanges] = useState(false);

  // Fetch report instance
  const { data: reportInstance, isLoading: isLoadingInstance } = useQuery<ReportInstance>({
    queryKey: ["/api/report-instances", id],
    enabled: !!id,
  });

  // Fetch template sections
  const { data: sections = [], isLoading: isLoadingSections } = useQuery<TemplateSection[]>({
    queryKey: ["/api/report-templates", reportInstance?.templateId, "sections"],
    enabled: !!reportInstance?.templateId,
  });

  // Fetch template fields
  const { data: fields = [], isLoading: isLoadingFields } = useQuery<TemplateField[]>({
    queryKey: ["/api/report-templates", reportInstance?.templateId, "fields"],
    enabled: !!reportInstance?.templateId,
  });

  // Fetch field dependencies
  const { data: dependencies = [] } = useQuery<FieldDependency[]>({
    queryKey: ["/api/templates", reportInstance?.templateId, "dependencies"],
    enabled: !!reportInstance?.templateId,
  });

  // Fetch existing field values
  const { data: existingValues = [] } = useQuery<ReportFieldValue[]>({
    queryKey: ["/api/report-instances", id, "field-values"],
    enabled: !!id,
  });

  // Initialize section instances and field values
  useEffect(() => {
    if (sections.length > 0) {
      const instances: SectionInstanceData[] = [];
      const values: Record<string, any> = {};
      
      sections.forEach((section) => {
        const numInstances = section.isRepeatable ? (section.minRepetitions || 1) : 1;
        for (let i = 0; i < numInstances; i++) {
          instances.push({
            sectionId: section.id,
            instanceIndex: i,
            fieldValues: {}
          });
        }
        // Expand all sections by default
        setExpandedSections(prev => new Set([...Array.from(prev), section.id]));
      });
      
      setSectionInstances(instances);
      
      // Load existing values
      existingValues.forEach((value) => {
        values[value.templateFieldId] = value.textValue || value.numberValue || value.booleanValue || value.dateValue || value.jsonValue;
      });
      
      setFieldValues(values);
    }
  }, [sections, existingValues]);

  // Initialize conditional logic engine
  useEffect(() => {
    if (fields.length > 0) {
      const engine = new ConditionalLogicEngine(
        fields,
        dependencies || [],
        fieldValues,
        false // Set to true for debug mode
      );
      setConditionalEngine(engine);
      
      // Get initial field states
      const states = engine.getFieldStates();
      const stateMap: Record<string, any> = {};
      states.forEach((state, fieldId) => {
        stateMap[fieldId] = state;
      });
      setFieldStates(stateMap);
    }
  }, [fields, dependencies, fieldValues]);

  // Save field value mutation
  const saveFieldValue = useMutation({
    mutationFn: (data: any) => 
      apiRequest("/api/report-field-values", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/report-instances", id, "field-values"] });
    },
  });

  // Update report status mutation
  const updateStatus = useMutation({
    mutationFn: (status: string) => 
      apiRequest(`/api/report-instances/${id}`, "PATCH", { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/report-instances", id] });
      toast({
        title: "Status updated",
        description: "Report status has been updated successfully.",
      });
    },
  });

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (unsavedChanges) {
        toast({
          title: "Back online",
          description: "Syncing your changes...",
        });
        syncQueue.processQueue();
      }
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      toast({
        title: "Working offline",
        description: "Your changes will be saved locally and synced when online",
        variant: "default",
      });
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [toast, unsavedChanges]);
  
  // Auto-save to IndexedDB
  const saveToIndexedDB = useCallback(async () => {
    if (id && reportInstance) {
      await indexedDB.saveReportInstance({
        id,
        templateId: reportInstance.templateId,
        fieldValues,
        status: reportInstance.status,
        lastSaved: new Date().toISOString(),
      });
      setLastSaved(new Date());
    }
  }, [id, reportInstance, fieldValues]);
  
  // Auto-save every 30 seconds if there are unsaved changes
  useEffect(() => {
    if (unsavedChanges) {
      const timer = setTimeout(() => {
        saveToIndexedDB();
        setUnsavedChanges(false);
      }, 30000);
      
      return () => clearTimeout(timer);
    }
  }, [unsavedChanges, saveToIndexedDB]);
  
  // Load from IndexedDB on mount if offline
  useEffect(() => {
    const loadOfflineData = async () => {
      if (!isOnline && id) {
        const offlineData = await indexedDB.getReportInstance(id);
        if (offlineData) {
          setFieldValues(offlineData.fieldValues || {});
          toast({
            title: "Loaded offline data",
            description: `Last saved: ${format(new Date(offlineData.lastSaved), 'PPp')}`,
          });
        }
      }
    };
    
    loadOfflineData();
  }, [id, isOnline, toast]);

  const handleFieldChange = (sectionId: string, instanceIndex: number, fieldId: string, value: any) => {
    // Update local state
    const newFieldValues = {
      ...fieldValues,
      [fieldId]: value
    };
    setFieldValues(newFieldValues);
    setUnsavedChanges(true);
    
    // Update conditional logic engine and evaluate conditions
    if (conditionalEngine) {
      conditionalEngine.updateFieldValue(fieldId, value);
      const states = conditionalEngine.getFieldStates();
      const stateMap: Record<string, any> = {};
      states.forEach((state, fId) => {
        stateMap[fId] = state;
      });
      setFieldStates(stateMap);
    }
    
    // Save to backend (will be queued if offline)
    const fieldData: any = {
      reportInstanceId: id,
      templateFieldId: fieldId,
    };
    
    // Set the appropriate value field based on type
    const field = fields.find((f) => f.id === fieldId);
    if (field) {
      switch (field.fieldType) {
        case "number":
        case "scale":
          fieldData.numberValue = value;
          break;
        case "date":
        case "datetime":
          fieldData.dateValue = value;
          break;
        case "multiselect":
        case "photo":
          fieldData.jsonValue = value;
          break;
        case "yes_no_na":
          fieldData.textValue = value;
          fieldData.booleanValue = value === "yes";
          break;
        default:
          fieldData.textValue = value;
      }
    }
    
    saveFieldValue.mutate(fieldData);
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  const handleSave = () => {
    updateStatus.mutate("in_progress");
  };

  const handleSubmit = () => {
    updateStatus.mutate("completed");
  };

  if (isLoadingInstance || isLoadingSections || isLoadingFields) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
          <p className="text-muted-foreground">Loading report...</p>
        </div>
      </div>
    );
  }

  if (!reportInstance) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex items-center justify-center h-64">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Report not found</h3>
              <p className="text-muted-foreground mb-4">
                The report instance you're looking for doesn't exist.
              </p>
              <Link href="/reports">
                <Button>Back to Reports</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "draft":
        return <Clock className="h-4 w-4" />;
      case "in_progress":
        return <Clock className="h-4 w-4" />;
      case "completed":
        return <CheckCircle className="h-4 w-4" />;
      case "submitted":
        return <Send className="h-4 w-4" />;
      case "approved":
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case "completed":
      case "approved":
        return "default";
      case "draft":
        return "secondary";
      default:
        return "outline";
    }
  };

  // Group fields by section
  const fieldsBySection: Record<string, TemplateField[]> = {};
  fields.forEach((field) => {
    if (!fieldsBySection[field.sectionId]) {
      fieldsBySection[field.sectionId] = [];
    }
    fieldsBySection[field.sectionId].push(field);
  });

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Report #{reportInstance.id.slice(0, 8)}</h1>
            <p className="text-muted-foreground mt-1">
              Job: {reportInstance.jobId} | Template: v{reportInstance.templateVersion}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={getStatusVariant(reportInstance.status)}>
              <span className="mr-1">{getStatusIcon(reportInstance.status)}</span>
              {reportInstance.status}
            </Badge>
            <Button
              variant="outline"
              onClick={handleSave}
              disabled={updateStatus.isPending}
              data-testid="button-save-report"
            >
              <Save className="h-4 w-4 mr-2" />
              Save
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={updateStatus.isPending}
              data-testid="button-submit-report"
            >
              <Send className="h-4 w-4 mr-2" />
              Submit
            </Button>
          </div>
        </div>
      </div>

      <ScrollArea className="h-[calc(100vh-180px)]">
        {sections.map((section) => {
          const sectionFields = fieldsBySection[section.id] || [];
          const instances = sectionInstances.filter(inst => inst.sectionId === section.id);
          
          return instances.map((instance, idx) => (
            <SectionInstance
              key={`${section.id}-${idx}`}
              section={section}
              fields={sectionFields}
              instanceData={instance}
              fieldStates={fieldStates}
              onFieldChange={handleFieldChange}
              isExpanded={expandedSections.has(section.id)}
              onToggleExpanded={() => toggleSection(section.id)}
            />
          ));
        })}
      </ScrollArea>
    </div>
  );
}