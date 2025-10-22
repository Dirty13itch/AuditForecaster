import { useState } from "react";
import { Plus, Search } from "lucide-react";
import TopBar from "@/components/TopBar";
import DashboardStats from "@/components/DashboardStats";
import JobCard from "@/components/JobCard";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "inspection" | "photos" | "forecast">("dashboard");
  const [searchQuery, setSearchQuery] = useState("");

  const jobs = [
    {
      id: "1",
      name: "Johnson Residence",
      address: "1234 Oak Street, Minneapolis, MN 55401",
      contractor: "Acme HVAC Solutions",
      status: "in-progress" as const,
      inspectionType: "Pre-Drywall Inspection",
      scheduledDate: "Oct 23, 2025",
      completedItems: 38,
      totalItems: 52,
    },
    {
      id: "2",
      name: "Smith Commercial Building",
      address: "5678 Maple Avenue, St. Paul, MN 55102",
      contractor: "Professional Contractors Inc",
      status: "pending" as const,
      inspectionType: "Final Inspection",
      scheduledDate: "Oct 24, 2025",
      completedItems: 0,
      totalItems: 52,
    },
    {
      id: "3",
      name: "Anderson Duplex",
      address: "9012 Pine Road, Bloomington, MN 55420",
      contractor: "Quality Build Co",
      status: "completed" as const,
      inspectionType: "Pre-Drywall Inspection",
      scheduledDate: "Oct 20, 2025",
      completedItems: 52,
      totalItems: 52,
    },
    {
      id: "4",
      name: "Martinez Family Home",
      address: "3456 Elm Street, Edina, MN 55436",
      contractor: "Reliable Energy Services",
      status: "review" as const,
      inspectionType: "Final Inspection",
      scheduledDate: "Oct 21, 2025",
      completedItems: 52,
      totalItems: 52,
    },
    {
      id: "5",
      name: "Wilson Office Complex",
      address: "7890 Cedar Lane, Minneapolis, MN 55403",
      contractor: "Metro HVAC Specialists",
      status: "in-progress" as const,
      inspectionType: "Pre-Drywall Inspection",
      scheduledDate: "Oct 23, 2025",
      completedItems: 24,
      totalItems: 52,
    },
  ];

  const filteredJobs = jobs.filter(job =>
    job.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    job.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
    job.contractor.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = {
    totalJobs: jobs.length,
    completed: jobs.filter(j => j.status === "completed").length,
    inProgress: jobs.filter(j => j.status === "in-progress").length,
    pending: jobs.filter(j => j.status === "pending").length,
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-6">
      <TopBar 
        title="Energy Audit Pro"
        isOnline={true}
      />
      
      <main className="pt-20 px-4 md:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-2xl font-bold" data-testid="text-page-title">Dashboard</h2>
              <p className="text-muted-foreground text-sm">Manage your energy audit inspections</p>
            </div>
            <Button data-testid="button-new-job">
              <Plus className="h-4 w-4 mr-2" />
              New Job
            </Button>
          </div>

          <DashboardStats {...stats} />

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search jobs, addresses, or contractors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12"
              data-testid="input-search"
            />
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">Active Jobs</h3>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredJobs.map((job) => (
                <JobCard
                  key={job.id}
                  {...job}
                  onClick={() => console.log('Navigate to job:', job.id)}
                />
              ))}
            </div>
            {filteredJobs.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                No jobs found matching your search
              </div>
            )}
          </div>
        </div>
      </main>

      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}
