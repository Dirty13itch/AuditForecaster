import { useState, useEffect } from 'react';
import { 
  useAutoExpandOnNegative, 
  AutoExpandSection, 
  NegativeResponseIndicator 
} from '@/hooks/useAutoExpandOnNegative';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Camera, AlertTriangle, CheckCircle, XCircle, MinusCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InspectionQuestionProps {
  question: string;
  questionId: string;
  required?: boolean;
  photoRequired?: boolean;
  onResponseChange?: (response: string, notes?: string) => void;
  onPhotoCapture?: () => void;
}

/**
 * Inspection question component with auto-expand for negative responses
 * Following iAuditor UX pattern - negative responses require documentation
 */
export function InspectionQuestionWithAutoExpand({
  question,
  questionId,
  required = false,
  photoRequired = false,
  onResponseChange,
  onPhotoCapture
}: InspectionQuestionProps) {
  const [response, setResponse] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [hasPhoto, setHasPhoto] = useState(false);

  const {
    notesExpanded,
    photoExpanded,
    isNegativeResponse,
    expandDocumentation
  } = useAutoExpandOnNegative({
    responseValue: response,
    negativeValues: ['fail', 'no', 'na'],
    onNotesExpand: () => {
      // Focus notes field when auto-expanded
      setTimeout(() => {
        const notesField = document.getElementById(`notes-${questionId}`);
        notesField?.focus();
      }, 300);
    }
  });

  const handleResponseChange = (value: string) => {
    setResponse(value);
    onResponseChange?.(value, notes);
  };

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNotes(e.target.value);
    onResponseChange?.(response, e.target.value);
  };

  const handlePhotoCapture = () => {
    setHasPhoto(true);
    onPhotoCapture?.();
  };

  // Get response icon and color
  const getResponseDisplay = () => {
    switch (response) {
      case 'pass':
        return { icon: CheckCircle, color: 'text-success', bgColor: 'bg-success/10' };
      case 'fail':
        return { icon: XCircle, color: 'text-destructive', bgColor: 'bg-destructive/10' };
      case 'na':
        return { icon: MinusCircle, color: 'text-muted-foreground', bgColor: 'bg-muted' };
      default:
        return null;
    }
  };

  const responseDisplay = getResponseDisplay();

  return (
    <Card 
      className={cn(
        "transition-all duration-300",
        isNegativeResponse && "border-warning",
        response && !isNegativeResponse && "border-success"
      )}
      data-testid={`question-card-${questionId}`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="text-base font-medium flex-1">
            {question}
            {required && <span className="text-destructive ml-1">*</span>}
          </CardTitle>
          {responseDisplay && (
            <div className={cn(
              "flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium",
              responseDisplay.bgColor
            )}>
              <responseDisplay.icon className={cn("h-3.5 w-3.5", responseDisplay.color)} />
              <span className={responseDisplay.color}>
                {response.toUpperCase()}
              </span>
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Response Options */}
        <RadioGroup 
          value={response} 
          onValueChange={handleResponseChange}
          className="flex flex-row gap-4"
          data-testid={`radio-group-${questionId}`}
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem 
              value="pass" 
              id={`pass-${questionId}`}
              className="border-success data-[state=checked]:bg-success data-[state=checked]:border-success"
              data-testid={`radio-pass-${questionId}`}
            />
            <Label 
              htmlFor={`pass-${questionId}`} 
              className="cursor-pointer text-sm font-medium"
            >
              Pass
            </Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <RadioGroupItem 
              value="fail" 
              id={`fail-${questionId}`}
              className="border-destructive data-[state=checked]:bg-destructive data-[state=checked]:border-destructive"
              data-testid={`radio-fail-${questionId}`}
            />
            <Label 
              htmlFor={`fail-${questionId}`} 
              className="cursor-pointer text-sm font-medium"
            >
              Fail
            </Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <RadioGroupItem 
              value="na" 
              id={`na-${questionId}`}
              data-testid={`radio-na-${questionId}`}
            />
            <Label 
              htmlFor={`na-${questionId}`} 
              className="cursor-pointer text-sm font-medium"
            >
              N/A
            </Label>
          </div>
        </RadioGroup>

        {/* Auto-expand indicator for negative responses */}
        <NegativeResponseIndicator 
          show={isNegativeResponse}
          message={
            response === 'fail' 
              ? "Failed items require documentation. Please add notes and photos."
              : response === 'na'
              ? "Please document why this item is not applicable."
              : "Please document this issue with notes and photos."
          }
        />

        {/* Auto-expanding Notes Section */}
        <AutoExpandSection
          expanded={notesExpanded}
          title="Notes"
          required={isNegativeResponse}
        >
          <Textarea
            id={`notes-${questionId}`}
            value={notes}
            onChange={handleNotesChange}
            placeholder={
              isNegativeResponse 
                ? "Describe the issue, location, and any corrective actions needed..."
                : "Add any additional notes..."
            }
            className={cn(
              "min-h-[100px] resize-none",
              isNegativeResponse && !notes && "border-warning"
            )}
            data-testid={`textarea-notes-${questionId}`}
          />
          {isNegativeResponse && !notes && (
            <p className="text-xs text-warning mt-1">
              Notes are required for {response === 'fail' ? 'failed' : 'N/A'} items
            </p>
          )}
        </AutoExpandSection>

        {/* Auto-expanding Photo Section */}
        <AutoExpandSection
          expanded={photoExpanded || (photoRequired && !hasPhoto)}
          title="Photo Documentation"
          required={isNegativeResponse || photoRequired}
        >
          <div className="space-y-3">
            <Button
              variant={isNegativeResponse || photoRequired ? "default" : "outline"}
              onClick={handlePhotoCapture}
              className="w-full"
              data-testid={`button-photo-${questionId}`}
            >
              <Camera className="h-4 w-4 mr-2" />
              {hasPhoto ? "Add Another Photo" : "Take Photo"}
            </Button>
            
            {hasPhoto && (
              <div className="flex items-center gap-2 p-2 bg-success/10 rounded-md">
                <CheckCircle className="h-4 w-4 text-success" />
                <span className="text-sm text-success-foreground">Photo captured</span>
              </div>
            )}
            
            {(isNegativeResponse || photoRequired) && !hasPhoto && (
              <p className="text-xs text-warning">
                {photoRequired 
                  ? "Photo required for this inspection item"
                  : `Photo documentation required for ${response === 'fail' ? 'failed' : 'N/A'} items`
                }
              </p>
            )}
          </div>
        </AutoExpandSection>

        {/* Manual expand option if user wants to add notes/photos for passing items */}
        {response === 'pass' && !notesExpanded && !photoExpanded && (
          <Button
            variant="ghost"
            size="sm"
            onClick={expandDocumentation}
            className="text-xs text-muted-foreground"
            data-testid={`button-expand-${questionId}`}
          >
            Add notes or photos
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Example usage in an inspection form
 */
export function InspectionFormExample() {
  const questions = [
    { id: 'q1', text: 'Is the insulation properly installed?', photoRequired: true },
    { id: 'q2', text: 'Are all electrical outlets grounded?', photoRequired: false },
    { id: 'q3', text: 'Does the HVAC system operate correctly?', photoRequired: false },
    { id: 'q4', text: 'Are smoke detectors installed and functional?', photoRequired: true },
  ];

  const handleResponseChange = (questionId: string, response: string, notes?: string) => {
    console.log(`Question ${questionId}: ${response}`, notes ? `(Notes: ${notes})` : '');
  };

  return (
    <div className="space-y-4 p-4">
      <h2 className="text-xl font-semibold mb-4">Home Inspection Checklist</h2>
      {questions.map(q => (
        <InspectionQuestionWithAutoExpand
          key={q.id}
          questionId={q.id}
          question={q.text}
          photoRequired={q.photoRequired}
          onResponseChange={(response, notes) => handleResponseChange(q.id, response, notes)}
          onPhotoCapture={() => console.log(`Photo capture for ${q.id}`)}
        />
      ))}
    </div>
  );
}