export interface TierDistribution {
  tier: string;
  count: number;
  percentage: number;
  color: string;
}

export interface MonthlyHighlight {
  label: string;
  value: string | number;
  type: 'success' | 'info' | 'warning';
}

export interface DashboardSummary {
  totalInspections: number;
  averageACH50: number;
  tierDistribution: TierDistribution[];
  passRate: number;
  failRate: number;
  tax45LEligibleCount: number;
  totalPotentialTaxCredits: number;
  monthlyHighlights: MonthlyHighlight[];
}

export interface BuilderLeaderboardEntry {
  builderId: string;
  builderName: string;
  averageACH50: number;
  tier: string;
  totalJobs: number;
  passRate: number;
  bestACH50: number;
  latestACH50: number | null;
  tierDistribution: TierDistribution[];
}

export type TierName = 'Elite' | 'Excellent' | 'Very Good' | 'Good' | 'Passing' | 'Failing';

export interface TierConfig {
  name: TierName;
  min: number;
  max: number;
  color: string;
}

export const TIER_CONFIGS: TierConfig[] = [
  { name: 'Elite', min: 0.5, max: 1.0, color: '#0B7285' },
  { name: 'Excellent', min: 1.0, max: 1.5, color: '#2E8B57' },
  { name: 'Very Good', min: 1.5, max: 2.0, color: '#3FA34D' },
  { name: 'Good', min: 2.0, max: 2.5, color: '#A0C34E' },
  { name: 'Passing', min: 2.5, max: 3.0, color: '#FFC107' },
  { name: 'Failing', min: 3.0, max: Infinity, color: '#DC3545' },
];

export function calculateTier(ach50: number): TierName {
  if (ach50 <= 1.0) return 'Elite';
  if (ach50 <= 1.5) return 'Excellent';
  if (ach50 <= 2.0) return 'Very Good';
  if (ach50 <= 2.5) return 'Good';
  if (ach50 <= 3.0) return 'Passing';
  return 'Failing';
}

export function getTierColor(tier: TierName): string {
  const config = TIER_CONFIGS.find(t => t.name === tier);
  return config?.color || '#6C757D';
}
