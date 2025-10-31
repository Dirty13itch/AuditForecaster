import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type {
  MultifamilyProgram,
  InsertMultifamilyProgram,
  ComplianceArtifact,
  InsertComplianceArtifact,
} from "@shared/schema";

/**
 * TanStack Query Keys for Compliance Data
 * Hierarchical query keys for proper cache management and invalidation
 */
export const complianceKeys = {
  all: ['/api/compliance'] as const,
  multifamilyPrograms: () => ['/api/multifamily-programs'] as const,
  multifamilyProgram: (id: string) => ['/api/multifamily-programs', id] as const,
  artifacts: () => ['/api/compliance/artifacts'] as const,
  benchmarkingDeadlines: (sqft: number) => ['/api/compliance/benchmarking/deadlines', { sqft }] as const,
  energyStarChecklists: (version: string, path: string) => ['/api/compliance/energy-star/checklists', { version, path }] as const,
  samplingCalculation: (unitCount: number) => ['/api/compliance/sampling/calculate', { unitCount }] as const,
};

/**
 * Fetch a single multifamily program by ID
 */
export function useMultifamilyProgram(id: string | null) {
  return useQuery<MultifamilyProgram>({
    queryKey: complianceKeys.multifamilyProgram(id!),
    enabled: !!id,
  });
}

/**
 * Create a new multifamily program
 */
export function useCreateMultifamilyProgram() {
  return useMutation({
    mutationFn: async (data: InsertMultifamilyProgram) => {
      const response = await apiRequest('POST', '/api/multifamily-programs', data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: complianceKeys.multifamilyPrograms() });
    },
  });
}

/**
 * Update an existing multifamily program
 */
export function useUpdateMultifamilyProgram() {
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertMultifamilyProgram> }) => {
      const response = await apiRequest('PATCH', `/api/multifamily-programs/${id}`, data);
      return await response.json();
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: complianceKeys.multifamilyProgram(id) });
      queryClient.invalidateQueries({ queryKey: complianceKeys.multifamilyPrograms() });
    },
  });
}

/**
 * Upload a compliance artifact (document/file)
 */
export function useUploadComplianceArtifact() {
  return useMutation({
    mutationFn: async (data: InsertComplianceArtifact) => {
      const response = await apiRequest('POST', '/api/compliance/artifacts', data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: complianceKeys.artifacts() });
    },
  });
}

/**
 * Calculate benchmarking deadlines based on building size
 * Minnesota requires benchmarking for buildings >= 50,000 sqft
 */
export function useBenchmarkingDeadlines(sqft: number | null) {
  return useQuery<{ class: string; deadline: Date }>({
    queryKey: complianceKeys.benchmarkingDeadlines(sqft!),
    enabled: !!sqft && sqft >= 50000,
  });
}

/**
 * Get ENERGY STAR checklist template for specific version and certification path
 */
export function useEnergyStarChecklist(version: string | null, path: string | null) {
  return useQuery<{ id: number; name: string; items: string[] }>({
    queryKey: complianceKeys.energyStarChecklists(version!, path!),
    enabled: !!version && !!path,
  });
}

/**
 * Calculate sample size for multifamily unit testing (mutation variant)
 * Use this when you need to trigger calculation on-demand
 */
export function useCalculateSampleSize() {
  return useMutation({
    mutationFn: async (unitCount: number) => {
      const response = await apiRequest('POST', '/api/compliance/sampling/calculate', { unitCount });
      return await response.json();
    },
  });
}

/**
 * Calculate sample size for multifamily unit testing (query variant)
 * Use this for automatic calculation when unitCount changes
 * 
 * Phase 5 - HARDEN: retry: 2 configuration ensures resilience during
 * network issues common in field operations
 */
export function useSampleSize(unitCount: number | null) {
  return useQuery<{ unitCount: number; sampleSize: number; protocol: string }>({
    queryKey: complianceKeys.samplingCalculation(unitCount!),
    queryFn: async () => {
      const response = await apiRequest('POST', '/api/compliance/sampling/calculate', { unitCount });
      return await response.json();
    },
    enabled: !!unitCount && unitCount > 0,
    retry: 2,
  });
}

/**
 * Utility Functions for Compliance Badge Rendering
 */

export function getComplianceBadgeVariant(
  status: string | null | undefined
): "default" | "secondary" | "destructive" | "outline" {
  if (status === "compliant") return "default";
  if (status === "pending") return "secondary"; // Will override with className
  if (status === "non-compliant") return "destructive";
  return "outline";
}

export function getComplianceBadgeClassName(
  status: string | null | undefined
): string {
  // Pending uses yellow/warning color (secondary variant is gray by default)
  if (status === "pending") return "bg-warning text-warning-foreground border-transparent";
  return "";
}

export function getComplianceBadgeText(
  status: string | null | undefined
): string {
  if (status === "compliant") return "Compliant";
  if (status === "pending") return "Pending";
  if (status === "non-compliant") return "Non-Compliant";
  return "Unknown";
}
