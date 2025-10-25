import { type IStorage } from "./storage";
import { type Achievement } from "@shared/schema";
import { ACHIEVEMENT_DEFINITIONS } from "@shared/achievementDefinitions";

export async function checkAndAwardAchievements(storage: IStorage, userId: string): Promise<string[]> {
  const awardedAchievementIds: string[] = [];
  
  // Get all achievements and user's current achievements
  const allAchievements = await storage.getAllAchievements();
  const userAchievements = await storage.getUserAchievements(userId);
  const earnedIds = new Set(userAchievements.map(ua => ua.achievementId));
  
  // Get user's job data for evaluation
  const jobs = await storage.getJobsByUser(userId);
  const completedJobs = jobs.filter(job => job.status === 'completed');
  
  // Check each achievement
  for (const achievement of allAchievements) {
    // Skip if already earned
    if (earnedIds.has(achievement.id)) {
      continue;
    }
    
    const criteria = achievement.criteria as any;
    let shouldAward = false;
    
    switch (criteria.type) {
      case 'tier_achieved':
        // Check if user has achieved Elite tier (ACH50 ≤ threshold)
        shouldAward = completedJobs.some(job => {
          const ach50 = job.finalTestingMeasurements?.ach50;
          return ach50 !== null && ach50 !== undefined && ach50 <= (criteria.threshold || 1.0);
        });
        break;
        
      case 'consecutive_passing':
        // Check for consecutive passing inspections within a week (Perfect Week)
        const passingThreshold = 3.0;
        const requiredCount = criteria.consecutivePassing || 5;
        
        // Filter jobs with scheduled dates and sort
        const sortedJobs = completedJobs
          .filter(job => job.scheduledDate !== null && job.scheduledDate !== undefined)
          .sort((a, b) => a.scheduledDate!.getTime() - b.scheduledDate!.getTime());
        
        // Check for consecutive passing inspections within 7 days
        for (let i = 0; i <= sortedJobs.length - requiredCount; i++) {
          const window = sortedJobs.slice(i, i + requiredCount);
          
          // Check if all in window are passing
          const allPassing = window.every(job => {
            const ach50 = job.finalTestingMeasurements?.ach50;
            return ach50 !== null && ach50 !== undefined && ach50 <= passingThreshold;
          });
          
          if (allPassing) {
            // Check if within 7-day window
            const firstDate = window[0].scheduledDate!;
            const lastDate = window[window.length - 1].scheduledDate!;
            const daysDiff = (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24);
            
            if (daysDiff <= 7) {
              shouldAward = true;
              break;
            }
          }
        }
        break;
        
      case 'job_count':
        // Check total job count
        shouldAward = completedJobs.length >= (criteria.threshold || 100);
        break;
        
      case 'builder_jobs':
        // Check jobs for a single builder
        const builderJobCounts = new Map<string, number>();
        for (const job of completedJobs) {
          if (job.builderId) {
            builderJobCounts.set(job.builderId, (builderJobCounts.get(job.builderId) || 0) + 1);
          }
        }
        const maxBuilderJobs = Math.max(...Array.from(builderJobCounts.values()), 0);
        shouldAward = maxBuilderJobs >= (criteria.threshold || 50);
        break;
        
      case 'daily_streak':
        // Check consecutive days with inspections (ignore jobs without scheduled dates)
        const jobDates = completedJobs
          .filter(job => job.scheduledDate !== null && job.scheduledDate !== undefined)
          .map(job => job.scheduledDate!.toISOString().split('T')[0])
          .sort();
        
        const uniqueDates = Array.from(new Set(jobDates));
        let longestStreak = 1;
        let currentDayStreak = 1;
        
        if (uniqueDates.length === 0) {
          shouldAward = false;
          break;
        }
        
        for (let i = 1; i < uniqueDates.length; i++) {
          const prevDate = new Date(uniqueDates[i - 1]);
          const currDate = new Date(uniqueDates[i]);
          const dayDiff = Math.round((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
          
          if (dayDiff === 1) {
            currentDayStreak++;
            longestStreak = Math.max(longestStreak, currentDayStreak);
          } else if (dayDiff > 1) {
            currentDayStreak = 1;
          }
        }
        
        shouldAward = longestStreak >= (criteria.threshold || 5);
        break;
        
      case 'ach50_count':
        // Count jobs under specific ACH50 threshold
        const countUnderThreshold = completedJobs.filter(job => {
          const ach50 = job.finalTestingMeasurements?.ach50;
          return ach50 !== null && ach50 !== undefined && ach50 < (criteria.ach50Max || 2.0);
        }).length;
        
        shouldAward = countUnderThreshold >= (criteria.threshold || 25);
        break;
        
      case 'perfect_completion':
        // Count jobs with perfect checklist completion using batch query
        const jobIds = completedJobs.map(job => job.id);
        let perfectCount = 0;
        
        // Get all checklist items for all jobs in one batch query
        const checklistsByJob = await storage.getChecklistItemsByJobs(jobIds);
        
        for (const jobId of jobIds) {
          const checklistItems = checklistsByJob.get(jobId) || [];
          if (checklistItems.length > 0) {
            const allCompleted = checklistItems.every(item => item.completed);
            if (allCompleted) {
              perfectCount++;
            }
          }
        }
        
        shouldAward = perfectCount >= (criteria.threshold || 10);
        break;
        
      case 'daily_count':
        // Check for X inspections in a single day
        const jobsByDate = new Map<string, number>();
        for (const job of completedJobs) {
          if (job.scheduledDate) {
            const dateKey = job.scheduledDate.toISOString().split('T')[0];
            jobsByDate.set(dateKey, (jobsByDate.get(dateKey) || 0) + 1);
          }
        }
        const maxInDay = Math.max(...Array.from(jobsByDate.values()), 0);
        shouldAward = maxInDay >= (criteria.threshold || 5);
        break;
    }
    
    if (shouldAward) {
      await storage.awardAchievement(userId, achievement.id);
      awardedAchievementIds.push(achievement.id);
    }
  }
  
  return awardedAchievementIds;
}
