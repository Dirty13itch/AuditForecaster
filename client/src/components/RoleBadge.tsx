import { Badge } from "@/components/ui/badge";
import { Shield, Eye, UserCheck, User } from "lucide-react";
import type { UserRole } from "@/hooks/useAuth";

interface RoleBadgeProps {
  role: UserRole;
  size?: "sm" | "default";
  showIcon?: boolean;
}

export function RoleBadge({ role, size = "default", showIcon = true }: RoleBadgeProps) {
  const roleConfig = {
    admin: {
      label: "Admin",
      variant: "destructive" as const,
      icon: Shield,
    },
    inspector: {
      label: "Inspector",
      variant: "default" as const,
      icon: UserCheck,
    },
    manager: {
      label: "Manager",
      variant: "secondary" as const,
      icon: Eye,
    },
    viewer: {
      label: "Viewer",
      variant: "outline" as const,
      icon: User,
    },
  };

  const config = roleConfig[role];
  const Icon = config.icon;

  return (
    <Badge 
      variant={config.variant} 
      className={size === "sm" ? "text-xs px-2 py-0" : ""}
      data-testid={`badge-role-${role}`}
    >
      {showIcon && <Icon className="h-3 w-3 mr-1" />}
      {config.label}
    </Badge>
  );
}
