import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import type { TierDistribution } from "@shared/dashboardTypes";

interface TierSummaryCardProps {
  tierDistribution: TierDistribution[];
  isLoading?: boolean;
}

export function TierSummaryCard({ tierDistribution, isLoading }: TierSummaryCardProps) {
  if (isLoading) {
    return (
      <Card data-testid="card-tier-summary">
        <CardHeader>
          <CardTitle>ACH50 Tier Distribution</CardTitle>
          <CardDescription>Performance breakdown by tier</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!tierDistribution || tierDistribution.length === 0) {
    return (
      <Card data-testid="card-tier-summary">
        <CardHeader>
          <CardTitle>ACH50 Tier Distribution</CardTitle>
          <CardDescription>Performance breakdown by tier</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            No inspection data available
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartData = tierDistribution.filter(t => t.count > 0);

  return (
    <Card data-testid="card-tier-summary">
      <CardHeader>
        <CardTitle>ACH50 Tier Distribution</CardTitle>
        <CardDescription>Performance breakdown by tier</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percentage }) => `${name}: ${percentage.toFixed(1)}%`}
              outerRadius={100}
              fill="#8884d8"
              dataKey="count"
              nameKey="tier"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value: number, name: string, props: any) => [
                `${value} jobs (${props.payload.percentage.toFixed(1)}%)`,
                props.payload.tier
              ]}
            />
            <Legend 
              verticalAlign="bottom" 
              height={36}
              formatter={(value, entry: any) => {
                const data = entry.payload;
                return `${data.tier}: ${data.count} (${data.percentage.toFixed(1)}%)`;
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        
        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3">
          {tierDistribution.map((tier, index) => (
            <div 
              key={index} 
              className="flex items-center gap-2 p-2 rounded-md border"
              data-testid={`tier-stat-${tier.tier.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <div 
                className="w-4 h-4 rounded-sm flex-shrink-0" 
                style={{ backgroundColor: tier.color }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{tier.tier}</p>
                <p className="text-xs text-muted-foreground">{tier.count} jobs</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
