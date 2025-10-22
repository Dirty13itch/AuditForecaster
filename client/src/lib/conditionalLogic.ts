import type { ConditionalRule, FormField } from "@shared/types";

export function evaluateCondition(
  rule: ConditionalRule,
  formData: Record<string, any>
): boolean {
  const fieldValue = formData[rule.fieldId];

  switch (rule.operator) {
    case 'equals':
      return fieldValue === rule.value;
    
    case 'notEquals':
      return fieldValue !== rule.value;
    
    case 'contains':
      if (typeof fieldValue === 'string' && typeof rule.value === 'string') {
        return fieldValue.toLowerCase().includes(rule.value.toLowerCase());
      }
      if (Array.isArray(fieldValue)) {
        return fieldValue.includes(rule.value);
      }
      return false;
    
    case 'greaterThan':
      const numValue = Number(fieldValue);
      const numRuleValue = Number(rule.value);
      return !isNaN(numValue) && !isNaN(numRuleValue) && numValue > numRuleValue;
    
    case 'lessThan':
      const numVal = Number(fieldValue);
      const numRuleVal = Number(rule.value);
      return !isNaN(numVal) && !isNaN(numRuleVal) && numVal < numRuleVal;
    
    case 'isTrue':
      return fieldValue === true || fieldValue === 'true' || fieldValue === 'yes';
    
    case 'isFalse':
      return fieldValue === false || fieldValue === 'false' || fieldValue === 'no' || fieldValue === undefined || fieldValue === null || fieldValue === '';
    
    default:
      console.warn(`Unknown operator: ${rule.operator}`);
      return false;
  }
}

export function shouldShowField(
  field: FormField,
  formData: Record<string, any>,
  visitedFields: Set<string> = new Set()
): boolean {
  if (!field.conditions || field.conditions.length === 0) {
    return true;
  }

  if (visitedFields.has(field.id)) {
    console.warn(`Circular dependency detected for field: ${field.id}`);
    return false;
  }

  visitedFields.add(field.id);

  for (const condition of field.conditions) {
    if (!formData.hasOwnProperty(condition.fieldId)) {
      return false;
    }

    if (!evaluateCondition(condition, formData)) {
      return false;
    }
  }

  return true;
}
