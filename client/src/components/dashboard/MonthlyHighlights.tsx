import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Star, TrendingUp, Info, AlertTriangle } from "lucide-react";
import type { MonthlyHighlight } from "@shared/dashboardTypes";

interface MonthlyHighlightsProps {
  highlights: MonthlyHighlight[];
  isLoading?: boolean;
}

export function MonthlyHighlights({ highlights, isLoading }: MonthlyHighlightsProps) {
  if (isLoading) {
    return (
      <Card data-testid="card-monthly-highlights">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-warning" />
            This Month's Highlights
          </CardTitle>
          <CardDescription>Key performance indicators</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!highlights || highlights.length === 0) {
    return (
      <Card data-testid="card-monthly-highlights">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-warning" />
            This Month's Highlights
          </CardTitle>
          <CardDescription>Key performance indicators</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-48 flex items-center justify-center text-muted-foreground">
            No highlights available for this month
          </div>
        </CardContent>
      </Card>
    );
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <TrendingUp className="h-4 w-4 text-success" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-warning" />;
      default:
        return <Info className="h-4 w-4 text-info" />;
    }
  };

  const getBadgeVariant = (type: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (type) {
      case 'success':
        return 'default';
      case 'warning':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  return (
    <Card data-testid="card-monthly-highlights">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star className="h-5 w-5 text-warning" />
          This Month's Highlights
        </CardTitle>
        <CardDescription>Key performance indicators</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {highlights.map((highlight, index) => (
            <div 
              key={index}
              className="flex items-start gap-3 p-3 rounded-md border hover-elevate"
              data-testid={`highlight-${index}`}
            >
              <div className="p-2 rounded-md bg-muted">
                {getIcon(highlight.type)}
              </div>
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium">{highlight.label}</p>
                <div className="flex items-center gap-2">
                  <Badge variant={getBadgeVariant(highlight.type)}>
                    {highlight.value}
                  </Badge>
                </div>
              </div>
            </div>
          ))}
        </div>

        {highlights.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">Complete more inspections to see highlights</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
