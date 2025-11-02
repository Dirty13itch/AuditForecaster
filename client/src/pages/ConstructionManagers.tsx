import { useState, useMemo, useCallback, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { UserCheck, Plus, Search, Edit, Trash2, RefreshCw, AlertCircle, Mail, Phone } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertConstructionManagerSchema } from "@shared/schema";
import type { InsertConstructionManager, ConstructionManager } from "@shared/schema";
import { z } from "zod";

const TITLE_LABELS = {
  construction_manager: "Construction Manager",
  area_construction_manager: "Area Construction Manager",
  director: "Director",
  superintendent: "Superintendent",
} as const;

const TITLE_COLORS = {
  construction_manager: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  area_construction_manager: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  director: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  superintendent: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
} as const;

function formatPhoneNumber(phone: string | null): string {
  if (!phone) return "—";
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
}

export default function ConstructionManagers() {
  const { toast } = useToast();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  
  const [searchQuery, setSearchQuery] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCM, setEditingCM] = useState<ConstructionManager | null>(null);
  const [deletingCM, setDeletingCM] = useState<ConstructionManager | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const queryParams = useMemo(() => ({
    search: debouncedSearch || undefined,
    isActive: showInactive ? undefined : true,
    page: 1,
    limit: 50,
  }), [debouncedSearch, showInactive]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["/api/construction-managers", queryParams],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (queryParams.search) params.set("search", queryParams.search);
      if (queryParams.isActive !== undefined) params.set("isActive", String(queryParams.isActive));
      params.set("page", String(queryParams.page));
      params.set("limit", String(queryParams.limit));
      
      const res = await apiRequest("GET", `/api/construction-managers?${params}`);
      return res.json();
    },
    retry: 2,
  });

  const constructionManagers = data?.data || [];
  const total = data?.total || 0;

  const form = useForm<InsertConstructionManager>({
    resolver: zodResolver(insertConstructionManagerSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      mobilePhone: "",
      title: "construction_manager",
      notes: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertConstructionManager) => {
      const res = await apiRequest("POST", "/api/construction-managers", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/construction-managers"] });
      setIsFormOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Construction manager created successfully",
        duration: 3000,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create construction manager",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertConstructionManager> }) => {
      const res = await apiRequest("PATCH", `/api/construction-managers/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/construction-managers"] });
      setIsFormOpen(false);
      setEditingCM(null);
      form.reset();
      toast({
        title: "Success",
        description: "Construction manager updated successfully",
        duration: 3000,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update construction manager",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/construction-managers/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/construction-managers"] });
      setDeletingCM(null);
      toast({
        title: "Success",
        description: "Construction manager deactivated successfully",
        duration: 3000,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to deactivate construction manager",
        variant: "destructive",
      });
    },
  });

  const handleAdd = useCallback(() => {
    setEditingCM(null);
    form.reset({
      name: "",
      email: "",
      phone: "",
      mobilePhone: "",
      title: "construction_manager",
      notes: "",
    });
    setIsFormOpen(true);
  }, [form]);

  const handleEdit = useCallback((cm: ConstructionManager) => {
    setEditingCM(cm);
    form.reset({
      name: cm.name,
      email: cm.email,
      phone: cm.phone || "",
      mobilePhone: cm.mobilePhone || "",
      title: cm.title,
      notes: cm.notes || "",
    });
    setIsFormOpen(true);
  }, [form]);

  const handleSubmit = useCallback((data: InsertConstructionManager) => {
    if (editingCM) {
      updateMutation.mutate({ id: editingCM.id, data });
    } else {
      createMutation.mutate(data);
    }
  }, [editingCM, updateMutation, createMutation]);

  const handleDelete = useCallback((cm: ConstructionManager) => {
    setDeletingCM(cm);
  }, []);

  const confirmDelete = useCallback(() => {
    if (deletingCM) {
      deleteMutation.mutate(deletingCM.id);
    }
  }, [deletingCM, deleteMutation]);

  if (error) {
    return (
      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        <Alert variant="destructive" data-testid="alert-cms-error">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between gap-4">
            <span>Failed to load construction managers: {error instanceof Error ? error.message : 'Unknown error'}</span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => refetch()}
              data-testid="button-retry-cms"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <UserCheck className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Construction Managers</h1>
            <p className="text-muted-foreground">
              {total} {total === 1 ? 'manager' : 'managers'}
            </p>
          </div>
        </div>
        {isAdmin && (
          <Button onClick={handleAdd} data-testid="button-add-cm">
            <Plus className="h-4 w-4 mr-2" />
            Add Construction Manager
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-cms"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="show-inactive"
                checked={showInactive}
                onCheckedChange={setShowInactive}
                data-testid="toggle-active-cms"
              />
              <Label htmlFor="show-inactive">Show inactive</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table - Desktop */}
      <Card className="hidden md:block">
        <CardContent className="p-0">
          <Table data-testid="table-cms">
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                {isAdmin && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                    {isAdmin && <TableCell><Skeleton className="h-8 w-20 ml-auto" /></TableCell>}
                  </TableRow>
                ))
              ) : constructionManagers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 6 : 5} className="text-center text-muted-foreground py-8">
                    No construction managers found
                  </TableCell>
                </TableRow>
              ) : (
                constructionManagers.map((cm: ConstructionManager) => (
                  <TableRow key={cm.id} data-testid={`row-cm-${cm.id}`}>
                    <TableCell className="font-medium" data-testid={`text-cm-name-${cm.id}`}>
                      {cm.name}
                    </TableCell>
                    <TableCell>
                      <a 
                        href={`mailto:${cm.email}`}
                        className="text-primary hover:underline flex items-center gap-2"
                        data-testid={`link-cm-email-${cm.id}`}
                      >
                        <Mail className="h-4 w-4" />
                        {cm.email}
                      </a>
                    </TableCell>
                    <TableCell data-testid={`text-cm-phone-${cm.id}`}>
                      {cm.phone ? (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          {formatPhoneNumber(cm.phone)}
                        </div>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        className={TITLE_COLORS[cm.title]}
                        data-testid={`badge-cm-title-${cm.id}`}
                      >
                        {TITLE_LABELS[cm.title]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={cm.isActive ? "default" : "secondary"}
                        className={cm.isActive ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" : ""}
                        data-testid={`badge-cm-status-${cm.id}`}
                      >
                        {cm.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(cm)}
                            data-testid={`button-edit-cm-${cm.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(cm)}
                            disabled={!cm.isActive}
                            data-testid={`button-delete-cm-${cm.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Cards - Mobile */}
      <div className="md:hidden space-y-4">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
              </CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-32" />
              </CardContent>
            </Card>
          ))
        ) : constructionManagers.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No construction managers found
            </CardContent>
          </Card>
        ) : (
          constructionManagers.map((cm: ConstructionManager) => (
            <Card key={cm.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{cm.name}</CardTitle>
                    <Badge className={TITLE_COLORS[cm.title]}>
                      {TITLE_LABELS[cm.title]}
                    </Badge>
                  </div>
                  <Badge
                    variant={cm.isActive ? "default" : "secondary"}
                    className={cm.isActive ? "bg-green-100 text-green-800" : ""}
                  >
                    {cm.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <a 
                  href={`mailto:${cm.email}`}
                  className="flex items-center gap-2 text-primary hover:underline"
                >
                  <Mail className="h-4 w-4" />
                  {cm.email}
                </a>
                {cm.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    {formatPhoneNumber(cm.phone)}
                  </div>
                )}
                {isAdmin && (
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleEdit(cm)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleDelete(cm)}
                      disabled={!cm.isActive}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={(open) => {
        setIsFormOpen(open);
        if (!open) {
          setEditingCM(null);
          form.reset();
        }
      }}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingCM ? "Edit Construction Manager" : "Add Construction Manager"}
            </DialogTitle>
            <DialogDescription>
              {editingCM ? "Update construction manager information" : "Add a new construction manager to the system"}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-cm-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} data-testid="input-cm-email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Office Phone</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-cm-phone" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="mobilePhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mobile Phone</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-cm-mobile" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-cm-title">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(TITLE_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea rows={3} {...field} data-testid="textarea-cm-notes" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsFormOpen(false)}
                  data-testid="button-cancel-cm-form"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-save-cm"
                >
                  {(createMutation.isPending || updateMutation.isPending) && (
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Save
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingCM} onOpenChange={(open) => !open && setDeletingCM(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Construction Manager?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate {deletingCM?.name}? This action will mark them as inactive.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-cm">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              data-testid="button-confirm-delete-cm"
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
