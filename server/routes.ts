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
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { username, password } = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
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
          return res.status(500).json({ message: "Registration successful but login failed" });
        }
        res.status(201).json(userWithoutPassword);
      });
    } catch (error) {
      res.status(400).json({ message: "Invalid registration data", error });
    }
  });

  app.post("/api/auth/login", (req, res, next) => {
    passport.authenticate('local', (err: any, user: any, info: any) => {
      if (err) {
        return res.status(500).json({ message: "Authentication error" });
      }
      if (!user) {
        return res.status(401).json({ message: info?.message || "Authentication failed" });
      }
      
      req.login(user, (err) => {
        if (err) {
          return res.status(500).json({ message: "Login failed" });
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
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/auth/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
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
      res.status(500).json({ message: "Failed to fetch builders" });
    }
  });

  app.post("/api/builders", isAuthenticated, async (req, res) => {
    try {
      const validated = insertBuilderSchema.parse(req.body);
      const builder = await storage.createBuilder(validated);
      res.status(201).json(builder);
    } catch (error) {
      res.status(400).json({ message: "Invalid builder data", error });
    }
  });

  app.get("/api/builders/:id", isAuthenticated, async (req, res) => {
    try {
      const builder = await storage.getBuilder(req.params.id);
      if (!builder) {
        return res.status(404).json({ message: "Builder not found" });
      }
      res.json(builder);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch builder" });
    }
  });

  app.put("/api/builders/:id", isAuthenticated, async (req, res) => {
    try {
      const validated = insertBuilderSchema.partial().parse(req.body);
      const builder = await storage.updateBuilder(req.params.id, validated);
      if (!builder) {
        return res.status(404).json({ message: "Builder not found" });
      }
      res.json(builder);
    } catch (error) {
      res.status(400).json({ message: "Invalid builder data", error });
    }
  });

  app.delete("/api/builders/:id", isAuthenticated, async (req, res) => {
    try {
      const deleted = await storage.deleteBuilder(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Builder not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete builder" });
    }
  });

  app.get("/api/jobs", isAuthenticated, async (_req, res) => {
    try {
      const jobs = await storage.getAllJobs();
      res.json(jobs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch jobs" });
    }
  });

  app.post("/api/jobs", isAuthenticated, async (req, res) => {
    try {
      const validated = insertJobSchema.parse(req.body);
      const job = await storage.createJob(validated);
      res.status(201).json(job);
    } catch (error) {
      res.status(400).json({ message: "Invalid job data", error });
    }
  });

  app.get("/api/jobs/:id", isAuthenticated, async (req, res) => {
    try {
      const job = await storage.getJob(req.params.id);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }
      res.json(job);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch job" });
    }
  });

  app.put("/api/jobs/:id", isAuthenticated, async (req, res) => {
    try {
      const validated = insertJobSchema.partial().parse(req.body);
      const job = await storage.updateJob(req.params.id, validated);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }
      res.json(job);
    } catch (error) {
      res.status(400).json({ message: "Invalid job data", error });
    }
  });

  app.delete("/api/jobs/:id", isAuthenticated, async (req, res) => {
    try {
      const deleted = await storage.deleteJob(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Job not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete job" });
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

      res.status(400).json({ message: "Either jobId or startDate/endDate query parameters are required" });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch schedule events" });
    }
  });

  app.get("/api/schedule-events/sync", isAuthenticated, async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ message: "startDate and endDate query parameters are required" });
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
      console.error('[Routes] Error syncing from Google Calendar:', error);
      res.status(500).json({ message: "Failed to sync from Google Calendar", error });
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
        console.error('[Routes] Error syncing to Google Calendar:', syncError);
      }
      
      res.status(201).json(event);
    } catch (error) {
      res.status(400).json({ message: "Invalid schedule event data", error });
    }
  });

  app.get("/api/schedule-events/:id", isAuthenticated, async (req, res) => {
    try {
      const event = await storage.getScheduleEvent(req.params.id);
      if (!event) {
        return res.status(404).json({ message: "Schedule event not found" });
      }
      res.json(event);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch schedule event" });
    }
  });

  app.put("/api/schedule-events/:id", isAuthenticated, async (req, res) => {
    try {
      const validated = insertScheduleEventSchema.partial().parse(req.body);
      const event = await storage.updateScheduleEvent(req.params.id, validated);
      if (!event) {
        return res.status(404).json({ message: "Schedule event not found" });
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
        console.error('[Routes] Error syncing to Google Calendar:', syncError);
      }
      
      res.json(event);
    } catch (error) {
      res.status(400).json({ message: "Invalid schedule event data", error });
    }
  });

  app.delete("/api/schedule-events/:id", isAuthenticated, async (req, res) => {
    try {
      const event = await storage.getScheduleEvent(req.params.id);
      
      if (event?.googleCalendarEventId) {
        try {
          await googleCalendarService.deleteEventFromGoogle(event.googleCalendarEventId);
        } catch (syncError) {
          console.error('[Routes] Error deleting from Google Calendar:', syncError);
        }
      }
      
      const deleted = await storage.deleteScheduleEvent(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Schedule event not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete schedule event" });
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
      res.status(500).json({ message: "Failed to fetch expenses" });
    }
  });

  app.post("/api/expenses", isAuthenticated, async (req, res) => {
    try {
      const validated = insertExpenseSchema.parse(req.body);
      const expense = await storage.createExpense(validated);
      res.status(201).json(expense);
    } catch (error) {
      res.status(400).json({ message: "Invalid expense data", error });
    }
  });

  app.get("/api/expenses/:id", isAuthenticated, async (req, res) => {
    try {
      const expense = await storage.getExpense(req.params.id);
      if (!expense) {
        return res.status(404).json({ message: "Expense not found" });
      }
      res.json(expense);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch expense" });
    }
  });

  app.put("/api/expenses/:id", isAuthenticated, async (req, res) => {
    try {
      const validated = insertExpenseSchema.partial().parse(req.body);
      const expense = await storage.updateExpense(req.params.id, validated);
      if (!expense) {
        return res.status(404).json({ message: "Expense not found" });
      }
      res.json(expense);
    } catch (error) {
      res.status(400).json({ message: "Invalid expense data", error });
    }
  });

  app.delete("/api/expenses/:id", isAuthenticated, async (req, res) => {
    try {
      const deleted = await storage.deleteExpense(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Expense not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete expense" });
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
      res.status(500).json({ message: "Failed to fetch mileage logs" });
    }
  });

  app.post("/api/mileage-logs", isAuthenticated, async (req, res) => {
    try {
      const validated = insertMileageLogSchema.parse(req.body);
      const log = await storage.createMileageLog(validated);
      res.status(201).json(log);
    } catch (error) {
      res.status(400).json({ message: "Invalid mileage log data", error });
    }
  });

  app.get("/api/mileage-logs/:id", isAuthenticated, async (req, res) => {
    try {
      const log = await storage.getMileageLog(req.params.id);
      if (!log) {
        return res.status(404).json({ message: "Mileage log not found" });
      }
      res.json(log);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch mileage log" });
    }
  });

  app.put("/api/mileage-logs/:id", isAuthenticated, async (req, res) => {
    try {
      const validated = insertMileageLogSchema.partial().parse(req.body);
      const log = await storage.updateMileageLog(req.params.id, validated);
      if (!log) {
        return res.status(404).json({ message: "Mileage log not found" });
      }
      res.json(log);
    } catch (error) {
      res.status(400).json({ message: "Invalid mileage log data", error });
    }
  });

  app.delete("/api/mileage-logs/:id", isAuthenticated, async (req, res) => {
    try {
      const deleted = await storage.deleteMileageLog(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Mileage log not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete mileage log" });
    }
  });

  app.get("/api/report-templates", isAuthenticated, async (_req, res) => {
    try {
      const templates = await storage.getAllReportTemplates();
      res.json(templates);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch report templates" });
    }
  });

  app.post("/api/report-templates", isAuthenticated, async (req, res) => {
    try {
      const validated = insertReportTemplateSchema.parse(req.body);
      const template = await storage.createReportTemplate(validated);
      res.status(201).json(template);
    } catch (error) {
      res.status(400).json({ message: "Invalid report template data", error });
    }
  });

  app.get("/api/report-templates/:id", isAuthenticated, async (req, res) => {
    try {
      const template = await storage.getReportTemplate(req.params.id);
      if (!template) {
        return res.status(404).json({ message: "Report template not found" });
      }
      res.json(template);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch report template" });
    }
  });

  app.put("/api/report-templates/:id", isAuthenticated, async (req, res) => {
    try {
      const validated = insertReportTemplateSchema.partial().parse(req.body);
      const template = await storage.updateReportTemplate(req.params.id, validated);
      if (!template) {
        return res.status(404).json({ message: "Report template not found" });
      }
      res.json(template);
    } catch (error) {
      res.status(400).json({ message: "Invalid report template data", error });
    }
  });

  app.delete("/api/report-templates/:id", isAuthenticated, async (req, res) => {
    try {
      const deleted = await storage.deleteReportTemplate(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Report template not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete report template" });
    }
  });

  app.get("/api/report-instances", isAuthenticated, async (req, res) => {
    try {
      const { jobId } = req.query;

      if (jobId && typeof jobId === "string") {
        const instances = await storage.getReportInstancesByJob(jobId);
        return res.json(instances);
      }

      res.status(400).json({ message: "jobId query parameter is required" });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch report instances" });
    }
  });

  app.post("/api/report-instances", isAuthenticated, async (req, res) => {
    try {
      const validated = insertReportInstanceSchema.parse(req.body);
      const instance = await storage.createReportInstance(validated);
      res.status(201).json(instance);
    } catch (error) {
      res.status(400).json({ message: "Invalid report instance data", error });
    }
  });

  app.get("/api/report-instances/:id", isAuthenticated, async (req, res) => {
    try {
      const instance = await storage.getReportInstance(req.params.id);
      if (!instance) {
        return res.status(404).json({ message: "Report instance not found" });
      }
      res.json(instance);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch report instance" });
    }
  });

  app.put("/api/report-instances/:id", isAuthenticated, async (req, res) => {
    try {
      const validated = insertReportInstanceSchema.partial().parse(req.body);
      const instance = await storage.updateReportInstance(req.params.id, validated);
      if (!instance) {
        return res.status(404).json({ message: "Report instance not found" });
      }
      res.json(instance);
    } catch (error) {
      res.status(400).json({ message: "Invalid report instance data", error });
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
      console.error("Error generating PDF:", error);
      res.status(500).json({ 
        message: "Failed to generate PDF", 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  });

  // PDF Download endpoint
  app.get("/api/report-instances/:id/download-pdf", isAuthenticated, async (req, res) => {
    try {
      const instance = await storage.getReportInstance(req.params.id);
      if (!instance || !instance.pdfUrl) {
        return res.status(404).json({ message: "PDF not found" });
      }

      const objectStorageService = new ObjectStorageService();
      const file = await objectStorageService.getObjectEntityFile(instance.pdfUrl);
      
      if (!file) {
        return res.status(404).json({ message: "PDF file not found in storage" });
      }

      await objectStorageService.downloadObject(file, res);
    } catch (error) {
      console.error("Error downloading PDF:", error);
      res.status(500).json({ message: "Failed to download PDF" });
    }
  });

  // Object Storage Routes
  app.post("/api/objects/upload", isAuthenticated, async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const { uploadURL, objectPath } = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL, objectPath });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ message: "Failed to get upload URL", error: String(error) });
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
      console.error("Error checking object access:", error);
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
        return res.status(400).json({ error: "signatureUrl and signerName are required" });
      }

      const objectStorageService = new ObjectStorageService();
      
      // Normalize the signature path (handles both presigned HTTPS URLs and relative paths)
      const normalizedPath = objectStorageService.normalizeObjectEntityPath(signatureUrl);
      
      // Validate that normalization was successful
      if (!normalizedPath || !normalizedPath.startsWith("/")) {
        return res.status(400).json({ 
          error: "Invalid signature URL format" 
        });
      }
      
      // Wait for the file to exist before setting ACL
      const fileExists = await objectStorageService.waitForObjectEntity(normalizedPath, 10, 500);
      if (!fileExists) {
        return res.status(400).json({ 
          error: "Uploaded signature not found. Please ensure the signature was uploaded successfully." 
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
        return res.status(404).json({ message: "Job not found" });
      }

      res.json(job);
    } catch (error) {
      console.error("Error saving signature:", error);
      res.status(500).json({ message: "Failed to save signature", error: String(error) });
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
      res.status(500).json({ message: "Failed to fetch photos" });
    }
  });

  app.post("/api/photos", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!req.body.filePath) {
        return res.status(400).json({ error: "filePath is required" });
      }

      const objectStorageService = new ObjectStorageService();
      
      // Normalize the path first
      const normalizedPath = objectStorageService.normalizeObjectEntityPath(req.body.filePath);
      
      // Wait for the file to exist before setting ACL (uploaded files may take a moment to appear)
      if (normalizedPath.startsWith("/")) {
        const fileExists = await objectStorageService.waitForObjectEntity(normalizedPath, 10, 500);
        if (!fileExists) {
          return res.status(400).json({ 
            error: "Uploaded file not found. Please ensure the file was uploaded successfully before creating the photo record." 
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
      console.error("Error creating photo:", error);
      res.status(400).json({ message: "Invalid photo data", error: String(error) });
    }
  });

  app.get("/api/photos/:id", isAuthenticated, async (req, res) => {
    try {
      const photo = await storage.getPhoto(req.params.id);
      if (!photo) {
        return res.status(404).json({ message: "Photo not found" });
      }
      res.json(photo);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch photo" });
    }
  });

  app.patch("/api/photos/:id", isAuthenticated, async (req, res) => {
    try {
      const validated = insertPhotoSchema.partial().parse(req.body);
      const photo = await storage.updatePhoto(req.params.id, validated);
      if (!photo) {
        return res.status(404).json({ message: "Photo not found" });
      }
      res.json(photo);
    } catch (error) {
      res.status(400).json({ message: "Invalid photo data", error });
    }
  });

  app.delete("/api/photos/:id", isAuthenticated, async (req, res) => {
    try {
      const photo = await storage.getPhoto(req.params.id);
      if (!photo) {
        return res.status(404).json({ message: "Photo not found" });
      }
      
      if (photo.checklistItemId) {
        const checklistItem = await storage.getChecklistItem(photo.checklistItemId);
        if (checklistItem && checklistItem.photoCount > 0) {
          await storage.updateChecklistItem(photo.checklistItemId, {
            photoCount: checklistItem.photoCount - 1,
          });
        }
      }
      
      const deleted = await storage.deletePhoto(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Photo not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete photo" });
    }
  });

  app.get("/api/forecasts", isAuthenticated, async (req, res) => {
    try {
      const forecasts = await storage.getAllForecasts();
      res.json(forecasts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch forecasts" });
    }
  });

  app.get("/api/forecasts/:id", isAuthenticated, async (req, res) => {
    try {
      const forecast = await storage.getForecast(req.params.id);
      if (!forecast) {
        return res.status(404).json({ message: "Forecast not found" });
      }
      res.json(forecast);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch forecast" });
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
      res.status(500).json({ message: "Failed to fetch checklist items" });
    }
  });

  app.post("/api/checklist-items", isAuthenticated, async (req, res) => {
    try {
      const validated = insertChecklistItemSchema.parse(req.body);
      const item = await storage.createChecklistItem(validated);
      res.status(201).json(item);
    } catch (error) {
      res.status(400).json({ message: "Invalid checklist item data", error });
    }
  });

  app.get("/api/checklist-items/:id", isAuthenticated, async (req, res) => {
    try {
      const item = await storage.getChecklistItem(req.params.id);
      if (!item) {
        return res.status(404).json({ message: "Checklist item not found" });
      }
      res.json(item);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch checklist item" });
    }
  });

  app.patch("/api/checklist-items/:id", isAuthenticated, async (req, res) => {
    try {
      const validated = updateChecklistItemSchema.parse(req.body);
      const item = await storage.updateChecklistItem(req.params.id, validated);
      if (!item) {
        return res.status(404).json({ message: "Checklist item not found" });
      }
      res.json(item);
    } catch (error) {
      res.status(400).json({ message: "Invalid checklist item data", error });
    }
  });

  app.delete("/api/checklist-items/:id", isAuthenticated, async (req, res) => {
    try {
      const deleted = await storage.deleteChecklistItem(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Checklist item not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete checklist item" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
