export type AchievementRarity = 'common' | 'rare' | 'epic' | 'legendary';
export type AchievementCategory = 
  | 'inspection' 
  | 'quality' 
  | 'speed' 
  | 'blower_door' 
  | 'tax_credit' 
  | 'photo' 
  | 'team';

export interface AchievementDefinition {
  id: string;
  name: string;
  description: string;
  category: AchievementCategory;
  rarity: AchievementRarity;
  xpReward: number;
  icon: string; // Lucide icon name
  requirements: {
    type: string;
    value: number;
    aggregation?: 'count' | 'sum' | 'average' | 'max' | 'min';
    timeframe?: 'all_time' | 'monthly' | 'weekly' | 'daily';
  }[];
  unlockMessage: string;
}

export const achievementDefinitions: AchievementDefinition[] = [
  // Inspection Milestones
  {
    id: 'first_timer',
    name: 'First Timer',
    description: 'Complete your first inspection',
    category: 'inspection',
    rarity: 'common',
    xpReward: 50,
    icon: 'Trophy',
    requirements: [
      { type: 'inspections_completed', value: 1, aggregation: 'count' }
    ],
    unlockMessage: 'Welcome to the team! You\'ve completed your first inspection!'
  },
  {
    id: 'centurion',
    name: 'Centurion',
    description: 'Complete 100 inspections',
    category: 'inspection',
    rarity: 'rare',
    xpReward: 200,
    icon: 'Award',
    requirements: [
      { type: 'inspections_completed', value: 100, aggregation: 'count' }
    ],
    unlockMessage: 'Incredible milestone! 100 inspections completed!'
  },
  {
    id: 'thousand_club',
    name: 'Thousand Club',
    description: 'Complete 1000 inspections',
    category: 'inspection',
    rarity: 'legendary',
    xpReward: 500,
    icon: 'Crown',
    requirements: [
      { type: 'inspections_completed', value: 1000, aggregation: 'count' }
    ],
    unlockMessage: 'You\'re a legend! 1000 inspections completed!'
  },

  // Quality Achievements
  {
    id: 'perfectionist',
    name: 'Perfectionist',
    description: 'Complete 10 inspections with 100% QA score',
    category: 'quality',
    rarity: 'rare',
    xpReward: 150,
    icon: 'CheckCircle',
    requirements: [
      { type: 'perfect_qa_scores', value: 10, aggregation: 'count' }
    ],
    unlockMessage: 'Perfection achieved! 10 flawless inspections!'
  },
  {
    id: 'quality_champion',
    name: 'Quality Champion',
    description: 'Maintain above 90% average QA score for 30 days',
    category: 'quality',
    rarity: 'epic',
    xpReward: 300,
    icon: 'Medal',
    requirements: [
      { type: 'qa_average', value: 90, aggregation: 'average', timeframe: 'monthly' }
    ],
    unlockMessage: 'Outstanding quality! 30 days of excellence!'
  },
  {
    id: 'zero_defects',
    name: 'Zero Defects',
    description: 'Complete 50 inspections without any issues',
    category: 'quality',
    rarity: 'epic',
    xpReward: 250,
    icon: 'ShieldCheck',
    requirements: [
      { type: 'inspections_no_issues', value: 50, aggregation: 'count' }
    ],
    unlockMessage: 'Flawless execution! 50 perfect inspections!'
  },

  // Speed Achievements
  {
    id: 'speed_demon',
    name: 'Speed Demon',
    description: 'Complete an inspection under 2 hours',
    category: 'speed',
    rarity: 'common',
    xpReward: 75,
    icon: 'Zap',
    requirements: [
      { type: 'inspection_duration_minutes', value: 120, aggregation: 'min' }
    ],
    unlockMessage: 'Lightning fast! Inspection completed in record time!'
  },
  {
    id: 'early_bird',
    name: 'Early Bird',
    description: 'Start 10 inspections before 7 AM',
    category: 'speed',
    rarity: 'rare',
    xpReward: 100,
    icon: 'Sunrise',
    requirements: [
      { type: 'early_starts', value: 10, aggregation: 'count' }
    ],
    unlockMessage: 'The early bird gets the worm! 10 early starts!'
  },
  {
    id: 'weekend_warrior',
    name: 'Weekend Warrior',
    description: 'Complete 10 weekend inspections',
    category: 'speed',
    rarity: 'rare',
    xpReward: 125,
    icon: 'Calendar',
    requirements: [
      { type: 'weekend_inspections', value: 10, aggregation: 'count' }
    ],
    unlockMessage: 'Dedication pays off! 10 weekend inspections completed!'
  },

  // Blower Door Mastery
  {
    id: 'ach_master',
    name: 'ACH Master',
    description: 'Complete 10 tests with ACH50 under 3.0',
    category: 'blower_door',
    rarity: 'rare',
    xpReward: 175,
    icon: 'Wind',
    requirements: [
      { type: 'low_ach_tests', value: 10, aggregation: 'count' }
    ],
    unlockMessage: 'Master of air tightness! 10 excellent test results!'
  },
  {
    id: 'precision_expert',
    name: 'Precision Expert',
    description: 'Complete 5 multi-point blower door tests',
    category: 'blower_door',
    rarity: 'epic',
    xpReward: 200,
    icon: 'Target',
    requirements: [
      { type: 'multipoint_tests', value: 5, aggregation: 'count' }
    ],
    unlockMessage: 'Precision perfected! 5 multi-point tests completed!'
  },
  {
    id: 'tight_house_hunter',
    name: 'Tight House Hunter',
    description: 'Find a home with ACH50 under 2.0',
    category: 'blower_door',
    rarity: 'legendary',
    xpReward: 300,
    icon: 'Home',
    requirements: [
      { type: 'ultra_low_ach', value: 1, aggregation: 'count' }
    ],
    unlockMessage: 'Incredible find! Ultra-tight home discovered!'
  },

  // 45L Tax Credit
  {
    id: 'tax_credit_hero',
    name: 'Tax Credit Hero',
    description: 'Certify 10 homes for tax credits',
    category: 'tax_credit',
    rarity: 'rare',
    xpReward: 200,
    icon: 'DollarSign',
    requirements: [
      { type: 'homes_certified', value: 10, aggregation: 'count' }
    ],
    unlockMessage: 'Tax credit champion! 10 homes certified!'
  },
  {
    id: 'million_dollar_club',
    name: 'Million Dollar Club',
    description: 'Generate $2.5M in tax credits',
    category: 'tax_credit',
    rarity: 'legendary',
    xpReward: 500,
    icon: 'TrendingUp',
    requirements: [
      { type: 'credits_generated', value: 2500000, aggregation: 'sum' }
    ],
    unlockMessage: 'Incredible impact! $2.5M in tax credits generated!'
  },
  {
    id: 'perfect_paperwork',
    name: 'Perfect Paperwork',
    description: 'Submit 25 error-free tax credit applications',
    category: 'tax_credit',
    rarity: 'epic',
    xpReward: 250,
    icon: 'FileCheck',
    requirements: [
      { type: 'perfect_submissions', value: 25, aggregation: 'count' }
    ],
    unlockMessage: 'Paperwork perfection! 25 flawless submissions!'
  },

  // Photo Documentation
  {
    id: 'shutterbug',
    name: 'Shutterbug',
    description: 'Take 1000 inspection photos',
    category: 'photo',
    rarity: 'rare',
    xpReward: 150,
    icon: 'Camera',
    requirements: [
      { type: 'photos_taken', value: 1000, aggregation: 'count' }
    ],
    unlockMessage: 'Picture perfect! 1000 photos captured!'
  },
  {
    id: 'annotation_pro',
    name: 'Annotation Pro',
    description: 'Annotate 500 photos',
    category: 'photo',
    rarity: 'epic',
    xpReward: 200,
    icon: 'Edit',
    requirements: [
      { type: 'photos_annotated', value: 500, aggregation: 'count' }
    ],
    unlockMessage: 'Documentation expert! 500 photos annotated!'
  },
  {
    id: 'ocr_wizard',
    name: 'OCR Wizard',
    description: 'Successfully extract text from 100 photos',
    category: 'photo',
    rarity: 'epic',
    xpReward: 225,
    icon: 'ScanText',
    requirements: [
      { type: 'ocr_extractions', value: 100, aggregation: 'count' }
    ],
    unlockMessage: 'Data extraction master! 100 successful OCR extractions!'
  },

  // Team Player
  {
    id: 'mentor',
    name: 'Mentor',
    description: 'Train 3 new inspectors',
    category: 'team',
    rarity: 'epic',
    xpReward: 300,
    icon: 'Users',
    requirements: [
      { type: 'inspectors_trained', value: 3, aggregation: 'count' }
    ],
    unlockMessage: 'Leadership excellence! 3 inspectors trained!'
  },
  {
    id: 'helpful_hand',
    name: 'Helpful Hand',
    description: 'Assist on 20 inspections',
    category: 'team',
    rarity: 'rare',
    xpReward: 150,
    icon: 'HandshakeIcon',
    requirements: [
      { type: 'inspections_assisted', value: 20, aggregation: 'count' }
    ],
    unlockMessage: 'Team player! 20 inspections assisted!'
  },
  {
    id: 'knowledge_sharer',
    name: 'Knowledge Sharer',
    description: 'Create 10 report templates',
    category: 'team',
    rarity: 'epic',
    xpReward: 250,
    icon: 'BookOpen',
    requirements: [
      { type: 'templates_created', value: 10, aggregation: 'count' }
    ],
    unlockMessage: 'Knowledge shared! 10 templates created!'
  }
];

// Helper function to get achievements by category
export function getAchievementsByCategory(category: AchievementCategory): AchievementDefinition[] {
  return achievementDefinitions.filter(a => a.category === category);
}

// Helper function to get achievement by ID
export function getAchievementById(id: string): AchievementDefinition | undefined {
  return achievementDefinitions.find(a => a.id === id);
}

// Helper function to calculate XP for level
export function calculateLevelFromXP(totalXP: number): { level: number; currentXP: number; nextLevelXP: number; progress: number } {
  let level = 1;
  let xpForCurrentLevel = 0;
  let xpForNextLevel = 100; // Level 1 requires 100 XP
  
  while (totalXP >= xpForNextLevel) {
    level++;
    xpForCurrentLevel = xpForNextLevel;
    // Exponential curve: each level requires 50 more XP than the previous increment
    xpForNextLevel = xpForCurrentLevel + (level * 50) + 50;
  }
  
  const currentXP = totalXP - xpForCurrentLevel;
  const xpNeeded = xpForNextLevel - xpForCurrentLevel;
  const progress = (currentXP / xpNeeded) * 100;
  
  return {
    level,
    currentXP,
    nextLevelXP: xpNeeded,
    progress
  };
}

// Helper function to get level title
export function getLevelTitle(level: number): string {
  if (level <= 5) return 'Novice Inspector';
  if (level <= 10) return 'Apprentice Inspector';
  if (level <= 20) return 'Journeyman Inspector';
  if (level <= 30) return 'Expert Inspector';
  if (level <= 40) return 'Master Inspector';
  if (level <= 50) return 'Senior Master';
  return 'Legendary Inspector';
}

// Helper function to get rarity color
export function getRarityColor(rarity: AchievementRarity): string {
  switch (rarity) {
    case 'common': return 'text-gray-600 dark:text-gray-400';
    case 'rare': return 'text-blue-600 dark:text-blue-400';
    case 'epic': return 'text-purple-600 dark:text-purple-400';
    case 'legendary': return 'text-yellow-600 dark:text-yellow-400';
  }
}

// Helper function to get rarity background
export function getRarityBackground(rarity: AchievementRarity): string {
  switch (rarity) {
    case 'common': return 'bg-gray-100 dark:bg-gray-800';
    case 'rare': return 'bg-blue-100 dark:bg-blue-900';
    case 'epic': return 'bg-purple-100 dark:bg-purple-900';
    case 'legendary': return 'bg-yellow-100 dark:bg-yellow-900';
  }
}