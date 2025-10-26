import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign, Home, Target } from "lucide-react";

interface TaxCreditPanelProps {
  eligibleCount: number;
  totalCredits: number;
  isLoading?: boolean;
}

const GOAL_CREDITS = 397500;

export function TaxCreditPanel({ eligibleCount, totalCredits, isLoading }: TaxCreditPanelProps) {
  if (isLoading) {
    return (
      <Card data-testid="card-tax-credits">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-success" />
            45L Tax Credit Tracking
          </CardTitle>
          <CardDescription>Energy Efficient Home Credit eligibility</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    );
  }

  // Ensure totalCredits is a number
  const safeCredits = totalCredits || 0;
  const progressPercentage = Math.min((safeCredits / GOAL_CREDITS) * 100, 100);
  const remainingHomes = Math.max(0, Math.ceil((GOAL_CREDITS - safeCredits) / 2000));

  return (
    <Card data-testid="card-tax-credits">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-success" />
          45L Tax Credit Tracking
        </CardTitle>
        <CardDescription>Energy Efficient Home Credit (≤3.0 ACH50)</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Home className="h-4 w-4" />
              Eligible Homes
            </div>
            <div className="text-3xl font-bold" data-testid="text-eligible-homes">
              {eligibleCount}
            </div>
            <Badge variant="secondary" className="text-xs">
              @ $2,000 each
            </Badge>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <DollarSign className="h-4 w-4" />
              Potential Credits
            </div>
            <div className="text-3xl font-bold text-success" data-testid="text-total-credits">
              ${safeCredits.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Tax deduction potential
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Target className="h-4 w-4" />
              Goal Progress
            </div>
            <div className="text-3xl font-bold" data-testid="text-goal-progress">
              {progressPercentage.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              of ${GOAL_CREDITS.toLocaleString()} goal
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progress to Goal</span>
            <span className="font-medium">${safeCredits.toLocaleString()} / ${GOAL_CREDITS.toLocaleString()}</span>
          </div>
          <Progress 
            value={progressPercentage} 
            className="h-3"
            data-testid="progress-tax-credits"
          />
          {remainingHomes > 0 && (
            <p className="text-xs text-muted-foreground text-center">
              {remainingHomes} more eligible homes needed to reach goal
            </p>
          )}
          {progressPercentage >= 100 && (
            <p className="text-xs text-success text-center font-medium">
              🎉 Goal achieved! Congratulations!
            </p>
          )}
        </div>

        <div className="rounded-md bg-muted p-4 space-y-2">
          <h4 className="text-sm font-semibold">45L Credit Requirements</h4>
          <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
            <li>ACH50 score ≤ 3.0 (Minnesota Energy Code threshold)</li>
            <li>$2,000 tax credit per eligible home</li>
            <li>Applies to qualified energy-efficient new construction</li>
            <li>Consult tax professional for complete eligibility details</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
