import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Star,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Edit,
  Trash2,
  ClipboardList,
  FileText,
} from "lucide-react";
import type { Builder, Job } from "@shared/schema";

interface BuilderDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  builder: Builder | null;
  onEdit: (builder: Builder) => void;
  onDelete: (builderId: string) => void;
}

export function BuilderDetailDialog({
  open,
  onOpenChange,
  builder,
  onEdit,
  onDelete,
}: BuilderDetailDialogProps) {
  const { data: jobs = [] } = useQuery<Job[]>({
    queryKey: ["/api/jobs"],
    enabled: open && !!builder,
  });

  if (!builder) return null;

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const renderStars = (rating: number | null) => {
    if (!rating) return <span className="text-sm text-muted-foreground">No rating</span>;

    return (
      <div className="flex gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={`h-5 w-5 ${
              i < rating
                ? "fill-warning text-warning"
                : "fill-muted text-muted"
            }`}
          />
        ))}
      </div>
    );
  };

  const activeJobs = jobs.filter(
    (job) => job.builderId === builder.id && job.status !== "completed"
  );

  const completedJobs = jobs.filter(
    (job) => job.builderId === builder.id && job.status === "completed"
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" data-testid="dialog-builder-detail">
        <DialogHeader>
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16 flex-shrink-0" data-testid="avatar-detail">
              <AvatarFallback className="bg-primary text-primary-foreground font-semibold text-xl">
                {getInitials(builder.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-2xl" data-testid="text-detail-name">
                {builder.name}
              </DialogTitle>
              <DialogDescription className="text-base" data-testid="text-detail-company">
                {builder.companyName}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          <div>
            <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              Contact Information
            </h3>
            <div className="space-y-2 ml-7">
              {builder.email && (
                <div className="flex items-center gap-2 text-sm" data-testid="text-detail-email">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a href={`mailto:${builder.email}`} className="text-primary hover:underline">
                    {builder.email}
                  </a>
                </div>
              )}
              {builder.phone && (
                <div className="flex items-center gap-2 text-sm" data-testid="text-detail-phone">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <a href={`tel:${builder.phone}`} className="text-primary hover:underline">
                    {builder.phone}
                  </a>
                </div>
              )}
              {builder.address && (
                <div className="flex items-center gap-2 text-sm" data-testid="text-detail-address">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{builder.address}</span>
                </div>
              )}
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" />
              Performance Metrics
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Jobs
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold" data-testid="text-total-jobs">
                    {builder.totalJobs || 0}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Rating
                  </CardTitle>
                </CardHeader>
                <CardContent data-testid="rating-detail">
                  {renderStars(builder.rating)}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Specialization
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {builder.tradeSpecialization ? (
                    <Badge variant="secondary" className="gap-1" data-testid="badge-detail-trade">
                      <Briefcase className="h-3 w-3" />
                      {builder.tradeSpecialization}
                    </Badge>
                  ) : (
                    <span className="text-sm text-muted-foreground">Not specified</span>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {activeJobs.length > 0 && (
            <>
              <Separator />
              <div>
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Active Jobs ({activeJobs.length})
                </h3>
                <div className="space-y-2">
                  {activeJobs.map((job) => (
                    <Card key={job.id} className="p-3" data-testid={`job-${job.id}`}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate" data-testid={`text-job-name-${job.id}`}>
                            {job.name}
                          </p>
                          <p className="text-sm text-muted-foreground truncate">
                            {job.address}
                          </p>
                        </div>
                        <Badge
                          variant={job.status === "in-progress" ? "default" : "secondary"}
                          data-testid={`badge-job-status-${job.id}`}
                        >
                          {job.status}
                        </Badge>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </>
          )}

          {builder.notes && (
            <>
              <Separator />
              <div>
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Notes
                </h3>
                <p className="text-sm whitespace-pre-wrap ml-7" data-testid="text-detail-notes">
                  {builder.notes}
                </p>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0 flex-col sm:flex-row">
          <div className="flex gap-2 flex-1">
            <Button
              variant="outline"
              onClick={() => onEdit(builder)}
              className="flex-1 sm:flex-none"
              data-testid="button-detail-edit"
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                onDelete(builder.id);
                onOpenChange(false);
              }}
              className="flex-1 sm:flex-none"
              data-testid="button-detail-delete"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
          <Button
            variant="secondary"
            onClick={() => onOpenChange(false)}
            data-testid="button-detail-close"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
