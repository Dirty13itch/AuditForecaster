import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingDown } from "lucide-react";
import { format } from "date-fns";
import type { Forecast, Job } from "@shared/schema";

interface TrendChartProps {
  forecasts: Forecast[];
  jobs: Job[];
  isLoading?: boolean;
}

export function TrendChart({ forecasts, jobs, isLoading }: TrendChartProps) {
  if (isLoading) {
    return (
      <Card data-testid="card-trend-chart">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5" />
            ACH50 Trend Over Time
          </CardTitle>
          <CardDescription>Historical performance tracking</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-80 w-full" />
        </CardContent>
      </Card>
    );
  }

  const jobsMap = new Map(jobs.map(j => [j.id, j]));
  
  const chartData = forecasts
    .filter(f => f.actualACH50 != null && f.jobId)
    .map(f => {
      const job = jobsMap.get(f.jobId);
      return {
        jobId: f.jobId,
        ach50: parseFloat(f.actualACH50?.toString() || '0'),
        date: job?.completedDate ? new Date(job.completedDate) : new Date(),
        jobName: job?.name || 'Unknown',
      };
    })
    .filter(d => d.ach50 > 0)
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(-20);

  if (chartData.length === 0) {
    return (
      <Card data-testid="card-trend-chart">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5" />
            ACH50 Trend Over Time
          </CardTitle>
          <CardDescription>Historical performance tracking</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center text-muted-foreground">
            No trend data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="card-trend-chart">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingDown className="h-5 w-5" />
          ACH50 Trend Over Time
        </CardTitle>
        <CardDescription>Last {chartData.length} completed inspections</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorACH50" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2E5BBA" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#2E5BBA" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis 
              dataKey="date" 
              tickFormatter={(date) => format(new Date(date), 'MM/dd')}
              tick={{ fontSize: 12 }}
            />
            <YAxis 
              label={{ value: 'ACH50', angle: -90, position: 'insideLeft' }}
              tick={{ fontSize: 12 }}
            />
            <Tooltip 
              labelFormatter={(date) => format(new Date(date), 'MMM d, yyyy')}
              formatter={(value: number, name: string, props: any) => [
                `${value.toFixed(2)} ACH50`,
                props.payload.jobName
              ]}
            />
            <ReferenceLine 
              y={3.0} 
              stroke="#FFC107" 
              strokeDasharray="5 5"
              label={{ 
                value: "3.0 ACH50 Threshold", 
                position: "insideTopRight",
                fill: "#FFC107",
                fontSize: 11
              }}
            />
            <Area 
              type="monotone" 
              dataKey="ach50" 
              stroke="#2E5BBA" 
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorACH50)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
