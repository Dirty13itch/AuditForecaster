import {
  type User,
  type InsertUser,
  type Builder,
  type InsertBuilder,
  type Job,
  type InsertJob,
  type ScheduleEvent,
  type InsertScheduleEvent,
  type Expense,
  type InsertExpense,
  type MileageLog,
  type InsertMileageLog,
  type ReportTemplate,
  type InsertReportTemplate,
  type ReportInstance,
  type InsertReportInstance,
  type Photo,
  type InsertPhoto,
  type Forecast,
  type InsertForecast,
  type ChecklistItem,
  type InsertChecklistItem,
  type ComplianceRule,
  type InsertComplianceRule,
  type ComplianceHistory,
  type InsertComplianceHistory,
  type CalendarPreference,
  type InsertCalendarPreference,
  type GoogleEvent,
  type InsertGoogleEvent,
  type UploadSession,
  type InsertUploadSession,
  type ScoreSummary,
  users,
  builders,
  jobs,
  scheduleEvents,
  expenses,
  mileageLogs,
  reportTemplates,
  reportInstances,
  photos,
  forecasts,
  checklistItems,
  complianceRules,
  complianceHistory,
  calendarPreferences,
  googleEvents,
  uploadSessions,
} from "@shared/schema";
import { calculateScore } from "@shared/scoring";
import { type PaginationParams, type PaginatedResult, type PhotoFilterParams } from "@shared/pagination";
import { db } from "./db";
import { eq, and, or, gte, lte, inArray, desc, asc, sql, count } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  createBuilder(builder: InsertBuilder): Promise<Builder>;
  getBuilder(id: string): Promise<Builder | undefined>;
  getAllBuilders(): Promise<Builder[]>;
  getBuildersPaginated(params: PaginationParams): Promise<PaginatedResult<Builder>>;
  updateBuilder(id: string, builder: Partial<InsertBuilder>): Promise<Builder | undefined>;
  deleteBuilder(id: string): Promise<boolean>;

  createJob(job: InsertJob): Promise<Job>;
  getJob(id: string): Promise<Job | undefined>;
  getJobBySourceEventId(sourceEventId: string): Promise<Job | undefined>;
  getAllJobs(): Promise<Job[]>;
  getJobsPaginated(params: PaginationParams): Promise<PaginatedResult<Job>>;
  updateJob(id: string, job: Partial<InsertJob>): Promise<Job | undefined>;
  deleteJob(id: string): Promise<boolean>;
  bulkDeleteJobs(ids: string[]): Promise<number>;

  createScheduleEvent(event: InsertScheduleEvent): Promise<ScheduleEvent>;
  getScheduleEvent(id: string): Promise<ScheduleEvent | undefined>;
  getScheduleEventsByJob(jobId: string): Promise<ScheduleEvent[]>;
  getScheduleEventsByDateRange(startDate: Date, endDate: Date): Promise<ScheduleEvent[]>;
  updateScheduleEvent(id: string, event: Partial<InsertScheduleEvent>): Promise<ScheduleEvent | undefined>;
  deleteScheduleEvent(id: string): Promise<boolean>;

  createExpense(expense: InsertExpense): Promise<Expense>;
  getExpense(id: string): Promise<Expense | undefined>;
  getAllExpenses(): Promise<Expense[]>;
  getExpensesPaginated(params: PaginationParams): Promise<PaginatedResult<Expense>>;
  getExpensesByJob(jobId: string): Promise<Expense[]>;
  getExpensesByJobPaginated(jobId: string, params: PaginationParams): Promise<PaginatedResult<Expense>>;
  updateExpense(id: string, expense: Partial<InsertExpense>): Promise<Expense | undefined>;
  deleteExpense(id: string): Promise<boolean>;

  createMileageLog(log: InsertMileageLog): Promise<MileageLog>;
  getMileageLog(id: string): Promise<MileageLog | undefined>;
  getAllMileageLogs(): Promise<MileageLog[]>;
  getMileageLogsPaginated(params: PaginationParams): Promise<PaginatedResult<MileageLog>>;
  getMileageLogsByDateRange(startDate: Date, endDate: Date): Promise<MileageLog[]>;
  updateMileageLog(id: string, log: Partial<InsertMileageLog>): Promise<MileageLog | undefined>;
  deleteMileageLog(id: string): Promise<boolean>;

  createReportTemplate(template: InsertReportTemplate): Promise<ReportTemplate>;
  getReportTemplate(id: string): Promise<ReportTemplate | undefined>;
  getAllReportTemplates(): Promise<ReportTemplate[]>;
  updateReportTemplate(id: string, template: Partial<InsertReportTemplate>): Promise<ReportTemplate | undefined>;
  deleteReportTemplate(id: string): Promise<boolean>;

  createReportInstance(instance: InsertReportInstance): Promise<ReportInstance>;
  getReportInstance(id: string): Promise<ReportInstance | undefined>;
  getAllReportInstances(): Promise<ReportInstance[]>;
  getReportInstancesByJob(jobId: string): Promise<ReportInstance[]>;
  getReportInstancesPaginated(params: PaginationParams): Promise<PaginatedResult<ReportInstance>>;
  updateReportInstance(id: string, instance: Partial<InsertReportInstance>): Promise<ReportInstance | undefined>;

  createPhoto(photo: InsertPhoto): Promise<Photo>;
  getPhoto(id: string): Promise<Photo | undefined>;
  getAllPhotos(): Promise<Photo[]>;
  getPhotosByJob(jobId: string): Promise<Photo[]>;
  getPhotosByChecklistItem(checklistItemId: string): Promise<Photo[]>;
  getPhotosPaginated(params: PaginationParams): Promise<PaginatedResult<Photo>>;
  getPhotosByJobPaginated(jobId: string, params: PaginationParams): Promise<PaginatedResult<Photo>>;
  getPhotosByChecklistItemPaginated(checklistItemId: string, params: PaginationParams): Promise<PaginatedResult<Photo>>;
  getPhotosFilteredPaginated(filters: PhotoFilterParams, params: PaginationParams): Promise<PaginatedResult<Photo>>;
  updatePhoto(id: string, photo: Partial<InsertPhoto>): Promise<Photo | undefined>;
  deletePhoto(id: string): Promise<boolean>;
  
  // Bulk photo operations
  bulkDeletePhotos(ids: string[]): Promise<number>;
  bulkUpdatePhotoTags(ids: string[], mode: 'add' | 'remove' | 'replace', tags: string[]): Promise<number>;

  createForecast(forecast: InsertForecast): Promise<Forecast>;
  getForecast(id: string): Promise<Forecast | undefined>;
  getAllForecasts(): Promise<Forecast[]>;
  getForecastsByJob(jobId: string): Promise<Forecast[]>;
  updateForecast(id: string, forecast: Partial<InsertForecast>): Promise<Forecast | undefined>;
  deleteForecast(id: string): Promise<boolean>;

  createChecklistItem(item: InsertChecklistItem): Promise<ChecklistItem>;
  getChecklistItem(id: string): Promise<ChecklistItem | undefined>;
  getChecklistItemsByJob(jobId: string): Promise<ChecklistItem[]>;
  updateChecklistItem(id: string, item: Partial<InsertChecklistItem>): Promise<ChecklistItem | undefined>;
  deleteChecklistItem(id: string): Promise<boolean>;

  createComplianceRule(rule: InsertComplianceRule): Promise<ComplianceRule>;
  getComplianceRules(): Promise<ComplianceRule[]>;
  updateComplianceRule(id: string, rule: Partial<InsertComplianceRule>): Promise<ComplianceRule | undefined>;
  deleteComplianceRule(id: string): Promise<boolean>;

  getComplianceHistory(entityType?: string, entityId?: string): Promise<ComplianceHistory[]>;
  createComplianceHistoryEntry(entry: InsertComplianceHistory): Promise<ComplianceHistory>;

  // Calendar preferences
  getCalendarPreferences(): Promise<CalendarPreference[]>;
  saveCalendarPreferences(preferences: InsertCalendarPreference[]): Promise<CalendarPreference[]>;
  updateCalendarToggle(calendarId: string, isEnabled: boolean): Promise<CalendarPreference | undefined>;
  deleteCalendarPreference(calendarId: string): Promise<boolean>;

  // Google events (not linked to jobs)
  createGoogleEvent(event: InsertGoogleEvent): Promise<GoogleEvent>;
  getGoogleEvent(id: string): Promise<GoogleEvent | undefined>;
  getGoogleEventByGoogleId(googleEventId: string, calendarId: string): Promise<GoogleEvent | undefined>;
  getGoogleEventsByDateRange(startDate: Date, endDate: Date): Promise<GoogleEvent[]>;
  getTodaysUnconvertedGoogleEvents(): Promise<GoogleEvent[]>;
  updateGoogleEvent(id: string, event: Partial<InsertGoogleEvent>): Promise<GoogleEvent | undefined>;
  deleteGoogleEvent(id: string): Promise<boolean>;
  markGoogleEventAsConverted(id: string, jobId: string): Promise<GoogleEvent | undefined>;
  getJobsByStatus(statuses: string[]): Promise<Job[]>;
  getTodaysJobsByStatus(statuses: string[]): Promise<Job[]>;

  recalculateReportScore(reportInstanceId: string): Promise<void>;

  // Upload sessions for photo cleanup reminder
  createUploadSession(data: InsertUploadSession): Promise<UploadSession>;
  getUploadSessions(): Promise<UploadSession[]>;
  acknowledgeUploadSession(id: string): Promise<void>;

  // Dashboard methods
  getDashboardSummary(): Promise<any>;
  getBuilderLeaderboard(): Promise<any[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db.insert(users).values(insertUser).returning();
    return result[0];
  }

  async createBuilder(insertBuilder: InsertBuilder): Promise<Builder> {
    const result = await db.insert(builders).values(insertBuilder).returning();
    return result[0];
  }

  async getBuilder(id: string): Promise<Builder | undefined> {
    const result = await db.select().from(builders).where(eq(builders.id, id)).limit(1);
    return result[0];
  }

  async getAllBuilders(): Promise<Builder[]> {
    return await db.select().from(builders);
  }

  async getBuildersPaginated(params: PaginationParams): Promise<PaginatedResult<Builder>> {
    const { limit, offset } = params;
    
    const [data, totalResult] = await Promise.all([
      db.select().from(builders).limit(limit).offset(offset),
      db.select({ count: count() }).from(builders)
    ]);
    
    const total = totalResult[0].count;
    
    return {
      data,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    };
  }

  async updateBuilder(id: string, updates: Partial<InsertBuilder>): Promise<Builder | undefined> {
    const result = await db.update(builders)
      .set(updates)
      .where(eq(builders.id, id))
      .returning();
    return result[0];
  }

  async deleteBuilder(id: string): Promise<boolean> {
    const result = await db.delete(builders).where(eq(builders.id, id)).returning();
    return result.length > 0;
  }

  async createJob(insertJob: InsertJob): Promise<Job> {
    const result = await db.insert(jobs).values(insertJob).returning();
    return result[0];
  }

  async getJob(id: string): Promise<Job | undefined> {
    const result = await db.select().from(jobs).where(eq(jobs.id, id)).limit(1);
    return result[0];
  }

  async getJobBySourceEventId(sourceEventId: string): Promise<Job | undefined> {
    const result = await db.select().from(jobs)
      .where(eq(jobs.sourceGoogleEventId, sourceEventId))
      .limit(1);
    return result[0];
  }

  async getAllJobs(): Promise<Job[]> {
    return await db.select().from(jobs);
  }

  async getJobsPaginated(params: PaginationParams): Promise<PaginatedResult<Job>> {
    const { limit, offset } = params;
    
    const [data, totalResult] = await Promise.all([
      db.select().from(jobs).limit(limit).offset(offset),
      db.select({ count: count() }).from(jobs)
    ]);
    
    const total = totalResult[0].count;
    
    return {
      data,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    };
  }

  async updateJob(id: string, updates: Partial<InsertJob>): Promise<Job | undefined> {
    const result = await db.update(jobs)
      .set(updates)
      .where(eq(jobs.id, id))
      .returning();
    return result[0];
  }

  async deleteJob(id: string): Promise<boolean> {
    const result = await db.delete(jobs).where(eq(jobs.id, id)).returning();
    return result.length > 0;
  }

  async bulkDeleteJobs(ids: string[]): Promise<number> {
    if (ids.length === 0) return 0;
    const result = await db.delete(jobs).where(inArray(jobs.id, ids)).returning();
    return result.length;
  }

  async createScheduleEvent(insertEvent: InsertScheduleEvent): Promise<ScheduleEvent> {
    const result = await db.insert(scheduleEvents).values(insertEvent).returning();
    return result[0];
  }

  async getScheduleEvent(id: string): Promise<ScheduleEvent | undefined> {
    const result = await db.select().from(scheduleEvents).where(eq(scheduleEvents.id, id)).limit(1);
    return result[0];
  }

  async getScheduleEventsByJob(jobId: string): Promise<ScheduleEvent[]> {
    return await db.select().from(scheduleEvents).where(eq(scheduleEvents.jobId, jobId));
  }

  async getScheduleEventsByDateRange(startDate: Date, endDate: Date): Promise<ScheduleEvent[]> {
    return await db.select().from(scheduleEvents)
      .where(
        and(
          gte(scheduleEvents.startTime, startDate),
          lte(scheduleEvents.startTime, endDate)
        )
      );
  }

  async updateScheduleEvent(id: string, updates: Partial<InsertScheduleEvent>): Promise<ScheduleEvent | undefined> {
    const result = await db.update(scheduleEvents)
      .set(updates)
      .where(eq(scheduleEvents.id, id))
      .returning();
    return result[0];
  }

  async deleteScheduleEvent(id: string): Promise<boolean> {
    const result = await db.delete(scheduleEvents).where(eq(scheduleEvents.id, id)).returning();
    return result.length > 0;
  }

  async createExpense(insertExpense: InsertExpense): Promise<Expense> {
    const result = await db.insert(expenses).values(insertExpense).returning();
    return result[0];
  }

  async getExpense(id: string): Promise<Expense | undefined> {
    const result = await db.select().from(expenses).where(eq(expenses.id, id)).limit(1);
    return result[0];
  }

  async getAllExpenses(): Promise<Expense[]> {
    return await db.select().from(expenses);
  }

  async getExpensesPaginated(params: PaginationParams): Promise<PaginatedResult<Expense>> {
    const { limit, offset } = params;
    
    const [data, totalResult] = await Promise.all([
      db.select().from(expenses).limit(limit).offset(offset),
      db.select({ count: count() }).from(expenses)
    ]);
    
    const total = totalResult[0].count;
    
    return {
      data,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    };
  }

  async getExpensesByJob(jobId: string): Promise<Expense[]> {
    return await db.select().from(expenses).where(eq(expenses.jobId, jobId));
  }

  async getExpensesByJobPaginated(jobId: string, params: PaginationParams): Promise<PaginatedResult<Expense>> {
    const { limit, offset } = params;
    
    const [data, totalResult] = await Promise.all([
      db.select().from(expenses).where(eq(expenses.jobId, jobId)).limit(limit).offset(offset),
      db.select({ count: count() }).from(expenses).where(eq(expenses.jobId, jobId))
    ]);
    
    const total = totalResult[0].count;
    
    return {
      data,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    };
  }

  async updateExpense(id: string, updates: Partial<InsertExpense>): Promise<Expense | undefined> {
    const result = await db.update(expenses)
      .set(updates)
      .where(eq(expenses.id, id))
      .returning();
    return result[0];
  }

  async deleteExpense(id: string): Promise<boolean> {
    const result = await db.delete(expenses).where(eq(expenses.id, id)).returning();
    return result.length > 0;
  }

  async createMileageLog(insertLog: InsertMileageLog): Promise<MileageLog> {
    const result = await db.insert(mileageLogs).values(insertLog).returning();
    return result[0];
  }

  async getMileageLog(id: string): Promise<MileageLog | undefined> {
    const result = await db.select().from(mileageLogs).where(eq(mileageLogs.id, id)).limit(1);
    return result[0];
  }

  async getAllMileageLogs(): Promise<MileageLog[]> {
    return await db.select().from(mileageLogs);
  }

  async getMileageLogsPaginated(params: PaginationParams): Promise<PaginatedResult<MileageLog>> {
    const { limit, offset } = params;
    
    const [data, totalResult] = await Promise.all([
      db.select().from(mileageLogs).limit(limit).offset(offset),
      db.select({ count: count() }).from(mileageLogs)
    ]);
    
    const total = totalResult[0].count;
    
    return {
      data,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    };
  }

  async getMileageLogsByDateRange(startDate: Date, endDate: Date): Promise<MileageLog[]> {
    return await db.select().from(mileageLogs)
      .where(
        and(
          gte(mileageLogs.date, startDate),
          lte(mileageLogs.date, endDate)
        )
      );
  }

  async updateMileageLog(id: string, updates: Partial<InsertMileageLog>): Promise<MileageLog | undefined> {
    const result = await db.update(mileageLogs)
      .set(updates)
      .where(eq(mileageLogs.id, id))
      .returning();
    return result[0];
  }

  async deleteMileageLog(id: string): Promise<boolean> {
    const result = await db.delete(mileageLogs).where(eq(mileageLogs.id, id)).returning();
    return result.length > 0;
  }

  async createReportTemplate(insertTemplate: InsertReportTemplate): Promise<ReportTemplate> {
    const result = await db.insert(reportTemplates).values(insertTemplate).returning();
    return result[0];
  }

  async getReportTemplate(id: string): Promise<ReportTemplate | undefined> {
    const result = await db.select().from(reportTemplates).where(eq(reportTemplates.id, id)).limit(1);
    return result[0];
  }

  async getAllReportTemplates(): Promise<ReportTemplate[]> {
    return await db.select().from(reportTemplates);
  }

  async updateReportTemplate(id: string, updates: Partial<InsertReportTemplate>): Promise<ReportTemplate | undefined> {
    const result = await db.update(reportTemplates)
      .set(updates)
      .where(eq(reportTemplates.id, id))
      .returning();
    return result[0];
  }

  async deleteReportTemplate(id: string): Promise<boolean> {
    const result = await db.delete(reportTemplates).where(eq(reportTemplates.id, id)).returning();
    return result.length > 0;
  }

  async createReportInstance(insertInstance: InsertReportInstance): Promise<ReportInstance> {
    const result = await db.insert(reportInstances).values(insertInstance).returning();
    const instance = result[0];

    await this.recalculateReportScore(instance.id);

    return instance;
  }

  async getReportInstance(id: string): Promise<ReportInstance | undefined> {
    const result = await db.select().from(reportInstances).where(eq(reportInstances.id, id)).limit(1);
    return result[0];
  }

  async getAllReportInstances(): Promise<ReportInstance[]> {
    return await db.select().from(reportInstances);
  }

  async getReportInstancesByJob(jobId: string): Promise<ReportInstance[]> {
    return await db.select().from(reportInstances).where(eq(reportInstances.jobId, jobId));
  }

  async getReportInstancesPaginated(params: PaginationParams): Promise<PaginatedResult<ReportInstance>> {
    const { limit, offset } = params;
    
    const [data, totalResult] = await Promise.all([
      db.select().from(reportInstances).limit(limit).offset(offset),
      db.select({ count: count() }).from(reportInstances)
    ]);
    
    const total = totalResult[0].count;
    
    return {
      data,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    };
  }

  async updateReportInstance(id: string, updates: Partial<InsertReportInstance>): Promise<ReportInstance | undefined> {
    const result = await db.update(reportInstances)
      .set(updates)
      .where(eq(reportInstances.id, id))
      .returning();
    return result[0];
  }

  async createPhoto(insertPhoto: InsertPhoto): Promise<Photo> {
    const result = await db.insert(photos).values(insertPhoto).returning();
    return result[0];
  }

  async getPhoto(id: string): Promise<Photo | undefined> {
    const result = await db.select().from(photos).where(eq(photos.id, id)).limit(1);
    return result[0];
  }

  async getAllPhotos(): Promise<Photo[]> {
    return await db.select().from(photos);
  }

  async getPhotosByJob(jobId: string): Promise<Photo[]> {
    return await db.select().from(photos).where(eq(photos.jobId, jobId));
  }

  async getPhotosByChecklistItem(checklistItemId: string): Promise<Photo[]> {
    return await db.select().from(photos).where(eq(photos.checklistItemId, checklistItemId));
  }

  async getPhotosPaginated(params: PaginationParams): Promise<PaginatedResult<Photo>> {
    const { limit, offset } = params;
    
    const [data, totalResult] = await Promise.all([
      db.select().from(photos).limit(limit).offset(offset),
      db.select({ count: count() }).from(photos)
    ]);
    
    const total = totalResult[0].count;
    
    return {
      data,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    };
  }

  async getPhotosByJobPaginated(jobId: string, params: PaginationParams): Promise<PaginatedResult<Photo>> {
    const { limit, offset } = params;
    
    const [data, totalResult] = await Promise.all([
      db.select().from(photos).where(eq(photos.jobId, jobId)).limit(limit).offset(offset),
      db.select({ count: count() }).from(photos).where(eq(photos.jobId, jobId))
    ]);
    
    const total = totalResult[0].count;
    
    return {
      data,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    };
  }

  async getPhotosByChecklistItemPaginated(checklistItemId: string, params: PaginationParams): Promise<PaginatedResult<Photo>> {
    const { limit, offset } = params;
    
    const [data, totalResult] = await Promise.all([
      db.select().from(photos).where(eq(photos.checklistItemId, checklistItemId)).limit(limit).offset(offset),
      db.select({ count: count() }).from(photos).where(eq(photos.checklistItemId, checklistItemId))
    ]);
    
    const total = totalResult[0].count;
    
    return {
      data,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    };
  }

  async getPhotosFilteredPaginated(filters: PhotoFilterParams, params: PaginationParams): Promise<PaginatedResult<Photo>> {
    const { limit, offset } = params;
    const { jobId, checklistItemId, tags, dateFrom, dateTo } = filters;
    
    const conditions = [];
    
    if (jobId) {
      conditions.push(eq(photos.jobId, jobId));
    }
    
    if (checklistItemId) {
      conditions.push(eq(photos.checklistItemId, checklistItemId));
    }
    
    if (tags && tags.length > 0) {
      conditions.push(sql`${photos.tags} @> ${tags}`);
    }
    
    if (dateFrom) {
      conditions.push(gte(photos.uploadedAt, new Date(dateFrom)));
    }
    
    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      conditions.push(lte(photos.uploadedAt, toDate));
    }
    
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    
    const [data, totalResult] = await Promise.all([
      db.select().from(photos).where(whereClause).limit(limit).offset(offset),
      db.select({ count: count() }).from(photos).where(whereClause)
    ]);
    
    const total = totalResult[0].count;
    
    return {
      data,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    };
  }

  async updatePhoto(id: string, updates: Partial<InsertPhoto>): Promise<Photo | undefined> {
    const result = await db.update(photos)
      .set(updates)
      .where(eq(photos.id, id))
      .returning();
    return result[0];
  }

  async deletePhoto(id: string): Promise<boolean> {
    const result = await db.delete(photos).where(eq(photos.id, id)).returning();
    return result.length > 0;
  }

  async bulkDeletePhotos(ids: string[]): Promise<number> {
    if (ids.length === 0) return 0;
    const result = await db.delete(photos).where(inArray(photos.id, ids)).returning();
    return result.length;
  }

  async bulkUpdatePhotoTags(
    ids: string[],
    mode: 'add' | 'remove' | 'replace',
    tags: string[]
  ): Promise<number> {
    if (ids.length === 0) return 0;

    let updateSql;
    
    switch (mode) {
      case 'add':
        updateSql = sql`ARRAY(SELECT DISTINCT unnest(COALESCE(${photos.tags}, ARRAY[]::text[]) || ${tags}::text[]))`;
        break;
      case 'remove':
        updateSql = sql`ARRAY(SELECT unnest(COALESCE(${photos.tags}, ARRAY[]::text[])) EXCEPT SELECT unnest(${tags}::text[]))`;
        break;
      case 'replace':
        updateSql = tags;
        break;
    }

    const result = await db.update(photos)
      .set({ tags: updateSql })
      .where(inArray(photos.id, ids))
      .returning();
    
    return result.length;
  }

  async createForecast(insertForecast: InsertForecast): Promise<Forecast> {
    const result = await db.insert(forecasts).values(insertForecast).returning();
    return result[0];
  }

  async getForecast(id: string): Promise<Forecast | undefined> {
    const result = await db.select().from(forecasts).where(eq(forecasts.id, id)).limit(1);
    return result[0];
  }

  async getAllForecasts(): Promise<Forecast[]> {
    return await db.select().from(forecasts);
  }

  async getForecastsByJob(jobId: string): Promise<Forecast[]> {
    return await db.select().from(forecasts).where(eq(forecasts.jobId, jobId));
  }

  async updateForecast(id: string, updates: Partial<InsertForecast>): Promise<Forecast | undefined> {
    const result = await db.update(forecasts)
      .set(updates)
      .where(eq(forecasts.id, id))
      .returning();
    return result[0];
  }

  async deleteForecast(id: string): Promise<boolean> {
    const result = await db.delete(forecasts).where(eq(forecasts.id, id)).returning();
    return result.length > 0;
  }

  async createChecklistItem(insertItem: InsertChecklistItem): Promise<ChecklistItem> {
    const result = await db.insert(checklistItems).values(insertItem).returning();
    const item = result[0];

    const instances = await this.getReportInstancesByJob(insertItem.jobId);
    for (const instance of instances) {
      await this.recalculateReportScore(instance.id);
    }

    return item;
  }

  async getChecklistItem(id: string): Promise<ChecklistItem | undefined> {
    const result = await db.select().from(checklistItems).where(eq(checklistItems.id, id)).limit(1);
    return result[0];
  }

  async getChecklistItemsByJob(jobId: string): Promise<ChecklistItem[]> {
    return await db.select().from(checklistItems)
      .where(eq(checklistItems.jobId, jobId))
      .orderBy(asc(checklistItems.itemNumber));
  }

  async updateChecklistItem(id: string, updates: Partial<InsertChecklistItem>): Promise<ChecklistItem | undefined> {
    const result = await db.update(checklistItems)
      .set(updates)
      .where(eq(checklistItems.id, id))
      .returning();
    
    const updated = result[0];
    if (!updated) return undefined;

    const instances = await this.getReportInstancesByJob(updated.jobId);
    for (const instance of instances) {
      await this.recalculateReportScore(instance.id);
    }

    return updated;
  }

  async deleteChecklistItem(id: string): Promise<boolean> {
    const result = await db.delete(checklistItems).where(eq(checklistItems.id, id)).returning();
    return result.length > 0;
  }

  async createComplianceRule(insertRule: InsertComplianceRule): Promise<ComplianceRule> {
    const result = await db.insert(complianceRules).values(insertRule).returning();
    return result[0];
  }

  async getComplianceRules(): Promise<ComplianceRule[]> {
    return await db.select().from(complianceRules).where(eq(complianceRules.isActive, true));
  }

  async updateComplianceRule(id: string, updates: Partial<InsertComplianceRule>): Promise<ComplianceRule | undefined> {
    const result = await db.update(complianceRules)
      .set(updates)
      .where(eq(complianceRules.id, id))
      .returning();
    return result[0];
  }

  async deleteComplianceRule(id: string): Promise<boolean> {
    const result = await db.delete(complianceRules).where(eq(complianceRules.id, id)).returning();
    return result.length > 0;
  }

  async getComplianceHistory(entityType?: string, entityId?: string): Promise<ComplianceHistory[]> {
    const conditions = [];
    
    if (entityType) {
      conditions.push(eq(complianceHistory.entityType, entityType));
    }
    
    if (entityId) {
      conditions.push(eq(complianceHistory.entityId, entityId));
    }
    
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    
    return await db.select().from(complianceHistory)
      .where(whereClause)
      .orderBy(desc(complianceHistory.evaluatedAt));
  }

  async createComplianceHistoryEntry(insertEntry: InsertComplianceHistory): Promise<ComplianceHistory> {
    const result = await db.insert(complianceHistory).values(insertEntry).returning();
    return result[0];
  }

  async getCalendarPreferences(): Promise<CalendarPreference[]> {
    return await db.select().from(calendarPreferences);
  }

  async saveCalendarPreferences(preferences: InsertCalendarPreference[]): Promise<CalendarPreference[]> {
    const savedPreferences: CalendarPreference[] = [];
    
    for (const pref of preferences) {
      const existing = await db.select().from(calendarPreferences)
        .where(eq(calendarPreferences.calendarId, pref.calendarId))
        .limit(1);
      
      if (existing.length > 0) {
        const result = await db.update(calendarPreferences)
          .set(pref)
          .where(eq(calendarPreferences.id, existing[0].id))
          .returning();
        savedPreferences.push(result[0]);
      } else {
        const result = await db.insert(calendarPreferences)
          .values(pref)
          .returning();
        savedPreferences.push(result[0]);
      }
    }
    
    return savedPreferences;
  }

  async updateCalendarToggle(calendarId: string, isEnabled: boolean): Promise<CalendarPreference | undefined> {
    const result = await db.update(calendarPreferences)
      .set({ isEnabled })
      .where(eq(calendarPreferences.calendarId, calendarId))
      .returning();
    return result[0];
  }

  async deleteCalendarPreference(calendarId: string): Promise<boolean> {
    const result = await db.delete(calendarPreferences)
      .where(eq(calendarPreferences.calendarId, calendarId))
      .returning();
    return result.length > 0;
  }

  async createGoogleEvent(event: InsertGoogleEvent): Promise<GoogleEvent> {
    const result = await db.insert(googleEvents).values(event).returning();
    return result[0];
  }

  async getGoogleEvent(id: string): Promise<GoogleEvent | undefined> {
    const result = await db.select().from(googleEvents).where(eq(googleEvents.id, id)).limit(1);
    return result[0];
  }

  async getGoogleEventByGoogleId(googleEventId: string, calendarId: string): Promise<GoogleEvent | undefined> {
    const result = await db.select().from(googleEvents)
      .where(
        and(
          eq(googleEvents.googleEventId, googleEventId),
          eq(googleEvents.googleCalendarId, calendarId)
        )
      )
      .limit(1);
    return result[0];
  }

  async getGoogleEventsByDateRange(startDate: Date, endDate: Date): Promise<GoogleEvent[]> {
    return await db.select().from(googleEvents)
      .where(
        and(
          lte(googleEvents.startTime, endDate),
          gte(googleEvents.endTime, startDate)
        )
      );
  }

  async updateGoogleEvent(id: string, event: Partial<InsertGoogleEvent>): Promise<GoogleEvent | undefined> {
    const result = await db.update(googleEvents)
      .set(event)
      .where(eq(googleEvents.id, id))
      .returning();
    return result[0];
  }

  async deleteGoogleEvent(id: string): Promise<boolean> {
    const result = await db.delete(googleEvents).where(eq(googleEvents.id, id)).returning();
    return result.length > 0;
  }

  async markGoogleEventAsConverted(id: string, jobId: string): Promise<GoogleEvent | undefined> {
    const result = await db.update(googleEvents)
      .set({ isConverted: true, convertedToJobId: jobId })
      .where(eq(googleEvents.id, id))
      .returning();
    return result[0];
  }

  async getTodaysUnconvertedGoogleEvents(): Promise<GoogleEvent[]> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    return await db.select().from(googleEvents)
      .where(
        and(
          gte(googleEvents.startTime, startOfDay),
          lte(googleEvents.startTime, endOfDay),
          eq(googleEvents.isConverted, false)
        )
      )
      .orderBy(asc(googleEvents.startTime));
  }

  async getJobsByStatus(statuses: string[]): Promise<Job[]> {
    return await db.select().from(jobs)
      .where(inArray(jobs.status, statuses))
      .orderBy(desc(jobs.scheduledDate));
  }

  async getTodaysJobsByStatus(statuses: string[]): Promise<Job[]> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    return await db.select().from(jobs)
      .where(
        and(
          inArray(jobs.status, statuses),
          gte(jobs.scheduledDate, startOfDay),
          lte(jobs.scheduledDate, endOfDay)
        )
      )
      .orderBy(asc(jobs.scheduledDate));
  }

  async recalculateReportScore(reportInstanceId: string): Promise<void> {
    const instance = await this.getReportInstance(reportInstanceId);
    if (!instance) return;

    const items = await this.getChecklistItemsByJob(instance.jobId);
    const score = calculateScore(items);

    const scoreSummary: ScoreSummary = {
      grade: score.grade,
      passRate: score.passRate,
      failRate: score.failRate,
      completionRate: score.completionRate,
      totalItems: score.totalItems,
      passedItems: score.passedItems,
      failedItems: score.failedItems,
      updatedAt: new Date().toISOString(),
    };

    await this.updateReportInstance(reportInstanceId, {
      scoreSummary: JSON.stringify(scoreSummary),
    });
  }

  async createUploadSession(data: InsertUploadSession): Promise<UploadSession> {
    const result = await db.insert(uploadSessions).values(data).returning();
    return result[0];
  }

  async getUploadSessions(): Promise<UploadSession[]> {
    return await db.select().from(uploadSessions).orderBy(desc(uploadSessions.timestamp));
  }

  async acknowledgeUploadSession(id: string): Promise<void> {
    await db.update(uploadSessions)
      .set({ 
        acknowledged: true, 
        acknowledgedAt: new Date() 
      })
      .where(eq(uploadSessions.id, id));
  }

  async getDashboardSummary(): Promise<any> {
    const completedJobs = await db.select()
      .from(jobs)
      .innerJoin(forecasts, eq(jobs.id, forecasts.jobId))
      .where(eq(jobs.status, 'completed'));

    const jobsWithACH50 = completedJobs
      .filter(row => row.forecasts.actualACH50 != null)
      .map(row => ({
        jobId: row.jobs.id,
        ach50: parseFloat(row.forecasts.actualACH50?.toString() || '0'),
        completedDate: row.jobs.completedDate,
      }));

    const totalInspections = jobsWithACH50.length;
    
    if (totalInspections === 0) {
      return {
        totalInspections: 0,
        averageACH50: 0,
        tierDistribution: [],
        passRate: 0,
        failRate: 0,
        tax45LEligibleCount: 0,
        totalPotentialTaxCredits: 0,
        monthlyHighlights: [],
      };
    }

    const calculateTier = (ach50: number): string => {
      if (ach50 <= 1.0) return 'Elite';
      if (ach50 <= 1.5) return 'Excellent';
      if (ach50 <= 2.0) return 'Very Good';
      if (ach50 <= 2.5) return 'Good';
      if (ach50 <= 3.0) return 'Passing';
      return 'Failing';
    };

    const getTierColor = (tier: string): string => {
      const colors: Record<string, string> = {
        'Elite': '#0B7285',
        'Excellent': '#2E8B57',
        'Very Good': '#3FA34D',
        'Good': '#A0C34E',
        'Passing': '#FFC107',
        'Failing': '#DC3545',
      };
      return colors[tier] || '#6C757D';
    };

    const totalACH50 = jobsWithACH50.reduce((sum, job) => sum + job.ach50, 0);
    const averageACH50 = totalACH50 / totalInspections;

    const tierCounts: Record<string, number> = {
      'Elite': 0,
      'Excellent': 0,
      'Very Good': 0,
      'Good': 0,
      'Passing': 0,
      'Failing': 0,
    };

    let passCount = 0;
    let failCount = 0;
    let tax45LEligibleCount = 0;

    jobsWithACH50.forEach(job => {
      const tier = calculateTier(job.ach50);
      tierCounts[tier]++;
      
      if (job.ach50 <= 3.0) {
        passCount++;
        tax45LEligibleCount++;
      } else {
        failCount++;
      }
    });

    const tierDistribution = Object.entries(tierCounts).map(([tier, count]) => ({
      tier,
      count,
      percentage: (count / totalInspections) * 100,
      color: getTierColor(tier),
    }));

    const passRate = (passCount / totalInspections) * 100;
    const failRate = (failCount / totalInspections) * 100;
    const totalPotentialTaxCredits = tax45LEligibleCount * 2000;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonthJobs = jobsWithACH50.filter(job => 
      job.completedDate && new Date(job.completedDate) >= startOfMonth
    );

    const monthlyHighlights = [];
    
    if (thisMonthJobs.length > 0) {
      const bestThisMonth = Math.min(...thisMonthJobs.map(j => j.ach50));
      monthlyHighlights.push({
        label: 'Best Performance This Month',
        value: `${bestThisMonth.toFixed(2)} ACH50`,
        type: 'success',
      });

      monthlyHighlights.push({
        label: 'Inspections This Month',
        value: thisMonthJobs.length,
        type: 'info',
      });

      const monthlyPassRate = (thisMonthJobs.filter(j => j.ach50 <= 3.0).length / thisMonthJobs.length) * 100;
      monthlyHighlights.push({
        label: 'Monthly Pass Rate',
        value: `${monthlyPassRate.toFixed(1)}%`,
        type: monthlyPassRate >= 80 ? 'success' : 'warning',
      });
    }

    return {
      totalInspections,
      averageACH50,
      tierDistribution,
      passRate,
      failRate,
      tax45LEligibleCount,
      totalPotentialTaxCredits,
      monthlyHighlights,
    };
  }

  async getBuilderLeaderboard(): Promise<any[]> {
    const allBuilders = await db.select().from(builders);
    const completedJobs = await db.select()
      .from(jobs)
      .innerJoin(forecasts, eq(jobs.id, forecasts.jobId))
      .where(eq(jobs.status, 'completed'));

    const calculateTier = (ach50: number): string => {
      if (ach50 <= 1.0) return 'Elite';
      if (ach50 <= 1.5) return 'Excellent';
      if (ach50 <= 2.0) return 'Very Good';
      if (ach50 <= 2.5) return 'Good';
      if (ach50 <= 3.0) return 'Passing';
      return 'Failing';
    };

    const getTierColor = (tier: string): string => {
      const colors: Record<string, string> = {
        'Elite': '#0B7285',
        'Excellent': '#2E8B57',
        'Very Good': '#3FA34D',
        'Good': '#A0C34E',
        'Passing': '#FFC107',
        'Failing': '#DC3545',
      };
      return colors[tier] || '#6C757D';
    };

    const leaderboard = allBuilders.map(builder => {
      const builderJobs = completedJobs
        .filter(row => row.jobs.builderId === builder.id && row.forecasts.actualACH50 != null)
        .map(row => ({
          jobId: row.jobs.id,
          ach50: parseFloat(row.forecasts.actualACH50?.toString() || '0'),
          completedDate: row.jobs.completedDate,
        }));

      if (builderJobs.length === 0) {
        return null;
      }

      const totalACH50 = builderJobs.reduce((sum, job) => sum + job.ach50, 0);
      const averageACH50 = totalACH50 / builderJobs.length;
      const tier = calculateTier(averageACH50);
      
      const passCount = builderJobs.filter(job => job.ach50 <= 3.0).length;
      const passRate = (passCount / builderJobs.length) * 100;
      
      const bestACH50 = Math.min(...builderJobs.map(j => j.ach50));
      
      const sortedByDate = builderJobs.sort((a, b) => {
        const dateA = a.completedDate ? new Date(a.completedDate).getTime() : 0;
        const dateB = b.completedDate ? new Date(b.completedDate).getTime() : 0;
        return dateB - dateA;
      });
      const latestACH50 = sortedByDate.length > 0 ? sortedByDate[0].ach50 : null;

      const tierCounts: Record<string, number> = {
        'Elite': 0,
        'Excellent': 0,
        'Very Good': 0,
        'Good': 0,
        'Passing': 0,
        'Failing': 0,
      };

      builderJobs.forEach(job => {
        const jobTier = calculateTier(job.ach50);
        tierCounts[jobTier]++;
      });

      const tierDistribution = Object.entries(tierCounts).map(([tierName, count]) => ({
        tier: tierName,
        count,
        percentage: (count / builderJobs.length) * 100,
        color: getTierColor(tierName),
      }));

      return {
        builderId: builder.id,
        builderName: builder.name,
        averageACH50,
        tier,
        totalJobs: builderJobs.length,
        passRate,
        bestACH50,
        latestACH50,
        tierDistribution,
      };
    }).filter((entry): entry is NonNullable<typeof entry> => entry !== null);

    return leaderboard.sort((a, b) => a.averageACH50 - b.averageACH50);
  }
}

export const storage = new DatabaseStorage();
