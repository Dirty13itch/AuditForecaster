import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { CheckCircle2, XCircle, MinusCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

// Response configuration with colors and icons
export const RESPONSE_CONFIG = {
  yes: {
    value: 'yes',
    label: 'Yes',
    icon: CheckCircle2,
    color: 'text-success',
    bgColor: 'bg-success/10',
    borderColor: 'border-success',
    radioColor: 'data-[state=checked]:bg-success data-[state=checked]:border-success',
  },
  no: {
    value: 'no',
    label: 'No',
    icon: XCircle,
    color: 'text-destructive',
    bgColor: 'bg-destructive/10',
    borderColor: 'border-destructive',
    radioColor: 'data-[state=checked]:bg-destructive data-[state=checked]:border-destructive',
  },
  na: {
    value: 'na',
    label: 'N/A',
    icon: MinusCircle,
    color: 'text-muted-foreground',
    bgColor: 'bg-muted',
    borderColor: 'border-muted-foreground',
    radioColor: 'data-[state=checked]:bg-muted-foreground data-[state=checked]:border-muted-foreground',
  },
  pass: {
    value: 'pass',
    label: 'Pass',
    icon: CheckCircle2,
    color: 'text-success',
    bgColor: 'bg-success/10',
    borderColor: 'border-success',
    radioColor: 'data-[state=checked]:bg-success data-[state=checked]:border-success',
  },
  fail: {
    value: 'fail',
    label: 'Fail',
    icon: XCircle,
    color: 'text-destructive',
    bgColor: 'bg-destructive/10',
    borderColor: 'border-destructive',
    radioColor: 'data-[state=checked]:bg-destructive data-[state=checked]:border-destructive',
  },
} as const;

export type ResponseType = keyof typeof RESPONSE_CONFIG;

interface ColorCodedResponseProps {
  value: string;
  onChange: (value: string) => void;
  options?: ResponseType[];
  id: string;
  size?: 'sm' | 'md' | 'lg';
  orientation?: 'horizontal' | 'vertical';
  showIcons?: boolean;
  disabled?: boolean;
}

/**
 * Color-coded response selector for inspection forms
 * Provides visual feedback with green/red/gray color system
 * Following iAuditor pattern for quick field scanning
 */
export function ColorCodedResponse({
  value,
  onChange,
  options = ['yes', 'no', 'na'],
  id,
  size = 'md',
  orientation = 'horizontal',
  showIcons = true,
  disabled = false
}: ColorCodedResponseProps) {
  
  const sizeClasses = {
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6'
  };

  const labelSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  const iconSizeClasses = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  };

  const radioSizeClasses = {
    sm: 'h-3.5 w-3.5',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  };

  return (
    <RadioGroup
      value={value}
      onValueChange={onChange}
      className={cn(
        'flex',
        orientation === 'horizontal' ? 'flex-row' : 'flex-col',
        sizeClasses[size]
      )}
      disabled={disabled}
      data-testid={`radio-group-${id}`}
    >
      {options.map((optionKey) => {
        const option = RESPONSE_CONFIG[optionKey];
        const Icon = option.icon;
        const isSelected = value === option.value;

        return (
          <div 
            key={option.value}
            className={cn(
              'flex items-center space-x-2 relative',
              'transition-all duration-200',
              isSelected && 'scale-105'
            )}
          >
            <RadioGroupItem
              value={option.value}
              id={`${option.value}-${id}`}
              className={cn(
                radioSizeClasses[size],
                option.radioColor,
                'transition-all duration-200'
              )}
              data-testid={`radio-${option.value}-${id}`}
            />
            <Label
              htmlFor={`${option.value}-${id}`}
              className={cn(
                'cursor-pointer font-medium flex items-center gap-1.5',
                labelSizeClasses[size],
                'select-none',
                'transition-all duration-200',
                isSelected && option.color
              )}
            >
              {showIcons && (
                <Icon className={cn(
                  iconSizeClasses[size],
                  'transition-all duration-200',
                  isSelected ? option.color : 'text-muted-foreground'
                )} />
              )}
              <span>{option.label}</span>
            </Label>
            
            {/* Visual highlight for selected option */}
            {isSelected && (
              <div className={cn(
                'absolute -inset-y-1 -inset-x-2',
                'rounded-md pointer-events-none',
                option.bgColor,
                'animate-in fade-in duration-200'
              )} />
            )}
          </div>
        );
      })}
    </RadioGroup>
  );
}

interface ResponseBadgeProps {
  value: ResponseType;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

/**
 * Visual badge showing response status with appropriate color
 */
export function ResponseBadge({ value, size = 'md', showIcon = true }: ResponseBadgeProps) {
  const config = RESPONSE_CONFIG[value];
  if (!config) return null;
  
  const Icon = config.icon;
  
  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5'
  };

  const iconSizeClasses = {
    sm: 'h-3 w-3',
    md: 'h-3.5 w-3.5',
    lg: 'h-4 w-4'
  };

  return (
    <div className={cn(
      'inline-flex items-center gap-1 rounded-md font-medium',
      sizeClasses[size],
      config.bgColor
    )}>
      {showIcon && <Icon className={cn(iconSizeClasses[size], config.color)} />}
      <span className={config.color}>{config.label.toUpperCase()}</span>
    </div>
  );
}

interface ResponseSummaryProps {
  responses: Array<{ id: string; value: ResponseType }>;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Visual summary of multiple responses with counts
 */
export function ResponseSummary({ responses, size = 'md' }: ResponseSummaryProps) {
  const counts = responses.reduce((acc, { value }) => {
    if (value in RESPONSE_CONFIG) {
      acc[value] = (acc[value] || 0) + 1;
    }
    return acc;
  }, {} as Record<ResponseType, number>);

  const sizeClasses = {
    sm: 'text-xs gap-2',
    md: 'text-sm gap-3',
    lg: 'text-base gap-4'
  };

  const iconSizeClasses = {
    sm: 'h-3.5 w-3.5',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  };

  return (
    <div className={cn('flex items-center', sizeClasses[size])}>
      {Object.entries(counts).map(([key, count]) => {
        const config = RESPONSE_CONFIG[key as ResponseType];
        const Icon = config.icon;
        
        return (
          <div
            key={key}
            className={cn(
              'flex items-center gap-1 px-2 py-1 rounded-md',
              config.bgColor
            )}
          >
            <Icon className={cn(iconSizeClasses[size], config.color)} />
            <span className={cn('font-semibold', config.color)}>{count}</span>
          </div>
        );
      })}
    </div>
  );
}

// Export configuration for use in other components
export { RESPONSE_CONFIG as COLOR_CODED_CONFIG };