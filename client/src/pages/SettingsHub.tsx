import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Building2, 
  Users, 
  DollarSign, 
  Workflow, 
  Plug, 
  Shield, 
  Upload, 
  UserPlus,
  Mail,
  Download,
  Settings,
  Check,
  X,
  AlertCircle,
  Save,
  RefreshCw,
  Key,
  Calendar,
  Webhook,
  FileDown,
  FileUp,
  ChevronDown,
  ChevronRight,
  Edit,
  Trash2,
  Eye,
  EyeOff
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

// Types
interface Organization {
  id: string;
  name: string;
  logoUrl?: string;
  resnetCertification?: string;
  insuranceProvider?: string;
  insurancePolicyNumber?: string;
  serviceAreas?: string[];
  primaryContactEmail: string;
  phone?: string;
  address?: string;
}

interface OrganizationUser {
  id: string;
  userId: string;
  role: "owner" | "admin" | "inspector" | "contractor";
  permissions: Record<string, boolean>;
  status: "pending" | "active" | "deactivated";
  joinedAt?: string;
  user: {
    id: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    profileImageUrl?: string;
  };
}

interface UserInvitation {
  id: string;
  email: string;
  role: string;
  status: string;
  expiresAt: string;
  createdAt: string;
  invitedBy: {
    id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
  };
}

// Form schemas
const inviteUserSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  role: z.enum(["admin", "inspector", "contractor"], {
    required_error: "Please select a role",
  }),
});

const organizationSchema = z.object({
  name: z.string().min(1, "Organization name is required"),
  resnetCertification: z.string().optional(),
  insuranceProvider: z.string().optional(),
  insurancePolicyNumber: z.string().optional(),
  primaryContactEmail: z.string().email("Please enter a valid email"),
  phone: z.string().optional(),
  address: z.string().optional(),
  serviceAreas: z.array(z.string()).optional(),
});

export default function SettingsHub() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("organization");
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<OrganizationUser | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [financialSettings, setFinancialSettings] = useState<Record<string, any>>({});
  const [workflowSettings, setWorkflowSettings] = useState<Record<string, any>>({});
  const [integrationSettings, setIntegrationSettings] = useState<Record<string, any>>({});
  const [securitySettings, setSecuritySettings] = useState<Record<string, any>>({});

  // Check permissions
  const canManage = user?.role === "admin" || user?.role === "owner";
  const isOwner = user?.role === "owner";

  // Queries
  const { data: organization, isLoading: orgLoading } = useQuery({
    queryKey: ["/api/organization"],
    enabled: canManage,
  });

  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ["/api/organization/users"],
    enabled: canManage,
  });

  const { data: invitations, isLoading: invitationsLoading } = useQuery({
    queryKey: ["/api/invitations"],
    enabled: canManage,
  });

  // Load settings for each category
  const { data: financialData } = useQuery({
    queryKey: ["/api/organization/settings/financial"],
    enabled: canManage,
    onSuccess: (data) => setFinancialSettings(data || {}),
  });

  const { data: workflowData } = useQuery({
    queryKey: ["/api/organization/settings/workflow"],
    enabled: canManage,
    onSuccess: (data) => setWorkflowSettings(data || {}),
  });

  const { data: integrationData } = useQuery({
    queryKey: ["/api/organization/settings/integration"],
    enabled: canManage,
    onSuccess: (data) => setIntegrationSettings(data || {}),
  });

  const { data: securityData } = useQuery({
    queryKey: ["/api/organization/settings/security"],
    enabled: canManage,
    onSuccess: (data) => setSecuritySettings(data || {}),
  });

  // Mutations
  const updateOrganizationMutation = useMutation({
    mutationFn: (data: Partial<Organization>) => 
      apiRequest("/api/organization", {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organization"] });
      toast({
        title: "Organization updated",
        description: "Organization details have been saved successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update organization details.",
        variant: "destructive",
      });
    },
  });

  const inviteUserMutation = useMutation({
    mutationFn: (data: z.infer<typeof inviteUserSchema>) =>
      apiRequest("/api/organization/users/invite", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invitations"] });
      setInviteDialogOpen(false);
      toast({
        title: "Invitation sent",
        description: "User invitation has been sent successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send invitation.",
        variant: "destructive",
      });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      apiRequest(`/api/organization/users/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organization/users"] });
      setSelectedUser(null);
      toast({
        title: "User updated",
        description: "User role and permissions have been updated.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update user.",
        variant: "destructive",
      });
    },
  });

  const deactivateUserMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/api/organization/users/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organization/users"] });
      toast({
        title: "User deactivated",
        description: "User has been deactivated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to deactivate user.",
        variant: "destructive",
      });
    },
  });

  const updateSettingsMutation = useMutation({
    mutationFn: ({ category, settings }: { category: string; settings: any[] }) =>
      apiRequest(`/api/organization/settings/${category}`, {
        method: "PATCH",
        body: JSON.stringify({ settings }),
      }),
    onSuccess: (_, { category }) => {
      queryClient.invalidateQueries({ queryKey: [`/api/organization/settings/${category}`] });
      toast({
        title: "Settings saved",
        description: `${category.charAt(0).toUpperCase() + category.slice(1)} settings have been updated.`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save settings.",
        variant: "destructive",
      });
    },
  });

  // Forms
  const organizationForm = useForm({
    resolver: zodResolver(organizationSchema),
    defaultValues: organization || {},
  });

  const inviteForm = useForm({
    resolver: zodResolver(inviteUserSchema),
  });

  // Effects
  useEffect(() => {
    if (organization) {
      organizationForm.reset(organization);
    }
  }, [organization]);

  // Helper functions
  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const saveFinancialSettings = () => {
    const settings = Object.entries(financialSettings).map(([key, value]) => ({
      key,
      value,
    }));
    updateSettingsMutation.mutate({ category: "financial", settings });
  };

  const saveWorkflowSettings = () => {
    const settings = Object.entries(workflowSettings).map(([key, value]) => ({
      key,
      value,
    }));
    updateSettingsMutation.mutate({ category: "workflow", settings });
  };

  const saveIntegrationSettings = () => {
    const settings = Object.entries(integrationSettings).map(([key, value]) => ({
      key,
      value,
    }));
    updateSettingsMutation.mutate({ category: "integration", settings });
  };

  const saveSecuritySettings = () => {
    const settings = Object.entries(securitySettings).map(([key, value]) => ({
      key,
      value,
    }));
    updateSettingsMutation.mutate({ category: "security", settings });
  };

  const exportSettings = async () => {
    try {
      const response = await fetch("/api/organization/settings/export", {
        credentials: "include",
      });
      const data = await response.blob();
      const url = window.URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `settings-${new Date().toISOString()}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export settings.",
        variant: "destructive",
      });
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: "logo" | "import") => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (type === "logo") {
      const formData = new FormData();
      formData.append("file", file);
      
      try {
        await apiRequest("/api/organization/logo", {
          method: "POST",
          body: formData,
          headers: {}, // Let browser set Content-Type
        });
        queryClient.invalidateQueries({ queryKey: ["/api/organization"] });
        toast({
          title: "Logo uploaded",
          description: "Organization logo has been updated.",
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to upload logo.",
          variant: "destructive",
        });
      }
    } else {
      // Import settings
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = JSON.parse(e.target?.result as string);
          await apiRequest("/api/organization/settings/import", {
            method: "POST",
            body: JSON.stringify(data),
          });
          queryClient.invalidateQueries({ queryKey: ["/api/organization/settings"] });
          toast({
            title: "Settings imported",
            description: "Settings have been imported successfully.",
          });
        } catch (error) {
          toast({
            title: "Error",
            description: "Failed to import settings.",
            variant: "destructive",
          });
        }
      };
      reader.readAsText(file);
    }
  };

  if (!canManage) {
    return (
      <div className="container mx-auto p-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You don't have permission to access organization settings.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Settings Hub</h1>
          <p className="text-muted-foreground mt-1">Manage your organization, team, and system settings</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportSettings}>
            <FileDown className="h-4 w-4 mr-2" />
            Export Settings
          </Button>
          {isOwner && (
            <label className="cursor-pointer">
              <Button variant="outline" asChild>
                <span>
                  <FileUp className="h-4 w-4 mr-2" />
                  Import Settings
                </span>
              </Button>
              <input
                type="file"
                accept=".json"
                className="hidden"
                onChange={(e) => handleFileUpload(e, "import")}
              />
            </label>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="organization" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">Organization</span>
          </TabsTrigger>
          <TabsTrigger value="team" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Team</span>
          </TabsTrigger>
          <TabsTrigger value="financial" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            <span className="hidden sm:inline">Financial</span>
          </TabsTrigger>
          <TabsTrigger value="workflow" className="flex items-center gap-2">
            <Workflow className="h-4 w-4" />
            <span className="hidden sm:inline">Workflow</span>
          </TabsTrigger>
          <TabsTrigger value="integrations" className="flex items-center gap-2">
            <Plug className="h-4 w-4" />
            <span className="hidden sm:inline">Integrations</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Security</span>
          </TabsTrigger>
        </TabsList>

        {/* Organization Tab */}
        <TabsContent value="organization" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Organization Profile</CardTitle>
              <CardDescription>
                Manage your organization's basic information and branding
              </CardDescription>
            </CardHeader>
            <CardContent>
              {orgLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : (
                <Form {...organizationForm}>
                  <form onSubmit={organizationForm.handleSubmit((data) => updateOrganizationMutation.mutate(data))} className="space-y-6">
                    <div className="space-y-4">
                      {/* Logo Upload */}
                      <div className="flex items-center gap-4">
                        {organization?.logoUrl ? (
                          <img
                            src={organization.logoUrl}
                            alt="Organization logo"
                            className="h-20 w-20 object-cover rounded-lg border"
                          />
                        ) : (
                          <div className="h-20 w-20 bg-muted rounded-lg flex items-center justify-center">
                            <Building2 className="h-8 w-8 text-muted-foreground" />
                          </div>
                        )}
                        <label className="cursor-pointer">
                          <Button variant="outline" size="sm" asChild>
                            <span>
                              <Upload className="h-4 w-4 mr-2" />
                              Upload Logo
                            </span>
                          </Button>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleFileUpload(e, "logo")}
                          />
                        </label>
                      </div>

                      {/* Organization Name */}
                      <FormField
                        control={organizationForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Organization Name</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Ulrich Energy Auditing" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Contact Email */}
                      <FormField
                        control={organizationForm.control}
                        name="primaryContactEmail"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Primary Contact Email</FormLabel>
                            <FormControl>
                              <Input {...field} type="email" placeholder="contact@company.com" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Phone */}
                      <FormField
                        control={organizationForm.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone Number</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="(555) 123-4567" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Address */}
                      <FormField
                        control={organizationForm.control}
                        name="address"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Address</FormLabel>
                            <FormControl>
                              <Textarea {...field} placeholder="123 Main St, City, State 12345" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* RESNET Certification */}
                      <FormField
                        control={organizationForm.control}
                        name="resnetCertification"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>RESNET Certification Number</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="CERT-12345" />
                            </FormControl>
                            <FormDescription>
                              Your RESNET HERS Rater certification number
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Insurance */}
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={organizationForm.control}
                          name="insuranceProvider"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Insurance Provider</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Provider name" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={organizationForm.control}
                          name="insurancePolicyNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Policy Number</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="POL-12345" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Service Areas */}
                      <FormField
                        control={organizationForm.control}
                        name="serviceAreas"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Service Areas</FormLabel>
                            <FormControl>
                              <Textarea 
                                value={field.value?.join(", ") || ""} 
                                onChange={(e) => field.onChange(e.target.value.split(",").map(s => s.trim()))}
                                placeholder="Minneapolis, St. Paul, Bloomington, Eden Prairie" 
                              />
                            </FormControl>
                            <FormDescription>
                              Comma-separated list of cities or regions you serve
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="flex justify-end">
                      <Button type="submit" disabled={updateOrganizationMutation.isPending}>
                        <Save className="h-4 w-4 mr-2" />
                        Save Changes
                      </Button>
                    </div>
                  </form>
                </Form>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Team Management Tab */}
        <TabsContent value="team" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Team Members</CardTitle>
                  <CardDescription>
                    Manage users, roles, and permissions
                  </CardDescription>
                </div>
                <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Invite User
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Invite Team Member</DialogTitle>
                      <DialogDescription>
                        Send an invitation to join your organization
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...inviteForm}>
                      <form onSubmit={inviteForm.handleSubmit((data) => inviteUserMutation.mutate(data))} className="space-y-4">
                        <FormField
                          control={inviteForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email Address</FormLabel>
                              <FormControl>
                                <Input {...field} type="email" placeholder="inspector@example.com" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={inviteForm.control}
                          name="role"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Role</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select a role" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="admin">Admin</SelectItem>
                                  <SelectItem value="inspector">Inspector</SelectItem>
                                  <SelectItem value="contractor">Contractor</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <DialogFooter>
                          <Button type="submit" disabled={inviteUserMutation.isPending}>
                            Send Invitation
                          </Button>
                        </DialogFooter>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {usersLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users?.map((orgUser: OrganizationUser) => (
                      <TableRow key={orgUser.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {orgUser.user.profileImageUrl ? (
                              <img
                                src={orgUser.user.profileImageUrl}
                                alt={`${orgUser.user.firstName} ${orgUser.user.lastName}`}
                                className="h-8 w-8 rounded-full"
                              />
                            ) : (
                              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                                <Users className="h-4 w-4 text-muted-foreground" />
                              </div>
                            )}
                            <div>
                              <p className="font-medium">
                                {orgUser.user.firstName} {orgUser.user.lastName}
                              </p>
                              <p className="text-sm text-muted-foreground">{orgUser.user.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={orgUser.role === "owner" ? "default" : "secondary"}>
                            {orgUser.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              orgUser.status === "active"
                                ? "default"
                                : orgUser.status === "pending"
                                ? "secondary"
                                : "destructive"
                            }
                          >
                            {orgUser.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {orgUser.joinedAt
                            ? new Date(orgUser.joinedAt).toLocaleDateString()
                            : "Pending"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedUser(orgUser)}
                              disabled={orgUser.role === "owner" && !isOwner}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            {orgUser.role !== "owner" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => deactivateUserMutation.mutate(orgUser.id)}
                                disabled={deactivateUserMutation.isPending}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {/* Pending Invitations */}
              {invitations && invitations.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-medium mb-4">Pending Invitations</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Invited By</TableHead>
                        <TableHead>Expires</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invitations.map((invitation: UserInvitation) => (
                        <TableRow key={invitation.id}>
                          <TableCell>{invitation.email}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{invitation.role}</Badge>
                          </TableCell>
                          <TableCell>
                            {invitation.invitedBy?.firstName} {invitation.invitedBy?.lastName}
                          </TableCell>
                          <TableCell>
                            {new Date(invitation.expiresAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={async () => {
                                  await apiRequest(`/api/invitations/${invitation.id}/resend`, {
                                    method: "POST",
                                  });
                                  queryClient.invalidateQueries({ queryKey: ["/api/invitations"] });
                                  toast({
                                    title: "Invitation resent",
                                    description: "The invitation has been resent successfully.",
                                  });
                                }}
                              >
                                <RefreshCw className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={async () => {
                                  await apiRequest(`/api/invitations/${invitation.id}`, {
                                    method: "DELETE",
                                  });
                                  queryClient.invalidateQueries({ queryKey: ["/api/invitations"] });
                                  toast({
                                    title: "Invitation cancelled",
                                    description: "The invitation has been cancelled.",
                                  });
                                }}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Financial Settings Tab */}
        <TabsContent value="financial" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Financial Settings</CardTitle>
              <CardDescription>
                Configure pricing, billing terms, and expense policies
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Pricing Matrix */}
              <div>
                <h3 className="text-lg font-medium mb-4">Pricing by Job Type</h3>
                <div className="space-y-4">
                  {["sv2", "full_test", "code_bdoor", "rough_duct"].map((jobType) => (
                    <div key={jobType} className="flex items-center justify-between">
                      <Label htmlFor={`price-${jobType}`} className="flex-1">
                        {jobType.replace(/_/g, " ").toUpperCase()}
                      </Label>
                      <Input
                        id={`price-${jobType}`}
                        type="number"
                        step="0.01"
                        value={financialSettings[`price_${jobType}`] || ""}
                        onChange={(e) =>
                          setFinancialSettings((prev) => ({
                            ...prev,
                            [`price_${jobType}`]: parseFloat(e.target.value) || 0,
                          }))
                        }
                        className="w-32"
                        placeholder="0.00"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Billing Terms */}
              <div>
                <h3 className="text-lg font-medium mb-4">Billing Terms</h3>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="payment-terms">Default Payment Terms (days)</Label>
                    <Input
                      id="payment-terms"
                      type="number"
                      value={financialSettings.payment_terms || 30}
                      onChange={(e) =>
                        setFinancialSettings((prev) => ({
                          ...prev,
                          payment_terms: parseInt(e.target.value) || 30,
                        }))
                      }
                      className="w-32"
                    />
                  </div>
                  <div>
                    <Label htmlFor="late-fee">Late Fee Percentage</Label>
                    <Input
                      id="late-fee"
                      type="number"
                      step="0.1"
                      value={financialSettings.late_fee_percentage || ""}
                      onChange={(e) =>
                        setFinancialSettings((prev) => ({
                          ...prev,
                          late_fee_percentage: parseFloat(e.target.value) || 0,
                        }))
                      }
                      className="w-32"
                      placeholder="1.5%"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Expense Settings */}
              <div>
                <h3 className="text-lg font-medium mb-4">Expense Policies</h3>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="mileage-rate">Mileage Rate (per mile)</Label>
                    <Input
                      id="mileage-rate"
                      type="number"
                      step="0.01"
                      value={financialSettings.mileage_rate || 0.65}
                      onChange={(e) =>
                        setFinancialSettings((prev) => ({
                          ...prev,
                          mileage_rate: parseFloat(e.target.value) || 0.65,
                        }))
                      }
                      className="w-32"
                      placeholder="0.65"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="require-receipts"
                      checked={financialSettings.require_receipts || false}
                      onCheckedChange={(checked) =>
                        setFinancialSettings((prev) => ({
                          ...prev,
                          require_receipts: checked,
                        }))
                      }
                    />
                    <Label htmlFor="require-receipts">
                      Require receipts for all expenses
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="auto-approve-mileage"
                      checked={financialSettings.auto_approve_mileage || false}
                      onCheckedChange={(checked) =>
                        setFinancialSettings((prev) => ({
                          ...prev,
                          auto_approve_mileage: checked,
                        }))
                      }
                    />
                    <Label htmlFor="auto-approve-mileage">
                      Auto-approve mileage claims under 100 miles
                    </Label>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={saveFinancialSettings}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Financial Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Workflow Templates Tab */}
        <TabsContent value="workflow" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Workflow Templates</CardTitle>
              <CardDescription>
                Configure inspection templates and documentation rules
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Inspection Templates */}
              <div>
                <h3 className="text-lg font-medium mb-4">Inspection Checklists</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>SV2 Checklist Items</Label>
                    <Input
                      type="number"
                      value={workflowSettings.sv2_checklist_count || 25}
                      onChange={(e) =>
                        setWorkflowSettings((prev) => ({
                          ...prev,
                          sv2_checklist_count: parseInt(e.target.value) || 25,
                        }))
                      }
                      className="w-20"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Full Test Checklist Items</Label>
                    <Input
                      type="number"
                      value={workflowSettings.full_test_checklist_count || 45}
                      onChange={(e) =>
                        setWorkflowSettings((prev) => ({
                          ...prev,
                          full_test_checklist_count: parseInt(e.target.value) || 45,
                        }))
                      }
                      className="w-20"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Photo Requirements */}
              <div>
                <h3 className="text-lg font-medium mb-4">Photo Requirements</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Minimum photos per inspection</Label>
                    <Input
                      type="number"
                      value={workflowSettings.min_photos_per_inspection || 10}
                      onChange={(e) =>
                        setWorkflowSettings((prev) => ({
                          ...prev,
                          min_photos_per_inspection: parseInt(e.target.value) || 10,
                        }))
                      }
                      className="w-20"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="require-geotagging"
                      checked={workflowSettings.require_photo_geotagging || false}
                      onCheckedChange={(checked) =>
                        setWorkflowSettings((prev) => ({
                          ...prev,
                          require_photo_geotagging: checked,
                        }))
                      }
                    />
                    <Label htmlFor="require-geotagging">
                      Require geotagging for all photos
                    </Label>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Testing Thresholds */}
              <div>
                <h3 className="text-lg font-medium mb-4">Testing Thresholds</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>ACH50 Pass Threshold</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={workflowSettings.ach50_threshold || 3.0}
                      onChange={(e) =>
                        setWorkflowSettings((prev) => ({
                          ...prev,
                          ach50_threshold: parseFloat(e.target.value) || 3.0,
                        }))
                      }
                      className="w-20"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>CFM25 Limit (per ton)</Label>
                    <Input
                      type="number"
                      step="1"
                      value={workflowSettings.cfm25_per_ton || 4}
                      onChange={(e) =>
                        setWorkflowSettings((prev) => ({
                          ...prev,
                          cfm25_per_ton: parseInt(e.target.value) || 4,
                        }))
                      }
                      className="w-20"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Auto-Documentation Rules */}
              <div>
                <h3 className="text-lg font-medium mb-4">Automation Rules</h3>
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="auto-generate-report"
                      checked={workflowSettings.auto_generate_report || false}
                      onCheckedChange={(checked) =>
                        setWorkflowSettings((prev) => ({
                          ...prev,
                          auto_generate_report: checked,
                        }))
                      }
                    />
                    <Label htmlFor="auto-generate-report">
                      Auto-generate report after inspection completion
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="auto-send-report"
                      checked={workflowSettings.auto_send_report || false}
                      onCheckedChange={(checked) =>
                        setWorkflowSettings((prev) => ({
                          ...prev,
                          auto_send_report: checked,
                        }))
                      }
                    />
                    <Label htmlFor="auto-send-report">
                      Auto-send report to builder when ready
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="require-supervisor-review"
                      checked={workflowSettings.require_supervisor_review || false}
                      onCheckedChange={(checked) =>
                        setWorkflowSettings((prev) => ({
                          ...prev,
                          require_supervisor_review: checked,
                        }))
                      }
                    />
                    <Label htmlFor="require-supervisor-review">
                      Require supervisor review for failed tests
                    </Label>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={saveWorkflowSettings}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Workflow Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Integrations Tab */}
        <TabsContent value="integrations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Integrations</CardTitle>
              <CardDescription>
                Manage external services and API connections
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Google Calendar */}
              <div>
                <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Google Calendar
                </h3>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="calendar-id">Calendar ID</Label>
                    <Input
                      id="calendar-id"
                      value={integrationSettings.google_calendar_id || ""}
                      onChange={(e) =>
                        setIntegrationSettings((prev) => ({
                          ...prev,
                          google_calendar_id: e.target.value,
                        }))
                      }
                      placeholder="your-calendar@group.calendar.google.com"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="auto-import-events"
                      checked={integrationSettings.auto_import_events || false}
                      onCheckedChange={(checked) =>
                        setIntegrationSettings((prev) => ({
                          ...prev,
                          auto_import_events: checked,
                        }))
                      }
                    />
                    <Label htmlFor="auto-import-events">
                      Auto-import events every 6 hours
                    </Label>
                  </div>
                </div>
              </div>

              <Separator />

              {/* API Keys */}
              <div>
                <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  API Keys
                </h3>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="openai-key">OpenAI API Key</Label>
                    <div className="flex gap-2">
                      <Input
                        id="openai-key"
                        type="password"
                        value={integrationSettings.openai_api_key || ""}
                        onChange={(e) =>
                          setIntegrationSettings((prev) => ({
                            ...prev,
                            openai_api_key: e.target.value,
                          }))
                        }
                        placeholder="sk-..."
                      />
                      <Button variant="outline" size="icon">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="sendgrid-key">SendGrid API Key</Label>
                    <div className="flex gap-2">
                      <Input
                        id="sendgrid-key"
                        type="password"
                        value={integrationSettings.sendgrid_api_key || ""}
                        onChange={(e) =>
                          setIntegrationSettings((prev) => ({
                            ...prev,
                            sendgrid_api_key: e.target.value,
                          }))
                        }
                        placeholder="SG..."
                      />
                      <Button variant="outline" size="icon">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Webhooks */}
              <div>
                <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                  <Webhook className="h-5 w-5" />
                  Webhooks
                </h3>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="webhook-url">Webhook URL</Label>
                    <Input
                      id="webhook-url"
                      value={integrationSettings.webhook_url || ""}
                      onChange={(e) =>
                        setIntegrationSettings((prev) => ({
                          ...prev,
                          webhook_url: e.target.value,
                        }))
                      }
                      placeholder="https://your-service.com/webhook"
                    />
                  </div>
                  <div>
                    <Label>Webhook Events</Label>
                    <div className="space-y-2 mt-2">
                      {["job.completed", "report.generated", "invoice.created", "payment.received"].map((event) => (
                        <div key={event} className="flex items-center space-x-2">
                          <Checkbox
                            id={`webhook-${event}`}
                            checked={integrationSettings[`webhook_${event}`] || false}
                            onCheckedChange={(checked) =>
                              setIntegrationSettings((prev) => ({
                                ...prev,
                                [`webhook_${event}`]: checked,
                              }))
                            }
                          />
                          <Label htmlFor={`webhook-${event}`}>{event}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Export Schedules */}
              <div>
                <h3 className="text-lg font-medium mb-4">Scheduled Exports</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Daily Reports Export</Label>
                    <Select
                      value={integrationSettings.daily_export_time || "disabled"}
                      onValueChange={(value) =>
                        setIntegrationSettings((prev) => ({
                          ...prev,
                          daily_export_time: value,
                        }))
                      }
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="disabled">Disabled</SelectItem>
                        <SelectItem value="06:00">6:00 AM</SelectItem>
                        <SelectItem value="12:00">12:00 PM</SelectItem>
                        <SelectItem value="18:00">6:00 PM</SelectItem>
                        <SelectItem value="23:00">11:00 PM</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Weekly Invoices Export</Label>
                    <Select
                      value={integrationSettings.weekly_invoice_export || "disabled"}
                      onValueChange={(value) =>
                        setIntegrationSettings((prev) => ({
                          ...prev,
                          weekly_invoice_export: value,
                        }))
                      }
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="disabled">Disabled</SelectItem>
                        <SelectItem value="monday">Monday</SelectItem>
                        <SelectItem value="friday">Friday</SelectItem>
                        <SelectItem value="sunday">Sunday</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={saveIntegrationSettings}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Integration Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>
                Configure security policies and access controls
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Password Policy */}
              <div>
                <h3 className="text-lg font-medium mb-4">Password Policy</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Minimum Password Length</Label>
                    <Input
                      type="number"
                      value={securitySettings.min_password_length || 8}
                      onChange={(e) =>
                        setSecuritySettings((prev) => ({
                          ...prev,
                          min_password_length: parseInt(e.target.value) || 8,
                        }))
                      }
                      className="w-20"
                      min="6"
                      max="32"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="require-uppercase"
                      checked={securitySettings.require_uppercase || false}
                      onCheckedChange={(checked) =>
                        setSecuritySettings((prev) => ({
                          ...prev,
                          require_uppercase: checked,
                        }))
                      }
                    />
                    <Label htmlFor="require-uppercase">
                      Require uppercase letters
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="require-numbers"
                      checked={securitySettings.require_numbers || false}
                      onCheckedChange={(checked) =>
                        setSecuritySettings((prev) => ({
                          ...prev,
                          require_numbers: checked,
                        }))
                      }
                    />
                    <Label htmlFor="require-numbers">
                      Require numbers
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="require-special"
                      checked={securitySettings.require_special_chars || false}
                      onCheckedChange={(checked) =>
                        setSecuritySettings((prev) => ({
                          ...prev,
                          require_special_chars: checked,
                        }))
                      }
                    />
                    <Label htmlFor="require-special">
                      Require special characters
                    </Label>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Session Management */}
              <div>
                <h3 className="text-lg font-medium mb-4">Session Management</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Session Timeout (minutes)</Label>
                    <Input
                      type="number"
                      value={securitySettings.session_timeout_minutes || 60}
                      onChange={(e) =>
                        setSecuritySettings((prev) => ({
                          ...prev,
                          session_timeout_minutes: parseInt(e.target.value) || 60,
                        }))
                      }
                      className="w-24"
                      min="5"
                      max="1440"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Max Concurrent Sessions</Label>
                    <Input
                      type="number"
                      value={securitySettings.max_concurrent_sessions || 3}
                      onChange={(e) =>
                        setSecuritySettings((prev) => ({
                          ...prev,
                          max_concurrent_sessions: parseInt(e.target.value) || 3,
                        }))
                      }
                      className="w-20"
                      min="1"
                      max="10"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Two-Factor Authentication */}
              <div>
                <h3 className="text-lg font-medium mb-4">Two-Factor Authentication</h3>
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="require-2fa"
                      checked={securitySettings.require_2fa || false}
                      onCheckedChange={(checked) =>
                        setSecuritySettings((prev) => ({
                          ...prev,
                          require_2fa: checked,
                        }))
                      }
                    />
                    <Label htmlFor="require-2fa">
                      Require 2FA for all users
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="require-2fa-admins"
                      checked={securitySettings.require_2fa_admins || true}
                      onCheckedChange={(checked) =>
                        setSecuritySettings((prev) => ({
                          ...prev,
                          require_2fa_admins: checked,
                        }))
                      }
                    />
                    <Label htmlFor="require-2fa-admins">
                      Require 2FA for admins and owners
                    </Label>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Data Retention */}
              <div>
                <h3 className="text-lg font-medium mb-4">Data Retention</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Audit Log Retention (days)</Label>
                    <Input
                      type="number"
                      value={securitySettings.audit_log_retention_days || 365}
                      onChange={(e) =>
                        setSecuritySettings((prev) => ({
                          ...prev,
                          audit_log_retention_days: parseInt(e.target.value) || 365,
                        }))
                      }
                      className="w-24"
                      min="30"
                      max="3650"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Job Data Retention (years)</Label>
                    <Input
                      type="number"
                      value={securitySettings.job_data_retention_years || 7}
                      onChange={(e) =>
                        setSecuritySettings((prev) => ({
                          ...prev,
                          job_data_retention_years: parseInt(e.target.value) || 7,
                        }))
                      }
                      className="w-20"
                      min="1"
                      max="20"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Photo Archive Period (days)</Label>
                    <Input
                      type="number"
                      value={securitySettings.photo_archive_days || 90}
                      onChange={(e) =>
                        setSecuritySettings((prev) => ({
                          ...prev,
                          photo_archive_days: parseInt(e.target.value) || 90,
                        }))
                      }
                      className="w-24"
                      min="30"
                      max="730"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* IP Restrictions */}
              <div>
                <h3 className="text-lg font-medium mb-4">Access Restrictions</h3>
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="enable-ip-whitelist"
                      checked={securitySettings.enable_ip_whitelist || false}
                      onCheckedChange={(checked) =>
                        setSecuritySettings((prev) => ({
                          ...prev,
                          enable_ip_whitelist: checked,
                        }))
                      }
                    />
                    <Label htmlFor="enable-ip-whitelist">
                      Enable IP whitelist
                    </Label>
                  </div>
                  {securitySettings.enable_ip_whitelist && (
                    <div>
                      <Label htmlFor="ip-whitelist">Allowed IP Addresses</Label>
                      <Textarea
                        id="ip-whitelist"
                        value={securitySettings.ip_whitelist?.join("\n") || ""}
                        onChange={(e) =>
                          setSecuritySettings((prev) => ({
                            ...prev,
                            ip_whitelist: e.target.value.split("\n").filter(ip => ip.trim()),
                          }))
                        }
                        placeholder="192.168.1.1&#10;10.0.0.0/24"
                        rows={5}
                      />
                      <p className="text-sm text-muted-foreground mt-1">
                        One IP address or CIDR range per line
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={saveSecuritySettings}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Security Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit User Dialog */}
      {selectedUser && (
        <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
              <DialogDescription>
                Update user role and permissions
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Role</Label>
                <Select
                  value={selectedUser.role}
                  onValueChange={(value) =>
                    setSelectedUser((prev) =>
                      prev ? { ...prev, role: value as any } : null
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {isOwner && <SelectItem value="owner">Owner</SelectItem>}
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="inspector">Inspector</SelectItem>
                    <SelectItem value="contractor">Contractor</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Permissions</Label>
                <div className="space-y-2 mt-2">
                  {[
                    { key: "manage_jobs", label: "Manage Jobs" },
                    { key: "view_financial", label: "View Financial Data" },
                    { key: "manage_users", label: "Manage Users" },
                    { key: "export_data", label: "Export Data" },
                    { key: "delete_data", label: "Delete Data" },
                  ].map(({ key, label }) => (
                    <div key={key} className="flex items-center space-x-2">
                      <Checkbox
                        id={key}
                        checked={selectedUser.permissions?.[key] || false}
                        onCheckedChange={(checked) =>
                          setSelectedUser((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  permissions: {
                                    ...prev.permissions,
                                    [key]: checked,
                                  },
                                }
                              : null
                          )
                        }
                      />
                      <Label htmlFor={key}>{label}</Label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label>Status</Label>
                <Select
                  value={selectedUser.status}
                  onValueChange={(value) =>
                    setSelectedUser((prev) =>
                      prev ? { ...prev, status: value as any } : null
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="deactivated">Deactivated</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={() => {
                  updateUserMutation.mutate({
                    id: selectedUser.id,
                    data: {
                      role: selectedUser.role,
                      permissions: selectedUser.permissions,
                      status: selectedUser.status,
                    },
                  });
                }}
              >
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}