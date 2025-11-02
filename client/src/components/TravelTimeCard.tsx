import { useQuery } from "@tanstack/react-query";
import { Car, AlertTriangle, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

interface TravelTimeCardProps {
  date: Date;
  inspectorId: string;
}

interface TravelSegment {
  fromAddress: string;
  toAddress: string;
  estimatedMinutes: number;
  distanceMiles: number;
  isLongCommute: boolean;
  isWarning: boolean;
}

interface TravelAnalysisData {
  date: string;
  inspectorId: string;
  jobCount: number;
  totalMinutes: number;
  totalMiles: number;
  segments: TravelSegment[];
  hasLongCommutes: boolean;
  hasWarnings: boolean;
}

export function TravelTimeCard({ date, inspectorId }: TravelTimeCardProps) {
  const { data, isLoading } = useQuery<TravelAnalysisData>({
    queryKey: ['/api/inspector-schedule/travel-analysis', { date: date.toISOString(), inspectorId }],
  });

  if (isLoading) {
    return <Skeleton className="h-32" />;
  }

  if (!data || data.jobCount < 2) {
    return null; // No travel if less than 2 jobs
  }

  return (
    <Card data-testid="card-travel-time">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Car className="w-5 h-5" />
          Travel Time Analysis
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Total Drive Time</p>
            <p className="text-2xl font-bold">{data.totalMinutes} min</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Distance</p>
            <p className="text-2xl font-bold">{data.totalMiles.toFixed(1)} mi</p>
          </div>
        </div>

        {/* Warnings */}
        {data.hasWarnings && (
          <Alert variant="destructive" className="mt-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Long Commute Detected</AlertTitle>
            <AlertDescription>
              One or more trips exceed 45 minutes. Consider reordering jobs for efficiency.
            </AlertDescription>
          </Alert>
        )}

        {data.hasLongCommutes && !data.hasWarnings && (
          <Alert className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Some trips exceed 30 minutes. Route may be optimized.
            </AlertDescription>
          </Alert>
        )}

        {/* Segment Details */}
        <div className="mt-4 space-y-2">
          <Label className="text-sm font-semibold">Route Details:</Label>
          {data.segments.map((segment, index) => (
            <div 
              key={index} 
              className={cn(
                "flex justify-between text-sm p-2 rounded",
                segment.isWarning && "bg-red-50 dark:bg-red-950",
                segment.isLongCommute && !segment.isWarning && "bg-yellow-50 dark:bg-yellow-950"
              )}
              data-testid={`segment-${index}`}
            >
              <span className="truncate flex-1">
                Job {index + 1} → Job {index + 2}
              </span>
              <Badge variant={segment.isWarning ? "destructive" : segment.isLongCommute ? "secondary" : "outline"}>
                {segment.estimatedMinutes} min
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
