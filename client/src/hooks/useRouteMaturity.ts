import { useLocation } from "wouter";
import { useMemo } from "react";
import { ROUTE_REGISTRY } from "@shared/navigation";
import { FeatureMaturity } from "@shared/featureFlags";

/**
 * Hook to get the current route's maturity level from the navigation registry
 * 
 * @returns The maturity level of the current route, or null if not found
 */
export function useRouteMaturity(): FeatureMaturity | null {
  const [location] = useLocation();
  
  const maturity = useMemo(() => {
    // Find exact match first
    const exactMatch = ROUTE_REGISTRY[location];
    if (exactMatch) {
      return exactMatch.maturity;
    }
    
    // Try to match dynamic routes (e.g., /jobs/:id)
    // Convert current location to a pattern and find matching route
    for (const [routePath, metadata] of Object.entries(ROUTE_REGISTRY)) {
      // Check if route has dynamic segments
      if (routePath.includes(':')) {
        // Create a regex pattern from the route path
        const pattern = routePath
          .split('/')
          .map(segment => {
            if (segment.startsWith(':')) {
              return '[^/]+'; // Match any non-slash characters
            }
            return segment;
          })
          .join('/');
        
        const regex = new RegExp(`^${pattern}$`);
        if (regex.test(location)) {
          return metadata.maturity;
        }
      }
    }
    
    // No match found
    return null;
  }, [location]);
  
  return maturity;
}

/**
 * Hook to get route metadata by path
 * 
 * @param path The route path to look up
 * @returns The route metadata or null if not found
 */
export function useRouteMetadata(path?: string) {
  const [location] = useLocation();
  const routePath = path || location;
  
  const metadata = useMemo(() => {
    // Find exact match first
    const exactMatch = ROUTE_REGISTRY[routePath];
    if (exactMatch) {
      return exactMatch;
    }
    
    // Try to match dynamic routes
    for (const [registeredPath, metadata] of Object.entries(ROUTE_REGISTRY)) {
      if (registeredPath.includes(':')) {
        const pattern = registeredPath
          .split('/')
          .map(segment => {
            if (segment.startsWith(':')) {
              return '[^/]+';
            }
            return segment;
          })
          .join('/');
        
        const regex = new RegExp(`^${pattern}$`);
        if (regex.test(routePath)) {
          return metadata;
        }
      }
    }
    
    return null;
  }, [routePath]);
  
  return metadata;
}