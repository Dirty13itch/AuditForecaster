import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, XCircle, Clock, MinusCircle } from "lucide-react";
import { calculateScore } from "@shared/scoring";
import type { ChecklistItem } from "@shared/schema";

interface InspectionScoreProps {
  items: ChecklistItem[];
}

export function InspectionScore({ items }: InspectionScoreProps) {
  const score = calculateScore(items);
  
  const getScoreColor = (rate: number) => {
    if (rate >= 90) return "text-green-600";
    if (rate >= 70) return "text-yellow-600";
    return "text-red-600";
  };
  
  const getGradeBadgeVariant = (grade: string) => {
    if (grade === 'A') return "default";
    if (grade === 'B' || grade === 'C') return "secondary";
    return "destructive";
  };
  
  return (
    <Card data-testid="card-inspection-score">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Inspection Score</CardTitle>
          <Badge variant={getGradeBadgeVariant(score.grade)} data-testid="badge-grade">
            Grade {score.grade}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Pass Rate</span>
            <span className={`text-2xl font-bold ${getScoreColor(score.passRate)}`} data-testid="text-pass-rate">
              {score.passRate.toFixed(1)}%
            </span>
          </div>
          <Progress value={score.passRate} data-testid="progress-pass-rate" />
        </div>
        
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Completion</span>
            <span className="text-sm text-muted-foreground" data-testid="text-completion-rate">
              {score.completionRate.toFixed(1)}%
            </span>
          </div>
          <Progress value={score.completionRate} data-testid="progress-completion-rate" />
        </div>
        
        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            <div className="flex-1">
              <div className="text-xs text-muted-foreground">Passed</div>
              <div className="font-medium" data-testid="text-passed-count">
                {score.passedItems} ({score.totalItems > 0 ? ((score.passedItems / score.totalItems) * 100).toFixed(0) : 0}%)
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <XCircle className="w-4 h-4 text-red-600" />
            <div className="flex-1">
              <div className="text-xs text-muted-foreground">Failed</div>
              <div className="font-medium" data-testid="text-failed-count">
                {score.failedItems} ({score.totalItems > 0 ? ((score.failedItems / score.totalItems) * 100).toFixed(0) : 0}%)
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-yellow-600" />
            <div className="flex-1">
              <div className="text-xs text-muted-foreground">Pending</div>
              <div className="font-medium" data-testid="text-pending-count">
                {score.pendingItems} ({score.totalItems > 0 ? ((score.pendingItems / score.totalItems) * 100).toFixed(0) : 0}%)
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <MinusCircle className="w-4 h-4 text-gray-600" />
            <div className="flex-1">
              <div className="text-xs text-muted-foreground">N/A</div>
              <div className="font-medium" data-testid="text-na-count">
                {score.notApplicableItems} ({score.totalItems > 0 ? ((score.notApplicableItems / score.totalItems) * 100).toFixed(0) : 0}%)
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
