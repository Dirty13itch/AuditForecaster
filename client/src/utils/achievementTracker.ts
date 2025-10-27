import { queryClient } from "@/lib/queryClient";
import { achievementDefinitions, type AchievementDefinition } from "@/data/achievementDefinitions";
import { toast } from "@/hooks/use-toast";

export interface UserProgress {
  userId: string;
  totalXP: number;
  level: number;
  achievements: string[]; // Achievement IDs that are unlocked
  stats: Record<string, number>; // Tracked statistics
  streaks: Record<string, StreakData>;
}

export interface StreakData {
  current: number;
  best: number;
  lastDate: string;
  frozen: boolean;
}

export interface AchievementProgress {
  achievementId: string;
  progress: number; // Percentage 0-100
  currentValue: number;
  targetValue: number;
  unlocked: boolean;
  unlockedAt?: string;
}

class AchievementTracker {
  private eventListeners: Map<string, Function[]> = new Map();
  private userProgress: UserProgress | null = null;
  private progressCache: Map<string, AchievementProgress> = new Map();

  // Initialize tracker for a user
  async initialize(userId: string) {
    try {
      const response = await fetch(`/api/achievements/user/${userId}`);
      if (response.ok) {
        const data = await response.json();
        this.userProgress = data;
        this.calculateAllProgress();
      }
    } catch (error) {
      // Failed to initialize achievement tracker - will retry on next user action
    }
  }

  // Track an event that might trigger achievements
  async trackEvent(eventType: string, value: number = 1, metadata?: any) {
    if (!this.userProgress) return;

    // Update local stats
    if (!this.userProgress.stats[eventType]) {
      this.userProgress.stats[eventType] = 0;
    }
    this.userProgress.stats[eventType] += value;

    // Check for achievement unlocks
    const newUnlocks = await this.checkAchievements(eventType);
    
    // Process any new unlocks
    for (const achievement of newUnlocks) {
      await this.unlockAchievement(achievement);
    }

    // Emit event to listeners
    this.emitEvent(eventType, value, metadata);
  }

  // Check if any achievements should be unlocked
  private async checkAchievements(eventType: string): Promise<AchievementDefinition[]> {
    const newUnlocks: AchievementDefinition[] = [];

    for (const achievement of achievementDefinitions) {
      // Skip if already unlocked
      if (this.userProgress?.achievements.includes(achievement.id)) continue;

      // Check if this achievement is relevant to the event
      const relevantRequirements = achievement.requirements.filter(
        req => req.type === eventType || this.isRelatedEvent(req.type, eventType)
      );

      if (relevantRequirements.length === 0) continue;

      // Check if all requirements are met
      const isMet = this.checkRequirements(achievement);
      if (isMet) {
        newUnlocks.push(achievement);
      }
    }

    return newUnlocks;
  }

  // Check if all requirements for an achievement are met
  private checkRequirements(achievement: AchievementDefinition): boolean {
    if (!this.userProgress) return false;

    for (const req of achievement.requirements) {
      const currentValue = this.getStatValue(req.type, req.aggregation, req.timeframe);
      
      switch (req.aggregation) {
        case 'min':
          if (currentValue >= req.value) return false;
          break;
        case 'max':
          if (currentValue <= req.value) return false;
          break;
        default:
          if (currentValue < req.value) return false;
      }
    }

    return true;
  }

  // Get aggregated stat value based on requirements
  private getStatValue(
    statType: string, 
    aggregation?: string, 
    timeframe?: string
  ): number {
    if (!this.userProgress) return 0;

    // For timeframe-based stats, we'd need to fetch from the server
    // For now, we'll use the cached stats
    const value = this.userProgress.stats[statType] || 0;

    // Apply aggregation if needed
    if (aggregation === 'average') {
      const count = this.userProgress.stats[`${statType}_count`] || 1;
      return value / count;
    }

    return value;
  }

  // Unlock an achievement
  private async unlockAchievement(achievement: AchievementDefinition) {
    if (!this.userProgress) return;

    try {
      const response = await fetch('/api/achievements/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: this.userProgress.userId,
          achievementId: achievement.id,
          achievementType: achievement.category,
          xpReward: achievement.xpReward
        })
      });

      if (response.ok) {
        // Update local state
        this.userProgress.achievements.push(achievement.id);
        this.userProgress.totalXP += achievement.xpReward;

        // Show notification
        this.showUnlockNotification(achievement);

        // Invalidate queries
        queryClient.invalidateQueries({ queryKey: ['/api/achievements'] });
        queryClient.invalidateQueries({ queryKey: ['/api/leaderboard'] });
      }
    } catch (error) {
      // Failed to unlock achievement - will retry on next trigger
    }
  }

  // Show achievement unlock notification
  private showUnlockNotification(achievement: AchievementDefinition) {
    toast({
      title: "🎉 Achievement Unlocked!",
      description: `${achievement.name} - ${achievement.unlockMessage} (+${achievement.xpReward} XP)`,
      duration: 5000,
    });

    // Trigger confetti if available
    if (typeof window !== 'undefined' && (window as any).confetti) {
      (window as any).confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
  }

  // Calculate progress for all achievements
  calculateAllProgress(): Map<string, AchievementProgress> {
    this.progressCache.clear();

    for (const achievement of achievementDefinitions) {
      const progress = this.calculateAchievementProgress(achievement);
      this.progressCache.set(achievement.id, progress);
    }

    return this.progressCache;
  }

  // Calculate progress for a single achievement
  calculateAchievementProgress(achievement: AchievementDefinition): AchievementProgress {
    const isUnlocked = this.userProgress?.achievements.includes(achievement.id) || false;
    
    if (isUnlocked) {
      return {
        achievementId: achievement.id,
        progress: 100,
        currentValue: achievement.requirements[0].value,
        targetValue: achievement.requirements[0].value,
        unlocked: true,
        unlockedAt: this.getUnlockDate(achievement.id)
      };
    }

    // Calculate progress based on primary requirement
    const mainReq = achievement.requirements[0];
    const currentValue = this.getStatValue(mainReq.type, mainReq.aggregation, mainReq.timeframe);
    const targetValue = mainReq.value;
    const progress = Math.min((currentValue / targetValue) * 100, 99.9); // Cap at 99.9% if not unlocked

    return {
      achievementId: achievement.id,
      progress,
      currentValue,
      targetValue,
      unlocked: false
    };
  }

  // Get unlock date for an achievement
  private getUnlockDate(achievementId: string): string | undefined {
    // This would come from the server data
    // For now, return undefined
    return undefined;
  }

  // Check if events are related
  private isRelatedEvent(requirementType: string, eventType: string): boolean {
    const relatedEvents: Record<string, string[]> = {
      'inspections_completed': ['job_completed', 'inspection_finished'],
      'perfect_qa_scores': ['qa_score_perfect', 'qa_score_100'],
      'photos_taken': ['photo_uploaded', 'photo_captured'],
      'photos_annotated': ['photo_annotated', 'annotation_saved'],
      'low_ach_tests': ['blower_door_completed', 'ach50_recorded'],
      'multipoint_tests': ['multipoint_test_completed'],
      'homes_certified': ['tax_credit_certified', '45l_approved'],
      'credits_generated': ['tax_credit_value_added'],
      'templates_created': ['template_saved', 'report_template_created']
    };

    return relatedEvents[requirementType]?.includes(eventType) || false;
  }

  // Event listener management
  addEventListener(eventType: string, callback: Function) {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, []);
    }
    this.eventListeners.get(eventType)?.push(callback);
  }

  removeEventListener(eventType: string, callback: Function) {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emitEvent(eventType: string, value: number, metadata?: any) {
    const listeners = this.eventListeners.get(eventType) || [];
    for (const listener of listeners) {
      listener(value, metadata);
    }
  }

  // Get current user progress
  getUserProgress(): UserProgress | null {
    return this.userProgress;
  }

  // Get progress for specific achievement
  getAchievementProgress(achievementId: string): AchievementProgress | undefined {
    return this.progressCache.get(achievementId);
  }

  // Get achievements by progress status
  getAchievementsByStatus(status: 'locked' | 'in_progress' | 'unlocked'): AchievementDefinition[] {
    const results: AchievementDefinition[] = [];

    for (const achievement of achievementDefinitions) {
      const progress = this.progressCache.get(achievement.id);
      if (!progress) continue;

      if (status === 'unlocked' && progress.unlocked) {
        results.push(achievement);
      } else if (status === 'in_progress' && !progress.unlocked && progress.progress > 0) {
        results.push(achievement);
      } else if (status === 'locked' && !progress.unlocked && progress.progress === 0) {
        results.push(achievement);
      }
    }

    return results;
  }

  // Get next achievable milestones
  getNextAchievables(limit: number = 3): AchievementDefinition[] {
    const inProgress = achievementDefinitions
      .filter(a => {
        const progress = this.progressCache.get(a.id);
        return progress && !progress.unlocked && progress.progress > 0;
      })
      .sort((a, b) => {
        const progressA = this.progressCache.get(a.id)?.progress || 0;
        const progressB = this.progressCache.get(b.id)?.progress || 0;
        return progressB - progressA; // Sort by highest progress
      });

    return inProgress.slice(0, limit);
  }
}

// Create singleton instance
export const achievementTracker = new AchievementTracker();

// Helper hooks for React components
export function useAchievementProgress(achievementId: string): AchievementProgress | undefined {
  return achievementTracker.getAchievementProgress(achievementId);
}

export function useUserProgress(): UserProgress | null {
  return achievementTracker.getUserProgress();
}