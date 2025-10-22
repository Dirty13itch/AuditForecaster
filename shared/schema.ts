import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, timestamp, boolean, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const builders = pgTable("builders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  companyName: text("company_name").notNull(),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  tradeSpecialization: text("trade_specialization"),
  rating: integer("rating"),
  totalJobs: integer("total_jobs").default(0),
  notes: text("notes"),
});

export const jobs = pgTable("jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  address: text("address").notNull(),
  builderId: varchar("builder_id"),
  contractor: text("contractor").notNull(),
  status: text("status").notNull(),
  inspectionType: text("inspection_type").notNull(),
  scheduledDate: timestamp("scheduled_date"),
  completedDate: timestamp("completed_date"),
  completedItems: integer("completed_items").default(0),
  totalItems: integer("total_items").default(52),
  priority: text("priority").default('medium'),
  latitude: real("latitude"),
  longitude: real("longitude"),
  notes: text("notes"),
});

export const scheduleEvents = pgTable("schedule_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobId: varchar("job_id").notNull(),
  title: text("title").notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  googleCalendarEventId: text("google_calendar_event_id"),
  color: text("color"),
});

export const expenses = pgTable("expenses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobId: varchar("job_id"),
  category: text("category").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  description: text("description"),
  receiptUrl: text("receipt_url"),
  date: timestamp("date").notNull(),
  isWorkRelated: boolean("is_work_related").default(true),
});

export const mileageLogs = pgTable("mileage_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  date: timestamp("date").notNull(),
  startLocation: text("start_location"),
  endLocation: text("end_location"),
  distance: decimal("distance", { precision: 10, scale: 2 }).notNull(),
  purpose: text("purpose"),
  isWorkRelated: boolean("is_work_related"),
  jobId: varchar("job_id"),
  startLatitude: real("start_latitude"),
  startLongitude: real("start_longitude"),
  endLatitude: real("end_latitude"),
  endLongitude: real("end_longitude"),
});

export const reportTemplates = pgTable("report_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  sections: text("sections").notNull(),
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const reportInstances = pgTable("report_instances", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobId: varchar("job_id").notNull(),
  templateId: varchar("template_id").notNull(),
  data: text("data").notNull(),
  pdfUrl: text("pdf_url"),
  emailedTo: text("emailed_to"),
  emailedAt: timestamp("emailed_at"),
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const forecasts = pgTable("forecasts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobId: varchar("job_id").notNull(),
  predictedTDL: decimal("predicted_tdl", { precision: 10, scale: 2 }),
  predictedDLO: decimal("predicted_dlo", { precision: 10, scale: 2 }),
  actualTDL: decimal("actual_tdl", { precision: 10, scale: 2 }),
  actualDLO: decimal("actual_dlo", { precision: 10, scale: 2 }),
  confidence: integer("confidence"),
});

export const checklistItems = pgTable("checklist_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobId: varchar("job_id").notNull(),
  itemNumber: integer("item_number").notNull(),
  title: text("title").notNull(),
  completed: boolean("completed").default(false),
  notes: text("notes"),
  photoCount: integer("photo_count").default(0),
});

export const photos = pgTable("photos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobId: varchar("job_id").notNull(),
  checklistItemId: varchar("checklist_item_id"),
  url: text("url").notNull(),
  timestamp: timestamp("timestamp").notNull(),
  caption: text("caption"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertBuilderSchema = createInsertSchema(builders).omit({ id: true, totalJobs: true });
export const insertJobSchema = createInsertSchema(jobs).omit({ id: true });
export const insertScheduleEventSchema = createInsertSchema(scheduleEvents).omit({ id: true });
export const insertExpenseSchema = createInsertSchema(expenses).omit({ id: true });
export const insertMileageLogSchema = createInsertSchema(mileageLogs).omit({ id: true });
export const insertReportTemplateSchema = createInsertSchema(reportTemplates).omit({ id: true, createdAt: true });
export const insertReportInstanceSchema = createInsertSchema(reportInstances).omit({ id: true, createdAt: true });
export const insertForecastSchema = createInsertSchema(forecasts).omit({ id: true });
export const insertChecklistItemSchema = createInsertSchema(checklistItems).omit({ id: true });
export const insertPhotoSchema = createInsertSchema(photos).omit({ id: true });

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Builder = typeof builders.$inferSelect;
export type Job = typeof jobs.$inferSelect;
export type ScheduleEvent = typeof scheduleEvents.$inferSelect;
export type Expense = typeof expenses.$inferSelect;
export type MileageLog = typeof mileageLogs.$inferSelect;
export type ReportTemplate = typeof reportTemplates.$inferSelect;
export type ReportInstance = typeof reportInstances.$inferSelect;
export type Forecast = typeof forecasts.$inferSelect;
export type ChecklistItem = typeof checklistItems.$inferSelect;
export type Photo = typeof photos.$inferSelect;
export type InsertBuilder = z.infer<typeof insertBuilderSchema>;
export type InsertJob = z.infer<typeof insertJobSchema>;
export type InsertScheduleEvent = z.infer<typeof insertScheduleEventSchema>;
export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type InsertMileageLog = z.infer<typeof insertMileageLogSchema>;
export type InsertReportTemplate = z.infer<typeof insertReportTemplateSchema>;
export type InsertReportInstance = z.infer<typeof insertReportInstanceSchema>;
export type InsertForecast = z.infer<typeof insertForecastSchema>;
export type InsertChecklistItem = z.infer<typeof insertChecklistItemSchema>;
export type InsertPhoto = z.infer<typeof insertPhotoSchema>;
