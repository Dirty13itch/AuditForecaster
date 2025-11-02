import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { UserPlus, Mail, Phone, X, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { ConstructionManager } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";

interface DevelopmentCMAssignmentProps {
  developmentId: string;
  developmentName: string;
}

interface CMAssignment {
  id: string;
  constructionManagerId: string;
  isPrimary: boolean;
  coverageNotes: string | null;
  assignedAt: Date;
  cmName: string;
  cmEmail: string;
  cmPhone: string | null;
  cmMobilePhone: string | null;
  cmTitle: string;
  cmIsActive: boolean;
}

export function DevelopmentCMAssignment({
  developmentId,
  developmentName,
}: DevelopmentCMAssignmentProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedCMId, setSelectedCMId] = useState("");
  const [isPrimary, setIsPrimary] = useState(false);
  const [coverageNotes, setCoverageNotes] = useState("");
  const [removingCM, setRemovingCM] = useState<CMAssignment | null>(null);

  // Fetch assigned CMs for this development
  const { data: assignedData, isLoading: isLoadingAssigned } = useQuery({
    queryKey: ["/api/developments", developmentId, "construction-managers"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/developments/${developmentId}/construction-managers`);
      return res.json();
    },
  });

  const assignedCMs: CMAssignment[] = assignedData?.data || [];

  // Fetch all CMs for selection
  const { data: allCMsData } = useQuery({
    queryKey: ["/api/construction-managers", { isActive: true }],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/construction-managers?isActive=true");
      return res.json();
    },
    enabled: isAssignDialogOpen,
  });

  const allCMs: ConstructionManager[] = allCMsData?.data || [];
  const availableCMs = allCMs.filter(
    (cm) => !assignedCMs.some((assigned) => assigned.constructionManagerId === cm.id)
  );

  const assignMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/developments/${developmentId}/construction-managers`, {
        constructionManagerId: selectedCMId,
        isPrimary,
        coverageNotes: coverageNotes.trim() || null,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/developments", developmentId, "construction-managers"] });
      setIsAssignDialogOpen(false);
      setSelectedCMId("");
      setIsPrimary(false);
      setCoverageNotes("");
      toast({
        title: "Success",
        description: "Construction manager assigned successfully",
        duration: 3000,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to assign construction manager",
        variant: "destructive",
      });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (cmId: string) => {
      const res = await apiRequest("DELETE", `/api/developments/${developmentId}/construction-managers/${cmId}`);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/developments", developmentId, "construction-managers"] });
      setRemovingCM(null);
      toast({
        title: "Success",
        description: "Construction manager removed successfully",
        duration: 3000,
      });
      if (data.warning) {
        toast({
          title: "Warning",
          description: data.warning,
          variant: "default",
          duration: 5000,
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove construction manager",
        variant: "destructive",
      });
    },
  });

  if (isLoadingAssigned) {
    return (
      <div className="space-y-3 mt-4 ml-11">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  return (
    <div className="mt-4 ml-11">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold flex items-center gap-2">
          Construction Managers
          {assignedCMs.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {assignedCMs.length}
            </Badge>
          )}
        </h4>
        {isAdmin && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAssignDialogOpen(true)}
            data-testid="button-assign-cm"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Assign CM
          </Button>
        )}
      </div>

      {assignedCMs.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm text-muted-foreground mb-3">
              No construction managers assigned
            </p>
            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAssignDialogOpen(true)}
                data-testid="button-assign-cm-empty"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Assign Construction Manager
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {assignedCMs.map((assignment) => (
            <Card key={assignment.id} className="relative">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className={`text-sm truncate ${assignment.isPrimary ? "font-semibold" : "font-medium"}`}>
                        {assignment.cmName}
                      </p>
                      {assignment.isPrimary && (
                        <Badge variant="default" className="text-xs">Primary</Badge>
                      )}
                      <Badge variant="secondary" className="text-xs">
                        {assignment.cmTitle.replace(/_/g, " ")}
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      <a
                        href={`mailto:${assignment.cmEmail}`}
                        className="flex items-center gap-2 text-xs text-primary hover:underline"
                        data-testid={`link-cm-email-${assignment.constructionManagerId}`}
                      >
                        <Mail className="h-3 w-3" />
                        {assignment.cmEmail}
                      </a>
                      {assignment.cmPhone && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          {assignment.cmPhone}
                        </div>
                      )}
                      {assignment.coverageNotes && (
                        <p className="text-xs text-muted-foreground mt-2">
                          {assignment.coverageNotes}
                        </p>
                      )}
                    </div>
                  </div>
                  {isAdmin && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 flex-shrink-0"
                      onClick={() => setRemovingCM(assignment)}
                      data-testid={`button-remove-cm-${assignment.constructionManagerId}`}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Assign CM Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Construction Manager</DialogTitle>
            <DialogDescription>
              Assign a construction manager to {developmentName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="cm-select">Construction Manager</Label>
              <Select value={selectedCMId} onValueChange={setSelectedCMId}>
                <SelectTrigger id="cm-select" data-testid="select-cm">
                  <SelectValue placeholder="Select a construction manager" />
                </SelectTrigger>
                <SelectContent>
                  {availableCMs.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground text-center">
                      No available construction managers
                    </div>
                  ) : (
                    availableCMs.map((cm) => (
                      <SelectItem key={cm.id} value={cm.id}>
                        {cm.name} - {cm.email}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="is-primary"
                checked={isPrimary}
                onCheckedChange={(checked) => setIsPrimary(checked as boolean)}
                data-testid="checkbox-cm-primary"
              />
              <label
                htmlFor="is-primary"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Set as primary contact
              </label>
            </div>

            <div>
              <Label htmlFor="coverage-notes">Coverage Notes (Optional)</Label>
              <Textarea
                id="coverage-notes"
                value={coverageNotes}
                onChange={(e) => setCoverageNotes(e.target.value)}
                placeholder="Add notes about this CM's coverage for this development..."
                rows={3}
                data-testid="textarea-coverage-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAssignDialogOpen(false);
                setSelectedCMId("");
                setIsPrimary(false);
                setCoverageNotes("");
              }}
              data-testid="button-cancel-assign-cm"
            >
              Cancel
            </Button>
            <Button
              onClick={() => assignMutation.mutate()}
              disabled={!selectedCMId || assignMutation.isPending}
              data-testid="button-confirm-assign-cm"
            >
              {assignMutation.isPending && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove CM Confirmation */}
      <AlertDialog open={!!removingCM} onOpenChange={(open) => !open && setRemovingCM(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Construction Manager?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {removingCM?.cmName} from this development?
              {removingCM?.isPrimary && " This is the primary contact for this development."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-remove-cm">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (removingCM) {
                  removeMutation.mutate(removingCM.constructionManagerId);
                }
              }}
              data-testid="button-confirm-remove-cm"
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
