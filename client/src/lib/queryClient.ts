import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { addToSyncQueue } from "./syncQueue";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  try {
    const res = await fetch(url, {
      method,
      headers: data ? { "Content-Type": "application/json" } : {},
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
    });

    await throwIfResNotOk(res);
    return res;
  } catch (error) {
    if (!navigator.onLine || (error instanceof Error && error.message.includes('Failed to fetch'))) {
      console.log('[QueryClient] Network error detected, adding to sync queue');
      
      if (method !== 'GET') {
        await addToSyncQueue({
          method,
          url,
          data,
          headers: data ? { "Content-Type": "application/json" } : {},
        });
        
        return new Response(
          JSON.stringify({ 
            queued: true, 
            message: 'Request queued for sync when online' 
          }),
          {
            status: 202,
            statusText: 'Accepted',
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
    }
    
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    try {
      const res = await fetch(queryKey.join("/") as string, {
        credentials: "include",
      });

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }

      await throwIfResNotOk(res);
      return await res.json();
    } catch (error) {
      if (!navigator.onLine || (error instanceof Error && error.message.includes('Failed to fetch'))) {
        console.log('[QueryClient] Network error on query, will use stale data if available');
      }
      throw error;
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
      gcTime: 1000 * 60 * 60 * 24,
    },
    mutations: {
      retry: false,
    },
  },
});
