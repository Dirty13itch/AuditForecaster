import { differenceInDays, startOfDay, format, isWeekend } from "date-fns";

export interface StreakType {
  id: string;
  name: string;
  description: string;
  icon: string;
  checkCondition: (data: any) => boolean;
}

export interface StreakData {
  type: string;
  current: number;
  best: number;
  lastDate: string;
  startDate: string;
  frozen: boolean;
  freezeTokensUsed: number;
  freezeTokensAvailable: number;
}

export interface StreakEvent {
  type: string;
  date: Date;
  value?: number;
  metadata?: any;
}

export const streakTypes: StreakType[] = [
  {
    id: 'daily_inspection',
    name: 'Daily Inspection Streak',
    description: 'Complete at least one inspection every day',
    icon: 'Flame',
    checkCondition: (data) => data.inspectionsCompleted > 0
  },
  {
    id: 'quality_streak',
    name: 'Quality Streak',
    description: 'Maintain 90%+ QA score on consecutive inspections',
    icon: 'Star',
    checkCondition: (data) => data.qaScore >= 90
  },
  {
    id: 'on_time_streak',
    name: 'On-Time Streak',
    description: 'Complete inspections on schedule',
    icon: 'Clock',
    checkCondition: (data) => data.completedOnTime === true
  },
  {
    id: 'zero_defect_streak',
    name: 'Zero Defect Streak',
    description: 'Complete inspections without any issues',
    icon: 'ShieldCheck',
    checkCondition: (data) => data.defectCount === 0
  },
  {
    id: 'early_bird_streak',
    name: 'Early Bird Streak',
    description: 'Start work before 7 AM',
    icon: 'Sunrise',
    checkCondition: (data) => {
      const startHour = new Date(data.startTime).getHours();
      return startHour < 7;
    }
  },
  {
    id: 'photo_documentation_streak',
    name: 'Photo Documentation Streak',
    description: 'Upload photos every inspection day',
    icon: 'Camera',
    checkCondition: (data) => data.photosUploaded > 0
  }
];

class StreakTracker {
  private streaks: Map<string, StreakData> = new Map();
  private userId: string | null = null;

  // Initialize streak tracker for a user
  async initialize(userId: string) {
    this.userId = userId;
    await this.loadStreaks();
  }

  // Load streaks from server
  private async loadStreaks() {
    if (!this.userId) return;

    try {
      const response = await fetch(`/api/streaks/${this.userId}`);
      if (response.ok) {
        const data = await response.json();
        this.streaks.clear();
        data.forEach((streak: StreakData) => {
          this.streaks.set(streak.type, streak);
        });
      }
    } catch (error) {
      // Failed to load streaks - will retry on next event
    }
  }

  // Track a streak event
  async trackEvent(event: StreakEvent) {
    if (!this.userId) return;

    const streakType = streakTypes.find(t => t.id === event.type);
    if (!streakType) return;

    const streak = this.getOrCreateStreak(event.type);
    const today = startOfDay(new Date());
    const lastDate = streak.lastDate ? startOfDay(new Date(streak.lastDate)) : null;

    // Check if event meets streak condition
    const conditionMet = streakType.checkCondition(event.metadata || {});

    if (conditionMet) {
      if (!lastDate) {
        // First event in streak
        streak.current = 1;
        streak.startDate = today.toISOString();
        streak.lastDate = today.toISOString();
      } else {
        const daysDiff = differenceInDays(today, lastDate);

        if (daysDiff === 0) {
          // Already tracked today, update lastDate
          streak.lastDate = today.toISOString();
        } else if (daysDiff === 1) {
          // Consecutive day, increment streak
          streak.current++;
          streak.lastDate = today.toISOString();
        } else if (daysDiff > 1) {
          // Streak broken, check for freeze token
          if (streak.frozen && streak.freezeTokensAvailable > 0 && daysDiff === 2) {
            // Use freeze token
            streak.current++;
            streak.lastDate = today.toISOString();
            streak.freezeTokensUsed++;
            streak.freezeTokensAvailable--;
            streak.frozen = false;
          } else {
            // Streak broken, restart
            streak.current = 1;
            streak.startDate = today.toISOString();
            streak.lastDate = today.toISOString();
          }
        }
      }

      // Update best streak if current is higher
      if (streak.current > streak.best) {
        streak.best = streak.current;
      }

      // Save streak to server
      await this.saveStreak(streak);
    } else {
      // Condition not met, potentially break the streak
      if (lastDate) {
        const daysDiff = differenceInDays(today, lastDate);
        if (daysDiff >= 1) {
          // Check if we can use a freeze token
          if (streak.freezeTokensAvailable > 0 && !streak.frozen) {
            streak.frozen = true;
          } else if (daysDiff > 1 || (daysDiff === 1 && !streak.frozen)) {
            // Streak broken
            streak.current = 0;
            await this.saveStreak(streak);
          }
        }
      }
    }

    this.streaks.set(event.type, streak);
  }

  // Get or create a streak
  private getOrCreateStreak(type: string): StreakData {
    if (this.streaks.has(type)) {
      return this.streaks.get(type)!;
    }

    const newStreak: StreakData = {
      type,
      current: 0,
      best: 0,
      lastDate: '',
      startDate: '',
      frozen: false,
      freezeTokensUsed: 0,
      freezeTokensAvailable: 3 // Start with 3 freeze tokens
    };

    this.streaks.set(type, newStreak);
    return newStreak;
  }

  // Save streak to server
  private async saveStreak(streak: StreakData) {
    if (!this.userId) return;

    try {
      await fetch(`/api/streaks/${this.userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(streak)
      });
    } catch (error) {
      // Failed to save streak - will retry on next event
    }
  }

  // Get all streaks
  getStreaks(): StreakData[] {
    return Array.from(this.streaks.values());
  }

  // Get specific streak
  getStreak(type: string): StreakData | undefined {
    return this.streaks.get(type);
  }

  // Use a freeze token
  async useFreeze(streakType: string): Promise<boolean> {
    const streak = this.streaks.get(streakType);
    if (!streak || streak.freezeTokensAvailable <= 0) {
      return false;
    }

    streak.frozen = true;
    streak.freezeTokensUsed++;
    streak.freezeTokensAvailable--;

    await this.saveStreak(streak);
    return true;
  }

  // Add freeze tokens (e.g., as a reward)
  async addFreezeTokens(streakType: string, count: number) {
    const streak = this.getOrCreateStreak(streakType);
    streak.freezeTokensAvailable += count;
    await this.saveStreak(streak);
  }

  // Get streaks that are at risk (haven't been updated today)
  getAtRiskStreaks(): StreakData[] {
    const today = startOfDay(new Date());
    const atRisk: StreakData[] = [];

    this.streaks.forEach(streak => {
      if (streak.current > 0) {
        const lastDate = startOfDay(new Date(streak.lastDate));
        const daysDiff = differenceInDays(today, lastDate);
        
        if (daysDiff >= 1 && !streak.frozen) {
          atRisk.push(streak);
        }
      }
    });

    return atRisk;
  }

  // Get streak statistics
  getStatistics() {
    const stats = {
      totalStreaks: this.streaks.size,
      activeStreaks: 0,
      longestStreak: 0,
      totalDaysStreaked: 0,
      frozenStreaks: 0,
      totalFreezeTokensUsed: 0
    };

    this.streaks.forEach(streak => {
      if (streak.current > 0) {
        stats.activeStreaks++;
      }
      if (streak.best > stats.longestStreak) {
        stats.longestStreak = streak.best;
      }
      stats.totalDaysStreaked += streak.current;
      if (streak.frozen) {
        stats.frozenStreaks++;
      }
      stats.totalFreezeTokensUsed += streak.freezeTokensUsed;
    });

    return stats;
  }

  // Generate heat map data for calendar view
  generateHeatMapData(streakType: string, days: number = 365): Array<{ date: string; value: number }> {
    const streak = this.streaks.get(streakType);
    if (!streak || !streak.startDate) {
      return [];
    }

    const heatMapData: Array<{ date: string; value: number }> = [];
    const startDate = new Date(streak.startDate);
    const today = new Date();

    // Generate data for each day
    for (let d = new Date(startDate); d <= today; d.setDate(d.getDate() + 1)) {
      const dateStr = format(d, 'yyyy-MM-dd');
      // For simplicity, we'll assume the streak was active every day between start and last
      // In a real implementation, you'd track individual days
      heatMapData.push({
        date: dateStr,
        value: 1 // 1 = active, 0 = inactive
      });
    }

    return heatMapData;
  }
}

// Create singleton instance
export const streakTracker = new StreakTracker();

// Helper function to get streak icon
export function getStreakIcon(streakType: string): string {
  const type = streakTypes.find(t => t.id === streakType);
  return type?.icon || 'Flame';
}

// Helper function to get streak color based on length
export function getStreakColor(days: number): string {
  if (days === 0) return 'text-muted-foreground';
  if (days < 7) return 'text-orange-500';
  if (days < 30) return 'text-yellow-500';
  if (days < 100) return 'text-green-500';
  return 'text-purple-500';
}

// Helper function to get streak badge
export function getStreakBadge(days: number): string {
  if (days === 0) return '';
  if (days < 7) return '🔥';
  if (days < 30) return '🔥🔥';
  if (days < 100) return '🔥🔥🔥';
  return '🔥🔥🔥🔥';
}