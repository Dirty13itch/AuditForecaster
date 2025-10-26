import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Plus, X, Trash2, HelpCircle, Calculator, GitBranch } from "lucide-react";
import type { TemplateField } from "@shared/schema";

// Field type definitions with icons and descriptions
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

// Condition operators with tooltips
const CONDITION_OPERATORS = [
  { value: "equals", label: "Equals", description: "Field value exactly matches the specified value" },
  { value: "not_equals", label: "Not Equals", description: "Field value doesn't match the specified value" },
  { value: "greater_than", label: "Greater Than", description: "Numeric value is greater than specified" },
  { value: "less_than", label: "Less Than", description: "Numeric value is less than specified" },
  { value: "greater_than_or_equals", label: "Greater or Equal", description: "Numeric value is greater than or equal to specified" },
  { value: "less_than_or_equals", label: "Less or Equal", description: "Numeric value is less than or equal to specified" },
  { value: "contains", label: "Contains", description: "Text contains the specified substring" },
  { value: "not_contains", label: "Not Contains", description: "Text doesn't contain the specified substring" },
  { value: "empty", label: "Is Empty", description: "Field has no value" },
  { value: "not_empty", label: "Is Not Empty", description: "Field has any value" },
];

// Condition actions
const CONDITION_ACTIONS = [
  { value: "show", label: "Show", description: "Make field visible" },
  { value: "hide", label: "Hide", description: "Make field hidden" },
  { value: "require", label: "Make Required", description: "Field becomes required" },
  { value: "unrequire", label: "Make Optional", description: "Field becomes optional" },
  { value: "enable", label: "Enable", description: "Enable field input" },
  { value: "disable", label: "Disable", description: "Disable field input" },
];

// Calculation functions
const CALCULATION_FUNCTIONS = [
  { value: "SUM", label: "SUM", description: "Add all values", example: "SUM({field1}, {field2})" },
  { value: "AVG", label: "AVERAGE", description: "Calculate average", example: "AVG({field1}, {field2})" },
  { value: "MIN", label: "MIN", description: "Find minimum value", example: "MIN({field1}, {field2})" },
  { value: "MAX", label: "MAX", description: "Find maximum value", example: "MAX({field1}, {field2})" },
  { value: "COUNT", label: "COUNT", description: "Count non-empty values", example: "COUNT({field1}, {field2})" },
  { value: "IF", label: "IF", description: "Conditional calculation", example: "IF({field1} > 10, {field2}, {field3})" },
];

interface FieldEditDialogProps {
  field: TemplateField;
  allFields?: TemplateField[];
  onSave: (field: TemplateField) => void;
  onCancel: () => void;
}

export function FieldEditDialog({ field, allFields = [], onSave, onCancel }: FieldEditDialogProps) {
  const [editedField, setEditedField] = useState(field);
  const [options, setOptions] = useState<string[]>((field.configuration as any)?.options || []);
  const [conditions, setConditions] = useState<any[]>((field.conditions as any)?.rules || []);
  const [calculationFormula, setCalculationFormula] = useState<string>((field.calculation as any)?.formula || "");
  const [logicalOperator, setLogicalOperator] = useState<"AND" | "OR">((field.conditions as any)?.operator || "AND");
  const [testMode, setTestMode] = useState(false);
  const [testValues, setTestValues] = useState<Record<string, any>>({});

  const handleSave = () => {
    const updatedField = {
      ...editedField,
      configuration: {
        ...(editedField.configuration || {}),
        ...(["select", "multiselect"].includes(editedField.fieldType) && { options })
      },
      conditions: conditions.length > 0 ? { rules: conditions, operator: logicalOperator } : null,
      calculation: (editedField.fieldType === "calculation" || editedField.fieldType === "conditional_calculation") && calculationFormula 
        ? { formula: calculationFormula, dependencies: extractFieldReferences(calculationFormula) } 
        : null
    };
    onSave(updatedField);
  };

  const extractFieldReferences = (formula: string): string[] => {
    const matches = formula.match(/\{([^}]+)\}/g) || [];
    return [...new Set(matches.map(m => m.slice(1, -1)))];
  };

  const addCondition = () => {
    setConditions([
      ...conditions,
      {
        id: `cond-${Date.now()}`,
        fieldId: "",
        operator: "equals",
        value: "",
        action: "show"
      }
    ]);
  };

  const updateCondition = (index: number, updates: any) => {
    const newConditions = [...conditions];
    newConditions[index] = { ...newConditions[index], ...updates };
    setConditions(newConditions);
  };

  const removeCondition = (index: number) => {
    setConditions(conditions.filter((_, i) => i !== index));
  };

  const getFieldDependencies = (): string[] => {
    const deps = new Set<string>();
    conditions.forEach(cond => {
      if (cond.fieldId) deps.add(cond.fieldId);
    });
    extractFieldReferences(calculationFormula).forEach(id => deps.add(id));
    return Array.from(deps);
  };

  const getDependentFields = (): TemplateField[] => {
    const thisFieldId = field.id;
    return allFields.filter(f => {
      const fConditions = (f.conditions as any)?.rules || [];
      const hasConditionDep = fConditions.some((c: any) => c.fieldId === thisFieldId);
      const fFormula = (f.calculation as any)?.formula || "";
      const hasCalcDep = extractFieldReferences(fFormula).includes(thisFieldId);
      return hasConditionDep || hasCalcDep;
    });
  };

  return (
    <TooltipProvider>
      <Dialog open onOpenChange={onCancel}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span>Edit Field: {field.label}</span>
              {testMode && <Badge variant="secondary">Test Mode</Badge>}
            </DialogTitle>
            <DialogDescription>
              Configure field properties, conditions, and calculations
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="basic" className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="basic">Basic</TabsTrigger>
              <TabsTrigger value="conditions" className="flex items-center gap-1">
                <GitBranch className="h-3 w-3" />
                Conditions
                {conditions.length > 0 && <Badge variant="secondary" className="ml-1 text-xs">{conditions.length}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="calculations" className="flex items-center gap-1">
                <Calculator className="h-3 w-3" />
                Calculations
              </TabsTrigger>
              <TabsTrigger value="dependencies">Dependencies</TabsTrigger>
            </TabsList>
            
            <div className="flex-1 overflow-y-auto">
              <TabsContent value="basic" className="space-y-4 p-4">
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
              </TabsContent>
              
              <TabsContent value="conditions" className="space-y-4 p-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Conditional Logic</Label>
                      <p className="text-sm text-muted-foreground">
                        Configure when this field should be shown, hidden, or required
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant={testMode ? "secondary" : "outline"}
                      onClick={() => setTestMode(!testMode)}
                      data-testid="button-toggle-test-mode"
                    >
                      {testMode ? "Exit Test Mode" : "Test Conditions"}
                    </Button>
                  </div>
                  
                  {conditions.length > 1 && (
                    <div className="flex items-center gap-2">
                      <Label>Logic Operator</Label>
                      <Select value={logicalOperator} onValueChange={(v) => setLogicalOperator(v as "AND" | "OR")}>
                        <SelectTrigger className="w-32" data-testid="select-logical-operator">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="AND">AND (All conditions must be true)</SelectItem>
                          <SelectItem value="OR">OR (Any condition can be true)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
                
                <div className="space-y-3">
                  {conditions.map((condition, index) => (
                    <Card key={condition.id || index} className="p-4">
                      <div className="grid grid-cols-4 gap-2 items-end">
                        <div>
                          <div className="flex items-center gap-1">
                            <Label>When field</Label>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="h-3 w-3 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Select which field's value to check</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          <Select
                            value={condition.fieldId}
                            onValueChange={(value) => updateCondition(index, { fieldId: value })}
                          >
                            <SelectTrigger data-testid={`select-condition-field-${index}`}>
                              <SelectValue placeholder="Select field" />
                            </SelectTrigger>
                            <SelectContent>
                              {allFields.filter(f => f.id !== field.id).map(f => (
                                <SelectItem key={f.id} value={f.id}>
                                  {f.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div>
                          <div className="flex items-center gap-1">
                            <Label>Operator</Label>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="h-3 w-3 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{CONDITION_OPERATORS.find(op => op.value === condition.operator)?.description}</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          <Select
                            value={condition.operator}
                            onValueChange={(value) => updateCondition(index, { operator: value })}
                          >
                            <SelectTrigger data-testid={`select-condition-operator-${index}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {CONDITION_OPERATORS.map(op => (
                                <SelectItem key={op.value} value={op.value}>
                                  {op.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div>
                          <Label>Value</Label>
                          <Input
                            value={condition.value || ""}
                            onChange={(e) => updateCondition(index, { value: e.target.value })}
                            placeholder="Enter value"
                            disabled={["empty", "not_empty"].includes(condition.operator)}
                            data-testid={`input-condition-value-${index}`}
                          />
                        </div>
                        
                        <div>
                          <Label>Action</Label>
                          <div className="flex gap-2">
                            <Select
                              value={condition.action}
                              onValueChange={(value) => updateCondition(index, { action: value })}
                            >
                              <SelectTrigger data-testid={`select-condition-action-${index}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {CONDITION_ACTIONS.map(action => (
                                  <SelectItem key={action.value} value={action.value}>
                                    {action.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => removeCondition(index)}
                              data-testid={`button-remove-condition-${index}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                      
                      {testMode && condition.fieldId && (
                        <div className="mt-3 p-3 bg-muted rounded-md">
                          <Label className="text-xs">Test Value for {allFields.find(f => f.id === condition.fieldId)?.label}</Label>
                          <Input
                            value={testValues[condition.fieldId] || ""}
                            onChange={(e) => setTestValues({...testValues, [condition.fieldId]: e.target.value})}
                            placeholder="Enter test value"
                            className="mt-1"
                            data-testid={`input-test-value-${condition.fieldId}`}
                          />
                        </div>
                      )}
                    </Card>
                  ))}
                  
                  <Button
                    variant="outline"
                    onClick={addCondition}
                    className="w-full"
                    data-testid="button-add-condition"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Condition
                  </Button>
                </div>
              </TabsContent>
              
              <TabsContent value="calculations" className="space-y-4 p-4">
                <div className="space-y-2">
                  <Label>Calculation Formula</Label>
                  <p className="text-sm text-muted-foreground">
                    Define a formula to calculate this field's value based on other fields
                  </p>
                </div>
                
                {(editedField.fieldType === "calculation" || editedField.fieldType === "conditional_calculation") ? (
                  <>
                    <div>
                      <Label>Formula</Label>
                      <Textarea
                        value={calculationFormula}
                        onChange={(e) => setCalculationFormula(e.target.value)}
                        placeholder="e.g., {field1} + {field2} * 0.1 or SUM({field1}, {field2}, {field3})"
                        rows={4}
                        className="font-mono"
                        data-testid="textarea-calculation-formula"
                      />
                      <p className="text-xs text-muted-foreground mt-2">
                        Use {"{fieldId}"} to reference other fields. Available functions: SUM, AVG, MIN, MAX, COUNT, IF
                      </p>
                    </div>
                    
                    <div>
                      <Label>Quick Functions</Label>
                      <div className="grid grid-cols-3 gap-2 mt-2">
                        {CALCULATION_FUNCTIONS.map(func => (
                          <Tooltip key={func.value}>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const textarea = document.querySelector('[data-testid="textarea-calculation-formula"]') as HTMLTextAreaElement;
                                  const cursorPos = textarea?.selectionStart || calculationFormula.length;
                                  const newFormula = 
                                    calculationFormula.slice(0, cursorPos) + 
                                    func.value + "()" + 
                                    calculationFormula.slice(cursorPos);
                                  setCalculationFormula(newFormula);
                                }}
                                data-testid={`button-function-${func.value}`}
                              >
                                {func.label}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{func.description}</p>
                              <p className="text-xs font-mono mt-1">{func.example}</p>
                            </TooltipContent>
                          </Tooltip>
                        ))}
                      </div>
                    </div>
                    
                    {allFields && allFields.length > 0 && (
                      <div>
                        <Label>Insert Field Reference</Label>
                        <Select
                          value=""
                          onValueChange={(fieldId) => {
                            setCalculationFormula(calculationFormula + ` {${fieldId}}`);
                          }}
                        >
                          <SelectTrigger data-testid="select-field-reference">
                            <SelectValue placeholder="Select a field to insert" />
                          </SelectTrigger>
                          <SelectContent>
                            {allFields.filter(f => f.id !== field.id && ["number", "calculation"].includes(f.fieldType)).map(f => (
                              <SelectItem key={f.id} value={f.id}>
                                {f.label} ({f.fieldType})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    
                    {calculationFormula && (
                      <div className="p-3 bg-muted rounded-md">
                        <Label className="text-xs">Referenced Fields</Label>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {extractFieldReferences(calculationFormula).map(refId => {
                            const refField = allFields.find(f => f.id === refId);
                            return (
                              <Badge key={refId} variant={refField ? "secondary" : "destructive"}>
                                {refField ? refField.label : `Unknown: ${refId}`}
                              </Badge>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calculator className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Calculations are only available for "Calculation" and "Conditional Calculation" field types.</p>
                    <p className="text-sm mt-2">Change the field type to enable calculations.</p>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="dependencies" className="space-y-4 p-4">
                <div className="space-y-4">
                  <div>
                    <Label>This Field Depends On</Label>
                    <p className="text-sm text-muted-foreground mb-3">
                      Fields that affect this field's behavior or value
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {getFieldDependencies().length > 0 ? (
                        getFieldDependencies().map(depId => {
                          const depField = allFields.find(f => f.id === depId);
                          return depField ? (
                            <Badge key={depId} variant="secondary">
                              <GitBranch className="h-3 w-3 mr-1" />
                              {depField.label}
                            </Badge>
                          ) : null;
                        })
                      ) : (
                        <p className="text-sm text-muted-foreground">No dependencies</p>
                      )}
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <Label>Fields Depending on This</Label>
                    <p className="text-sm text-muted-foreground mb-3">
                      Fields that will be affected when this field changes
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {getDependentFields().length > 0 ? (
                        getDependentFields().map(depField => (
                          <Badge key={depField.id} variant="outline">
                            <GitBranch className="h-3 w-3 mr-1" />
                            {depField.label}
                          </Badge>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">No dependent fields</p>
                      )}
                    </div>
                  </div>
                  
                  {(getFieldDependencies().length > 0 || getDependentFields().length > 0) && (
                    <>
                      <Separator />
                      <div className="p-4 bg-muted rounded-md">
                        <p className="text-sm font-medium mb-2">Dependency Visualization</p>
                        <div className="text-xs text-muted-foreground space-y-1">
                          {getFieldDependencies().map(depId => {
                            const depField = allFields.find(f => f.id === depId);
                            return depField ? (
                              <div key={depId}>
                                {depField.label} → <strong>{field.label}</strong>
                              </div>
                            ) : null;
                          })}
                          {getDependentFields().map(depField => (
                            <div key={depField.id}>
                              <strong>{field.label}</strong> → {depField.label}
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </TabsContent>
            </div>
          </Tabs>
          
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
    </TooltipProvider>
  );
}