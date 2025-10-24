import { queryClientLogger } from "./logger";

let csrfToken: string | null = null;
let fetchPromise: Promise<string> | null = null;

export async function fetchCsrfToken(): Promise<string> {
  // If already fetching, return the existing promise
  if (fetchPromise) {
    return fetchPromise;
  }

  fetchPromise = (async () => {
    try {
      queryClientLogger.debug('[CSRF] Fetching CSRF token');
      const response = await fetch('/api/csrf-token', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch CSRF token: ${response.status}`);
      }

      const data = await response.json();
      csrfToken = data.csrfToken;
      queryClientLogger.info('[CSRF] Token fetched successfully');
      return csrfToken!;
    } finally {
      fetchPromise = null;
    }
  })();

  return fetchPromise;
}

export function getCsrfToken(): string | null {
  return csrfToken;
}

export function clearCsrfToken(): void {
  queryClientLogger.info('[CSRF] Token cleared');
  csrfToken = null;
  fetchPromise = null;
}
