import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Building2,
  Home,
  Briefcase,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import type { Builder } from "@shared/schema";

interface Job {
  id: string;
  name: string;
  status: string;
  address: string | null;
}

interface Lot {
  id: string;
  lotNumber: string;
  phase: string | null;
  status: string;
  jobs: Job[];
}

interface Development {
  id: string;
  name: string;
  status: string;
  region: string | null;
  lots: Lot[];
}

interface BuilderHierarchy {
  builder: Builder;
  developments: Development[];
}

interface BuilderHierarchyTabProps {
  builder: Builder;
}

export function BuilderHierarchyTab({ builder }: BuilderHierarchyTabProps) {
  const { data: hierarchy, isLoading } = useQuery<BuilderHierarchy>({
    queryKey: ["/api/builders", builder.id, "hierarchy"],
    retry: 2,
  });

  const [expandedDevelopments, setExpandedDevelopments] = useState<Set<string>>(
    new Set()
  );
  const [expandedLots, setExpandedLots] = useState<Set<string>>(new Set());

  const toggleDevelopment = (id: string) => {
    const newExpanded = new Set(expandedDevelopments);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedDevelopments(newExpanded);
  };

  const toggleLot = (id: string) => {
    const newExpanded = new Set(expandedLots);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedLots(newExpanded);
  };

  const getStatusColor = (status: string) => {
    const statusMap: Record<string, "default" | "secondary" | "outline"> = {
      active: "default",
      planning: "secondary",
      completed: "outline",
      in_progress: "default",
      pending: "secondary",
    };
    return statusMap[status] || "outline";
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-6 w-48 mb-4" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-3/4" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!hierarchy || hierarchy.developments.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Building2 className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Developments</h3>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            This builder doesn't have any developments yet. Developments will appear
            here once they are created.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Project Hierarchy</h2>
        <p className="text-muted-foreground">
          Organizational structure of developments, lots, and jobs
        </p>
      </div>

      <div className="space-y-4">
        {hierarchy.developments.map((development) => (
          <Card key={development.id} className="overflow-hidden" data-testid={`development-${development.id}`}>
            <Collapsible
              open={expandedDevelopments.has(development.id)}
              onOpenChange={() => toggleDevelopment(development.id)}
            >
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-start p-6 h-auto hover:bg-transparent"
                  data-testid={`button-toggle-development-${development.id}`}
                >
                  <div className="flex items-center justify-between w-full gap-4">
                    <div className="flex items-center gap-3">
                      {expandedDevelopments.has(development.id) ? (
                        <ChevronDown className="h-5 w-5 flex-shrink-0" />
                      ) : (
                        <ChevronRight className="h-5 w-5 flex-shrink-0" />
                      )}
                      <Building2 className="h-6 w-6 text-primary flex-shrink-0" />
                      <div className="text-left">
                        <h3 className="font-semibold text-lg">{development.name}</h3>
                        {development.region && (
                          <p className="text-sm text-muted-foreground">
                            {development.region}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge variant={getStatusColor(development.status)}>
                        {development.status}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {development.lots.length} lot{development.lots.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                </Button>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <div className="px-6 pb-6 space-y-3">
                  {development.lots.length === 0 ? (
                    <p className="text-sm text-muted-foreground ml-11">
                      No lots in this development
                    </p>
                  ) : (
                    development.lots.map((lot) => (
                      <div key={lot.id} className="ml-11" data-testid={`lot-${lot.id}`}>
                        <Collapsible
                          open={expandedLots.has(lot.id)}
                          onOpenChange={() => toggleLot(lot.id)}
                        >
                          <Card className="overflow-hidden">
                            <CollapsibleTrigger asChild>
                              <Button
                                variant="ghost"
                                className="w-full justify-start p-4 h-auto hover:bg-transparent"
                                data-testid={`button-toggle-lot-${lot.id}`}
                              >
                                <div className="flex items-center justify-between w-full gap-4">
                                  <div className="flex items-center gap-3">
                                    {expandedLots.has(lot.id) ? (
                                      <ChevronDown className="h-4 w-4 flex-shrink-0" />
                                    ) : (
                                      <ChevronRight className="h-4 w-4 flex-shrink-0" />
                                    )}
                                    <Home className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                                    <div className="text-left">
                                      <p className="font-medium">
                                        Lot {lot.lotNumber}
                                        {lot.phase && ` - Phase ${lot.phase}`}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 flex-shrink-0">
                                    <Badge variant={getStatusColor(lot.status)} className="text-xs">
                                      {lot.status}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground">
                                      {lot.jobs.length} job{lot.jobs.length !== 1 ? "s" : ""}
                                    </span>
                                  </div>
                                </div>
                              </Button>
                            </CollapsibleTrigger>

                            <CollapsibleContent>
                              <div className="px-4 pb-4 space-y-2">
                                {lot.jobs.length === 0 ? (
                                  <p className="text-sm text-muted-foreground ml-9">
                                    No jobs for this lot
                                  </p>
                                ) : (
                                  lot.jobs.map((job) => (
                                    <div
                                      key={job.id}
                                      className="ml-9 flex items-center gap-3 p-3 rounded-md border hover-elevate"
                                      data-testid={`job-${job.id}`}
                                    >
                                      <Briefcase className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                      <div className="flex-1 min-w-0">
                                        <p className="font-medium text-sm truncate">
                                          {job.name}
                                        </p>
                                        {job.address && (
                                          <p className="text-xs text-muted-foreground truncate">
                                            {job.address}
                                          </p>
                                        )}
                                      </div>
                                      <Badge variant={getStatusColor(job.status)} className="text-xs flex-shrink-0">
                                        {job.status}
                                      </Badge>
                                    </div>
                                  ))
                                )}
                              </div>
                            </CollapsibleContent>
                          </Card>
                        </Collapsible>
                      </div>
                    ))
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        ))}
      </div>
    </div>
  );
}
