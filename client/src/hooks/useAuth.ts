import { useQuery } from "@tanstack/react-query";
import type { User, UserRole } from '@shared/types';

// Re-export UserRole for backwards compatibility
export type { UserRole };

export function useAuth() {
  const { data: user, isLoading } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
  };
}
