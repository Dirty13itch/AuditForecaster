import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { safeToFixed, safeDivide } from "@shared/numberUtils";

interface ForecastCardProps {
  title: string;
  predicted: number;
  actual?: number;
  unit: string;
  confidence?: number;
  threshold?: number;
}

export default function ForecastCard({ 
  title, 
  predicted, 
  actual, 
  unit, 
  confidence,
  threshold 
}: ForecastCardProps) {
  const hasActual = actual !== undefined;
  // When predicted is 0, variance is undefined unless actual is also 0
  const variance = hasActual 
    ? (predicted === 0 
        ? (actual === 0 ? 0 : Infinity) 
        : safeDivide(actual - predicted, predicted) * 100)
    : 0;
  const passedTest = hasActual && threshold ? actual <= threshold : undefined;

  const getVarianceColor = () => {
    if (!hasActual) return "text-muted-foreground";
    if (!isFinite(variance)) return "text-destructive";
    if (variance > 10) return "text-destructive";
    if (variance < -10) return "text-success";
    return "text-muted-foreground";
  };

  const getVarianceIcon = () => {
    if (!hasActual) return null;
    if (!isFinite(variance)) return <TrendingUp className="h-4 w-4" />;
    if (variance > 5) return <TrendingUp className="h-4 w-4" />;
    if (variance < -5) return <TrendingDown className="h-4 w-4" />;
    return <Minus className="h-4 w-4" />;
  };

  return (
    <Card data-testid="card-forecast">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-medium text-muted-foreground" data-testid="text-forecast-title">
            {title}
          </h3>
          {passedTest !== undefined && (
            <Badge 
              className={passedTest ? "bg-success text-success-foreground" : "bg-destructive text-destructive-foreground"}
              data-testid="badge-test-result"
            >
              {passedTest ? "Pass" : "Fail"}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Predicted</p>
            <p className="text-2xl font-bold" data-testid="text-predicted">
              {safeToFixed(predicted, 1)}
              <span className="text-sm font-normal text-muted-foreground ml-1">{unit}</span>
            </p>
            {confidence && (
              <p className="text-xs text-muted-foreground mt-1" data-testid="text-confidence">
                {confidence}% confidence
              </p>
            )}
          </div>

          {hasActual ? (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Actual</p>
              <p className="text-2xl font-bold" data-testid="text-actual">
                {safeToFixed(actual, 1)}
                <span className="text-sm font-normal text-muted-foreground ml-1">{unit}</span>
              </p>
              <div className={`flex items-center gap-1 mt-1 text-xs ${getVarianceColor()}`} data-testid="text-variance">
                {getVarianceIcon()}
                <span>{isFinite(variance) ? `${safeToFixed(Math.abs(variance), 1)}%` : 'N/A'}</span>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center">
              <p className="text-sm text-muted-foreground">Pending test</p>
            </div>
          )}
        </div>

        {threshold && (
          <div className="pt-3 border-t">
            <p className="text-xs text-muted-foreground">
              Threshold: <span className="font-medium text-foreground">{threshold} {unit}</span>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
