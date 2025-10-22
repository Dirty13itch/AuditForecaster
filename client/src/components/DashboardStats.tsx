import { ClipboardList, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}

function StatCard({ label, value, icon, color }: StatCardProps) {
  return (
    <Card data-testid={`card-stat-${label.toLowerCase().replace(/\s+/g, '-')}`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-1">{label}</p>
            <p className="text-3xl font-bold" data-testid="text-stat-value">{value}</p>
          </div>
          <div className={`p-3 rounded-md ${color}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface DashboardStatsProps {
  totalJobs: number;
  completed: number;
  inProgress: number;
  pending: number;
}

export default function DashboardStats({ totalJobs, completed, inProgress, pending }: DashboardStatsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatCard
        label="Total Jobs"
        value={totalJobs}
        icon={<ClipboardList className="h-6 w-6 text-primary" />}
        color="bg-primary/10"
      />
      <StatCard
        label="Completed"
        value={completed}
        icon={<CheckCircle2 className="h-6 w-6 text-success" />}
        color="bg-success/10"
      />
      <StatCard
        label="In Progress"
        value={inProgress}
        icon={<Clock className="h-6 w-6 text-info" />}
        color="bg-info/10"
      />
      <StatCard
        label="Pending"
        value={pending}
        icon={<AlertTriangle className="h-6 w-6 text-warning" />}
        color="bg-warning/10"
      />
    </div>
  );
}
