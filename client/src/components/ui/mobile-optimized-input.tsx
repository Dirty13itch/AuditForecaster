import * as React from "react";
import { useState, useEffect, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export interface MobileOptimizedInputProps extends React.ComponentProps<typeof Input> {
  // Core input behavior
  inputMode?: "none" | "text" | "decimal" | "numeric" | "tel" | "search" | "email" | "url";
  pattern?: string;
  autoCapitalize?: "off" | "none" | "on" | "sentences" | "words" | "characters";
  autoCorrect?: "on" | "off";
  autoComplete?: string;
  
  // Field validation and behavior
  fieldType?: "currency" | "percentage" | "decimal" | "integer" | "phone" | "cfm" | "ach" | "pressure" | "volume" | "area" | "text";
  min?: number;
  max?: number;
  step?: number;
  precision?: number;
  
  // Auto-advance behavior
  autoAdvance?: boolean;
  onAdvance?: () => void;
  autoAdvanceLength?: number; // Number of characters before auto-advance
  
  // Smart defaults
  defaultSuggestion?: string | number;
  suggestions?: (string | number)[];
  onSuggestionAccepted?: (value: string | number) => void;
  
  // Voice input
  enableVoice?: boolean;
  voiceLanguage?: string;
  voiceHints?: string[]; // Common terms to help voice recognition
  
  // Visual feedback
  showValidation?: boolean;
  validationMessage?: string;
  isValid?: boolean;
  
  // Mobile-specific enhancements
  largeTouch?: boolean; // Use larger 48px touch target
  showClearButton?: boolean;
  hapticFeedback?: boolean;
  
  // Callbacks
  onValidInput?: (value: string) => void;
  onInvalidInput?: (value: string, reason: string) => void;
}

// Field type configurations for automatic input mode and pattern detection
const FIELD_TYPE_CONFIG = {
  currency: {
    inputMode: "decimal" as const,
    pattern: "[0-9]*\\.?[0-9]*",
    autoCapitalize: "off" as const,
    autoCorrect: "off",
    placeholder: "0.00",
    prefix: "$",
  },
  percentage: {
    inputMode: "decimal" as const,
    pattern: "[0-9]*\\.?[0-9]*",
    autoCapitalize: "off" as const,
    autoCorrect: "off",
    placeholder: "0.0",
    suffix: "%",
  },
  decimal: {
    inputMode: "decimal" as const,
    pattern: "[0-9]*\\.?[0-9]*",
    autoCapitalize: "off" as const,
    autoCorrect: "off",
    placeholder: "0.0",
  },
  integer: {
    inputMode: "numeric" as const,
    pattern: "[0-9]*",
    autoCapitalize: "off" as const,
    autoCorrect: "off",
    placeholder: "0",
  },
  phone: {
    inputMode: "tel" as const,
    pattern: "[0-9]{3}-[0-9]{3}-[0-9]{4}",
    autoCapitalize: "off" as const,
    autoCorrect: "off",
    placeholder: "555-555-5555",
  },
  cfm: {
    inputMode: "decimal" as const,
    pattern: "[0-9]*\\.?[0-9]*",
    autoCapitalize: "off" as const,
    autoCorrect: "off",
    placeholder: "0.0",
    suffix: " CFM",
    voiceHints: ["CFM", "cubic feet per minute", "airflow"],
  },
  ach: {
    inputMode: "decimal" as const,
    pattern: "[0-9]*\\.?[0-9]*",
    autoCapitalize: "off" as const,
    autoCorrect: "off",
    placeholder: "0.0",
    suffix: " ACH",
    voiceHints: ["ACH", "air changes per hour"],
  },
  pressure: {
    inputMode: "decimal" as const,
    pattern: "[0-9]*\\.?[0-9]*",
    autoCapitalize: "off" as const,
    autoCorrect: "off",
    placeholder: "0.0",
    suffix: " Pa",
    voiceHints: ["Pascal", "Pascals", "PA", "pressure"],
  },
  volume: {
    inputMode: "decimal" as const,
    pattern: "[0-9]*\\.?[0-9]*",
    autoCapitalize: "off" as const,
    autoCorrect: "off",
    placeholder: "0",
    suffix: " ft³",
    voiceHints: ["cubic feet", "volume"],
  },
  area: {
    inputMode: "decimal" as const,
    pattern: "[0-9]*\\.?[0-9]*",
    autoCapitalize: "off" as const,
    autoCorrect: "off",
    placeholder: "0",
    suffix: " ft²",
    voiceHints: ["square feet", "area"],
  },
  text: {
    inputMode: "text" as const,
    pattern: undefined,
    autoCapitalize: "sentences" as const,
    autoCorrect: "on",
    placeholder: "",
  },
};

// Common inspector voice terms mapping
const VOICE_NUMBER_MAPPINGS: Record<string, string> = {
  "zero": "0",
  "oh": "0",
  "one": "1",
  "two": "2",
  "to": "2", // Common misheard
  "too": "2", // Common misheard
  "three": "3",
  "four": "4",
  "for": "4", // Common misheard
  "five": "5",
  "six": "6",
  "seven": "7",
  "eight": "8",
  "nine": "9",
  "ten": "10",
  "eleven": "11",
  "twelve": "12",
  "thirteen": "13",
  "fourteen": "14",
  "fifteen": "15",
  "twenty": "20",
  "thirty": "30",
  "forty": "40",
  "fifty": "50",
  "hundred": "100",
  "thousand": "1000",
  "point": ".",
  "dot": ".",
  "decimal": ".",
  "negative": "-",
  "minus": "-",
  "dash": "-",
};

const MobileOptimizedInput = React.forwardRef<HTMLInputElement, MobileOptimizedInputProps>(
  (
    {
      className,
      type = "text",
      fieldType = "text",
      inputMode,
      pattern,
      autoCapitalize,
      autoCorrect,
      autoComplete = "off",
      min,
      max,
      step,
      precision = 2,
      autoAdvance = false,
      onAdvance,
      autoAdvanceLength,
      defaultSuggestion,
      suggestions = [],
      onSuggestionAccepted,
      enableVoice = false,
      voiceLanguage = "en-US",
      voiceHints = [],
      showValidation = false,
      validationMessage,
      isValid,
      largeTouch = true,
      showClearButton = true,
      hapticFeedback = true,
      onValidInput,
      onInvalidInput,
      onChange,
      onKeyDown,
      onBlur,
      value,
      ...props
    },
    ref
  ) => {
    const { toast } = useToast();
    const [localValue, setLocalValue] = useState(value || "");
    const [isListening, setIsListening] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [internalIsValid, setInternalIsValid] = useState<boolean | undefined>(isValid);
    const recognitionRef = useRef<any>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Get field type configuration
    const fieldConfig = FIELD_TYPE_CONFIG[fieldType] || FIELD_TYPE_CONFIG.text;
    const finalInputMode = inputMode || fieldConfig.inputMode;
    const finalPattern = pattern || fieldConfig.pattern;
    const finalAutoCapitalize = autoCapitalize || fieldConfig.autoCapitalize;
    const finalAutoCorrect = autoCorrect || fieldConfig.autoCorrect || "off";
    const finalPlaceholder = props.placeholder || fieldConfig.placeholder || "";

    // Combine voice hints from field type and props
    const allVoiceHints = [...(fieldConfig.voiceHints || []), ...voiceHints];

    // Update local value when prop changes
    useEffect(() => {
      setLocalValue(value || "");
    }, [value]);

    // Validate input value
    const validateValue = useCallback(
      (val: string): { valid: boolean; reason?: string } => {
        if (!val && props.required) {
          return { valid: false, reason: "Required field" };
        }

        const numVal = parseFloat(val);
        
        if (fieldType !== "text" && val && isNaN(numVal)) {
          return { valid: false, reason: "Must be a valid number" };
        }

        if (min !== undefined && numVal < min) {
          return { valid: false, reason: `Must be at least ${min}` };
        }

        if (max !== undefined && numVal > max) {
          return { valid: false, reason: `Must be at most ${max}` };
        }

        if (finalPattern && val && !new RegExp(finalPattern).test(val)) {
          return { valid: false, reason: "Invalid format" };
        }

        return { valid: true };
      },
      [fieldType, min, max, finalPattern, props.required]
    );

    // Format value based on field type
    const formatValue = useCallback(
      (val: string): string => {
        if (!val) return val;

        switch (fieldType) {
          case "currency":
            const currencyNum = parseFloat(val.replace(/[^0-9.-]/g, ""));
            return isNaN(currencyNum) ? val : currencyNum.toFixed(2);
          
          case "percentage":
          case "decimal":
          case "cfm":
          case "ach":
          case "pressure":
            const decimalNum = parseFloat(val);
            return isNaN(decimalNum) ? val : decimalNum.toFixed(precision);
          
          case "phone":
            const digits = val.replace(/\D/g, "");
            if (digits.length === 10) {
              return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
            }
            return val;
          
          case "integer":
          case "volume":
          case "area":
            const intNum = parseInt(val);
            return isNaN(intNum) ? val : intNum.toString();
          
          default:
            return val;
        }
      },
      [fieldType, precision]
    );

    // Handle input change
    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setLocalValue(newValue);

        // Validate
        const validation = validateValue(newValue);
        setInternalIsValid(validation.valid);

        if (validation.valid) {
          onValidInput?.(newValue);
        } else if (validation.reason) {
          onInvalidInput?.(newValue, validation.reason);
        }

        // Auto-advance if configured
        if (
          autoAdvance &&
          validation.valid &&
          onAdvance &&
          ((autoAdvanceLength && newValue.length >= autoAdvanceLength) ||
            (fieldType === "phone" && newValue.length === 12))
        ) {
          setTimeout(() => onAdvance(), 100);
        }

        // Call original onChange
        onChange?.(e);
      },
      [
        onChange,
        validateValue,
        onValidInput,
        onInvalidInput,
        autoAdvance,
        onAdvance,
        autoAdvanceLength,
        fieldType,
      ]
    );

    // Handle blur to format value
    const handleBlur = useCallback(
      (e: React.FocusEvent<HTMLInputElement>) => {
        const formatted = formatValue(localValue);
        if (formatted !== localValue) {
          setLocalValue(formatted);
          const syntheticEvent = {
            ...e,
            target: { ...e.target, value: formatted },
          } as React.FocusEvent<HTMLInputElement>;
          onBlur?.(syntheticEvent);
        } else {
          onBlur?.(e);
        }
      },
      [localValue, formatValue, onBlur]
    );

    // Process voice input text
    const processVoiceText = useCallback(
      (transcript: string): string => {
        let processed = transcript.toLowerCase();

        // Replace common number words with digits
        Object.entries(VOICE_NUMBER_MAPPINGS).forEach(([word, digit]) => {
          const regex = new RegExp(`\\b${word}\\b`, "gi");
          processed = processed.replace(regex, digit);
        });

        // Remove common field terminology that might be spoken
        allVoiceHints.forEach((hint) => {
          const regex = new RegExp(`\\b${hint.toLowerCase()}\\b`, "gi");
          processed = processed.replace(regex, "");
        });

        // Clean up extra spaces and punctuation
        processed = processed
          .replace(/[^0-9.\-]/g, " ")
          .replace(/\s+/g, " ")
          .trim();

        return processed;
      },
      [allVoiceHints]
    );

    // Initialize voice recognition
    useEffect(() => {
      if (!enableVoice) return;

      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (!SpeechRecognition) {
        console.warn("Speech recognition not supported in this browser");
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = voiceLanguage;
      recognition.maxAlternatives = 1;

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        const processed = processVoiceText(transcript);
        
        setLocalValue(processed);
        const syntheticEvent = {
          target: { value: processed },
        } as React.ChangeEvent<HTMLInputElement>;
        handleChange(syntheticEvent);
        
        // Provide haptic feedback if available
        if (hapticFeedback && navigator.vibrate) {
          navigator.vibrate(50);
        }
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        setIsListening(false);
        
        if (event.error === "no-speech") {
          toast({
            title: "No speech detected",
            description: "Please try speaking again",
            variant: "default",
          });
        } else {
          toast({
            title: "Voice input error",
            description: "Unable to process voice input",
            variant: "destructive",
          });
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;

      return () => {
        if (recognitionRef.current) {
          recognitionRef.current.stop();
        }
      };
    }, [
      enableVoice,
      voiceLanguage,
      processVoiceText,
      handleChange,
      hapticFeedback,
      toast,
    ]);

    // Toggle voice input
    const toggleVoiceInput = useCallback(() => {
      if (!recognitionRef.current) {
        toast({
          title: "Voice input not available",
          description: "Your browser doesn't support voice input",
          variant: "destructive",
        });
        return;
      }

      if (isListening) {
        recognitionRef.current.stop();
        setIsListening(false);
      } else {
        recognitionRef.current.start();
        setIsListening(true);
        
        if (hapticFeedback && navigator.vibrate) {
          navigator.vibrate(100);
        }
        
        toast({
          title: "Listening...",
          description: `Speak the ${fieldType} value clearly`,
          variant: "default",
        });
      }
    }, [isListening, fieldType, hapticFeedback, toast]);

    // Clear input
    const handleClear = useCallback(() => {
      setLocalValue("");
      const syntheticEvent = {
        target: { value: "" },
      } as React.ChangeEvent<HTMLInputElement>;
      handleChange(syntheticEvent);
      inputRef.current?.focus();
      
      if (hapticFeedback && navigator.vibrate) {
        navigator.vibrate(25);
      }
    }, [handleChange, hapticFeedback]);

    // Accept suggestion
    const acceptSuggestion = useCallback(
      (suggestion: string | number) => {
        const value = suggestion.toString();
        setLocalValue(value);
        const syntheticEvent = {
          target: { value },
        } as React.ChangeEvent<HTMLInputElement>;
        handleChange(syntheticEvent);
        setShowSuggestions(false);
        onSuggestionAccepted?.(suggestion);
        
        if (hapticFeedback && navigator.vibrate) {
          navigator.vibrate(50);
        }
      },
      [handleChange, onSuggestionAccepted, hapticFeedback]
    );

    // Handle Enter key for auto-advance
    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" && autoAdvance && onAdvance) {
          e.preventDefault();
          onAdvance();
        }
        onKeyDown?.(e);
      },
      [autoAdvance, onAdvance, onKeyDown]
    );

    // Determine validation state for visual feedback
    const showValidState = showValidation && localValue;
    const validState = showValidState
      ? internalIsValid === false
        ? "error"
        : internalIsValid === true
        ? "success"
        : "default"
      : "default";

    // Combine refs
    const combinedRef = React.useCallback(
      (instance: HTMLInputElement | null) => {
        inputRef.current = instance;
        if (ref) {
          if (typeof ref === "function") {
            ref(instance);
          } else {
            ref.current = instance;
          }
        }
      },
      [ref]
    );

    return (
      <div className="relative w-full">
        {/* Prefix (e.g., $ for currency) */}
        {fieldConfig.prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground z-10 pointer-events-none">
            {fieldConfig.prefix}
          </span>
        )}

        {/* Main Input */}
        <Input
          ref={combinedRef}
          type={type}
          inputMode={finalInputMode}
          pattern={finalPattern}
          autoCapitalize={finalAutoCapitalize}
          autoCorrect={finalAutoCorrect}
          autoComplete={autoComplete}
          className={cn(
            largeTouch && "h-12", // Maintain 48px touch target
            fieldConfig.prefix && "pl-8",
            fieldConfig.suffix && "pr-16",
            showClearButton && localValue && "pr-20",
            enableVoice && "pr-28",
            validState === "error" && "border-destructive focus-visible:ring-destructive",
            validState === "success" && "border-green-500 focus-visible:ring-green-500",
            className
          )}
          value={localValue}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          onFocus={() => defaultSuggestion && setShowSuggestions(true)}
          placeholder={finalPlaceholder}
          {...props}
        />

        {/* Suffix (e.g., % for percentage) */}
        {fieldConfig.suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
            {fieldConfig.suffix}
          </span>
        )}

        {/* Action Buttons Container */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {/* Validation Icon */}
          {showValidState && (
            <div className="pointer-events-none">
              {validState === "error" ? (
                <X className="h-4 w-4 text-destructive" />
              ) : validState === "success" ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : null}
            </div>
          )}

          {/* Clear Button */}
          {showClearButton && localValue && !enableVoice && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleClear}
              data-testid="button-clear-input"
            >
              <X className="h-4 w-4" />
            </Button>
          )}

          {/* Voice Input Button */}
          {enableVoice && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={cn(
                "h-8 w-8",
                isListening && "bg-destructive/10 text-destructive"
              )}
              onClick={toggleVoiceInput}
              data-testid="button-voice-input"
            >
              {isListening ? (
                <MicOff className="h-4 w-4" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>

        {/* Validation Message */}
        {showValidation && validationMessage && validState === "error" && (
          <p className="mt-1 text-sm text-destructive">{validationMessage}</p>
        )}

        {/* Suggestions Dropdown */}
        {showSuggestions && (defaultSuggestion || suggestions.length > 0) && (
          <div className="absolute z-50 w-full mt-1 bg-background border border-input rounded-md shadow-lg">
            {defaultSuggestion && (
              <button
                type="button"
                className="w-full px-3 py-2 text-left hover:bg-accent hover:text-accent-foreground transition-colors"
                onClick={() => acceptSuggestion(defaultSuggestion)}
                data-testid="button-default-suggestion"
              >
                <span className="text-sm text-muted-foreground">Suggested: </span>
                <span className="font-medium">{defaultSuggestion}</span>
              </button>
            )}
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                type="button"
                className="w-full px-3 py-2 text-left hover:bg-accent hover:text-accent-foreground transition-colors border-t"
                onClick={() => acceptSuggestion(suggestion)}
                data-testid={`button-suggestion-${index}`}
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }
);

MobileOptimizedInput.displayName = "MobileOptimizedInput";

export { MobileOptimizedInput };