import { MapPin, Calendar, Building2, ArrowRight } from "lucide-react";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface JobCardProps {
  id: string;
  name: string;
  address: string;
  contractor: string;
  status: "pending" | "in-progress" | "completed" | "review";
  inspectionType: string;
  scheduledDate?: string;
  completedItems: number;
  totalItems: number;
  onClick?: () => void;
}

export default function JobCard({
  id,
  name,
  address,
  contractor,
  status,
  inspectionType,
  scheduledDate,
  completedItems,
  totalItems,
  onClick
}: JobCardProps) {
  const statusConfig = {
    pending: { label: "Pending", className: "bg-muted text-muted-foreground" },
    "in-progress": { label: "In Progress", className: "bg-info text-info-foreground" },
    completed: { label: "Completed", className: "bg-success text-success-foreground" },
    review: { label: "Review", className: "bg-warning text-warning-foreground" }
  };

  const progress = (completedItems / totalItems) * 100;

  return (
    <Card 
      className="hover-elevate active-elevate-2 cursor-pointer" 
      onClick={onClick}
      data-testid={`card-job-${id}`}
    >
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
        <h3 className="text-lg font-semibold" data-testid="text-job-name">{name}</h3>
        <Badge className={statusConfig[status].className} data-testid="badge-status">
          {statusConfig[status].label}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-start gap-2 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span data-testid="text-address">{address}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Building2 className="h-4 w-4 flex-shrink-0" />
          <span data-testid="text-contractor">{contractor}</span>
        </div>
        {scheduledDate && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4 flex-shrink-0" />
            <span data-testid="text-scheduled-date">{scheduledDate}</span>
          </div>
        )}
        <div className="pt-2">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-muted-foreground">{inspectionType}</span>
            <span className="font-medium" data-testid="text-progress">
              {completedItems}/{totalItems}
            </span>
          </div>
          <Progress value={progress} className="h-2" data-testid="progress-checklist" />
        </div>
      </CardContent>
      <CardFooter>
        <Button className="w-full" data-testid="button-continue">
          Continue Inspection
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </CardFooter>
    </Card>
  );
}
