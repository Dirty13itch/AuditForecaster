import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { shouldShowField } from "@/lib/conditionalLogic";
import type { FormSection, FormField as FormFieldType } from "@shared/types";
import { cn } from "@/lib/utils";

interface DynamicFormProps {
  sections: FormSection[];
  initialData?: Record<string, any>;
  onChange?: (data: Record<string, any>) => void;
  onSubmit?: (data: Record<string, any>) => void;
}

export function DynamicForm({ sections, initialData = {}, onChange, onSubmit }: DynamicFormProps) {
  const [formData, setFormData] = useState<Record<string, any>>(initialData);

  const allFields = sections.flatMap(section => section.fields);
  
  // Build Zod schema dynamically based on current form data
  const buildZodSchema = (currentFormData: Record<string, any>) => {
    const schemaFields: Record<string, z.ZodTypeAny> = {};
    
    allFields.forEach(field => {
      let fieldSchema: z.ZodTypeAny;
      
      switch (field.type) {
        case 'number':
          fieldSchema = z.coerce.number();
          break;
        case 'checkbox':
          fieldSchema = z.boolean();
          break;
        case 'date':
          fieldSchema = z.string();
          break;
        default:
          fieldSchema = z.string();
      }
      
      // Only make field required if it's currently visible
      if (field.required && shouldShowField(field, currentFormData)) {
        schemaFields[field.id] = fieldSchema;
      } else {
        schemaFields[field.id] = fieldSchema.optional();
      }
    });
    
    return z.object(schemaFields);
  };

  // Custom resolver that rebuilds schema based on current form values
  const dynamicResolver = async (
    values: Record<string, any>,
    context: any,
    options: any
  ) => {
    const schema = buildZodSchema(values);
    return zodResolver(schema)(values, context, options);
  };

  const form = useForm({
    resolver: dynamicResolver,
    defaultValues: initialData,
    mode: "onChange",
  });

  useEffect(() => {
    const subscription = form.watch((data) => {
      setFormData(data as Record<string, any>);
      onChange?.(data as Record<string, any>);
    });
    return () => subscription.unsubscribe();
  }, [form.watch, onChange]);

  // Clear validation errors for fields that become hidden
  useEffect(() => {
    allFields.forEach(field => {
      if (!shouldShowField(field, formData)) {
        form.clearErrors(field.id);
      }
    });
  }, [formData, allFields, form]);

  const handleSubmit = (data: Record<string, any>) => {
    onSubmit?.(data);
  };

  const renderField = (field: FormFieldType) => {
    const isVisible = shouldShowField(field, formData);
    
    return (
      <div
        key={field.id}
        className={cn(
          "transition-all duration-300 ease-in-out",
          isVisible 
            ? "opacity-100 max-h-[500px] mb-6" 
            : "opacity-0 max-h-0 overflow-hidden mb-0"
        )}
        data-testid={`field-container-${field.id}`}
      >
        <FormField
          control={form.control}
          name={field.id}
          render={({ field: formField }) => (
            <FormItem>
              <FormLabel>
                {field.label}
                {field.required && isVisible && <span className="text-destructive ml-1">*</span>}
              </FormLabel>
              <FormControl>
                {field.type === 'text' && (
                  <Input
                    {...formField}
                    placeholder={field.label}
                    data-testid={`input-${field.id}`}
                  />
                )}
                
                {field.type === 'number' && (
                  <Input
                    {...formField}
                    type="number"
                    placeholder={field.label}
                    data-testid={`input-${field.id}`}
                  />
                )}
                
                {field.type === 'textarea' && (
                  <Textarea
                    {...formField}
                    placeholder={field.label}
                    rows={4}
                    data-testid={`textarea-${field.id}`}
                  />
                )}
                
                {field.type === 'date' && (
                  <Input
                    {...formField}
                    type="date"
                    data-testid={`input-${field.id}`}
                  />
                )}
                
                {field.type === 'select' && (
                  <Select
                    onValueChange={formField.onChange}
                    defaultValue={formField.value}
                    data-testid={`select-${field.id}`}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={`Select ${field.label}`} />
                    </SelectTrigger>
                    <SelectContent>
                      {field.options?.map((option) => (
                        <SelectItem key={option} value={option} data-testid={`select-option-${field.id}-${option}`}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                
                {field.type === 'radio' && (
                  <RadioGroup
                    onValueChange={formField.onChange}
                    defaultValue={formField.value}
                    data-testid={`radio-${field.id}`}
                  >
                    {field.options?.map((option) => (
                      <div key={option} className="flex items-center space-x-2">
                        <RadioGroupItem value={option} id={`${field.id}-${option}`} data-testid={`radio-option-${field.id}-${option}`} />
                        <Label htmlFor={`${field.id}-${option}`}>{option}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                )}
                
                {field.type === 'checkbox' && (
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={formField.value}
                      onCheckedChange={formField.onChange}
                      data-testid={`checkbox-${field.id}`}
                    />
                    <Label>{field.label}</Label>
                  </div>
                )}
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    );
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
        {sections.map((section, index) => (
          <Card key={section.id} data-testid={`section-${section.id}`}>
            <CardHeader>
              <CardTitle>{section.title}</CardTitle>
              {section.description && (
                <CardDescription>{section.description}</CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {section.fields.map((field) => renderField(field))}
              </div>
            </CardContent>
            {index < sections.length - 1 && <Separator className="mt-6" />}
          </Card>
        ))}
      </form>
    </Form>
  );
}
