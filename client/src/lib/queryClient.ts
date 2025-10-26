import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { queryClientLogger } from "./logger";
import { fetchCsrfToken, getCsrfToken, clearCsrfToken } from "./csrfToken";
import { syncQueue } from "@/utils/syncQueue";
import { indexedDB } from "@/utils/indexedDB";
import { cacheManager } from "@/utils/cacheManager";

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
    // Fetch CSRF token for state-changing requests
    let csrfToken = getCsrfToken();
    if (method !== 'GET' && method !== 'HEAD') {
      if (!csrfToken) {
        queryClientLogger.debug('[CSRF] No token in cache, fetching...');
        csrfToken = await fetchCsrfToken();
      }
    }

    const headers: Record<string, string> = data ? { "Content-Type": "application/json" } : {};
    if (csrfToken && method !== 'GET' && method !== 'HEAD') {
      headers['X-CSRF-Token'] = csrfToken;
    }

    const res = await fetch(url, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
    });

    // If CSRF validation fails, clear token and retry once
    if (res.status === 403) {
      const errorText = await res.text();
      if (errorText.includes('CSRF') || errorText.includes('csrf')) {
        queryClientLogger.warn('[CSRF] Token invalid, fetching new token and retrying');
        clearCsrfToken();
        csrfToken = await fetchCsrfToken();
        
        const headers: Record<string, string> = data ? { "Content-Type": "application/json" } : {};
        if (csrfToken && method !== 'GET' && method !== 'HEAD') {
          headers['X-CSRF-Token'] = csrfToken;
        }

        const retryRes = await fetch(url, {
          method,
          headers,
          body: data ? JSON.stringify(data) : undefined,
          credentials: "include",
        });

        await throwIfResNotOk(retryRes);
        return retryRes;
      }
      // Not a CSRF error, throw the original error
      throw new Error(`403: ${errorText}`);
    }

    await throwIfResNotOk(res);
    return res;
  } catch (error) {
    if (!navigator.onLine || (error instanceof Error && error.message.includes('Failed to fetch'))) {
      queryClientLogger.info('Network error detected, adding to sync queue');
      
      if (method !== 'GET') {
        const csrfToken = getCsrfToken();
        const headers: Record<string, string> = data ? { "Content-Type": "application/json" } : {};
        if (csrfToken) {
          headers['X-CSRF-Token'] = csrfToken;
        }

        await syncQueue.queueRequest({
          url,
          method,
          body: data,
          headers,
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
      // Coerce all queryKey elements to strings and join them
      const url = queryKey
        .map(key => `${key}`)
        .join("/");
      
      const res = await fetch(url, {
        credentials: "include",
      });

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }

      await throwIfResNotOk(res);
      return await res.json();
    } catch (error) {
      if (!navigator.onLine || (error instanceof Error && error.message.includes('Failed to fetch'))) {
        queryClientLogger.info('Network error on query, will use stale data if available');
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
