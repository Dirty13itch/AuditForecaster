import { useQuery } from "@tanstack/react-query";

export type UserRole = 'admin' | 'inspector' | 'manager' | 'viewer';

export function useAuth() {
  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
  };
}
