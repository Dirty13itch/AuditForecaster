import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { LineChart, Line, ResponsiveContainer, Tooltip } from "recharts";
import { useEffect, useState } from "react";

interface MetricCardProps {
  title: string;
  value: string | number;
  previousValue?: string | number;
  sparklineData?: { value: number }[];
  icon?: React.ReactNode;
  format?: "number" | "currency" | "percentage";
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  loading?: boolean;
  onClick?: () => void;
  className?: string;
  animate?: boolean;
  live?: boolean;
}

export function MetricCard({
  title,
  value,
  previousValue,
  sparklineData,
  icon,
  format = "number",
  trend,
  trendValue,
  loading,
  onClick,
  className,
  animate = false,
  live = false,
}: MetricCardProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const [isFlashing, setIsFlashing] = useState(false);

  // Animate value changes
  useEffect(() => {
    if (animate && value !== displayValue) {
      setIsFlashing(true);
      setTimeout(() => {
        setDisplayValue(value);
        setIsFlashing(false);
      }, 300);
    } else {
      setDisplayValue(value);
    }
  }, [value, animate]);

  // Auto calculate trend if not provided
  const calculatedTrend = trend || (() => {
    if (!previousValue || !value) return "neutral";
    const curr = parseFloat(String(value).replace(/[^0-9.-]/g, ''));
    const prev = parseFloat(String(previousValue).replace(/[^0-9.-]/g, ''));
    if (curr > prev) return "up";
    if (curr < prev) return "down";
    return "neutral";
  })();

  const getTrendIcon = () => {
    switch (calculatedTrend) {
      case "up":
        return <TrendingUp className="h-4 w-4 text-success" />;
      case "down":
        return <TrendingDown className="h-4 w-4 text-destructive" />;
      default:
        return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const formatValue = (val: string | number) => {
    if (format === "currency") {
      return `$${parseFloat(String(val)).toLocaleString()}`;
    }
    if (format === "percentage") {
      return `${val}%`;
    }
    return val.toLocaleString();
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <Skeleton className="h-4 w-24" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-32 mb-2" />
          <Skeleton className="h-3 w-16" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      className={cn(
        "transition-all duration-200 hover-elevate",
        onClick && "cursor-pointer",
        className
      )}
      onClick={onClick}
      data-testid={`metric-card-${title.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">
            {title}
          </span>
          <div className="flex items-center gap-2">
            {live && (
              <Badge variant="secondary" className="animate-pulse gap-1">
                <Activity className="h-3 w-3" />
                Live
              </Badge>
            )}
            {icon}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className={cn(
          "text-2xl font-bold transition-all duration-300",
          isFlashing && "text-primary animate-pulse"
        )}>
          {formatValue(displayValue)}
        </div>
        
        {(trendValue || calculatedTrend !== "neutral") && (
          <div className="flex items-center gap-1 mt-2">
            {getTrendIcon()}
            {trendValue && (
              <span className={cn(
                "text-xs font-medium",
                calculatedTrend === "up" && "text-success",
                calculatedTrend === "down" && "text-destructive",
                calculatedTrend === "neutral" && "text-muted-foreground"
              )}>
                {trendValue}
              </span>
            )}
          </div>
        )}

        {sparklineData && sparklineData.length > 0 && (
          <div className="h-12 mt-3">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sparklineData}>
                <Tooltip
                  contentStyle={{
                    background: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  labelStyle={{ display: 'none' }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={
                    calculatedTrend === "up" 
                      ? "hsl(var(--success))"
                      : calculatedTrend === "down"
                      ? "hsl(var(--destructive))"
                      : "hsl(var(--primary))"
                  }
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}