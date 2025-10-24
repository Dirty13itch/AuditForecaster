import cron from 'node-cron';
import { storage } from '../storage';
import { emailService } from './emailService';
import { dailyDigestTemplate, type DailyDigestJob } from './templates/dailyDigest';
import { weeklyPerformanceSummaryTemplate } from './templates/weeklyPerformanceSummary';
import { serverLogger } from '../logger';

export function startScheduledEmails() {
  // Daily digest at 7:00 AM every day
  cron.schedule('0 7 * * *', async () => {
    serverLogger.info('[ScheduledEmails] Running daily digest job');
    
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Get all jobs scheduled for today
      const todaysJobs = await storage.getScheduleEventsByDateRange(today, tomorrow);
      
      if (todaysJobs.length === 0) {
        serverLogger.info('[ScheduledEmails] No jobs scheduled for today, skipping daily digest');
        return;
      }

      // Get all users (in a real app, you'd get users assigned to these jobs)
      const users = await storage.getUser; // This is a placeholder - you'd need to get all users or users assigned to jobs
      
      // For now, we'll just log this since we don't have a way to get all users
      // In production, you'd iterate through users and send them their personalized digests
      
      const digestJobs: DailyDigestJob[] = await Promise.all(
        todaysJobs.map(async (event) => {
          const job = await storage.getJob(event.jobId);
          if (!job) return null;
          
          return {
            id: job.id,
            name: job.name,
            address: job.address,
            time: new Date(event.startTime).toLocaleTimeString('en-US', { 
              hour: 'numeric', 
              minute: '2-digit',
              hour12: true 
            }),
            contractor: job.contractor,
            inspectionType: job.inspectionType,
          };
        })
      ).then(jobs => jobs.filter((j): j is DailyDigestJob => j !== null));

      serverLogger.info('[ScheduledEmails] Daily digest would be sent', {
        jobCount: digestJobs.length,
        jobs: digestJobs,
      });

      // Note: In production, you'd get all users with dailyDigest=true and send to each
      // Example:
      // const allUsers = await getAllUsersWithDailyDigestEnabled();
      // for (const user of allUsers) {
      //   const userPrefs = await storage.getEmailPreferences(user.id);
      //   if (userPrefs?.dailyDigest) {
      //     const { subject, html } = dailyDigestTemplate({
      //       date: today.toLocaleDateString(),
      //       dayOfWeek: today.toLocaleDateString('en-US', { weekday: 'long' }),
      //       jobs: digestJobs,
      //       totalJobs: digestJobs.length,
      //       unsubscribeUrl: `${process.env.APP_URL}/api/email-preferences/unsubscribe/${userPrefs.unsubscribeToken}`,
      //       recipientName: user.firstName,
      //     });
      //     await emailService.sendEmail(user.email!, subject, html);
      //   }
      // }
      
    } catch (error) {
      serverLogger.error('[ScheduledEmails] Failed to send daily digest', { error });
    }
  });

  // Weekly performance summary on Monday at 9:00 AM
  cron.schedule('0 9 * * 1', async () => {
    serverLogger.info('[ScheduledEmails] Running weekly performance summary job');
    
    try {
      const today = new Date();
      const oneWeekAgo = new Date(today);
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      // Get all completed jobs from the past week
      const weekJobs = await storage.getJobsByStatus(['completed']);
      const thisWeekJobs = weekJobs.filter(job => {
        if (!job.completedDate) return false;
        const completedDate = new Date(job.completedDate);
        return completedDate >= oneWeekAgo && completedDate <= today;
      });

      if (thisWeekJobs.length === 0) {
        serverLogger.info('[ScheduledEmails] No completed jobs this week, skipping weekly summary');
        return;
      }

      // Calculate stats
      const forecasts = await Promise.all(
        thisWeekJobs.map(job => storage.getForecastsByJob(job.id))
      );
      
      const allForecasts = forecasts.flat().filter(f => f.actualACH50 !== null);
      const passCount = allForecasts.filter(f => {
        const ach50 = parseFloat(f.actualACH50?.toString() || '0');
        return ach50 <= 3.0;
      }).length;
      
      const passRate = allForecasts.length > 0 ? (passCount / allForecasts.length) * 100 : 0;
      
      const totalACH50 = allForecasts.reduce((sum, f) => {
        return sum + parseFloat(f.actualACH50?.toString() || '0');
      }, 0);
      const averageACH50 = allForecasts.length > 0 ? totalACH50 / allForecasts.length : 0;

      // Count photos uploaded this week
      const photos = await storage.getAllPhotos();
      const thisWeekPhotos = photos.filter(photo => {
        const uploadedDate = new Date(photo.uploadedAt);
        return uploadedDate >= oneWeekAgo && uploadedDate <= today;
      });

      // Determine top achievement
      let topAchievement = '';
      if (passRate === 100) {
        topAchievement = 'Perfect Week - 100% Pass Rate!';
      } else if (passRate >= 90) {
        topAchievement = 'Excellent Week - Outstanding Performance!';
      } else if (thisWeekJobs.length >= 10) {
        topAchievement = `High Productivity - ${thisWeekJobs.length} Jobs Completed!`;
      } else if (averageACH50 <= 2.0) {
        topAchievement = 'Superior Quality - Excellent ACH50 Average!';
      }

      serverLogger.info('[ScheduledEmails] Weekly summary stats', {
        jobsCompleted: thisWeekJobs.length,
        passRate: passRate.toFixed(1),
        averageACH50: averageACH50.toFixed(2),
        photosUploaded: thisWeekPhotos.length,
        topAchievement,
      });

      // Note: In production, you'd get all users with weeklyPerformanceSummary=true and send to each
      // Example:
      // const allUsers = await getAllUsersWithWeeklySummaryEnabled();
      // for (const user of allUsers) {
      //   const userPrefs = await storage.getEmailPreferences(user.id);
      //   if (userPrefs?.weeklyPerformanceSummary) {
      //     const weekStart = oneWeekAgo.toLocaleDateString();
      //     const weekEnd = today.toLocaleDateString();
      //     
      //     const { subject, html } = weeklyPerformanceSummaryTemplate({
      //       weekStart,
      //       weekEnd,
      //       jobsCompleted: thisWeekJobs.length,
      //       passRate,
      //       averageACH50,
      //       photosUploaded: thisWeekPhotos.length,
      //       topAchievement,
      //       unsubscribeUrl: `${process.env.APP_URL}/api/email-preferences/unsubscribe/${userPrefs.unsubscribeToken}`,
      //       recipientName: user.firstName,
      //     });
      //     
      //     await emailService.sendEmail(user.email!, subject, html);
      //   }
      // }
      
    } catch (error) {
      serverLogger.error('[ScheduledEmails] Failed to send weekly summary', { error });
    }
  });

  serverLogger.info('[ScheduledEmails] Cron jobs initialized', {
    dailyDigest: '7:00 AM daily',
    weeklySummary: '9:00 AM Monday',
  });
}
