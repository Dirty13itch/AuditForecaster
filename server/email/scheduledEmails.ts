import cron from 'node-cron';
import { storage } from '../storage';
import { emailService } from './emailService';
import { dailyDigestTemplate, type DailyDigestJob } from './templates/dailyDigest';
import { weeklyPerformanceSummaryTemplate } from './templates/weeklyPerformanceSummary';
import { serverLogger } from '../logger';
import { backgroundJobTracker } from '../backgroundJobTracker';

export async function startScheduledEmails() {
  // Register daily digest job
  await backgroundJobTracker.registerJob({
    jobName: 'daily_digest',
    displayName: 'Daily Digest Email',
    description: 'Send daily digest emails to users at 7:00 AM',
    schedule: '0 7 * * *',
    enabled: true,
  });

  // Register weekly performance summary job
  await backgroundJobTracker.registerJob({
    jobName: 'weekly_performance_summary',
    displayName: 'Weekly Performance Summary',
    description: 'Send weekly performance summary emails on Monday at 9:00 AM',
    schedule: '0 9 * * 1',
    enabled: true,
  });

  // Daily digest at 7:00 AM every day
  cron.schedule('0 7 * * *', async () => {
    serverLogger.info('[ScheduledEmails] Running daily digest job');
    
    await backgroundJobTracker.executeJob('daily_digest', async () => {
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

      // Get all users to send daily digests
      const allUsers = await storage.getAllUsers();
      
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

      serverLogger.info('[ScheduledEmails] Processing daily digest', {
        jobCount: digestJobs.length,
        userCount: allUsers.length,
      });

      // Send daily digest to each user who has it enabled
      for (const user of allUsers) {
        if (!user.email) {
          continue; // Skip users without email
        }
        
        const userPrefs = await storage.getEmailPreferences(user.id);
        if (userPrefs?.dailyDigest) {
          const { subject, html } = dailyDigestTemplate({
            date: today.toLocaleDateString(),
            dayOfWeek: today.toLocaleDateString('en-US', { weekday: 'long' }),
            jobs: digestJobs,
            totalJobs: digestJobs.length,
            unsubscribeUrl: `${process.env.APP_URL || 'http://localhost:3000'}/api/email-preferences/unsubscribe/${userPrefs.unsubscribeToken || user.id}`,
            recipientName: user.firstName || 'User',
          });
          
          await emailService.sendEmail(user.email, subject, html);
          serverLogger.info('[ScheduledEmails] Daily digest sent', { 
            userId: user.id, 
            email: user.email,
            jobCount: digestJobs.length 
          });
        }
      }
    });
  });

  // Weekly performance summary on Monday at 9:00 AM
  cron.schedule('0 9 * * 1', async () => {
    serverLogger.info('[ScheduledEmails] Running weekly performance summary job');
    
    await backgroundJobTracker.executeJob('weekly_performance_summary', async () => {
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
      
      const allForecasts = forecasts.flat().filter(f => f.actualAch50 !== null);
      const passCount = allForecasts.filter(f => {
        const ach50 = parseFloat(f.actualAch50?.toString() || '0');
        return ach50 <= 3.0;
      }).length;
      
      const passRate = allForecasts.length > 0 ? (passCount / allForecasts.length) * 100 : 0;
      
      const totalACH50 = allForecasts.reduce((sum, f) => {
        return sum + parseFloat(f.actualAch50?.toString() || '0');
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

      // Get all users to send weekly performance summaries
      const allUsers = await storage.getAllUsers();
      
      // Send weekly performance summary to each user who has it enabled
      for (const user of allUsers) {
        if (!user.email) {
          continue; // Skip users without email
        }
        
        const userPrefs = await storage.getEmailPreferences(user.id);
        if (userPrefs?.weeklyPerformanceSummary) {
          const weekStart = oneWeekAgo.toLocaleDateString();
          const weekEnd = today.toLocaleDateString();
          
          const { subject, html } = weeklyPerformanceSummaryTemplate({
            weekStart,
            weekEnd,
            jobsCompleted: thisWeekJobs.length,
            passRate,
            averageACH50,
            photosUploaded: thisWeekPhotos.length,
            topAchievement,
            unsubscribeUrl: `${process.env.APP_URL || 'http://localhost:3000'}/api/email-preferences/unsubscribe/${userPrefs.unsubscribeToken || user.id}`,
            recipientName: user.firstName || 'User',
          });
          
          await emailService.sendEmail(user.email, subject, html);
          serverLogger.info('[ScheduledEmails] Weekly summary sent', {
            userId: user.id,
            email: user.email,
            jobsCompleted: thisWeekJobs.length,
            passRate: passRate.toFixed(1),
          });
        }
      }
    });
  });

  serverLogger.info('[ScheduledEmails] Cron jobs initialized', {
    dailyDigest: '7:00 AM daily',
    weeklySummary: '9:00 AM Monday',
  });
}
