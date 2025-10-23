import type { Express } from "express";
import { createServer, type Server } from "http";
import passport from "passport";
import bcrypt from "bcrypt";
import { storage } from "./storage";
import { googleCalendarService } from "./googleCalendar";
import { isAuthenticated, getUserId } from "./auth";
import { ObjectStorageService, ObjectNotFoundError, objectStorageClient } from "./objectStorage";
import { ObjectPermission } from "./objectAcl";
import { generateReportPDF } from "./pdfGenerator.tsx";
import {
  insertBuilderSchema,
  insertJobSchema,
  insertScheduleEventSchema,
  insertExpenseSchema,
  insertMileageLogSchema,
  insertReportTemplateSchema,
  insertReportInstanceSchema,
  insertPhotoSchema,
  insertUserSchema,
  insertChecklistItemSchema,
  updateChecklistItemSchema,
  insertComplianceRuleSchema,
  insertForecastSchema,
} from "@shared/schema";
import {
  evaluateJobCompliance,
  evaluateReportCompliance,
  updateJobComplianceStatus,
  updateReportComplianceStatus,
} from "./complianceService";
import { ZodError } from "zod";
import { serverLogger } from "./logger";

// Error handling helpers
function logError(context: string, error: unknown, additionalInfo?: Record<string, any>) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;
  
  serverLogger.error(`[${context}] Error:`, {
    message: errorMessage,
    stack: errorStack,
    ...additionalInfo,
  });
}

function handleValidationError(error: unknown): { status: number; message: string } {
  if (error instanceof ZodError) {
    const firstError = error.errors[0];
    const fieldName = firstError.path.join('.');
    return {
      status: 400,
      message: `Please check your input: ${firstError.message}${fieldName ? ` (${fieldName})` : ''}`,
    };
  }
  return { status: 400, message: "Please check your input and try again" };
}

function handleDatabaseError(error: unknown, operation: string): { status: number; message: string } {
  logError('Database', error, { operation });
  return {
    status: 500,
    message: "We're having trouble processing your request. Please try again.",
  };
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { username, password } = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "This username is already taken. Please choose another." });
      }
      
      // Hash password with bcrypt
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Create user
      const user = await storage.createUser({
        username,
        password: hashedPassword
      });
      
      // Remove password from response
      const { password: _, ...userWithoutPassword } = user;
      
      // Log user in after registration
      req.login(user, (err) => {
        if (err) {
          logError('Auth/Register', err, { username });
          return res.status(500).json({ message: "Account created successfully, but we couldn't log you in. Please try logging in manually." });
        }
        res.status(201).json(userWithoutPassword);
      });
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      logError('Auth/Register', error);
      res.status(500).json({ message: "We couldn't create your account. Please try again." });
    }
  });

  app.post("/api/auth/login", (req, res, next) => {
    passport.authenticate('local', (err: any, user: any, info: any) => {
      if (err) {
        logError('Auth/Login', err);
        return res.status(500).json({ message: "We're having trouble logging you in. Please try again." });
      }
      if (!user) {
        return res.status(401).json({ message: info?.message || "Incorrect username or password" });
      }
      
      req.login(user, (err) => {
        if (err) {
          logError('Auth/LoginSession', err);
          return res.status(500).json({ message: "We couldn't complete your login. Please try again." });
        }
        
        // Remove password from response
        const { password: _, ...userWithoutPassword } = user;
        res.json(userWithoutPassword);
      });
    })(req, res, next);
  });

  app.post("/api/auth/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        logError('Auth/Logout', err);
        return res.status(500).json({ message: "We couldn't log you out. Please try again." });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/auth/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "You must be logged in to access this" });
    }
    
    // Remove password from response
    const user = req.user as any;
    const { password: _, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  });

  app.get("/api/builders", isAuthenticated, async (_req, res) => {
    try {
      const builders = await storage.getAllBuilders();
      res.json(builders);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch builders');
      res.status(status).json({ message });
    }
  });

  app.post("/api/builders", isAuthenticated, async (req, res) => {
    try {
      const validated = insertBuilderSchema.parse(req.body);
      const builder = await storage.createBuilder(validated);
      res.status(201).json(builder);
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'create builder');
      res.status(status).json({ message });
    }
  });

  app.get("/api/builders/:id", isAuthenticated, async (req, res) => {
    try {
      const builder = await storage.getBuilder(req.params.id);
      if (!builder) {
        return res.status(404).json({ message: "Builder not found. It may have been deleted." });
      }
      res.json(builder);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch builder');
      res.status(status).json({ message });
    }
  });

  app.put("/api/builders/:id", isAuthenticated, async (req, res) => {
    try {
      const validated = insertBuilderSchema.partial().parse(req.body);
      const builder = await storage.updateBuilder(req.params.id, validated);
      if (!builder) {
        return res.status(404).json({ message: "Builder not found. It may have been deleted." });
      }
      res.json(builder);
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'update builder');
      res.status(status).json({ message });
    }
  });

  app.delete("/api/builders/:id", isAuthenticated, async (req, res) => {
    try {
      const deleted = await storage.deleteBuilder(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Builder not found. It may have already been deleted." });
      }
      res.status(204).send();
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'delete builder');
      res.status(status).json({ message });
    }
  });

  app.get("/api/jobs", isAuthenticated, async (_req, res) => {
    try {
      const jobs = await storage.getAllJobs();
      res.json(jobs);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch jobs');
      res.status(status).json({ message });
    }
  });

  app.post("/api/jobs", isAuthenticated, async (req, res) => {
    try {
      const validated = insertJobSchema.parse(req.body);
      const job = await storage.createJob(validated);
      res.status(201).json(job);
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'create job');
      res.status(status).json({ message });
    }
  });

  app.get("/api/jobs/:id", isAuthenticated, async (req, res) => {
    try {
      const job = await storage.getJob(req.params.id);
      if (!job) {
        return res.status(404).json({ message: "Job not found. It may have been deleted or the link may be outdated." });
      }
      res.json(job);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch job');
      res.status(status).json({ message });
    }
  });

  app.put("/api/jobs/:id", isAuthenticated, async (req, res) => {
    try {
      const validated = insertJobSchema.partial().parse(req.body);
      const job = await storage.updateJob(req.params.id, validated);
      if (!job) {
        return res.status(404).json({ message: "Job not found. It may have been deleted." });
      }
      res.json(job);
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'update job');
      res.status(status).json({ message });
    }
  });

  app.delete("/api/jobs/:id", isAuthenticated, async (req, res) => {
    try {
      const deleted = await storage.deleteJob(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Job not found. It may have already been deleted." });
      }
      res.status(204).send();
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'delete job');
      res.status(status).json({ message });
    }
  });

  app.get("/api/schedule-events", isAuthenticated, async (req, res) => {
    try {
      const { startDate, endDate, jobId } = req.query;

      if (jobId && typeof jobId === "string") {
        const events = await storage.getScheduleEventsByJob(jobId);
        return res.json(events);
      }

      if (startDate && endDate) {
        const start = new Date(startDate as string);
        const end = new Date(endDate as string);
        const events = await storage.getScheduleEventsByDateRange(start, end);
        return res.json(events);
      }

      res.status(400).json({ message: "Please provide either a job ID or date range to view schedule events" });
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch schedule events');
      res.status(status).json({ message });
    }
  });

  app.get("/api/schedule-events/sync", isAuthenticated, async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ message: "Please provide both start date and end date to sync events" });
      }

      const start = new Date(startDate as string);
      const end = new Date(endDate as string);
      
      const googleEvents = await googleCalendarService.fetchEventsFromGoogle(start, end);
      const syncedCount = { created: 0, updated: 0, skipped: 0 };
      
      for (const googleEvent of googleEvents) {
        const parsedEvent = googleCalendarService.parseGoogleEventToScheduleEvent(googleEvent);
        
        if (!parsedEvent || !parsedEvent.jobId) {
          syncedCount.skipped++;
          continue;
        }

        const existingEvent = parsedEvent.id 
          ? await storage.getScheduleEvent(parsedEvent.id)
          : null;

        if (existingEvent) {
          await storage.updateScheduleEvent(existingEvent.id, {
            title: parsedEvent.title,
            startTime: parsedEvent.startTime,
            endTime: parsedEvent.endTime,
            notes: parsedEvent.notes,
            googleCalendarEventId: parsedEvent.googleCalendarEventId,
            lastSyncedAt: parsedEvent.lastSyncedAt,
          });
          syncedCount.updated++;
        } else {
          const job = await storage.getJob(parsedEvent.jobId);
          if (job) {
            await storage.createScheduleEvent({
              jobId: parsedEvent.jobId,
              title: parsedEvent.title!,
              startTime: parsedEvent.startTime!,
              endTime: parsedEvent.endTime!,
              notes: parsedEvent.notes,
              googleCalendarEventId: parsedEvent.googleCalendarEventId,
              color: parsedEvent.color,
            });
            syncedCount.created++;
          } else {
            syncedCount.skipped++;
          }
        }
      }

      res.json({
        message: "Sync completed successfully",
        syncedCount,
        totalProcessed: googleEvents.length,
      });
    } catch (error) {
      logError('ScheduleEvents/Sync', error, { startDate, endDate });
      const { status, message } = handleDatabaseError(error, 'sync schedule events from Google Calendar');
      res.status(status).json({ message });
    }
  });

  app.post("/api/schedule-events", isAuthenticated, async (req, res) => {
    try {
      const validated = insertScheduleEventSchema.parse(req.body);
      const event = await storage.createScheduleEvent(validated);
      
      try {
        const job = await storage.getJob(event.jobId);
        if (job) {
          const googleEventId = await googleCalendarService.syncEventToGoogle(event, job);
          if (googleEventId) {
            const updatedEvent = await storage.updateScheduleEvent(event.id, {
              googleCalendarEventId: googleEventId,
              lastSyncedAt: new Date(),
            });
            return res.status(201).json(updatedEvent || event);
          }
        }
      } catch (syncError) {
        logError('ScheduleEvents/GoogleSync', syncError, { eventId: event.id });
      }
      
      res.status(201).json(event);
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'create schedule event');
      res.status(status).json({ message });
    }
  });

  app.get("/api/schedule-events/:id", isAuthenticated, async (req, res) => {
    try {
      const event = await storage.getScheduleEvent(req.params.id);
      if (!event) {
        return res.status(404).json({ message: "Schedule event not found. It may have been deleted." });
      }
      res.json(event);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch schedule event');
      res.status(status).json({ message });
    }
  });

  app.put("/api/schedule-events/:id", isAuthenticated, async (req, res) => {
    try {
      const validated = insertScheduleEventSchema.partial().parse(req.body);
      const event = await storage.updateScheduleEvent(req.params.id, validated);
      if (!event) {
        return res.status(404).json({ message: "Schedule event not found. It may have been deleted." });
      }
      
      try {
        const job = await storage.getJob(event.jobId);
        if (job) {
          const googleEventId = await googleCalendarService.syncEventToGoogle(event, job);
          if (googleEventId) {
            const updatedEvent = await storage.updateScheduleEvent(event.id, {
              googleCalendarEventId: googleEventId,
              lastSyncedAt: new Date(),
            });
            return res.json(updatedEvent || event);
          }
        }
      } catch (syncError) {
        logError('ScheduleEvents/GoogleSync', syncError, { eventId: event.id });
      }
      
      res.json(event);
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'update schedule event');
      res.status(status).json({ message });
    }
  });

  app.delete("/api/schedule-events/:id", isAuthenticated, async (req, res) => {
    try {
      const event = await storage.getScheduleEvent(req.params.id);
      
      if (event?.googleCalendarEventId) {
        try {
          await googleCalendarService.deleteEventFromGoogle(event.googleCalendarEventId);
        } catch (syncError) {
          logError('ScheduleEvents/GoogleSync', syncError, { eventId: req.params.id });
        }
      }
      
      const deleted = await storage.deleteScheduleEvent(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Schedule event not found. It may have already been deleted." });
      }
      res.status(204).send();
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'delete schedule event');
      res.status(status).json({ message });
    }
  });

  app.get("/api/expenses", isAuthenticated, async (req, res) => {
    try {
      const { jobId } = req.query;

      if (jobId && typeof jobId === "string") {
        const expenses = await storage.getExpensesByJob(jobId);
        return res.json(expenses);
      }

      const expenses = await storage.getAllExpenses();
      res.json(expenses);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch expenses');
      res.status(status).json({ message });
    }
  });

  app.post("/api/expenses", isAuthenticated, async (req, res) => {
    try {
      const validated = insertExpenseSchema.parse(req.body);
      const expense = await storage.createExpense(validated);
      res.status(201).json(expense);
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'create expense');
      res.status(status).json({ message });
    }
  });

  app.get("/api/expenses/:id", isAuthenticated, async (req, res) => {
    try {
      const expense = await storage.getExpense(req.params.id);
      if (!expense) {
        return res.status(404).json({ message: "Expense not found. It may have been deleted." });
      }
      res.json(expense);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch expense');
      res.status(status).json({ message });
    }
  });

  app.put("/api/expenses/:id", isAuthenticated, async (req, res) => {
    try {
      const validated = insertExpenseSchema.partial().parse(req.body);
      const expense = await storage.updateExpense(req.params.id, validated);
      if (!expense) {
        return res.status(404).json({ message: "Expense not found. It may have been deleted." });
      }
      res.json(expense);
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'update expense');
      res.status(status).json({ message });
    }
  });

  app.delete("/api/expenses/:id", isAuthenticated, async (req, res) => {
    try {
      const deleted = await storage.deleteExpense(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Expense not found. It may have already been deleted." });
      }
      res.status(204).send();
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'delete expense');
      res.status(status).json({ message });
    }
  });

  app.get("/api/mileage-logs", isAuthenticated, async (req, res) => {
    try {
      const { startDate, endDate } = req.query;

      if (startDate && endDate) {
        const start = new Date(startDate as string);
        const end = new Date(endDate as string);
        const logs = await storage.getMileageLogsByDateRange(start, end);
        return res.json(logs);
      }

      const logs = await storage.getAllMileageLogs();
      res.json(logs);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch mileage logs');
      res.status(status).json({ message });
    }
  });

  app.post("/api/mileage-logs", isAuthenticated, async (req, res) => {
    try {
      const validated = insertMileageLogSchema.parse(req.body);
      const log = await storage.createMileageLog(validated);
      res.status(201).json(log);
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'create mileage log');
      res.status(status).json({ message });
    }
  });

  app.get("/api/mileage-logs/:id", isAuthenticated, async (req, res) => {
    try {
      const log = await storage.getMileageLog(req.params.id);
      if (!log) {
        return res.status(404).json({ message: "Mileage log not found. It may have been deleted." });
      }
      res.json(log);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch mileage log');
      res.status(status).json({ message });
    }
  });

  app.put("/api/mileage-logs/:id", isAuthenticated, async (req, res) => {
    try {
      const validated = insertMileageLogSchema.partial().parse(req.body);
      const log = await storage.updateMileageLog(req.params.id, validated);
      if (!log) {
        return res.status(404).json({ message: "Mileage log not found. It may have been deleted." });
      }
      res.json(log);
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'update mileage log');
      res.status(status).json({ message });
    }
  });

  app.delete("/api/mileage-logs/:id", isAuthenticated, async (req, res) => {
    try {
      const deleted = await storage.deleteMileageLog(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Mileage log not found. It may have already been deleted." });
      }
      res.status(204).send();
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'delete mileage log');
      res.status(status).json({ message });
    }
  });

  app.get("/api/report-templates", isAuthenticated, async (_req, res) => {
    try {
      const templates = await storage.getAllReportTemplates();
      res.json(templates);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch report templates');
      res.status(status).json({ message });
    }
  });

  app.post("/api/report-templates", isAuthenticated, async (req, res) => {
    try {
      const validated = insertReportTemplateSchema.parse(req.body);
      const template = await storage.createReportTemplate(validated);
      res.status(201).json(template);
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'create report template');
      res.status(status).json({ message });
    }
  });

  app.get("/api/report-templates/:id", isAuthenticated, async (req, res) => {
    try {
      const template = await storage.getReportTemplate(req.params.id);
      if (!template) {
        return res.status(404).json({ message: "Report template not found. It may have been deleted." });
      }
      res.json(template);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch report template');
      res.status(status).json({ message });
    }
  });

  app.put("/api/report-templates/:id", isAuthenticated, async (req, res) => {
    try {
      const validated = insertReportTemplateSchema.partial().parse(req.body);
      const template = await storage.updateReportTemplate(req.params.id, validated);
      if (!template) {
        return res.status(404).json({ message: "Report template not found. It may have been deleted." });
      }
      res.json(template);
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'update report template');
      res.status(status).json({ message });
    }
  });

  app.delete("/api/report-templates/:id", isAuthenticated, async (req, res) => {
    try {
      const deleted = await storage.deleteReportTemplate(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Report template not found. It may have already been deleted." });
      }
      res.status(204).send();
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'delete report template');
      res.status(status).json({ message });
    }
  });

  app.get("/api/report-instances", isAuthenticated, async (req, res) => {
    try {
      const { jobId } = req.query;

      if (jobId && typeof jobId === "string") {
        const instances = await storage.getReportInstancesByJob(jobId);
        
        const withScores = instances.map(inst => ({
          ...inst,
          scoreSummary: inst.scoreSummary ? JSON.parse(inst.scoreSummary) : null,
        }));
        
        return res.json(withScores);
      }

      res.status(400).json({ message: "Please provide a job ID to view report instances" });
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch report instances');
      res.status(status).json({ message });
    }
  });

  app.post("/api/report-instances", isAuthenticated, async (req, res) => {
    try {
      const validated = insertReportInstanceSchema.parse(req.body);
      const instance = await storage.createReportInstance(validated);
      
      // Trigger compliance evaluation for both job and report
      try {
        await updateJobComplianceStatus(storage, instance.jobId);
        await updateReportComplianceStatus(storage, instance.id);
      } catch (error) {
        logError('ReportInstances/ComplianceEvaluation', error, { instanceId: instance.id });
      }
      
      res.status(201).json(instance);
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'create report instance');
      res.status(status).json({ message });
    }
  });

  app.post("/api/report-instances/recalculate-scores", isAuthenticated, async (req, res) => {
    try {
      const jobs = await storage.getAllJobs();
      let recalculated = 0;
      
      for (const job of jobs) {
        const instances = await storage.getReportInstancesByJob(job.id);
        for (const instance of instances) {
          await storage.recalculateReportScore(instance.id);
          recalculated++;
        }
      }
      
      res.json({ message: `Recalculated scores for ${recalculated} report instances` });
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'recalculate report scores');
      res.status(status).json({ message });
    }
  });

  app.get("/api/report-instances/:id", isAuthenticated, async (req, res) => {
    try {
      const instance = await storage.getReportInstance(req.params.id);
      if (!instance) {
        return res.status(404).json({ message: "Report instance not found. It may have been deleted." });
      }
      
      const job = await storage.getJob(instance.jobId);
      const builder = job?.builderId ? await storage.getBuilder(job.builderId) : undefined;
      const checklistItems = await storage.getChecklistItemsByJob(instance.jobId);
      
      res.json({
        ...instance,
        job,
        builder,
        checklistItems,
      });
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch report instance');
      res.status(status).json({ message });
    }
  });

  app.put("/api/report-instances/:id", isAuthenticated, async (req, res) => {
    try {
      const validated = insertReportInstanceSchema.partial().parse(req.body);
      const instance = await storage.updateReportInstance(req.params.id, validated);
      if (!instance) {
        return res.status(404).json({ message: "Report instance not found. It may have been deleted." });
      }
      res.json(instance);
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'update report instance');
      res.status(status).json({ message });
    }
  });

  app.post("/api/report-instances/:id/generate-pdf", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      
      // Fetch report instance
      const reportInstance = await storage.getReportInstance(req.params.id);
      if (!reportInstance) {
        return res.status(404).json({ message: "Report instance not found" });
      }

      // Fetch related data
      const job = await storage.getJob(reportInstance.jobId);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }

      const builder = job.builderId ? await storage.getBuilder(job.builderId) : undefined;
      const checklistItems = await storage.getChecklistItemsByJob(reportInstance.jobId);
      const photos = await storage.getPhotosByJob(reportInstance.jobId);
      const forecasts = await storage.getForecastsByJob(reportInstance.jobId);

      // Parse template sections
      const template = await storage.getReportTemplate(reportInstance.templateId);
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }

      const templateSections = JSON.parse(template.sections);

      // Generate PDF
      const pdfBuffer = await generateReportPDF({
        reportInstance,
        job,
        builder,
        checklistItems,
        photos,
        forecasts,
        templateSections,
      });

      // Upload PDF to object storage
      const objectStorageService = new ObjectStorageService();
      const privateDir = objectStorageService.getPrivateObjectDir();
      
      // Create a unique filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `report-${reportInstance.id}-${timestamp}.pdf`;
      const objectPath = `${privateDir}/reports/${filename}`;

      // Parse the object path to get bucket and object name
      const pathParts = objectPath.split('/');
      const bucketName = pathParts[1];
      const objectName = pathParts.slice(2).join('/');

      // Upload the PDF buffer
      const bucket = objectStorageClient.bucket(bucketName);
      const file = bucket.file(objectName);
      
      await file.save(pdfBuffer, {
        metadata: {
          contentType: 'application/pdf',
        },
      });

      // Set ACL to private
      await objectStorageService.trySetObjectEntityAclPolicy(
        `/objects/reports/${filename}`,
        {
          owner: userId || "unknown",
          visibility: "private",
        }
      );

      // Update report instance with PDF URL (normalized path)
      const normalizedPath = `/objects/reports/${filename}`;
      await storage.updateReportInstance(req.params.id, {
        pdfUrl: normalizedPath,
      });

      res.json({
        success: true,
        pdfUrl: normalizedPath,
      });
    } catch (error) {
      logError('ReportInstances/GeneratePDF', error, { reportId: req.params.id });
      const { status, message } = handleDatabaseError(error, 'generate PDF report');
      res.status(status).json({ message });
    }
  });

  // PDF Download endpoint
  app.get("/api/report-instances/:id/download-pdf", isAuthenticated, async (req, res) => {
    try {
      const instance = await storage.getReportInstance(req.params.id);
      if (!instance || !instance.pdfUrl) {
        return res.status(404).json({ message: "PDF not found. Please generate the PDF first." });
      }

      const objectStorageService = new ObjectStorageService();
      const file = await objectStorageService.getObjectEntityFile(instance.pdfUrl);
      
      if (!file) {
        return res.status(404).json({ message: "PDF file not found in storage. It may have been deleted." });
      }

      await objectStorageService.downloadObject(file, res);
    } catch (error) {
      logError('ReportInstances/DownloadPDF', error, { reportId: req.params.id });
      const { status, message } = handleDatabaseError(error, 'download PDF report');
      res.status(status).json({ message });
    }
  });

  // Object Storage Routes
  app.post("/api/objects/upload", isAuthenticated, async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const { uploadURL, objectPath } = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL, objectPath });
    } catch (error) {
      logError('ObjectStorage/Upload', error);
      const { status, message } = handleDatabaseError(error, 'get upload URL');
      res.status(status).json({ message });
    }
  });

  app.get("/objects/:objectPath(*)", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      const canAccess = await objectStorageService.canAccessObjectEntity({
        objectFile,
        userId: userId,
        requestedPermission: ObjectPermission.READ,
      });
      if (!canAccess) {
        return res.sendStatus(401);
      }
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      logError('ObjectStorage/Access', error, { path: req.path, userId });
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  // Signature Routes
  app.post("/api/jobs/:id/signature", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { signatureUrl, signerName, signerRole } = req.body;

      if (!signatureUrl || !signerName) {
        return res.status(400).json({ message: "Please provide both signature and signer name" });
      }

      const objectStorageService = new ObjectStorageService();
      
      // Normalize the signature path (handles both presigned HTTPS URLs and relative paths)
      const normalizedPath = objectStorageService.normalizeObjectEntityPath(signatureUrl);
      
      // Validate that normalization was successful
      if (!normalizedPath || !normalizedPath.startsWith("/")) {
        return res.status(400).json({ 
          message: "Invalid signature format. Please try again." 
        });
      }
      
      // Wait for the file to exist before setting ACL
      const fileExists = await objectStorageService.waitForObjectEntity(normalizedPath, 10, 500);
      if (!fileExists) {
        return res.status(400).json({ 
          message: "Signature upload not complete. Please ensure the signature was uploaded successfully." 
        });
      }
      
      // Set the ACL policy to private (signatures should be secure)
      // Use normalizedPath instead of raw signatureUrl
      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
        normalizedPath,
        {
          owner: userId || "unknown",
          visibility: "private",
        },
      );

      // Update the job with signature data and server-side timestamp
      const job = await storage.updateJob(req.params.id, {
        builderSignatureUrl: objectPath,
        builderSignerName: signerName,
        builderSignedAt: new Date(),
      });

      if (!job) {
        return res.status(404).json({ message: "Job not found. It may have been deleted." });
      }

      res.json(job);
    } catch (error) {
      logError('Signature/Save', error, { jobId: req.params.id });
      const { status, message } = handleDatabaseError(error, 'save signature');
      res.status(status).json({ message });
    }
  });

  // Photo Routes
  app.get("/api/photos", isAuthenticated, async (req, res) => {
    try {
      const { jobId, checklistItemId } = req.query;

      if (checklistItemId && typeof checklistItemId === "string") {
        const photos = await storage.getPhotosByChecklistItem(checklistItemId);
        return res.json(photos);
      }

      if (jobId && typeof jobId === "string") {
        const photos = await storage.getPhotosByJob(jobId);
        return res.json(photos);
      }

      const jobs = await storage.getAllJobs();
      const allPhotos = [];
      for (const job of jobs) {
        const photos = await storage.getPhotosByJob(job.id);
        allPhotos.push(...photos);
      }
      res.json(allPhotos);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch photos');
      res.status(status).json({ message });
    }
  });

  app.post("/api/photos", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!req.body.filePath) {
        return res.status(400).json({ message: "Please provide a file path for the photo" });
      }

      const objectStorageService = new ObjectStorageService();
      
      // Normalize the path first
      const normalizedPath = objectStorageService.normalizeObjectEntityPath(req.body.filePath);
      
      // Wait for the file to exist before setting ACL (uploaded files may take a moment to appear)
      if (normalizedPath.startsWith("/")) {
        const fileExists = await objectStorageService.waitForObjectEntity(normalizedPath, 10, 500);
        if (!fileExists) {
          return res.status(400).json({ 
            message: "Photo upload not complete. Please ensure the file was uploaded successfully." 
          });
        }
      }
      
      // Now that we've confirmed the file exists, set the ACL policy
      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
        req.body.filePath,
        {
          owner: userId || "unknown",
          visibility: "public",
        },
      );

      const validated = insertPhotoSchema.parse({
        ...req.body,
        filePath: objectPath,
      });
      const photo = await storage.createPhoto(validated);
      
      if (photo.checklistItemId) {
        const checklistItem = await storage.getChecklistItem(photo.checklistItemId);
        if (checklistItem) {
          await storage.updateChecklistItem(photo.checklistItemId, {
            photoCount: (checklistItem.photoCount || 0) + 1,
          });
        }
      }
      
      res.status(201).json(photo);
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      logError('Photos/Create', error, { filePath: req.body.filePath });
      const { status, message } = handleDatabaseError(error, 'create photo');
      res.status(status).json({ message });
    }
  });

  app.get("/api/photos/:id", isAuthenticated, async (req, res) => {
    try {
      const photo = await storage.getPhoto(req.params.id);
      if (!photo) {
        return res.status(404).json({ message: "Photo not found. It may have been deleted." });
      }
      res.json(photo);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch photo');
      res.status(status).json({ message });
    }
  });

  app.patch("/api/photos/:id", isAuthenticated, async (req, res) => {
    try {
      const validated = insertPhotoSchema.partial().parse(req.body);
      const photo = await storage.updatePhoto(req.params.id, validated);
      if (!photo) {
        return res.status(404).json({ message: "Photo not found. It may have been deleted." });
      }
      res.json(photo);
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'update photo');
      res.status(status).json({ message });
    }
  });

  app.delete("/api/photos/:id", isAuthenticated, async (req, res) => {
    try {
      const photo = await storage.getPhoto(req.params.id);
      if (!photo) {
        return res.status(404).json({ message: "Photo not found. It may have already been deleted." });
      }
      
      if (photo.checklistItemId) {
        const checklistItem = await storage.getChecklistItem(photo.checklistItemId);
        if (checklistItem && checklistItem.photoCount !== null && checklistItem.photoCount > 0) {
          await storage.updateChecklistItem(photo.checklistItemId, {
            photoCount: checklistItem.photoCount - 1,
          });
        }
      }
      
      const deleted = await storage.deletePhoto(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Photo not found. It may have already been deleted." });
      }
      res.status(204).send();
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'delete photo');
      res.status(status).json({ message });
    }
  });

  app.get("/api/forecasts", isAuthenticated, async (req, res) => {
    try {
      const forecasts = await storage.getAllForecasts();
      res.json(forecasts);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch forecasts');
      res.status(status).json({ message });
    }
  });

  app.get("/api/forecasts/:id", isAuthenticated, async (req, res) => {
    try {
      const forecast = await storage.getForecast(req.params.id);
      if (!forecast) {
        return res.status(404).json({ message: "Forecast not found. It may have been deleted." });
      }
      res.json(forecast);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch forecast');
      res.status(status).json({ message });
    }
  });

  app.post("/api/forecasts", isAuthenticated, async (req, res) => {
    try {
      const validated = insertForecastSchema.parse(req.body);
      const forecast = await storage.createForecast(validated);
      
      // Trigger compliance evaluation if actual values are being updated
      if (validated.actualTDL !== undefined || validated.actualDLO !== undefined || validated.actualACH50 !== undefined) {
        try {
          await updateJobComplianceStatus(storage, forecast.jobId);
        } catch (error) {
          logError('Forecasts/ComplianceEvaluation', error, { forecastId: forecast.id });
        }
      }
      
      res.status(201).json(forecast);
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'create forecast');
      res.status(status).json({ message });
    }
  });

  app.patch("/api/forecasts/:id", isAuthenticated, async (req, res) => {
    try {
      const validated = insertForecastSchema.partial().parse(req.body);
      const forecast = await storage.updateForecast(req.params.id, validated);
      if (!forecast) {
        return res.status(404).json({ message: "Forecast not found. It may have been deleted." });
      }
      
      // Trigger compliance evaluation if actual values are being updated
      if (validated.actualTDL !== undefined || validated.actualDLO !== undefined || validated.actualACH50 !== undefined) {
        try {
          await updateJobComplianceStatus(storage, forecast.jobId);
        } catch (error) {
          logError('Forecasts/ComplianceEvaluation', error, { forecastId: forecast.id });
        }
      }
      
      res.json(forecast);
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'update forecast');
      res.status(status).json({ message });
    }
  });

  app.get("/api/checklist-items", isAuthenticated, async (req, res) => {
    try {
      const { jobId } = req.query;

      if (jobId && typeof jobId === "string") {
        const items = await storage.getChecklistItemsByJob(jobId);
        return res.json(items);
      }

      const jobs = await storage.getAllJobs();
      const allItems = [];
      for (const job of jobs) {
        const items = await storage.getChecklistItemsByJob(job.id);
        allItems.push(...items);
      }
      res.json(allItems);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch checklist items');
      res.status(status).json({ message });
    }
  });

  app.post("/api/checklist-items", isAuthenticated, async (req, res) => {
    try {
      const validated = insertChecklistItemSchema.parse(req.body);
      const item = await storage.createChecklistItem(validated);
      
      // Trigger compliance evaluation for all checklist item changes
      try {
        const reportInstances = await storage.getReportInstancesByJob(item.jobId);
        for (const reportInstance of reportInstances) {
          await updateReportComplianceStatus(storage, reportInstance.id);
        }
      } catch (error) {
        logError('ChecklistItems/ComplianceEvaluation', error, { itemId: item.id });
      }
      
      res.status(201).json(item);
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'create checklist item');
      res.status(status).json({ message });
    }
  });

  app.get("/api/checklist-items/:id", isAuthenticated, async (req, res) => {
    try {
      const item = await storage.getChecklistItem(req.params.id);
      if (!item) {
        return res.status(404).json({ message: "Checklist item not found. It may have been deleted." });
      }
      res.json(item);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch checklist item');
      res.status(status).json({ message });
    }
  });

  app.patch("/api/checklist-items/:id", isAuthenticated, async (req, res) => {
    try {
      const validated = updateChecklistItemSchema.parse(req.body);
      const item = await storage.updateChecklistItem(req.params.id, validated);
      if (!item) {
        return res.status(404).json({ message: "Checklist item not found. It may have been deleted." });
      }
      
      // Trigger compliance evaluation for all checklist item changes
      try {
        const reportInstances = await storage.getReportInstancesByJob(item.jobId);
        for (const reportInstance of reportInstances) {
          await updateReportComplianceStatus(storage, reportInstance.id);
        }
      } catch (error) {
        logError('ChecklistItems/ComplianceEvaluation', error, { itemId: item.id });
      }
      
      res.json(item);
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'update checklist item');
      res.status(status).json({ message });
    }
  });

  app.delete("/api/checklist-items/:id", isAuthenticated, async (req, res) => {
    try {
      const deleted = await storage.deleteChecklistItem(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Checklist item not found. It may have already been deleted." });
      }
      res.status(204).send();
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'delete checklist item');
      res.status(status).json({ message });
    }
  });

  app.get("/api/compliance/jobs/:jobId", isAuthenticated, async (req, res) => {
    try {
      const job = await storage.getJob(req.params.jobId);
      if (!job) {
        return res.status(404).json({ message: "Job not found. It may have been deleted." });
      }

      const evaluation = await evaluateJobCompliance(storage, req.params.jobId);
      res.json({
        jobId: req.params.jobId,
        ...evaluation,
      });
    } catch (error) {
      logError('Compliance/JobStatus', error, { jobId: req.params.jobId });
      const { status, message } = handleDatabaseError(error, 'fetch job compliance status');
      res.status(status).json({ message });
    }
  });

  app.post("/api/compliance/jobs/:jobId/evaluate", isAuthenticated, async (req, res) => {
    try {
      const job = await storage.getJob(req.params.jobId);
      if (!job) {
        return res.status(404).json({ message: "Job not found. It may have been deleted." });
      }

      const updatedJob = await updateJobComplianceStatus(storage, req.params.jobId);
      if (!updatedJob) {
        return res.status(500).json({ message: "Unable to evaluate job compliance. Please try again." });
      }

      res.json(updatedJob);
    } catch (error) {
      logError('Compliance/JobEvaluate', error, { jobId: req.params.jobId });
      const { status, message } = handleDatabaseError(error, 'evaluate job compliance');
      res.status(status).json({ message });
    }
  });

  app.get("/api/compliance/reports/:reportId", isAuthenticated, async (req, res) => {
    try {
      const report = await storage.getReportInstance(req.params.reportId);
      if (!report) {
        return res.status(404).json({ message: "Report not found. It may have been deleted." });
      }

      const evaluation = await evaluateReportCompliance(storage, req.params.reportId);
      res.json({
        reportId: req.params.reportId,
        ...evaluation,
      });
    } catch (error) {
      logError('Compliance/ReportStatus', error, { reportId: req.params.reportId });
      const { status, message } = handleDatabaseError(error, 'fetch report compliance status');
      res.status(status).json({ message });
    }
  });

  app.post("/api/compliance/reports/:reportId/evaluate", isAuthenticated, async (req, res) => {
    try {
      const report = await storage.getReportInstance(req.params.reportId);
      if (!report) {
        return res.status(404).json({ message: "Report not found. It may have been deleted." });
      }

      const updatedReport = await updateReportComplianceStatus(storage, req.params.reportId);
      if (!updatedReport) {
        return res.status(500).json({ message: "Unable to evaluate report compliance. Please try again." });
      }

      res.json(updatedReport);
    } catch (error) {
      logError('Compliance/ReportEvaluate', error, { reportId: req.params.reportId });
      const { status, message } = handleDatabaseError(error, 'evaluate report compliance');
      res.status(status).json({ message });
    }
  });

  app.get("/api/compliance/rules", isAuthenticated, async (_req, res) => {
    try {
      const rules = await storage.getComplianceRules();
      res.json(rules);
    } catch (error) {
      logError('Compliance/GetRules', error);
      const { status, message } = handleDatabaseError(error, 'fetch compliance rules');
      res.status(status).json({ message });
    }
  });

  app.post("/api/compliance/rules", isAuthenticated, async (req, res) => {
    try {
      const validated = insertComplianceRuleSchema.parse(req.body);
      const rule = await storage.createComplianceRule(validated);
      res.status(201).json(rule);
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      logError('Compliance/CreateRule', error);
      const { status, message } = handleDatabaseError(error, 'create compliance rule');
      res.status(status).json({ message });
    }
  });

  app.get("/api/compliance/history/:entityType/:entityId", isAuthenticated, async (req, res) => {
    try {
      const { entityType, entityId } = req.params;
      
      if (entityType !== "job" && entityType !== "report") {
        return res.status(400).json({ message: "Please specify either 'job' or 'report' as the entity type" });
      }

      const history = await storage.getComplianceHistory(entityType, entityId);
      res.json(history);
    } catch (error) {
      logError('Compliance/History', error, { entityType: req.params.entityType, entityId: req.params.entityId });
      const { status, message } = handleDatabaseError(error, 'fetch compliance history');
      res.status(status).json({ message });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
