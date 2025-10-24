import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, TrendingUp, TrendingDown } from "lucide-react";
import type { BuilderLeaderboardEntry } from "@shared/dashboardTypes";
import { getTierColor } from "@shared/dashboardTypes";

interface LeaderboardTableProps {
  leaderboard: BuilderLeaderboardEntry[];
  isLoading?: boolean;
}

export function LeaderboardTable({ leaderboard, isLoading }: LeaderboardTableProps) {
  if (isLoading) {
    return (
      <Card data-testid="card-leaderboard">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-warning" />
            Builder Leaderboard
          </CardTitle>
          <CardDescription>Top performers by average ACH50 score</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!leaderboard || leaderboard.length === 0) {
    return (
      <Card data-testid="card-leaderboard">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-warning" />
            Builder Leaderboard
          </CardTitle>
          <CardDescription>Top performers by average ACH50 score</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            No builder data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="card-leaderboard">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-warning" />
          Builder Leaderboard
        </CardTitle>
        <CardDescription>Top performers by average ACH50 score (lower is better)</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Rank</TableHead>
                <TableHead>Builder</TableHead>
                <TableHead className="text-right">Avg ACH50</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead className="text-right">Jobs</TableHead>
                <TableHead className="text-right">Pass Rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leaderboard.map((entry, index) => {
                const isTop3 = index < 3;
                const trendIcon = entry.latestACH50 !== null && entry.latestACH50 < entry.averageACH50 
                  ? <TrendingUp className="h-3 w-3 text-success" />
                  : entry.latestACH50 !== null && entry.latestACH50 > entry.averageACH50
                  ? <TrendingDown className="h-3 w-3 text-error" />
                  : null;

                return (
                  <TableRow 
                    key={entry.builderId}
                    className={isTop3 ? "bg-muted/50" : ""}
                    data-testid={`leaderboard-row-${index + 1}`}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-1">
                        {index === 0 && <Trophy className="h-4 w-4 text-warning" />}
                        {index + 1}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {entry.builderName}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      <div className="flex items-center justify-end gap-1">
                        {entry.averageACH50.toFixed(2)}
                        {trendIcon}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        style={{ 
                          backgroundColor: getTierColor(entry.tier as any),
                          color: '#fff',
                        }}
                        data-testid={`tier-badge-${entry.tier.toLowerCase().replace(/\s+/g, '-')}`}
                      >
                        {entry.tier}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{entry.totalJobs}</TableCell>
                    <TableCell className="text-right">
                      <span className={entry.passRate >= 80 ? "text-success font-medium" : ""}>
                        {entry.passRate.toFixed(1)}%
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
