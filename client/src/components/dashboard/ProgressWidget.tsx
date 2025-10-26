import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Target, TrendingUp, Award } from "lucide-react";

interface ProgressWidgetProps {
  title: string;
  current: number;
  target: number;
  unit?: string;
  format?: "number" | "currency" | "percentage";
  showPercentage?: boolean;
  color?: "primary" | "success" | "warning" | "destructive";
  icon?: React.ReactNode;
  subtitle?: string;
  className?: string;
}

export function ProgressWidget({
  title,
  current,
  target,
  unit = "",
  format = "number",
  showPercentage = true,
  color = "primary",
  icon,
  subtitle,
  className,
}: ProgressWidgetProps) {
  const percentage = Math.min(100, (current / target) * 100);
  const isComplete = current >= target;

  const formatValue = (value: number) => {
    if (format === "currency") {
      return `$${value.toLocaleString()}`;
    }
    if (format === "percentage") {
      return `${value}%`;
    }
    return value.toLocaleString();
  };

  const getProgressColor = () => {
    if (isComplete) return "bg-success";
    switch (color) {
      case "success":
        return "bg-success";
      case "warning":
        return "bg-warning";
      case "destructive":
        return "bg-destructive";
      default:
        return "bg-primary";
    }
  };

  return (
    <Card className={cn("hover-elevate", className)} data-testid={`progress-widget-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          {isComplete ? (
            <Award className="h-5 w-5 text-success" />
          ) : icon || (
            <Target className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold">
              {formatValue(current)}{unit}
            </span>
            <span className="text-sm text-muted-foreground">
              of {formatValue(target)}{unit}
            </span>
          </div>
          
          <div className="space-y-2">
            <Progress value={percentage} className={cn("h-2", getProgressColor())} />
            
            <div className="flex items-center justify-between">
              {showPercentage && (
                <Badge variant={isComplete ? "default" : "secondary"}>
                  {percentage.toFixed(0)}%
                </Badge>
              )}
              
              {percentage > 80 && !isComplete && (
                <span className="text-xs text-warning flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  Almost there!
                </span>
              )}
              
              {isComplete && (
                <span className="text-xs text-success font-medium">
                  Goal Achieved!
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}