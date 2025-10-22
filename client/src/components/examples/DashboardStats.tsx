import DashboardStats from '../DashboardStats';

export default function DashboardStatsExample() {
  return (
    <div className="p-4">
      <DashboardStats
        totalJobs={24}
        completed={8}
        inProgress={12}
        pending={4}
      />
    </div>
  );
}
