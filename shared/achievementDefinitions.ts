// Achievement type definitions and criteria

export type AchievementType = 
  | 'first_elite'
  | 'perfect_week'
  | 'hundred_jobs'
  | 'top_builder'
  | 'streak_5'
  | 'streak_10'
  | 'under_2_ach50'
  | 'thirty_day_streak'
  | 'perfectionist'
  | 'speed_demon';

export interface AchievementCriteria {
  type: string;
  threshold?: number;
  countField?: string;
  ach50Max?: number;
  consecutivePassing?: number;
}

export interface AchievementDefinition {
  id: string;
  name: string;
  description: string;
  type: AchievementType;
  iconName: string;
  criteria: AchievementCriteria;
  tier?: 'bronze' | 'silver' | 'gold' | 'platinum';
}

// Predefined achievement definitions
export const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  {
    id: 'first_elite',
    name: 'Elite Performer',
    description: 'Achieve your first Elite tier rating (ACH50 ≤ 1.0)',
    type: 'first_elite',
    iconName: 'Trophy',
    criteria: { type: 'tier_achieved', threshold: 1.0 },
    tier: 'gold',
  },
  {
    id: 'perfect_week',
    name: 'Perfect Week',
    description: 'Complete 5 consecutive passing inspections (ACH50 ≤ 3.0) in one week',
    type: 'perfect_week',
    iconName: 'Calendar',
    criteria: { type: 'consecutive_passing', consecutivePassing: 5 },
    tier: 'silver',
  },
  {
    id: 'hundred_jobs',
    name: 'Century',
    description: 'Complete 100 total inspections',
    type: 'hundred_jobs',
    iconName: 'Target',
    criteria: { type: 'job_count', threshold: 100 },
    tier: 'gold',
  },
  {
    id: 'top_builder',
    name: 'Builder Champion',
    description: 'Inspect 50 jobs for a single builder',
    type: 'top_builder',
    iconName: 'Building2',
    criteria: { type: 'builder_jobs', threshold: 50 },
    tier: 'silver',
  },
  {
    id: 'streak_5',
    name: 'On a Roll',
    description: 'Maintain a 5-day consecutive inspection streak',
    type: 'streak_5',
    iconName: 'Flame',
    criteria: { type: 'daily_streak', threshold: 5 },
    tier: 'bronze',
  },
  {
    id: 'streak_10',
    name: 'Unstoppable',
    description: 'Maintain a 10-day consecutive inspection streak',
    type: 'streak_10',
    iconName: 'Zap',
    criteria: { type: 'daily_streak', threshold: 10 },
    tier: 'silver',
  },
  {
    id: 'under_2_ach50',
    name: 'Excellence Standard',
    description: 'Complete 25 inspections with ACH50 under 2.0',
    type: 'under_2_ach50',
    iconName: 'Award',
    criteria: { type: 'ach50_count', threshold: 25, ach50Max: 2.0 },
    tier: 'gold',
  },
  {
    id: 'thirty_day_streak',
    name: 'Marathon Runner',
    description: 'Maintain a 30-day consecutive inspection streak',
    type: 'thirty_day_streak',
    iconName: 'TrendingUp',
    criteria: { type: 'daily_streak', threshold: 30 },
    tier: 'platinum',
  },
  {
    id: 'perfectionist',
    name: 'Perfectionist',
    description: 'Complete 10 inspections with perfect checklist completion (100%)',
    type: 'perfectionist',
    iconName: 'CheckCircle2',
    criteria: { type: 'perfect_completion', threshold: 10 },
    tier: 'gold',
  },
  {
    id: 'speed_demon',
    name: 'Speed Demon',
    description: 'Complete 5 inspections in a single day',
    type: 'speed_demon',
    iconName: 'Rocket',
    criteria: { type: 'daily_count', threshold: 5 },
    tier: 'silver',
  },
];
