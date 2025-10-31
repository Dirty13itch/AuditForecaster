import type { TemplateField, FieldDependency, ReportFieldValue } from "@shared/schema";

// Types for conditional logic
export interface Condition {
  id: string;
  fieldId: string; // The field to check
  operator: ConditionOperator;
  value: any;
  logicalOperator?: "AND" | "OR"; // For combining multiple conditions
}

export interface ConditionGroup {
  id: string;
  conditions: Condition[];
  operator: "AND" | "OR";
  groups?: ConditionGroup[]; // For nested groups
}

export interface FieldAction {
  type: "show" | "hide" | "require" | "unrequire" | "enable" | "disable" | "set_value" | "clear_value" | "calculate" | "validate";
  value?: any; // For set_value or calculate actions
  formula?: string; // For calculate actions
  message?: string; // For validation actions
}

export interface ConditionalRule {
  id: string;
  conditions: ConditionGroup;
  actions: FieldAction[];
  priority?: number;
}

export type ConditionOperator = 
  | "equals" 
  | "not_equals" 
  | "greater_than" 
  | "less_than" 
  | "greater_than_or_equals" 
  | "less_than_or_equals" 
  | "contains" 
  | "not_contains" 
  | "empty" 
  | "not_empty" 
  | "in" 
  | "not_in";

export interface FieldState {
  visible: boolean;
  required: boolean;
  enabled: boolean;
  value: any;
  error?: string;
  calculated?: boolean;
}

export interface FieldValues {
  [fieldId: string]: any;
}

export interface DependencyGraph {
  [fieldId: string]: Set<string>; // field -> fields that depend on it
}

export interface CalculationResult {
  value: any;
  error?: string;
}

// Main Conditional Logic Engine
export class ConditionalLogicEngine {
  private fields: Map<string, TemplateField>;
  private dependencies: Map<string, FieldDependency[]>;
  private fieldStates: Map<string, FieldState>;
  private fieldValues: FieldValues;
  private dependencyGraph: DependencyGraph;
  private calculationCache: Map<string, any>;
  private debugMode: boolean = false;
  private debugLog: string[] = [];
  private customValidators: Map<string, (value: any, field: TemplateField, allValues: FieldValues) => boolean | string>;

  constructor(
    fields: TemplateField[],
    dependencies: FieldDependency[] = [],
    initialValues: FieldValues = {},
    debugMode: boolean = false
  ) {
    this.fields = new Map(fields.map(f => [f.id, f]));
    this.dependencies = new Map();
    this.fieldStates = new Map();
    this.fieldValues = initialValues;
    this.dependencyGraph = {};
    this.calculationCache = new Map();
    this.debugMode = debugMode;
    this.customValidators = new Map();

    // Group dependencies by field
    dependencies.forEach(dep => {
      const deps = this.dependencies.get(dep.fieldId) || [];
      deps.push(dep);
      this.dependencies.set(dep.fieldId, deps);
    });

    // Build dependency graph
    this.buildDependencyGraph();

    // Initialize field states
    this.initializeFieldStates();

    // Initial evaluation
    this.evaluateAll();
  }

  private buildDependencyGraph(): void {
    // Build reverse dependency graph for efficient updates
    this.dependencies.forEach((deps, fieldId) => {
      deps.forEach(dep => {
        if (!this.dependencyGraph[dep.dependsOnFieldId]) {
          this.dependencyGraph[dep.dependsOnFieldId] = new Set();
        }
        this.dependencyGraph[dep.dependsOnFieldId].add(fieldId);
      });
    });

    // Add calculation dependencies
    this.fields.forEach((field, fieldId) => {
      if (field.calculation) {
        const calc = field.calculation as any;
        if (calc.dependencies) {
          calc.dependencies.forEach((depId: string) => {
            if (!this.dependencyGraph[depId]) {
              this.dependencyGraph[depId] = new Set();
            }
            this.dependencyGraph[depId].add(fieldId);
          });
        }
      }
    });

    // Check for circular dependencies
    this.checkCircularDependencies();
  }

  private checkCircularDependencies(): void {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycle = (fieldId: string): boolean => {
      visited.add(fieldId);
      recursionStack.add(fieldId);

      const dependents = this.dependencyGraph[fieldId];
      if (dependents) {
        for (const dependent of dependents) {
          if (!visited.has(dependent)) {
            if (hasCycle(dependent)) return true;
          } else if (recursionStack.has(dependent)) {
            return true;
          }
        }
      }

      recursionStack.delete(fieldId);
      return false;
    };

    for (const fieldId of this.fields.keys()) {
      if (!visited.has(fieldId)) {
        if (hasCycle(fieldId)) {
          throw new Error("Circular dependencies detected in field configuration");
        }
      }
    }
  }

  private initializeFieldStates(): void {
    this.fields.forEach((field, fieldId) => {
      this.fieldStates.set(fieldId, {
        visible: field.isVisible !== false,
        required: field.isRequired || false,
        enabled: true,
        value: this.fieldValues[fieldId] ?? field.defaultValue ?? null,
        calculated: field.fieldType === "calculation" || field.fieldType === "conditional_calculation"
      });
    });
  }

  // Evaluate a single condition
  private evaluateCondition(condition: Condition): boolean {
    const fieldValue = this.fieldValues[condition.fieldId];
    const targetValue = condition.value;

    if (this.debugMode) {
      this.debugLog.push(`Evaluating: ${condition.fieldId} ${condition.operator} ${JSON.stringify(targetValue)}, Current value: ${JSON.stringify(fieldValue)}`);
    }

    switch (condition.operator) {
      case "equals":
        return fieldValue === targetValue;
      case "not_equals":
        return fieldValue !== targetValue;
      case "greater_than":
        return Number(fieldValue) > Number(targetValue);
      case "less_than":
        return Number(fieldValue) < Number(targetValue);
      case "greater_than_or_equals":
        return Number(fieldValue) >= Number(targetValue);
      case "less_than_or_equals":
        return Number(fieldValue) <= Number(targetValue);
      case "contains":
        return String(fieldValue).includes(String(targetValue));
      case "not_contains":
        return !String(fieldValue).includes(String(targetValue));
      case "empty":
        return fieldValue === null || fieldValue === undefined || fieldValue === "" || 
               (Array.isArray(fieldValue) && fieldValue.length === 0);
      case "not_empty":
        return fieldValue !== null && fieldValue !== undefined && fieldValue !== "" && 
               (!Array.isArray(fieldValue) || fieldValue.length > 0);
      case "in":
        return Array.isArray(targetValue) && targetValue.includes(fieldValue);
      case "not_in":
        return Array.isArray(targetValue) && !targetValue.includes(fieldValue);
      default:
        return false;
    }
  }

  // Evaluate a condition group
  private evaluateConditionGroup(group: ConditionGroup): boolean {
    let results: boolean[] = [];

    // Evaluate individual conditions
    if (group.conditions && group.conditions.length > 0) {
      results = results.concat(group.conditions.map(c => this.evaluateCondition(c)));
    }

    // Evaluate nested groups
    if (group.groups && group.groups.length > 0) {
      results = results.concat(group.groups.map(g => this.evaluateConditionGroup(g)));
    }

    if (results.length === 0) return true;

    return group.operator === "AND" 
      ? results.every(r => r) 
      : results.some(r => r);
  }

  // Evaluate conditions from field configuration
  private evaluateFieldConditions(field: TemplateField): void {
    if (!field.conditions) return;

    const conditions = field.conditions as any;
    const fieldState = this.fieldStates.get(field.id)!;

    // Parse and evaluate conditions
    if (Array.isArray(conditions)) {
      conditions.forEach((condition: any) => {
        const result = this.evaluateConditionFromConfig(condition);
        
        // Apply actions based on condition result
        if (result) {
          if (condition.action === "show") fieldState.visible = true;
          if (condition.action === "hide") fieldState.visible = false;
          if (condition.action === "require") fieldState.required = true;
          if (condition.action === "unrequire") fieldState.required = false;
          if (condition.action === "enable") fieldState.enabled = true;
          if (condition.action === "disable") fieldState.enabled = false;
          if (condition.action === "set_value") {
            fieldState.value = condition.actionValue;
            this.fieldValues[field.id] = condition.actionValue;
          }
          if (condition.action === "clear_value") {
            fieldState.value = null;
            this.fieldValues[field.id] = null;
          }
        }
      });
    }
  }

  private evaluateConditionFromConfig(config: any): boolean {
    if (!config.field || !config.operator) return false;

    const condition: Condition = {
      id: config.id || Math.random().toString(),
      fieldId: config.field,
      operator: config.operator as ConditionOperator,
      value: config.value
    };

    return this.evaluateCondition(condition);
  }

  // Calculate field value based on formula
  private calculateFieldValue(field: TemplateField): CalculationResult {
    if (!field.calculation) return { value: null };

    const calc = field.calculation as any;
    const formula = calc.formula;

    if (!formula) return { value: null };

    try {
      // Replace field references with values
      let evaluableFormula = formula;
      const fieldPattern = /\{([^}]+)\}/g;
      let match;

      while ((match = fieldPattern.exec(formula)) !== null) {
        const fieldId = match[1];
        const value = this.fieldValues[fieldId] ?? 0;
        evaluableFormula = evaluableFormula.replace(match[0], String(value));
      }

      // Evaluate mathematical functions
      evaluableFormula = this.evaluateFunctions(evaluableFormula);

      // Safely evaluate the formula
      const result = this.safeEval(evaluableFormula);

      // Apply rounding if specified
      if (calc.decimals !== undefined) {
        return { value: Math.round(result * Math.pow(10, calc.decimals)) / Math.pow(10, calc.decimals) };
      }

      return { value: result };
    } catch (error) {
      return { 
        value: null, 
        error: `Calculation error: ${error instanceof Error ? error.message : String(error)}` 
      };
    }
  }

  private evaluateFunctions(formula: string): string {
    // SUM function
    formula = formula.replace(/SUM\(([^)]+)\)/gi, (match, args) => {
      const values = this.extractValues(args);
      return String(values.reduce((sum, val) => sum + Number(val), 0));
    });

    // AVG function
    formula = formula.replace(/AVG\(([^)]+)\)/gi, (match, args) => {
      const values = this.extractValues(args);
      if (values.length === 0) return "0";
      return String(values.reduce((sum, val) => sum + Number(val), 0) / values.length);
    });

    // MIN function
    formula = formula.replace(/MIN\(([^)]+)\)/gi, (match, args) => {
      const values = this.extractValues(args);
      return String(Math.min(...values.map(v => Number(v))));
    });

    // MAX function
    formula = formula.replace(/MAX\(([^)]+)\)/gi, (match, args) => {
      const values = this.extractValues(args);
      return String(Math.max(...values.map(v => Number(v))));
    });

    // COUNT function
    formula = formula.replace(/COUNT\(([^)]+)\)/gi, (match, args) => {
      const values = this.extractValues(args);
      return String(values.filter(v => v !== null && v !== undefined && v !== "").length);
    });

    // IF function (simple)
    formula = formula.replace(/IF\(([^,]+),([^,]+),([^)]+)\)/gi, (match, condition, trueVal, falseVal) => {
      const condResult = this.evaluateSimpleCondition(condition.trim());
      return condResult ? trueVal.trim() : falseVal.trim();
    });

    return formula;
  }

  private extractValues(args: string): any[] {
    const parts = args.split(',').map(p => p.trim());
    return parts.map(part => {
      // Check if it's a number
      if (!isNaN(Number(part))) return Number(part);
      // Otherwise treat as field reference or string
      return this.fieldValues[part] ?? part;
    });
  }

  private evaluateSimpleCondition(condition: string): boolean {
    // Support simple comparisons like "field1 > 5"
    const operators = [">=", "<=", "!=", "==", ">", "<", "="];
    for (const op of operators) {
      if (condition.includes(op)) {
        const [left, right] = condition.split(op).map(s => s.trim());
        const leftVal = isNaN(Number(left)) ? (this.fieldValues[left] ?? left) : Number(left);
        const rightVal = isNaN(Number(right)) ? (this.fieldValues[right] ?? right) : Number(right);
        
        switch (op) {
          case ">=": return Number(leftVal) >= Number(rightVal);
          case "<=": return Number(leftVal) <= Number(rightVal);
          case "!=": return leftVal != rightVal;
          case "==": case "=": return leftVal == rightVal;
          case ">": return Number(leftVal) > Number(rightVal);
          case "<": return Number(leftVal) < Number(rightVal);
        }
      }
    }
    return false;
  }

  private safeEval(formula: string): number {
    // Remove any potentially dangerous characters
    const cleaned = formula.replace(/[^0-9+\-*/().\s]/g, '');
    
    // Use Function constructor for safer evaluation
    try {
      return new Function('return ' + cleaned)();
    } catch (e) {
      throw new Error('Invalid formula');
    }
  }

  // Validate field value based on rules
  private validateField(field: TemplateField): string | undefined {
    if (!field.validationRules) return undefined;

    const rules = field.validationRules as any;
    const value = this.fieldValues[field.id];
    const fieldState = this.fieldStates.get(field.id)!;

    // Required validation
    if (fieldState.required && (value === null || value === undefined || value === "")) {
      return rules.requiredMessage || `${field.label} is required`;
    }

    // Custom validation rules
    if (rules.rules && Array.isArray(rules.rules)) {
      for (const rule of rules.rules) {
        // Pass fieldId for custom validators
        const ruleWithFieldId = { ...rule, fieldId: field.id };
        const result = this.evaluateValidationRule(ruleWithFieldId, value);
        
        // If result is false or a string (error message), validation failed
        if (result === false) {
          return rule.message || `${field.label} validation failed`;
        } else if (typeof result === 'string') {
          return result; // Use the custom error message from validator
        }
      }
    }

    // Cross-field validation
    if (rules.crossField && Array.isArray(rules.crossField)) {
      for (const crossRule of rules.crossField) {
        const otherValue = this.fieldValues[crossRule.field];
        if (!this.evaluateCrossFieldRule(crossRule, value, otherValue)) {
          return crossRule.message || `${field.label} must be ${crossRule.operator} ${crossRule.field}`;
        }
      }
    }

    return undefined;
  }

  private evaluateValidationRule(rule: any, value: any): boolean | string {
    switch (rule.type) {
      case "min":
        return Number(value) >= Number(rule.value);
      case "max":
        return Number(value) <= Number(rule.value);
      case "minLength":
        return String(value).length >= Number(rule.value);
      case "maxLength":
        return String(value).length <= Number(rule.value);
      case "pattern":
        return new RegExp(rule.value).test(String(value));
      case "custom":
        // Execute custom validation function if registered
        if (rule.validatorId && this.customValidators.has(rule.validatorId)) {
          const validator = this.customValidators.get(rule.validatorId)!;
          const field = this.fields.get(rule.fieldId);
          
          try {
            const result = validator(value, field || {} as TemplateField, this.fieldValues);
            
            // If the validator returns a string, it's an error message
            if (typeof result === 'string') {
              return false;
            }
            
            // Otherwise, it should return a boolean
            return result === true;
          } catch (error) {
            if (this.debugMode) {
              this.debugLog.push(`Custom validator '${rule.validatorId}' threw error: ${error}`);
            }
            // If validator throws, treat as validation failure
            return false;
          }
        }
        
        // If no custom validator is registered but one is required, log warning and pass
        if (this.debugMode && rule.validatorId) {
          this.debugLog.push(`Warning: Custom validator '${rule.validatorId}' not found`);
        }
        
        // Default to true if no validator is specified
        return true;
      default:
        return true;
    }
  }

  private evaluateCrossFieldRule(rule: any, value: any, otherValue: any): boolean {
    switch (rule.operator) {
      case "greater_than":
        return Number(value) > Number(otherValue);
      case "less_than":
        return Number(value) < Number(otherValue);
      case "equals":
        return value === otherValue;
      case "not_equals":
        return value !== otherValue;
      default:
        return true;
    }
  }

  // Public methods

  public setFieldValue(fieldId: string, value: any): void {
    const oldValue = this.fieldValues[fieldId];
    this.fieldValues[fieldId] = value;
    
    const fieldState = this.fieldStates.get(fieldId);
    if (fieldState) {
      fieldState.value = value;
    }

    if (this.debugMode) {
      this.debugLog.push(`Field ${fieldId} changed: ${JSON.stringify(oldValue)} -> ${JSON.stringify(value)}`);
    }

    // Clear calculation cache for dependent fields
    this.clearDependentCache(fieldId);

    // Re-evaluate dependent fields
    this.evaluateDependents(fieldId);
  }

  private clearDependentCache(fieldId: string): void {
    const dependents = this.dependencyGraph[fieldId];
    if (dependents) {
      dependents.forEach(depId => {
        this.calculationCache.delete(depId);
        // Recursively clear cache for fields that depend on this one
        this.clearDependentCache(depId);
      });
    }
  }

  private evaluateDependents(fieldId: string): void {
    const dependents = this.dependencyGraph[fieldId];
    if (!dependents) return;

    const evaluated = new Set<string>();
    const queue = Array.from(dependents);

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      if (evaluated.has(currentId)) continue;

      const field = this.fields.get(currentId);
      if (field) {
        // Evaluate conditions
        this.evaluateFieldConditions(field);

        // Evaluate calculations
        if (field.fieldType === "calculation" || field.fieldType === "conditional_calculation") {
          const result = this.calculateFieldValue(field);
          const fieldState = this.fieldStates.get(currentId)!;
          fieldState.value = result.value;
          fieldState.error = result.error;
          this.fieldValues[currentId] = result.value;
        }

        // Validate
        const fieldState = this.fieldStates.get(currentId)!;
        fieldState.error = this.validateField(field);
      }

      evaluated.add(currentId);

      // Add dependents of this field to the queue
      const nextDependents = this.dependencyGraph[currentId];
      if (nextDependents) {
        nextDependents.forEach(depId => {
          if (!evaluated.has(depId)) {
            queue.push(depId);
          }
        });
      }
    }
  }

  public evaluateAll(): void {
    // Evaluate all fields in dependency order
    const evaluated = new Set<string>();
    
    const evaluateField = (fieldId: string) => {
      if (evaluated.has(fieldId)) return;

      const field = this.fields.get(fieldId);
      if (!field) return;

      // First evaluate fields this depends on
      const deps = this.dependencies.get(fieldId);
      if (deps) {
        deps.forEach(dep => {
          if (!evaluated.has(dep.dependsOnFieldId)) {
            evaluateField(dep.dependsOnFieldId);
          }
        });
      }

      // Evaluate conditions
      this.evaluateFieldConditions(field);

      // Evaluate calculations
      if (field.fieldType === "calculation" || field.fieldType === "conditional_calculation") {
        const result = this.calculateFieldValue(field);
        const fieldState = this.fieldStates.get(fieldId)!;
        fieldState.value = result.value;
        fieldState.error = result.error;
        this.fieldValues[fieldId] = result.value;
      }

      // Validate
      const fieldState = this.fieldStates.get(fieldId)!;
      fieldState.error = this.validateField(field);

      evaluated.add(fieldId);
    };

    this.fields.forEach((_, fieldId) => evaluateField(fieldId));
  }

  public getFieldState(fieldId: string): FieldState | undefined {
    return this.fieldStates.get(fieldId);
  }

  public getAllFieldStates(): Map<string, FieldState> {
    return this.fieldStates;
  }

  public getFieldValue(fieldId: string): any {
    return this.fieldValues[fieldId];
  }

  public getAllFieldValues(): FieldValues {
    return { ...this.fieldValues };
  }

  public validateAll(): Map<string, string> {
    const errors = new Map<string, string>();
    
    this.fields.forEach((field, fieldId) => {
      const error = this.validateField(field);
      if (error) {
        errors.set(fieldId, error);
      }
    });

    return errors;
  }

  public getDebugLog(): string[] {
    return this.debugLog;
  }

  public clearDebugLog(): void {
    this.debugLog = [];
  }

  public setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
    if (!enabled) {
      this.clearDebugLog();
    }
  }

  // Custom validator management methods
  public registerCustomValidator(
    validatorId: string,
    validator: (value: any, field: TemplateField, allValues: FieldValues) => boolean | string
  ): void {
    if (!validatorId) {
      throw new Error('Validator ID is required');
    }
    
    if (typeof validator !== 'function') {
      throw new Error('Validator must be a function');
    }
    
    this.customValidators.set(validatorId, validator);
    
    if (this.debugMode) {
      this.debugLog.push(`Custom validator '${validatorId}' registered`);
    }
  }
  
  public unregisterCustomValidator(validatorId: string): boolean {
    const existed = this.customValidators.has(validatorId);
    this.customValidators.delete(validatorId);
    
    if (this.debugMode && existed) {
      this.debugLog.push(`Custom validator '${validatorId}' unregistered`);
    }
    
    return existed;
  }
  
  public hasCustomValidator(validatorId: string): boolean {
    return this.customValidators.has(validatorId);
  }
  
  public clearCustomValidators(): void {
    this.customValidators.clear();
    
    if (this.debugMode) {
      this.debugLog.push('All custom validators cleared');
    }
  }
  
  public getRegisteredValidatorIds(): string[] {
    return Array.from(this.customValidators.keys());
  }

  public getDependencyChain(fieldId: string): string[] {
    const chain: string[] = [];
    const visited = new Set<string>();

    const traverse = (id: string) => {
      if (visited.has(id)) return;
      visited.add(id);
      chain.push(id);

      const dependents = this.dependencyGraph[id];
      if (dependents) {
        dependents.forEach(depId => traverse(depId));
      }
    };

    traverse(fieldId);
    return chain;
  }

  // Performance optimization: Batch updates
  public batchUpdate(updates: Array<{ fieldId: string; value: any }>): void {
    // Collect all affected fields
    const affectedFields = new Set<string>();
    
    // Apply all updates first
    updates.forEach(update => {
      this.fieldValues[update.fieldId] = update.value;
      const fieldState = this.fieldStates.get(update.fieldId);
      if (fieldState) {
        fieldState.value = update.value;
      }
      affectedFields.add(update.fieldId);
      
      // Add all dependents to affected fields
      const dependents = this.dependencyGraph[update.fieldId];
      if (dependents) {
        dependents.forEach(depId => affectedFields.add(depId));
      }
    });

    // Clear cache for all affected fields
    affectedFields.forEach(fieldId => this.calculationCache.delete(fieldId));

    // Re-evaluate all affected fields once
    affectedFields.forEach(fieldId => {
      const field = this.fields.get(fieldId);
      if (field) {
        this.evaluateFieldConditions(field);
        
        if (field.fieldType === "calculation" || field.fieldType === "conditional_calculation") {
          const result = this.calculateFieldValue(field);
          const fieldState = this.fieldStates.get(fieldId)!;
          fieldState.value = result.value;
          fieldState.error = result.error;
          this.fieldValues[fieldId] = result.value;
        }

        const fieldState = this.fieldStates.get(fieldId)!;
        fieldState.error = this.validateField(field);
      }
    });
  }
}

// Helper function to create a simple condition
export function createCondition(
  fieldId: string,
  operator: ConditionOperator,
  value: any,
  logicalOperator?: "AND" | "OR"
): Condition {
  return {
    id: Math.random().toString(),
    fieldId,
    operator,
    value,
    logicalOperator
  };
}

// Helper function to create a condition group
export function createConditionGroup(
  conditions: Condition[],
  operator: "AND" | "OR" = "AND",
  groups?: ConditionGroup[]
): ConditionGroup {
  return {
    id: Math.random().toString(),
    conditions,
    operator,
    groups
  };
}

// Helper function to parse conditions from field configuration
export function parseFieldConditions(field: TemplateField): ConditionalRule[] {
  if (!field.conditions) return [];
  
  const conditions = field.conditions as any;
  if (!Array.isArray(conditions)) return [];

  return conditions.map((cond: any) => ({
    id: cond.id || Math.random().toString(),
    conditions: createConditionGroup(
      [{
        id: Math.random().toString(),
        fieldId: cond.field,
        operator: cond.operator,
        value: cond.value
      }],
      cond.logicalOperator || "AND"
    ),
    actions: [{
      type: cond.action,
      value: cond.actionValue,
      formula: cond.formula,
      message: cond.message
    }],
    priority: cond.priority
  }));
}