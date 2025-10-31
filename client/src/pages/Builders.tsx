import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Building2, Plus, Search, ArrowLeft, Edit, Trash2, RefreshCw, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { BuilderCard } from "@/components/BuilderCard";
import { BuilderDialog } from "@/components/BuilderDialog";
import { BuilderOverviewTab } from "@/components/builders/BuilderOverviewTab";
import { BuilderHierarchyTab } from "@/components/builders/BuilderHierarchyTab";
import { BuilderContactsTab } from "@/components/builders/BuilderContactsTab";
import { BuilderAgreementsTab } from "@/components/builders/BuilderAgreementsTab";
import { BuilderProgramsTab } from "@/components/builders/BuilderProgramsTab";
import { BuilderInteractionsTab } from "@/components/builders/BuilderInteractionsTab";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Builder, InsertBuilder } from "@shared/schema";

// Module-level constants for consistent configuration
const SKELETON_COUNT = 6;
const SEARCH_PLACEHOLDER = "Search builders by name, company, or specialization...";
const DEFAULT_TAB = "overview";

function BuildersContent() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedBuilder, setSelectedBuilder] = useState<Builder | null>(null);
  const [builderToEdit, setBuilderToEdit] = useState<Builder | null>(null);
  const [builderToDelete, setBuilderToDelete] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(DEFAULT_TAB);

  // Main builders query with retry configuration for resilience
  const { data: builders = [], isLoading, error, refetch } = useQuery<Builder[]>({
    queryKey: ["/api/builders"],
    retry: 2,
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

  // Memoized event handlers to prevent unnecessary re-renders
  const handleSubmit = useCallback((data: InsertBuilder) => {
    if (builderToEdit) {
      updateMutation.mutate({ id: builderToEdit.id, data });
    } else {
      createMutation.mutate(data);
    }
  }, [builderToEdit, updateMutation, createMutation]);

  const handleEdit = useCallback((builder: Builder) => {
    setBuilderToEdit(builder);
    setSelectedBuilder(null);
    setIsAddDialogOpen(true);
  }, []);

  const handleDelete = useCallback((builderId: string) => {
    setBuilderToDelete(builderId);
  }, []);

  const confirmDelete = useCallback(() => {
    if (builderToDelete) {
      deleteMutation.mutate(builderToDelete);
    }
  }, [builderToDelete, deleteMutation]);

  const handleViewDetails = useCallback((builder: Builder) => {
    setSelectedBuilder(builder);
    setActiveTab(DEFAULT_TAB);
  }, []);

  const handleBackToList = useCallback(() => {
    setSelectedBuilder(null);
    setActiveTab(DEFAULT_TAB);
  }, []);

  const handleAddNew = useCallback(() => {
    setBuilderToEdit(null);
    setIsAddDialogOpen(true);
  }, []);

  const handleDialogClose = useCallback((open: boolean) => {
    setIsAddDialogOpen(open);
    if (!open) setBuilderToEdit(null);
  }, []);

  const handleDeleteDialogClose = useCallback((open: boolean) => {
    if (!open) setBuilderToDelete(null);
  }, []);

  // Utility function to generate initials from builder name
  const getInitials = useCallback((name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }, []);

  // Memoized filtered builders list to prevent recalculation on every render
  const filteredBuilders = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return builders.filter((builder) =>
      builder.name.toLowerCase().includes(query) ||
      builder.companyName.toLowerCase().includes(query) ||
      builder.email?.toLowerCase().includes(query) ||
      builder.tradeSpecialization?.toLowerCase().includes(query)
    );
  }, [builders, searchQuery]);

  // Error state with retry functionality
  if (error) {
    return (
      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        <Alert variant="destructive" data-testid="alert-builders-error">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between gap-4">
            <span>Failed to load builders: {error instanceof Error ? error.message : 'Unknown error'}</span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => refetch()}
              data-testid="button-retry-builders"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Builder detail view - shows tabbed interface for selected builder
  if (selectedBuilder) {
    return (
      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        <div className="flex flex-col gap-6">
          {/* Header with builder info and action buttons */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4 w-full sm:w-auto">
              <Button
                variant="outline"
                size="icon"
                onClick={handleBackToList}
                data-testid="button-back-to-list"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <Avatar className="h-14 w-14 flex-shrink-0">
                <AvatarFallback className="bg-primary text-primary-foreground font-semibold text-lg">
                  {getInitials(selectedBuilder.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl md:text-3xl font-bold truncate" data-testid="text-builder-name">
                  {selectedBuilder.name}
                </h1>
                <p className="text-sm text-muted-foreground truncate" data-testid="text-builder-company">
                  {selectedBuilder.companyName}
                </p>
              </div>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                onClick={() => handleEdit(selectedBuilder)}
                className="flex-1 sm:flex-none"
                data-testid="button-edit-builder"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleDelete(selectedBuilder.id)}
                className="flex-1 sm:flex-none"
                data-testid="button-delete-builder"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>

          {/* Tabbed interface for builder details - 6 tabs for comprehensive management */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full grid grid-cols-3 lg:grid-cols-6 h-auto gap-1" data-testid="tabs-list">
              <TabsTrigger value="overview" className="text-xs sm:text-sm" data-testid="tab-overview">
                Overview
              </TabsTrigger>
              <TabsTrigger value="hierarchy" className="text-xs sm:text-sm" data-testid="tab-hierarchy">
                Hierarchy
              </TabsTrigger>
              <TabsTrigger value="contacts" className="text-xs sm:text-sm" data-testid="tab-contacts">
                Contacts
              </TabsTrigger>
              <TabsTrigger value="agreements" className="text-xs sm:text-sm" data-testid="tab-agreements">
                Agreements
              </TabsTrigger>
              <TabsTrigger value="programs" className="text-xs sm:text-sm" data-testid="tab-programs">
                Programs
              </TabsTrigger>
              <TabsTrigger value="interactions" className="text-xs sm:text-sm" data-testid="tab-interactions">
                Interactions
              </TabsTrigger>
            </TabsList>

            <div className="mt-6">
              <TabsContent value="overview" className="mt-0">
                <BuilderOverviewTab builder={selectedBuilder} />
              </TabsContent>

              <TabsContent value="hierarchy" className="mt-0">
                <BuilderHierarchyTab builder={selectedBuilder} />
              </TabsContent>

              <TabsContent value="contacts" className="mt-0">
                <BuilderContactsTab builder={selectedBuilder} />
              </TabsContent>

              <TabsContent value="agreements" className="mt-0">
                <BuilderAgreementsTab builder={selectedBuilder} />
              </TabsContent>

              <TabsContent value="programs" className="mt-0">
                <BuilderProgramsTab builder={selectedBuilder} />
              </TabsContent>

              <TabsContent value="interactions" className="mt-0">
                <BuilderInteractionsTab builder={selectedBuilder} />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    );
  }

  // Default view: Builder list with search and grid layout
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
            placeholder={SEARCH_PLACEHOLDER}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search"
          />
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
              <Card key={i} className="p-6" data-testid={`skeleton-builder-${i}`}>
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
        onOpenChange={handleDialogClose}
        builder={builderToEdit}
        onSubmit={handleSubmit}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
      />

      <AlertDialog
        open={!!builderToDelete}
        onOpenChange={handleDeleteDialogClose}
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

// Wrap entire component in ErrorBoundary for production-grade error handling
export default function Builders() {
  return (
    <ErrorBoundary>
      <BuildersContent />
    </ErrorBoundary>
  );
}
