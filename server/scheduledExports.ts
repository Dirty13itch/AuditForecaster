import * as cron from 'node-cron';
import { exportService, type ExportOptions } from './exportService';
import { emailService } from './email/emailService';
import { storage } from './storage';
import { serverLogger } from './logger';
import { format } from 'date-fns';
import { createReadStream } from 'fs';
import { unlink } from 'fs/promises';

export interface ScheduledExport {
  id: string;
  name: string;
  dataType: 'jobs' | 'financial' | 'equipment' | 'qa-scores' | 'analytics' | 'photos';
  format: 'csv' | 'xlsx' | 'pdf' | 'json';
  frequency: 'daily' | 'weekly' | 'monthly';
  time: string; // Format: "HH:mm"
  dayOfWeek?: number; // 0-6 for weekly exports
  dayOfMonth?: number; // 1-31 for monthly exports
  recipients: string[];
  options: Partial<ExportOptions>;
  userId: string;
  enabled: boolean;
  lastRun?: Date;
  nextRun?: Date;
  createdAt: Date;
  updatedAt: Date;
}

class ScheduledExportService {
  private jobs: Map<string, cron.ScheduledTask>;
  private exports: Map<string, ScheduledExport>;

  constructor() {
    this.jobs = new Map();
    this.exports = new Map();
    this.initialize();
  }

  private async initialize() {
    try {
      // Load scheduled exports from database
      const exports = await this.loadScheduledExports();
      
      for (const exp of exports) {
        if (exp.enabled) {
          this.scheduleExport(exp);
        }
      }
      
      serverLogger.info('[ScheduledExports] Initialized with exports', {
        count: exports.length,
        enabled: exports.filter(e => e.enabled).length,
      });
    } catch (error) {
      serverLogger.error('[ScheduledExports] Failed to initialize', { error });
    }
  }

  private async loadScheduledExports(): Promise<ScheduledExport[]> {
    // TODO: Load from database when the schema is added
    // For now, return empty array
    return [];
  }

  private getCronExpression(exp: ScheduledExport): string {
    const [hour, minute] = exp.time.split(':').map(Number);
    
    switch (exp.frequency) {
      case 'daily':
        return `${minute} ${hour} * * *`;
      case 'weekly':
        const dayOfWeek = exp.dayOfWeek || 1; // Default to Monday
        return `${minute} ${hour} * * ${dayOfWeek}`;
      case 'monthly':
        const dayOfMonth = exp.dayOfMonth || 1; // Default to 1st of month
        return `${minute} ${hour} ${dayOfMonth} * *`;
      default:
        throw new Error(`Invalid frequency: ${exp.frequency}`);
    }
  }

  private async executeExport(exp: ScheduledExport) {
    serverLogger.info('[ScheduledExports] Executing scheduled export', {
      id: exp.id,
      name: exp.name,
      dataType: exp.dataType,
    });

    try {
      let result;
      
      // Execute the export based on data type
      switch (exp.dataType) {
        case 'jobs':
          result = await exportService.exportJobs({
            ...exp.options,
            format: exp.format,
          } as ExportOptions);
          break;
          
        case 'financial':
          const financialDataType = exp.options.filters?.dataType || 'invoices';
          result = await exportService.exportFinancialData({
            ...exp.options,
            format: exp.format,
            dataType: financialDataType as any,
          } as any);
          break;
          
        case 'equipment':
          result = await exportService.exportEquipment({
            ...exp.options,
            format: exp.format,
          } as ExportOptions);
          break;
          
        case 'qa-scores':
          result = await exportService.exportQAScores({
            ...exp.options,
            format: exp.format,
          } as ExportOptions);
          break;
          
        case 'analytics':
          result = await exportService.exportAnalytics({
            ...exp.options,
            format: exp.format,
            reportType: exp.options.filters?.reportType || 'general',
          } as any);
          break;
          
        case 'photos':
          result = await exportService.exportPhotoMetadata({
            ...exp.options,
            format: exp.format,
          } as ExportOptions);
          break;
          
        default:
          throw new Error(`Unsupported data type: ${exp.dataType}`);
      }

      // Send email with attachment
      if (result && exp.recipients.length > 0) {
        const fileStream = createReadStream(result.filePath);
        const fileBuffer = await this.streamToBuffer(fileStream);
        
        await emailService.sendScheduledExport({
          to: exp.recipients,
          subject: `Scheduled Export: ${exp.name}`,
          exportName: exp.name,
          dataType: exp.dataType,
          format: exp.format,
          generatedAt: new Date(),
          attachment: {
            filename: result.fileName,
            content: fileBuffer,
            type: result.mimeType,
          },
        });

        serverLogger.info('[ScheduledExports] Export sent via email', {
          id: exp.id,
          recipients: exp.recipients.length,
          fileName: result.fileName,
        });
      }

      // Clean up temporary file
      if (result) {
        await unlink(result.filePath).catch(err => {
          serverLogger.error('[ScheduledExports] Failed to delete temp file', {
            error: err,
            file: result.filePath,
          });
        });
      }

      // Update last run time
      exp.lastRun = new Date();
      exp.nextRun = this.calculateNextRun(exp);
      this.exports.set(exp.id, exp);
      
      // TODO: Update in database
      
    } catch (error) {
      serverLogger.error('[ScheduledExports] Export execution failed', {
        id: exp.id,
        error,
      });
      
      // TODO: Store error in database for user visibility
    }
  }

  private async streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  private calculateNextRun(exp: ScheduledExport): Date {
    const cronExpression = this.getCronExpression(exp);
    const interval = cron.parseExpression(cronExpression);
    return interval.next().toDate();
  }

  public scheduleExport(exp: ScheduledExport): void {
    // Cancel existing job if it exists
    if (this.jobs.has(exp.id)) {
      const existingJob = this.jobs.get(exp.id);
      existingJob?.stop();
      this.jobs.delete(exp.id);
    }

    if (!exp.enabled) {
      return;
    }

    const cronExpression = this.getCronExpression(exp);
    
    const job = cron.schedule(cronExpression, () => {
      this.executeExport(exp);
    }, {
      scheduled: true,
      timezone: 'America/New_York', // TODO: Make this configurable
    });

    this.jobs.set(exp.id, job);
    this.exports.set(exp.id, exp);
    
    exp.nextRun = this.calculateNextRun(exp);
    
    serverLogger.info('[ScheduledExports] Export scheduled', {
      id: exp.id,
      name: exp.name,
      cron: cronExpression,
      nextRun: exp.nextRun,
    });
  }

  public async createScheduledExport(data: Omit<ScheduledExport, 'id' | 'createdAt' | 'updatedAt'>): Promise<ScheduledExport> {
    const exp: ScheduledExport = {
      ...data,
      id: `sched_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // TODO: Save to database
    
    if (exp.enabled) {
      this.scheduleExport(exp);
    }

    return exp;
  }

  public async updateScheduledExport(id: string, updates: Partial<ScheduledExport>): Promise<ScheduledExport | null> {
    const exp = this.exports.get(id);
    if (!exp) {
      return null;
    }

    const updated: ScheduledExport = {
      ...exp,
      ...updates,
      id: exp.id, // Ensure ID doesn't change
      updatedAt: new Date(),
    };

    // TODO: Update in database
    
    // Reschedule if necessary
    this.scheduleExport(updated);
    
    return updated;
  }

  public async deleteScheduledExport(id: string): Promise<boolean> {
    const job = this.jobs.get(id);
    if (job) {
      job.stop();
      this.jobs.delete(id);
    }
    
    this.exports.delete(id);
    
    // TODO: Delete from database
    
    return true;
  }

  public getScheduledExports(userId?: string): ScheduledExport[] {
    const exports = Array.from(this.exports.values());
    
    if (userId) {
      return exports.filter(exp => exp.userId === userId);
    }
    
    return exports;
  }

  public getScheduledExport(id: string): ScheduledExport | undefined {
    return this.exports.get(id);
  }

  public async runExportNow(id: string): Promise<void> {
    const exp = this.exports.get(id);
    if (!exp) {
      throw new Error(`Scheduled export not found: ${id}`);
    }
    
    await this.executeExport(exp);
  }

  public shutdown(): void {
    serverLogger.info('[ScheduledExports] Shutting down scheduled exports');
    
    for (const [id, job] of this.jobs) {
      job.stop();
    }
    
    this.jobs.clear();
  }
}

export const scheduledExportService = new ScheduledExportService();