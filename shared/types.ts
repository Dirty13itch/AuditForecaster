export type FieldType = 'text' | 'number' | 'select' | 'radio' | 'checkbox' | 'textarea' | 'date';

export type ConditionalRule = {
  fieldId: string;
  operator: 'equals' | 'notEquals' | 'contains' | 'greaterThan' | 'lessThan' | 'isTrue' | 'isFalse';
  value: any;
}

export type FormField = {
  id: string;
  label: string;
  type: FieldType;
  required: boolean;
  options?: string[];
  defaultValue?: any;
  conditions?: ConditionalRule[];
}

export type FormSection = {
  id: string;
  title: string;
  description?: string;
  fields: FormField[];
}
