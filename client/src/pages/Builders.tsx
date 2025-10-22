import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Building2, Plus, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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
import { BuilderCard } from "@/components/BuilderCard";
import { BuilderDialog } from "@/components/BuilderDialog";
import { BuilderDetailDialog } from "@/components/BuilderDetailDialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Builder, InsertBuilder } from "@shared/schema";

export default function Builders() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedBuilder, setSelectedBuilder] = useState<Builder | null>(null);
  const [builderToEdit, setBuilderToEdit] = useState<Builder | null>(null);
  const [builderToDelete, setBuilderToDelete] = useState<string | null>(null);

  const { data: builders = [], isLoading } = useQuery<Builder[]>({
    queryKey: ["/api/builders"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertBuilder) => {
      const res = await apiRequest("POST", "/api/builders", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/builders"] });
      setIsAddDialogOpen(false);
      setBuilderToEdit(null);
      toast({
        title: "Success",
        description: "Builder added successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add builder",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<InsertBuilder>;
    }) => {
      const res = await apiRequest("PUT", `/api/builders/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/builders"] });
      setIsAddDialogOpen(false);
      setBuilderToEdit(null);
      setSelectedBuilder(null);
      toast({
        title: "Success",
        description: "Builder updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update builder",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/builders/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/builders"] });
      setBuilderToDelete(null);
      setSelectedBuilder(null);
      toast({
        title: "Success",
        description: "Builder deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete builder",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: InsertBuilder) => {
    if (builderToEdit) {
      updateMutation.mutate({ id: builderToEdit.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (builder: Builder) => {
    setBuilderToEdit(builder);
    setSelectedBuilder(null);
    setIsAddDialogOpen(true);
  };

  const handleDelete = (builderId: string) => {
    setBuilderToDelete(builderId);
  };

  const confirmDelete = () => {
    if (builderToDelete) {
      deleteMutation.mutate(builderToDelete);
    }
  };

  const handleViewDetails = (builder: Builder) => {
    setSelectedBuilder(builder);
  };

  const handleAddNew = () => {
    setBuilderToEdit(null);
    setIsAddDialogOpen(true);
  };

  const filteredBuilders = builders.filter((builder) => {
    const query = searchQuery.toLowerCase();
    return (
      builder.name.toLowerCase().includes(query) ||
      builder.companyName.toLowerCase().includes(query) ||
      builder.email?.toLowerCase().includes(query) ||
      builder.tradeSpecialization?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Building2 className="h-8 w-8 text-primary flex-shrink-0" />
            <div>
              <h1 className="text-2xl md:text-3xl font-bold" data-testid="text-page-title">
                Builders
              </h1>
              <p className="text-sm text-muted-foreground">
                Manage your builder contacts and track performance
              </p>
            </div>
          </div>
          <Button
            onClick={handleAddNew}
            className="w-full sm:w-auto"
            data-testid="button-add-builder"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add New Builder
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search builders by name, company, or specialization..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search"
          />
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="p-6">
                <div className="flex items-start gap-4 mb-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                </div>
                <div className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-6 w-1/3" />
                </div>
              </Card>
            ))}
          </div>
        ) : filteredBuilders.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Building2 className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2" data-testid="text-no-results">
                {searchQuery ? "No builders found" : "No builders yet"}
              </h3>
              <p className="text-sm text-muted-foreground mb-4 text-center max-w-md">
                {searchQuery
                  ? "Try adjusting your search criteria"
                  : "Get started by adding your first builder contact"}
              </p>
              {!searchQuery && (
                <Button onClick={handleAddNew} data-testid="button-add-first">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Builder
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground" data-testid="text-results-count">
                Showing {filteredBuilders.length} of {builders.length}{" "}
                {builders.length === 1 ? "builder" : "builders"}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {filteredBuilders.map((builder) => (
                <BuilderCard
                  key={builder.id}
                  builder={builder}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onViewDetails={handleViewDetails}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <BuilderDialog
        open={isAddDialogOpen}
        onOpenChange={(open) => {
          setIsAddDialogOpen(open);
          if (!open) setBuilderToEdit(null);
        }}
        builder={builderToEdit}
        onSubmit={handleSubmit}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
      />

      <BuilderDetailDialog
        open={!!selectedBuilder}
        onOpenChange={(open) => !open && setSelectedBuilder(null)}
        builder={selectedBuilder}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <AlertDialog
        open={!!builderToDelete}
        onOpenChange={(open) => !open && setBuilderToDelete(null)}
      >
        <AlertDialogContent data-testid="dialog-delete-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this builder from your contact database.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
