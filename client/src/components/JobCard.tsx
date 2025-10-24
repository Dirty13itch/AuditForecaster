import { MapPin, Calendar, Building2, ArrowRight, ExternalLink, FileText } from "lucide-react";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Builder } from "@shared/schema";
import { getComplianceBadgeVariant, getComplianceBadgeClassName, getComplianceBadgeText } from "@/lib/compliance";

interface JobCardProps {
  id: string;
  name: string;
  address: string;
  contractor: string;
  builderId?: string | null;
  builders?: Builder[];
  status: string;
  inspectionType: string;
  pricing?: string | null;
  scheduledDate?: string;
  originalScheduledDate?: string | null;
  isCancelled?: boolean;
  priority?: string;
  latitude?: number | null;
  longitude?: number | null;
  notes?: string | null;
  completedItems: number;
  totalItems: number;
  isSelected?: boolean;
  complianceStatus?: string | null;
  onSelect?: (id: string) => void;
  onBuilderChange?: (jobId: string, builderId: string) => void;
  onClick?: () => void;
  onViewCompliance?: () => void;
}

export default function JobCard({
  id,
  name,
  address,
  contractor,
  builderId,
  builders = [],
  status,
  inspectionType,
  pricing,
  scheduledDate,
  originalScheduledDate,
  isCancelled = false,
  priority = "medium",
  latitude,
  longitude,
  notes,
  completedItems,
  totalItems,
  isSelected = false,
  complianceStatus,
  onSelect,
  onBuilderChange,
  onClick,
  onViewCompliance
}: JobCardProps) {
  const statusConfig: Record<string, { label: string; className: string }> = {
    pending: { label: "Pending", className: "bg-muted text-muted-foreground" },
    scheduled: { label: "Scheduled", className: "bg-info text-info-foreground" },
    "pre-inspection": { label: "Pre-Inspection", className: "bg-info text-info-foreground" },
    "in-progress": { label: "In Progress", className: "bg-info text-info-foreground" },
    testing: { label: "Testing", className: "bg-warning text-warning-foreground" },
    review: { label: "Review", className: "bg-warning text-warning-foreground" },
    completed: { label: "Completed", className: "bg-success text-success-foreground" }
  };

  const priorityConfig: Record<string, { label: string; className: string }> = {
    high: { label: "High", className: "bg-destructive text-destructive-foreground" },
    medium: { label: "Medium", className: "bg-warning text-warning-foreground" },
    low: { label: "Low", className: "bg-success text-success-foreground" }
  };

  const progress = (completedItems / totalItems) * 100;
  const builder = builders.find(b => b.id === builderId);
  const hasLocation = latitude !== null && longitude !== null && latitude !== undefined && longitude !== undefined;
  const mapUrl = hasLocation ? `https://www.google.com/maps?q=${latitude},${longitude}` : null;

  const handleCardClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (
      target.closest('button') || 
      target.closest('[role="combobox"]') ||
      target.closest('input[type="checkbox"]') ||
      target.closest('a')
    ) {
      return;
    }
    onClick?.();
  };

  return (
    <Card 
      className="hover-elevate active-elevate-2 cursor-pointer relative" 
      onClick={handleCardClick}
      data-testid={`card-job-${id}`}
    >
      {onSelect && (
        <div className="absolute top-4 left-4 z-10">
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onSelect(id)}
            onClick={(e) => e.stopPropagation()}
            data-testid={`checkbox-select-job-${id}`}
          />
        </div>
      )}

      <CardHeader className={`flex flex-row items-start justify-between gap-2 space-y-0 pb-3 ${onSelect ? 'pl-12' : ''}`}>
        <div className="space-y-1 flex-1">
          <h3 className="text-lg font-semibold" data-testid="text-job-name">{name}</h3>
          <div className="flex flex-wrap gap-2">
            <Badge 
              className={statusConfig[status]?.className || statusConfig.pending.className} 
              data-testid="badge-status"
            >
              {statusConfig[status]?.label || status}
            </Badge>
            <Badge 
              className={priorityConfig[priority]?.className || priorityConfig.medium.className}
              data-testid="badge-priority"
            >
              {priorityConfig[priority]?.label || priority}
            </Badge>
            {isCancelled && (
              <Badge 
                variant="destructive"
                data-testid={`badge-cancelled-${id}`}
              >
                Cancelled
              </Badge>
            )}
            {originalScheduledDate && !isCancelled && (
              <Badge 
                variant="outline"
                className="bg-warning/10 text-warning border-warning/20"
                data-testid={`badge-rescheduled-${id}`}
              >
                Rescheduled
              </Badge>
            )}
            {complianceStatus && (
              <Badge 
                variant={getComplianceBadgeVariant(complianceStatus)}
                className={getComplianceBadgeClassName(complianceStatus)}
                data-testid={`badge-compliance-${id}`}
              >
                {getComplianceBadgeText(complianceStatus)}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="flex items-start gap-2 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <div className="flex-1 flex items-center justify-between gap-2">
            <span data-testid="text-address">{address}</span>
            {mapUrl && (
              <a
                href={mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline flex items-center gap-1"
                onClick={(e) => e.stopPropagation()}
                data-testid="link-map"
              >
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Building2 className="h-4 w-4 flex-shrink-0" />
          <span data-testid="text-contractor">{contractor}</span>
        </div>

        {builder && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Builder:</span>
            {onBuilderChange ? (
              <Select
                value={builderId || ""}
                onValueChange={(value) => {
                  onBuilderChange(id, value);
                }}
              >
                <SelectTrigger 
                  className="h-8 text-sm flex-1"
                  onClick={(e) => e.stopPropagation()}
                  data-testid={`select-builder-${id}`}
                >
                  <SelectValue placeholder="Select builder">
                    {builder.name}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {builders.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name} - {b.companyName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <span className="font-medium" data-testid="text-builder">{builder.name}</span>
            )}
          </div>
        )}

        {scheduledDate && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4 flex-shrink-0" />
            <span data-testid="text-scheduled-date">{scheduledDate}</span>
          </div>
        )}

        {notes && (
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <FileText className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span className="line-clamp-2" data-testid="text-notes">{notes}</span>
          </div>
        )}

        <div className="pt-2">
          <div className="flex items-center justify-between text-sm mb-2">
            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground">{inspectionType}</span>
              {pricing && (
                <span className="text-sm font-medium" data-testid="text-pricing">
                  ${parseFloat(pricing).toFixed(2)}
                </span>
              )}
            </div>
            <span className="font-medium" data-testid="text-progress">
              {completedItems}/{totalItems}
            </span>
          </div>
          <Progress value={progress} className="h-2" data-testid="progress-checklist" />
        </div>
      </CardContent>

      <CardFooter className="flex gap-2 flex-col sm:flex-row">
        <Button className="flex-1" data-testid="button-continue">
          Continue Inspection
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
        {complianceStatus === "non-compliant" && onViewCompliance && (
          <Button 
            variant="outline"
            className="flex-1"
            onClick={(e) => {
              e.stopPropagation();
              onViewCompliance();
            }}
            data-testid={`button-view-compliance-${id}`}
          >
            View Compliance
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
