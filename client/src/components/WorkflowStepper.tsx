import { Check, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const WORKFLOW_STEPS = [
  { id: "scheduled", label: "Scheduled" },
  { id: "pre-inspection", label: "Pre-Inspection" },
  { id: "in-progress", label: "In Progress" },
  { id: "testing", label: "Testing" },
  { id: "review", label: "Review" },
  { id: "completed", label: "Completed" }
];

interface WorkflowStepperProps {
  currentStatus: string;
  onStatusChange: (newStatus: string) => void;
  isPending?: boolean;
}

export default function WorkflowStepper({ 
  currentStatus, 
  onStatusChange,
  isPending = false
}: WorkflowStepperProps) {
  const currentIndex = WORKFLOW_STEPS.findIndex(step => step.id === currentStatus);
  const nextStep = WORKFLOW_STEPS[currentIndex + 1];
  const canAdvance = currentIndex >= 0 && currentIndex < WORKFLOW_STEPS.length - 1;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-2">
        {WORKFLOW_STEPS.map((step, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isUpcoming = index > currentIndex;

          return (
            <div key={step.id} className="flex items-center gap-2 min-w-fit">
              <div className="flex flex-col items-center gap-1">
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors",
                    isCompleted && "bg-success border-success text-success-foreground",
                    isCurrent && "bg-primary border-primary text-primary-foreground",
                    isUpcoming && "bg-muted border-muted-foreground/20 text-muted-foreground"
                  )}
                  data-testid={`step-${step.id}`}
                >
                  {isCompleted ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <span className="text-sm font-medium">{index + 1}</span>
                  )}
                </div>
                <span
                  className={cn(
                    "text-xs font-medium text-center whitespace-nowrap",
                    (isCompleted || isCurrent) && "text-foreground",
                    isUpcoming && "text-muted-foreground"
                  )}
                >
                  {step.label}
                </span>
              </div>
              
              {index < WORKFLOW_STEPS.length - 1 && (
                <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              )}
            </div>
          );
        })}
      </div>

      {canAdvance && (
        <div className="flex justify-end">
          <Button
            onClick={() => nextStep && onStatusChange(nextStep.id)}
            disabled={isPending}
            data-testid="button-advance-workflow"
          >
            Advance to {nextStep?.label}
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      )}
    </div>
  );
}
