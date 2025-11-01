import { storage } from "./storage";
import { serverLogger } from "./logger";
import type { InsertBackgroundJob } from "@shared/schema";
import { backgroundJobExecutions, backgroundJobDuration, backgroundJobErrors } from "./metrics";

export class BackgroundJobTracker {
  private static instance: BackgroundJobTracker;
  private jobs: Map<string, InsertBackgroundJob> = new Map();

  private constructor() {}

  static getInstance(): BackgroundJobTracker {
    if (!BackgroundJobTracker.instance) {
      BackgroundJobTracker.instance = new BackgroundJobTracker();
    }
    return BackgroundJobTracker.instance;
  }

  /**
   * Register a background job in the tracking system
   */
  async registerJob(job: InsertBackgroundJob): Promise<void> {
    try {
      this.jobs.set(job.jobName, job);
      await storage.upsertBackgroundJob(job);
      serverLogger.info('[BackgroundJobTracker] Job registered', { 
        jobName: job.jobName,
        schedule: job.schedule 
      });
    } catch (error) {
      serverLogger.error('[BackgroundJobTracker] Failed to register job', { 
        error, 
        jobName: job.jobName 
      });
    }
  }

  /**
   * Execute a background job with automatic tracking
   * @param jobName - The name of the job to execute
   * @param jobFunction - The async function to execute
   * @returns The result of the job function
   */
  async executeJob<T>(
    jobName: string,
    jobFunction: () => Promise<T>
  ): Promise<T> {
    const startTime = Date.now();
    
    serverLogger.info('[BackgroundJobTracker] Job starting', { jobName });

    // Record job execution start
    const execution = await storage.recordBackgroundJobExecution({
      jobName,
      status: 'running',
      startedAt: new Date(),
    });

    try {
      // Execute the job
      const result = await jobFunction();
      
      const duration = Date.now() - startTime;
      
      // Update job execution as successful
      await storage.updateBackgroundJobExecution(
        jobName,
        'success',
        duration
      );
      
      // Record metrics
      backgroundJobExecutions.inc({ job_name: jobName, status: 'success' });
      backgroundJobDuration.observe({ job_name: jobName }, duration / 1000);
      
      serverLogger.info('[BackgroundJobTracker] Job completed successfully', { 
        jobName,
        duration,
        executionId: execution.id
      });
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Update job execution as failed
      await storage.updateBackgroundJobExecution(
        jobName,
        'failed',
        duration,
        errorMessage
      );
      
      // Record metrics
      backgroundJobExecutions.inc({ job_name: jobName, status: 'failed' });
      backgroundJobDuration.observe({ job_name: jobName }, duration / 1000);
      backgroundJobErrors.inc({ job_name: jobName });
      
      serverLogger.error('[BackgroundJobTracker] Job failed', { 
        jobName,
        duration,
        error: errorMessage,
        executionId: execution.id
      });
      
      throw error;
    }
  }

  /**
   * Get all registered jobs
   */
  getRegisteredJobs(): InsertBackgroundJob[] {
    return Array.from(this.jobs.values());
  }
}

export const backgroundJobTracker = BackgroundJobTracker.getInstance();
