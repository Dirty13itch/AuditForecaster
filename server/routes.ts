import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { googleCalendarService, getUncachableGoogleCalendarClient, allDayDateToUTC } from "./googleCalendar";
import { setupAuth, isAuthenticated, setupForceAdminEndpoint, getOidcConfig, getRegisteredStrategies } from "./auth";
import { ObjectStorageService, ObjectNotFoundError, objectStorageClient } from "./objectStorage";
import { ObjectPermission } from "./objectAcl";
import { generateReportPDF } from "./pdfGenerator.tsx";
import { generateThumbnail } from "./thumbnailGenerator";
import { healthz, readyz, status } from "./health";
import { generateToken, csrfSynchronisedProtection } from "./csrf";
import { createAuditLog } from "./auditLogger";
import { requireRole, checkResourceOwnership, canEdit, canCreate, canDelete, type UserRole } from "./permissions";
import { validateContactRole, categorizeAgreementExpiration } from "./builderService";
import {
  insertBuilderSchema,
  insertBuilderContactSchema,
  updateBuilderContactSchema,
  insertBuilderAgreementSchema,
  updateBuilderAgreementSchema,
  insertBuilderProgramSchema,
  updateBuilderProgramSchema,
  insertBuilderInteractionSchema,
  updateBuilderInteractionSchema,
  insertDevelopmentSchema,
  updateDevelopmentSchema,
  insertLotSchema,
  updateLotSchema,
  insertPlanSchema,
  insertJobSchema,
  insertScheduleEventSchema,
  insertExpenseSchema,
  insertMileageLogSchema,
  insertMileageRoutePointSchema,
  autoTripSchema,
  insertReportTemplateSchema,
  insertReportInstanceSchema,
  insertPhotoAlbumSchema,
  insertPhotoAlbumItemSchema,
  insertPhotoSchema,
  insertChecklistItemSchema,
  updateChecklistItemSchema,
  insertComplianceRuleSchema,
  insertForecastSchema,
  insertCalendarPreferenceSchema,
  insertUploadSessionSchema,
  insertEmailPreferenceSchema,
  insertBuilderAbbreviationSchema,
  insertBlowerDoorTestSchema,
  insertDuctLeakageTestSchema,
  insertVentilationTestSchema,
  insertInvoiceSchema,
  insertPaymentSchema,
  insertFinancialSettingsSchema,
  insertTaxCreditProjectSchema,
  insertTaxCreditRequirementSchema,
  insertTaxCreditDocumentSchema,
  insertUnitCertificationSchema,
  insertEquipmentSchema,
  insertEquipmentCalibrationSchema,
  insertEquipmentMaintenanceSchema,
  insertEquipmentCheckoutSchema,
  insertReportFieldValueSchema,
  insertScheduledExportSchema,
  updateScheduledExportSchema,
} from "@shared/schema";
import { emailService } from "./email/emailService";
import { jobAssignedTemplate } from "./email/templates/jobAssigned";
import { jobStatusChangedTemplate } from "./email/templates/jobStatusChanged";
import { reportReadyTemplate } from "./email/templates/reportReady";
import { calendarEventNotificationTemplate } from "./email/templates/calendarEventNotification";
import { paginationParamsSchema, cursorPaginationParamsSchema, photoCursorPaginationParamsSchema } from "@shared/pagination";
import {
  evaluateJobCompliance,
  evaluateReportCompliance,
  updateJobComplianceStatus,
  updateReportComplianceStatus,
} from "./complianceService";
import { calculateVentilationRequirements } from "./ventilationTests";
import { processCalendarEvents, type CalendarEvent } from './calendarImportService';
import { scheduledExportService } from './scheduledExports';
import { calculateACH50, checkMinnesotaCompliance } from './blowerDoorService';
import { z, ZodError } from "zod";
import { serverLogger } from "./logger";
import { validateAuthConfig, getRecentAuthErrors, sanitizeEnvironmentForClient, type ValidationReport } from "./auth/validation";
import { getConfig, isDevelopment } from "./config";
import { getTroubleshootingGuide, getAllTroubleshootingGuides, suggestTroubleshootingGuide } from "./auth/troubleshooting";
import { db } from "./db";
import { sql } from "drizzle-orm";
import { exportService, type ExportOptions } from "./exportService";
import { createReadStream } from "fs";
import { unlink } from "fs/promises";
import rateLimit from "express-rate-limit";

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
  // Health check endpoints (no authentication required for monitoring)
  app.get("/healthz", healthz);
  app.get("/readyz", readyz);
  app.get("/api/status", status);
  
  // Setup Replit Auth middleware
  await setupAuth(app);
  
  // Setup force admin endpoint (for emergency admin role assignment)
  await setupForceAdminEndpoint(app);

  // CSRF token generation endpoint (must be authenticated)
  app.get("/api/csrf-token", isAuthenticated, (req, res) => {
    try {
      const csrfToken = generateToken(req, res);
      res.json({ csrfToken });
    } catch (error) {
      logError('CSRF/GenerateToken', error);
      res.status(500).json({ message: "Failed to generate CSRF token" });
    }
  });

  // Replit Auth route - get authenticated user
  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      // CRITICAL FIX: Use the session user directly (already contains database data)
      const sessionUser = req.user;
      
      serverLogger.info(`[API/Auth/User] SESSION CONTAINS: ${JSON.stringify({
        id: sessionUser.id,
        email: sessionUser.email,
        role: sessionUser.role,
        firstName: sessionUser.firstName,
        lastName: sessionUser.lastName,
        hasDbData: !!sessionUser.id && !!sessionUser.role,
        claimsSubPresent: !!sessionUser.claims?.sub
      })}`);
      
      // The session now contains the full database user (fixed in verify function)
      if (!sessionUser.id || !sessionUser.email) {
        serverLogger.error(`[API/Auth/User] Invalid session user - missing core fields`);
        return res.status(404).json({ message: "User not found" });
      }
      
      // Return the user data from session (no database query needed!)
      serverLogger.info(`[API/Auth/User] Returning user ${sessionUser.id} (${sessionUser.email}) with role: ${sessionUser.role}`);
      res.json({
        id: sessionUser.id,
        email: sessionUser.email,
        firstName: sessionUser.firstName,
        lastName: sessionUser.lastName,
        role: sessionUser.role || 'inspector', // Fallback for safety
        profileImageUrl: sessionUser.profileImageUrl,
        createdAt: sessionUser.createdAt,
        updatedAt: sessionUser.updatedAt
      });
    } catch (error) {
      logError('Auth/GetUser', error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Get all inspectors - for dynamic assignment UI
  app.get("/api/users/inspectors", isAuthenticated, requireRole('admin'), async (req: any, res) => {
    try {
      const inspectors = await storage.getUsersByRole('inspector');
      res.json(inspectors);
    } catch (error) {
      logError('Users/GetInspectors', error);
      res.status(500).json({ message: "Failed to fetch inspectors" });
    }
  });
  
  // TEMPORARY: Manual admin role override (development only)
  // This endpoint allows manually setting a user's role to admin by email
  app.post("/api/dev/set-admin-role", async (req: any, res) => {
    // Only allow in development mode
    if (!isDevelopment()) {
      return res.status(404).json({ message: "Not found" });
    }
    
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ message: "Email required" });
      }
      
      serverLogger.warn(`[DEV] Manual admin role override requested for: ${email}`);
      
      // Find user by email
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ message: `User with email ${email} not found` });
      }
      
      // Update user role to admin using raw SQL
      await db.update(users)
        .set({ role: 'admin', updatedAt: new Date() })
        .where(eq(users.email, email));
      
      // Get updated user
      const updatedUser = await storage.getUserByEmail(email);
      
      serverLogger.warn(`[DEV] ✅ Admin role set for user: ${updatedUser?.id} (${email})`);
      res.json({ 
        message: "Admin role set successfully", 
        user: updatedUser 
      });
    } catch (error) {
      logError('Dev/SetAdminRole', error);
      res.status(500).json({ message: "Failed to set admin role" });
    }
  });

  // DEV MODE: Instant login endpoint (development only)
  // SECURITY: Returns 404 in production to ensure this endpoint is completely inaccessible
  app.get("/api/dev-login/:userId", async (req: any, res) => {
    // CRITICAL: Check development mode first - return 404 in production
    if (!isDevelopment()) {
      return res.status(404).json({ message: "Not found" });
    }

    try {
      const { userId } = req.params;
      
      // Get user from database
      const user = await storage.getUser(userId);
      if (!user) {
        serverLogger.warn(`[DevLogin] Attempt to login as non-existent user: ${userId}`);
        return res.status(404).json({ message: "User not found" });
      }

      // Create passport user object that mimics OAuth flow
      const passportUser = {
        claims: {
          sub: userId,
          email: user.email || '',
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
          first_name: user.firstName || '',
          last_name: user.lastName || '',
        },
        role: user.role || 'inspector',
        // Set far future expiry for dev sessions (1 week)
        expires_at: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60),
      };

      // Use passport's login mechanism to establish session
      req.login(passportUser, async (err) => {
        if (err) {
          serverLogger.error(`[DevLogin] Failed to establish passport session: ${err}`);
          return res.status(500).json({ message: "Failed to establish session" });
        }

        // Log the dev login for audit trail
        serverLogger.warn(`[DevLogin] ⚠️  DEV MODE LOGIN: User ${userId} (${user.email}) logged in via dev endpoint`);
        
        // Create audit log entry
        await createAuditLog(req, {
          userId,
          action: 'dev_login',
          resourceType: 'user',
          resourceId: userId,
          metadata: { 
            message: 'Development mode authentication bypass used',
            userAgent: req.headers['user-agent'],
            ip: req.ip
          },
        }, storage);

        // Redirect to dashboard
        res.redirect('/');
      });
    } catch (error) {
      logError('DevLogin', error);
      res.status(500).json({ message: "Dev login failed" });
    }
  });

  // DEV MODE: Status endpoint to check if dev mode is active
  // SECURITY: Returns 404 in production
  app.get("/api/dev/status", (req, res) => {
    if (!isDevelopment()) {
      return res.status(404).json({ message: "Not found" });
    }

    res.json({
      enabled: true,
      activeSession: !!(req as any).user?.claims?.sub,
    });
  });

  // Health endpoint - unauthenticated, production-safe
  app.get("/api/health", async (req, res) => {
    try {
      const config = getConfig();
      const report = await validateAuthConfig({ 
        skipOIDC: false,
        skipDatabase: false 
      });

      const oidcResult = report.results.find(r => r.component === 'OIDC Discovery');
      const dbResult = report.results.find(r => r.component === 'Database Connectivity');
      const domainsResult = report.results.find(r => r.component === 'Registered Domains');
      
      const health = {
        status: report.overall === 'pass' ? 'healthy' : report.overall === 'degraded' ? 'degraded' : 'unhealthy',
        timestamp: report.timestamp,
        version: process.env.npm_package_version || '1.0.0',
        environment: config.nodeEnv,
        components: {
          oidc: {
            status: oidcResult?.status === 'pass' ? 'working' : 'failed',
            message: oidcResult?.message,
            error: oidcResult?.error,
          },
          database: {
            status: dbResult?.status === 'pass' ? 'connected' : dbResult?.status === 'warning' ? 'not_configured' : 'disconnected',
            message: dbResult?.message,
            error: dbResult?.error,
          },
          sessionStore: {
            status: config.databaseUrl ? 'postgresql' : 'in_memory',
            message: config.databaseUrl 
              ? 'Using PostgreSQL session store' 
              : 'Using in-memory session store (development only)',
          },
          domains: {
            registered: config.replitDomains,
            status: domainsResult?.status === 'pass' ? 'valid' : 'invalid',
            message: domainsResult?.message,
          },
          currentDomain: {
            hostname: req.hostname,
            status: config.replitDomains.some(d => req.hostname.endsWith(d) || req.hostname === d) 
              ? 'recognized' 
              : 'unknown',
          },
        },
      };

      const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503;
      res.status(statusCode).json(health);
    } catch (error) {
      logError('Health/Check', error);
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Health check failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Diagnostics endpoint - authenticated admin only
  // SECURITY WARNING: This endpoint is production-safe because it uses sanitizeEnvironmentForClient()
  // to ensure NO secrets (SESSION_SECRET, DATABASE_URL credentials, full REPL_ID) are exposed
  app.get("/api/auth/diagnostics", isAuthenticated, requireRole('admin'), async (req: any, res) => {
    try {
      const config = getConfig();
      const oidcConfig = await getOidcConfig();
      const metadata = oidcConfig.serverMetadata();
      const strategies = getRegisteredStrategies();
      const recentErrors = getRecentAuthErrors();
      
      const report = await validateAuthConfig({ 
        skipOIDC: false,
        skipDatabase: false 
      });

      let sessionStats: any = null;
      if (config.databaseUrl) {
        try {
          const sessionCountResult = await db.execute(sql`
            SELECT COUNT(*) as total,
                   COUNT(CASE WHEN expire > NOW() THEN 1 END) as active,
                   COUNT(CASE WHEN expire <= NOW() THEN 1 END) as expired
            FROM sessions
          `);
          sessionStats = {
            total: parseInt(sessionCountResult.rows[0]?.total as string || '0'),
            active: parseInt(sessionCountResult.rows[0]?.active as string || '0'),
            expired: parseInt(sessionCountResult.rows[0]?.expired as string || '0'),
          };
        } catch (error) {
          sessionStats = { error: 'Failed to fetch session statistics' };
        }
      }

      const domainMappingTests = config.replitDomains.map(domain => {
        const testHostnames = [
          domain,
          `www.${domain}`,
          `subdomain.${domain}`,
        ];
        
        return {
          domain,
          tests: testHostnames.map(hostname => ({
            hostname,
            wouldMatch: hostname === domain || hostname.endsWith(domain),
          })),
        };
      });

      // SECURITY: Use sanitized environment data to prevent secret exposure
      const sanitizedEnv = sanitizeEnvironmentForClient();

      const diagnostics = {
        timestamp: new Date().toISOString(),
        validationReport: report,
        oidcConfiguration: {
          issuer: metadata.issuer,
          authorizationEndpoint: metadata.authorization_endpoint,
          tokenEndpoint: metadata.token_endpoint,
          userinfoEndpoint: metadata.userinfo_endpoint,
          endSessionEndpoint: metadata.end_session_endpoint,
          jwksUri: metadata.jwks_uri,
          rfc9207Support: metadata.authorization_response_iss_parameter_supported || false,
          scopesSupported: metadata.scopes_supported,
          responseTypesSupported: metadata.response_types_supported,
        },
        registeredStrategies: strategies.map(name => ({
          name,
          domain: name.replace('replitauth:', ''),
        })),
        domainMappingTests,
        sessionStore: {
          type: config.databaseUrl ? 'postgresql' : 'in_memory',
          statistics: sessionStats,
        },
        recentAuthErrors: recentErrors.slice(0, 100),
        // SECURITY: Only use sanitized environment data
        environment: sanitizedEnv,
      };

      res.json(diagnostics);
    } catch (error) {
      logError('Auth/Diagnostics', error);
      res.status(500).json({ 
        message: "Failed to generate diagnostics",
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Auth metrics endpoint - authenticated admin only
  app.get("/api/auth/metrics", isAuthenticated, requireRole('admin'), async (req: any, res) => {
    try {
      const { authMonitoring } = await import("./auth/monitoring");
      const metrics = authMonitoring.getMetrics();
      res.json(metrics);
    } catch (error) {
      logError('Auth/Metrics', error);
      res.status(500).json({ 
        message: "Failed to fetch auth metrics",
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Troubleshooting guide endpoint - public (no auth required)
  app.get("/api/auth/troubleshooting/:code?", async (req, res) => {
    try {
      const { code } = req.params;
      
      if (code) {
        const guide = getTroubleshootingGuide(code);
        
        if (guide) {
          res.json(guide);
        } else {
          const generalGuide = getTroubleshootingGuide('GENERAL_AUTH_ERROR');
          res.status(404).json({
            message: `No troubleshooting guide found for code: ${code}`,
            fallbackGuide: generalGuide,
          });
        }
      } else {
        const allGuides = getAllTroubleshootingGuides();
        res.json({
          guides: allGuides,
          total: allGuides.length,
          categories: {
            configuration: allGuides.filter(g => g.category === 'configuration').length,
            network: allGuides.filter(g => g.category === 'network').length,
            environment: allGuides.filter(g => g.category === 'environment').length,
            infrastructure: allGuides.filter(g => g.category === 'infrastructure').length,
          },
        });
      }
    } catch (error) {
      logError('Auth/Troubleshooting', error);
      res.status(500).json({ 
        message: "Failed to fetch troubleshooting guide",
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Dev mode login bypass - development only
  app.get("/api/dev/login-as", async (req: any, res) => {
    const { devModeLogin } = await import("./auth/devMode");
    await devModeLogin(req, res);
  });

  // Dev mode status endpoint - check if dev mode is enabled
  app.get("/api/dev/status", async (req: any, res) => {
    try {
      const { getDevModeStatus } = await import("./auth/devMode");
      const status = getDevModeStatus(req);
      res.json(status);
    } catch (error) {
      logError('DevMode/Status', error);
      res.status(500).json({ 
        message: "Failed to check dev mode status",
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Domain testing endpoint - authenticated admin only
  app.post("/api/auth/test-domain", isAuthenticated, requireRole('admin'), async (req: any, res) => {
    try {
      const { domain } = req.body;
      
      if (!domain || typeof domain !== 'string') {
        return res.status(400).json({ 
          message: "Domain is required and must be a string",
        });
      }

      const config = getConfig();
      const registeredDomains = config.replitDomains;
      
      // Test if domain would be recognized
      const exactMatch = registeredDomains.find(d => d === domain);
      const endsWithMatch = registeredDomains.find(d => domain.endsWith(d));
      const localhostFallback = domain === 'localhost' && registeredDomains.length > 0;
      
      let recognized = false;
      let strategy: string | null = null;
      let matchType: 'exact' | 'subdomain' | 'localhost_fallback' | 'none' = 'none';
      let matchedDomain: string | null = null;
      
      if (exactMatch) {
        recognized = true;
        strategy = `replitauth:${exactMatch}`;
        matchType = 'exact';
        matchedDomain = exactMatch;
      } else if (endsWithMatch) {
        recognized = true;
        strategy = `replitauth:${endsWithMatch}`;
        matchType = 'subdomain';
        matchedDomain = endsWithMatch;
      } else if (localhostFallback) {
        recognized = true;
        strategy = `replitauth:${registeredDomains[0]}`;
        matchType = 'localhost_fallback';
        matchedDomain = registeredDomains[0];
      }
      
      const result = {
        domain,
        recognized,
        strategy,
        matchType,
        matchedDomain,
        registeredDomains,
        explanation: recognized 
          ? matchType === 'exact'
            ? `Domain matches exactly with registered domain: ${matchedDomain}`
            : matchType === 'subdomain'
            ? `Domain is a subdomain of registered domain: ${matchedDomain}`
            : `Localhost development mode: falls back to first registered domain: ${matchedDomain}`
          : `Domain does not match any registered domains. Available: ${registeredDomains.join(', ')}`,
      };
      
      res.json(result);
    } catch (error) {
      logError('Auth/TestDomain', error);
      res.status(500).json({ 
        message: "Failed to test domain",
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  app.get("/api/builders", isAuthenticated, async (req: any, res) => {
    try {
      const userRole = (req.user.role as UserRole) || 'inspector';
      const userId = req.user.id;
      
      // Inspectors only see their own builders
      if (userRole === 'inspector') {
        const builders = await storage.getBuildersByUser(userId);
        return res.json(builders);
      }
      
      // Admins/managers see all builders
      if (req.query.limit !== undefined || req.query.offset !== undefined) {
        const params = paginationParamsSchema.parse(req.query);
        const result = await storage.getBuildersPaginated(params);
        return res.json(result);
      }
      const builders = await storage.getAllBuilders();
      res.json(builders);
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'fetch builders');
      res.status(status).json({ message });
    }
  });

  app.post("/api/builders", isAuthenticated, requireRole('admin', 'inspector'), csrfSynchronisedProtection, async (req: any, res) => {
    try {
      const validated = insertBuilderSchema.parse(req.body);
      // Set createdBy to current user
      validated.createdBy = req.user.id;
      const builder = await storage.createBuilder(validated);
      
      // Audit log: Builder creation
      await createAuditLog(req, {
        userId: req.user.id,
        action: 'builder.create',
        resourceType: 'builder',
        resourceId: builder.id,
        metadata: { builderName: builder.name, companyName: builder.companyName },
      }, storage);
      
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

  app.get("/api/builders/:id", isAuthenticated, async (req: any, res) => {
    try {
      const builder = await storage.getBuilder(req.params.id);
      if (!builder) {
        return res.status(404).json({ message: "Builder not found. It may have been deleted." });
      }
      
      // Check ownership using checkResourceOwnership
      if (!checkResourceOwnership(builder.createdBy, req.user.id, req.user.role)) {
        return res.status(403).json({ message: "Forbidden: Cannot access this builder" });
      }
      
      res.json(builder);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch builder');
      res.status(status).json({ message });
    }
  });

  app.put("/api/builders/:id", isAuthenticated, requireRole('admin', 'inspector'), csrfSynchronisedProtection, async (req: any, res) => {
    try {
      const validated = insertBuilderSchema.partial().parse(req.body);
      const builder = await storage.updateBuilder(req.params.id, validated);
      if (!builder) {
        return res.status(404).json({ message: "Builder not found. It may have been deleted." });
      }
      
      // Audit log: Builder update
      await createAuditLog(req, {
        userId: req.user.id,
        action: 'builder.update',
        resourceType: 'builder',
        resourceId: req.params.id,
        changes: validated,
        metadata: { builderName: builder.name, companyName: builder.companyName },
      }, storage);
      
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

  app.delete("/api/builders/:id", isAuthenticated, requireRole('admin'), csrfSynchronisedProtection, async (req: any, res) => {
    try {
      const builder = await storage.getBuilder(req.params.id);
      const deleted = await storage.deleteBuilder(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Builder not found. It may have already been deleted." });
      }
      
      // Audit log: Builder deletion
      if (builder) {
        await createAuditLog(req, {
          userId: req.user.id,
          action: 'builder.delete',
          resourceType: 'builder',
          resourceId: req.params.id,
          metadata: { builderName: builder.name, companyName: builder.companyName },
        }, storage);
      }
      
      res.status(204).send();
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'delete builder');
      res.status(status).json({ message });
    }
  });

  // Builder Contacts routes
  app.get("/api/builders/:builderId/contacts", isAuthenticated, async (req, res) => {
    try {
      const contacts = await storage.getBuilderContacts(req.params.builderId);
      res.json(contacts);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch builder contacts');
      res.status(status).json({ message });
    }
  });

  app.post("/api/builders/:builderId/contacts", isAuthenticated, requireRole('admin', 'inspector'), csrfSynchronisedProtection, async (req: any, res) => {
    try {
      const validated = insertBuilderContactSchema.parse({
        ...req.body,
        builderId: req.params.builderId,
      });
      // Set createdBy to current user
      validated.createdBy = req.user.id;
      const contact = await storage.createBuilderContact(validated);
      
      const builder = await storage.getBuilder(req.params.builderId);
      await createAuditLog(req, {
        userId: req.user.id,
        action: 'builder_contact.create',
        resourceType: 'builder_contact',
        resourceId: contact.id,
        changes: validated,
        metadata: { 
          builderName: builder?.name,
          contactName: contact.name,
          contactRole: contact.role,
        },
      }, storage);
      
      res.status(201).json(contact);
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'create builder contact');
      res.status(status).json({ message });
    }
  });

  app.get("/api/builders/:builderId/contacts/:id", isAuthenticated, async (req, res) => {
    try {
      const contact = await storage.getBuilderContact(req.params.id);
      if (!contact) {
        return res.status(404).json({ message: "Contact not found" });
      }
      if (contact.builderId !== req.params.builderId) {
        return res.status(404).json({ message: "Contact not found for this builder" });
      }
      res.json(contact);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch builder contact');
      res.status(status).json({ message });
    }
  });

  app.put("/api/builders/:builderId/contacts/:id", isAuthenticated, requireRole('admin', 'inspector'), csrfSynchronisedProtection, async (req: any, res) => {
    try {
      const existing = await storage.getBuilderContact(req.params.id);
      if (!existing) {
        return res.status(404).json({ message: "Contact not found" });
      }
      if (existing.builderId !== req.params.builderId) {
        return res.status(404).json({ message: "Contact not found for this builder" });
      }

      const validated = updateBuilderContactSchema.parse(req.body);
      const contact = await storage.updateBuilderContact(req.params.id, validated);
      
      if (!contact) {
        return res.status(404).json({ message: "Contact not found" });
      }
      
      const builder = await storage.getBuilder(req.params.builderId);
      await createAuditLog(req, {
        userId: req.user.id,
        action: 'builder_contact.update',
        resourceType: 'builder_contact',
        resourceId: req.params.id,
        changes: validated,
        metadata: { 
          builderName: builder?.name,
          contactName: contact.name,
          contactRole: contact.role,
        },
      }, storage);
      
      res.json(contact);
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'update builder contact');
      res.status(status).json({ message });
    }
  });

  app.delete("/api/builders/:builderId/contacts/:id", isAuthenticated, requireRole('admin', 'inspector'), csrfSynchronisedProtection, async (req: any, res) => {
    try {
      const contact = await storage.getBuilderContact(req.params.id);
      if (!contact) {
        return res.status(404).json({ message: "Contact not found" });
      }
      if (contact.builderId !== req.params.builderId) {
        return res.status(404).json({ message: "Contact not found for this builder" });
      }

      const deleted = await storage.deleteBuilderContact(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Contact not found" });
      }
      
      const builder = await storage.getBuilder(req.params.builderId);
      await createAuditLog(req, {
        userId: req.user.id,
        action: 'builder_contact.delete',
        resourceType: 'builder_contact',
        resourceId: req.params.id,
        metadata: { 
          builderName: builder?.name,
          contactName: contact.name,
          contactRole: contact.role,
        },
      }, storage);
      
      res.status(204).send();
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'delete builder contact');
      res.status(status).json({ message });
    }
  });

  app.put("/api/builders/:builderId/contacts/:id/primary", isAuthenticated, requireRole('admin', 'inspector'), csrfSynchronisedProtection, async (req: any, res) => {
    try {
      const contact = await storage.getBuilderContact(req.params.id);
      if (!contact) {
        return res.status(404).json({ message: "Contact not found" });
      }
      if (contact.builderId !== req.params.builderId) {
        return res.status(404).json({ message: "Contact not found for this builder" });
      }

      await storage.setPrimaryContact(req.params.builderId, req.params.id);
      
      const builder = await storage.getBuilder(req.params.builderId);
      await createAuditLog(req, {
        userId: req.user.id,
        action: 'builder_contact.set_primary',
        resourceType: 'builder_contact',
        resourceId: req.params.id,
        metadata: { 
          builderName: builder?.name,
          contactName: contact.name,
          contactRole: contact.role,
        },
      }, storage);
      
      res.status(204).send();
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'set primary contact');
      res.status(status).json({ message });
    }
  });

  // Builder Agreements routes
  app.get("/api/builders/:builderId/agreements", isAuthenticated, async (req, res) => {
    try {
      const agreements = await storage.getBuilderAgreements(req.params.builderId);
      res.json(agreements);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch builder agreements');
      res.status(status).json({ message });
    }
  });

  app.post("/api/builders/:builderId/agreements", isAuthenticated, requireRole('admin', 'inspector'), csrfSynchronisedProtection, async (req: any, res) => {
    try {
      const validated = insertBuilderAgreementSchema.parse({ ...req.body, builderId: req.params.builderId });
      // Set createdBy to current user
      validated.createdBy = req.user.id;
      const agreement = await storage.createBuilderAgreement(validated);
      
      const builder = await storage.getBuilder(req.params.builderId);
      await createAuditLog(req, {
        userId: req.user.id,
        action: 'builder_agreement.create',
        resourceType: 'builder_agreement',
        resourceId: agreement.id,
        metadata: { 
          builderName: builder?.name,
          agreementName: agreement.agreementName,
          status: agreement.status,
        },
      }, storage);
      
      res.status(201).json(agreement);
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'create builder agreement');
      res.status(status).json({ message });
    }
  });

  app.get("/api/builders/:builderId/agreements/:id", isAuthenticated, async (req, res) => {
    try {
      const agreement = await storage.getBuilderAgreement(req.params.id);
      if (!agreement) {
        return res.status(404).json({ message: "Agreement not found" });
      }
      if (agreement.builderId !== req.params.builderId) {
        return res.status(404).json({ message: "Agreement not found for this builder" });
      }
      res.json(agreement);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch builder agreement');
      res.status(status).json({ message });
    }
  });

  app.put("/api/builders/:builderId/agreements/:id", isAuthenticated, requireRole('admin', 'inspector'), csrfSynchronisedProtection, async (req: any, res) => {
    try {
      const existing = await storage.getBuilderAgreement(req.params.id);
      if (!existing) {
        return res.status(404).json({ message: "Agreement not found" });
      }
      if (existing.builderId !== req.params.builderId) {
        return res.status(404).json({ message: "Agreement not found for this builder" });
      }

      const validated = updateBuilderAgreementSchema.parse(req.body);
      const agreement = await storage.updateBuilderAgreement(req.params.id, validated);
      
      const builder = await storage.getBuilder(req.params.builderId);
      await createAuditLog(req, {
        userId: req.user.id,
        action: 'builder_agreement.update',
        resourceType: 'builder_agreement',
        resourceId: req.params.id,
        changes: validated,
        metadata: { 
          builderName: builder?.name,
          agreementName: agreement?.agreementName,
        },
      }, storage);
      
      res.json(agreement);
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'update builder agreement');
      res.status(status).json({ message });
    }
  });

  app.delete("/api/builders/:builderId/agreements/:id", isAuthenticated, requireRole('admin', 'inspector'), csrfSynchronisedProtection, async (req: any, res) => {
    try {
      const agreement = await storage.getBuilderAgreement(req.params.id);
      if (!agreement) {
        return res.status(404).json({ message: "Agreement not found" });
      }
      if (agreement.builderId !== req.params.builderId) {
        return res.status(404).json({ message: "Agreement not found for this builder" });
      }

      const deleted = await storage.deleteBuilderAgreement(req.params.id);
      
      const builder = await storage.getBuilder(req.params.builderId);
      await createAuditLog(req, {
        userId: req.user.id,
        action: 'builder_agreement.delete',
        resourceType: 'builder_agreement',
        resourceId: req.params.id,
        metadata: { 
          builderName: builder?.name,
          agreementName: agreement.agreementName,
        },
      }, storage);
      
      res.status(204).send();
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'delete builder agreement');
      res.status(status).json({ message });
    }
  });

  // Builder Programs routes
  app.get("/api/builders/:builderId/programs", isAuthenticated, async (req, res) => {
    try {
      const programs = await storage.getBuilderPrograms(req.params.builderId);
      res.json(programs);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch builder programs');
      res.status(status).json({ message });
    }
  });

  app.post("/api/builders/:builderId/programs", isAuthenticated, requireRole('admin', 'inspector'), csrfSynchronisedProtection, async (req: any, res) => {
    try {
      const validated = insertBuilderProgramSchema.parse({ ...req.body, builderId: req.params.builderId });
      // Set createdBy to current user
      validated.createdBy = req.user.id;
      const program = await storage.createBuilderProgram(validated);
      
      const builder = await storage.getBuilder(req.params.builderId);
      await createAuditLog(req, {
        userId: req.user.id,
        action: 'builder_program.create',
        resourceType: 'builder_program',
        resourceId: program.id,
        metadata: { 
          builderName: builder?.name,
          programName: program.programName,
          programType: program.programType,
        },
      }, storage);
      
      res.status(201).json(program);
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'create builder program');
      res.status(status).json({ message });
    }
  });

  app.get("/api/builders/:builderId/programs/:id", isAuthenticated, async (req, res) => {
    try {
      const program = await storage.getBuilderProgram(req.params.id);
      if (!program) {
        return res.status(404).json({ message: "Program not found" });
      }
      if (program.builderId !== req.params.builderId) {
        return res.status(404).json({ message: "Program not found for this builder" });
      }
      res.json(program);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch builder program');
      res.status(status).json({ message });
    }
  });

  app.put("/api/builders/:builderId/programs/:id", isAuthenticated, requireRole('admin', 'inspector'), csrfSynchronisedProtection, async (req: any, res) => {
    try {
      const existing = await storage.getBuilderProgram(req.params.id);
      if (!existing) {
        return res.status(404).json({ message: "Program not found" });
      }
      if (existing.builderId !== req.params.builderId) {
        return res.status(404).json({ message: "Program not found for this builder" });
      }

      const validated = updateBuilderProgramSchema.parse(req.body);
      const program = await storage.updateBuilderProgram(req.params.id, validated);
      
      const builder = await storage.getBuilder(req.params.builderId);
      await createAuditLog(req, {
        userId: req.user.id,
        action: 'builder_program.update',
        resourceType: 'builder_program',
        resourceId: req.params.id,
        changes: validated,
        metadata: { 
          builderName: builder?.name,
          programName: program?.programName,
        },
      }, storage);
      
      res.json(program);
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'update builder program');
      res.status(status).json({ message });
    }
  });

  app.delete("/api/builders/:builderId/programs/:id", isAuthenticated, requireRole('admin', 'inspector'), csrfSynchronisedProtection, async (req: any, res) => {
    try {
      const program = await storage.getBuilderProgram(req.params.id);
      if (!program) {
        return res.status(404).json({ message: "Program not found" });
      }
      if (program.builderId !== req.params.builderId) {
        return res.status(404).json({ message: "Program not found for this builder" });
      }

      const deleted = await storage.deleteBuilderProgram(req.params.id);
      
      const builder = await storage.getBuilder(req.params.builderId);
      await createAuditLog(req, {
        userId: req.user.id,
        action: 'builder_program.delete',
        resourceType: 'builder_program',
        resourceId: req.params.id,
        metadata: { 
          builderName: builder?.name,
          programName: program.programName,
        },
      }, storage);
      
      res.status(204).send();
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'delete builder program');
      res.status(status).json({ message });
    }
  });

  // Builder Interactions routes
  app.get("/api/builders/:builderId/interactions", isAuthenticated, async (req, res) => {
    try {
      const interactions = await storage.getBuilderInteractions(req.params.builderId);
      res.json(interactions);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch builder interactions');
      res.status(status).json({ message });
    }
  });

  app.post("/api/builders/:builderId/interactions", isAuthenticated, requireRole('admin', 'inspector'), csrfSynchronisedProtection, async (req: any, res) => {
    try {
      const validated = insertBuilderInteractionSchema.parse({ 
        ...req.body, 
        builderId: req.params.builderId,
        createdBy: req.user.id,
      });
      const interaction = await storage.createBuilderInteraction(validated);
      
      const builder = await storage.getBuilder(req.params.builderId);
      await createAuditLog(req, {
        userId: req.user.id,
        action: 'builder_interaction.create',
        resourceType: 'builder_interaction',
        resourceId: interaction.id,
        metadata: { 
          builderName: builder?.name,
          interactionType: interaction.interactionType,
          subject: interaction.subject,
        },
      }, storage);
      
      res.status(201).json(interaction);
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'create builder interaction');
      res.status(status).json({ message });
    }
  });

  app.get("/api/builders/:builderId/interactions/:id", isAuthenticated, async (req, res) => {
    try {
      const interaction = await storage.getBuilderInteraction(req.params.id);
      if (!interaction) {
        return res.status(404).json({ message: "Interaction not found" });
      }
      if (interaction.builderId !== req.params.builderId) {
        return res.status(404).json({ message: "Interaction not found for this builder" });
      }
      res.json(interaction);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch builder interaction');
      res.status(status).json({ message });
    }
  });

  app.put("/api/builders/:builderId/interactions/:id", isAuthenticated, requireRole('admin', 'inspector'), csrfSynchronisedProtection, async (req: any, res) => {
    try {
      const existing = await storage.getBuilderInteraction(req.params.id);
      if (!existing) {
        return res.status(404).json({ message: "Interaction not found" });
      }
      if (existing.builderId !== req.params.builderId) {
        return res.status(404).json({ message: "Interaction not found for this builder" });
      }

      const validated = updateBuilderInteractionSchema.parse(req.body);
      const interaction = await storage.updateBuilderInteraction(req.params.id, validated);
      
      const builder = await storage.getBuilder(req.params.builderId);
      await createAuditLog(req, {
        userId: req.user.id,
        action: 'builder_interaction.update',
        resourceType: 'builder_interaction',
        resourceId: req.params.id,
        changes: validated,
        metadata: { 
          builderName: builder?.name,
          subject: interaction?.subject,
        },
      }, storage);
      
      res.json(interaction);
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'update builder interaction');
      res.status(status).json({ message });
    }
  });

  app.delete("/api/builders/:builderId/interactions/:id", isAuthenticated, requireRole('admin', 'inspector'), csrfSynchronisedProtection, async (req: any, res) => {
    try {
      const interaction = await storage.getBuilderInteraction(req.params.id);
      if (!interaction) {
        return res.status(404).json({ message: "Interaction not found" });
      }
      if (interaction.builderId !== req.params.builderId) {
        return res.status(404).json({ message: "Interaction not found for this builder" });
      }

      const deleted = await storage.deleteBuilderInteraction(req.params.id);
      
      const builder = await storage.getBuilder(req.params.builderId);
      await createAuditLog(req, {
        userId: req.user.id,
        action: 'builder_interaction.delete',
        resourceType: 'builder_interaction',
        resourceId: req.params.id,
        metadata: { 
          builderName: builder?.name,
          subject: interaction.subject,
        },
      }, storage);
      
      res.status(204).send();
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'delete builder interaction');
      res.status(status).json({ message });
    }
  });

  // Developments routes
  app.get("/api/builders/:builderId/developments", isAuthenticated, async (req, res) => {
    try {
      const developments = await storage.getDevelopments(req.params.builderId);
      res.json(developments);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch developments');
      res.status(status).json({ message });
    }
  });

  app.post("/api/builders/:builderId/developments", isAuthenticated, requireRole('admin', 'inspector'), csrfSynchronisedProtection, async (req: any, res) => {
    try {
      const validated = insertDevelopmentSchema.parse({ ...req.body, builderId: req.params.builderId });
      // Set createdBy to current user
      validated.createdBy = req.user.id;
      const development = await storage.createDevelopment(validated);
      
      const builder = await storage.getBuilder(req.params.builderId);
      await createAuditLog(req, {
        userId: req.user.id,
        action: 'development.create',
        resourceType: 'development',
        resourceId: development.id,
        metadata: { 
          builderName: builder?.name,
          developmentName: development.name,
          status: development.status,
        },
      }, storage);
      
      res.status(201).json(development);
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'create development');
      res.status(status).json({ message });
    }
  });

  app.get("/api/builders/:builderId/developments/:id", isAuthenticated, async (req, res) => {
    try {
      const development = await storage.getDevelopment(req.params.id);
      if (!development) {
        return res.status(404).json({ message: "Development not found" });
      }
      if (development.builderId !== req.params.builderId) {
        return res.status(404).json({ message: "Development not found for this builder" });
      }
      res.json(development);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch development');
      res.status(status).json({ message });
    }
  });

  app.put("/api/builders/:builderId/developments/:id", isAuthenticated, requireRole('admin', 'inspector'), csrfSynchronisedProtection, async (req: any, res) => {
    try {
      const existing = await storage.getDevelopment(req.params.id);
      if (!existing) {
        return res.status(404).json({ message: "Development not found" });
      }
      if (existing.builderId !== req.params.builderId) {
        return res.status(404).json({ message: "Development not found for this builder" });
      }

      const validated = updateDevelopmentSchema.parse(req.body);
      const development = await storage.updateDevelopment(req.params.id, validated);
      
      const builder = await storage.getBuilder(req.params.builderId);
      await createAuditLog(req, {
        userId: req.user.id,
        action: 'development.update',
        resourceType: 'development',
        resourceId: req.params.id,
        changes: validated,
        metadata: { 
          builderName: builder?.name,
          developmentName: development?.name,
        },
      }, storage);
      
      res.json(development);
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'update development');
      res.status(status).json({ message });
    }
  });

  app.delete("/api/builders/:builderId/developments/:id", isAuthenticated, requireRole('admin', 'inspector'), csrfSynchronisedProtection, async (req: any, res) => {
    try {
      const development = await storage.getDevelopment(req.params.id);
      if (!development) {
        return res.status(404).json({ message: "Development not found" });
      }
      if (development.builderId !== req.params.builderId) {
        return res.status(404).json({ message: "Development not found for this builder" });
      }

      const deleted = await storage.deleteDevelopment(req.params.id);
      
      const builder = await storage.getBuilder(req.params.builderId);
      await createAuditLog(req, {
        userId: req.user.id,
        action: 'development.delete',
        resourceType: 'development',
        resourceId: req.params.id,
        metadata: { 
          builderName: builder?.name,
          developmentName: development.name,
        },
      }, storage);
      
      res.status(204).send();
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'delete development');
      res.status(status).json({ message });
    }
  });

  // Builder Abbreviations CRUD
  app.get('/api/builders/:builderId/abbreviations', isAuthenticated, requireRole('admin', 'manager'), async (req: any, res) => {
    try {
      const { builderId } = req.params;
      const abbreviations = await storage.getBuilderAbbreviationsByBuilder(builderId);
      res.json(abbreviations);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch builder abbreviations');
      res.status(status).json({ message });
    }
  });

  app.post('/api/builders/:builderId/abbreviations', isAuthenticated, requireRole('admin'), csrfSynchronisedProtection, async (req: any, res) => {
    try {
      const { builderId } = req.params;
      const validatedData = insertBuilderAbbreviationSchema.parse({
        ...req.body,
        builderId,
      });

      const abbreviation = await storage.createBuilderAbbreviation(validatedData);

      await createAuditLog(req, {
        userId: req.user.id,
        action: 'builder_abbreviation.create',
        resourceType: 'builder_abbreviation',
        resourceId: abbreviation.id,
        metadata: {
          builderId,
          abbreviation: abbreviation.abbreviation,
          isPrimary: abbreviation.isPrimary,
        },
      }, storage);

      res.status(201).json(abbreviation);
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'create builder abbreviation');
      res.status(status).json({ message });
    }
  });

  app.patch('/api/builders/:builderId/abbreviations/:id', isAuthenticated, requireRole('admin'), csrfSynchronisedProtection, async (req: any, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertBuilderAbbreviationSchema.partial().parse(req.body);

      const abbreviation = await storage.updateBuilderAbbreviation(id, validatedData);
      
      if (!abbreviation) {
        return res.status(404).json({ message: 'Abbreviation not found' });
      }

      await createAuditLog(req, {
        userId: req.user.id,
        action: 'builder_abbreviation.update',
        resourceType: 'builder_abbreviation',
        resourceId: id,
        metadata: {
          changes: validatedData,
        },
      }, storage);

      res.json(abbreviation);
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'update builder abbreviation');
      res.status(status).json({ message });
    }
  });

  app.delete('/api/builders/:builderId/abbreviations/:id', isAuthenticated, requireRole('admin'), csrfSynchronisedProtection, async (req: any, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteBuilderAbbreviation(id);

      if (!success) {
        return res.status(404).json({ message: 'Abbreviation not found' });
      }

      await createAuditLog(req, {
        userId: req.user.id,
        action: 'builder_abbreviation.delete',
        resourceType: 'builder_abbreviation',
        resourceId: id,
        metadata: {},
      }, storage);

      res.json({ success: true });
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'delete builder abbreviation');
      res.status(status).json({ message });
    }
  });

  app.post('/api/builders/:builderId/abbreviations/:id/set-primary', isAuthenticated, requireRole('admin'), csrfSynchronisedProtection, async (req: any, res) => {
    try {
      const { builderId, id } = req.params;

      // Verify the abbreviation belongs to this builder
      const abbreviations = await storage.getBuilderAbbreviationsByBuilder(builderId);
      const targetAbbreviation = abbreviations.find(a => a.id === id);

      if (!targetAbbreviation) {
        return res.status(404).json({ message: 'Abbreviation not found for this builder' });
      }

      // Set as primary (unsets all others atomically)
      await storage.setPrimaryBuilderAbbreviation(builderId, id);

      // Audit log
      const userId = req.user.id;
      if (userId) {
        await createAuditLog(req, {
          userId,
          action: 'set_primary_builder_abbreviation',
          resourceType: 'builder_abbreviation',
          resourceId: id,
          metadata: {
            builderId,
            abbreviation: targetAbbreviation.abbreviation,
          },
        }, storage);
      }

      res.json({ success: true, message: 'Primary abbreviation updated' });
    } catch (error) {
      serverLogger.error('[API] Failed to set primary builder abbreviation:', error);
      const { status, message } = handleDatabaseError(error, 'set primary builder abbreviation');
      res.status(status).json({ message });
    }
  });

  /**
   * GET /api/builders/:id/stats
   * Get comprehensive performance statistics for a builder
   */
  app.get("/api/builders/:id/stats", isAuthenticated, async (req: any, res) => {
    try {
      const builder = await storage.getBuilder(req.params.id);
      if (!builder) {
        return res.status(404).json({ message: "Builder not found" });
      }
      
      // Check ownership using checkResourceOwnership
      if (!checkResourceOwnership(builder.createdBy, req.user.id, req.user.role)) {
        return res.status(403).json({ message: "Forbidden: Cannot access this builder" });
      }
      
      const stats = await storage.getBuilderStats(req.params.id);
      res.json(stats);
    } catch (error) {
      logError('Builders/GetStats', error, { builderId: req.params.id });
      const { status, message } = handleDatabaseError(error, 'fetch builder stats');
      res.status(status).json({ message });
    }
  });

  /**
   * GET /api/builders/:id/hierarchy
   * Get full builder hierarchy (builder → developments → lots → jobs)
   */
  app.get("/api/builders/:id/hierarchy", isAuthenticated, async (req: any, res) => {
    try {
      const builder = await storage.getBuilder(req.params.id);
      if (!builder) {
        return res.status(404).json({ message: "Builder not found" });
      }
      
      // Check ownership using checkResourceOwnership
      if (!checkResourceOwnership(builder.createdBy, req.user.id, req.user.role)) {
        return res.status(403).json({ message: "Forbidden: Cannot access this builder" });
      }
      
      const hierarchy = await storage.getBuilderHierarchy(req.params.id);
      res.json(hierarchy);
    } catch (error) {
      logError('Builders/GetHierarchy', error, { builderId: req.params.id });
      const { status, message } = handleDatabaseError(error, 'fetch builder hierarchy');
      res.status(status).json({ message });
    }
  });

  /**
   * GET /api/agreements/expiring
   * Get agreements expiring within specified timeframe
   * Query params: ?days=30 (default 30)
   */
  app.get("/api/agreements/expiring", isAuthenticated, async (req, res) => {
    try {
      const days = req.query.days ? parseInt(req.query.days as string, 10) : 30;
      if (isNaN(days) || days < 1) {
        return res.status(400).json({ message: "Invalid days parameter. Must be a positive number." });
      }
      
      const agreements = await storage.getExpiringAgreements(days);
      
      // Add expiration categorization to each agreement
      const enrichedAgreements = agreements.map(agreement => ({
        ...agreement,
        expirationInfo: categorizeAgreementExpiration(agreement)
      }));
      
      res.json(enrichedAgreements);
    } catch (error) {
      logError('Agreements/GetExpiring', error, { days: req.query.days });
      const { status, message } = handleDatabaseError(error, 'fetch expiring agreements');
      res.status(status).json({ message });
    }
  });

  /**
   * GET /api/builders/:builderId/contacts/by-role/:role
   * Get builder contacts filtered by role
   */
  app.get("/api/builders/:builderId/contacts/by-role/:role", isAuthenticated, async (req, res) => {
    try {
      const { role } = req.params;
      
      // Validate role
      const validation = validateContactRole(role);
      if (!validation.valid) {
        return res.status(400).json({ message: validation.error });
      }
      
      const contacts = await storage.getContactsByRole(req.params.builderId, role);
      res.json(contacts);
    } catch (error) {
      logError('Builders/GetContactsByRole', error, { 
        builderId: req.params.builderId, 
        role: req.params.role 
      });
      const { status, message } = handleDatabaseError(error, 'fetch contacts by role');
      res.status(status).json({ message });
    }
  });

  /**
   * GET /api/developments/:id/with-lots
   * Get development with nested lots and stats
   */
  app.get("/api/developments/:id/with-lots", isAuthenticated, async (req, res) => {
    try {
      const developmentWithLots = await storage.getDevelopmentWithLots(req.params.id);
      if (!developmentWithLots) {
        return res.status(404).json({ message: "Development not found" });
      }
      res.json(developmentWithLots);
    } catch (error) {
      logError('Developments/GetWithLots', error, { developmentId: req.params.id });
      const { status, message } = handleDatabaseError(error, 'fetch development with lots');
      res.status(status).json({ message });
    }
  });

  /**
   * GET /api/lots/:id/with-jobs
   * Get lot with nested jobs and stats
   */
  app.get("/api/lots/:id/with-jobs", isAuthenticated, async (req, res) => {
    try {
      const lotWithJobs = await storage.getLotWithJobs(req.params.id);
      if (!lotWithJobs) {
        return res.status(404).json({ message: "Lot not found" });
      }
      res.json(lotWithJobs);
    } catch (error) {
      logError('Lots/GetWithJobs', error, { lotId: req.params.id });
      const { status, message } = handleDatabaseError(error, 'fetch lot with jobs');
      res.status(status).json({ message });
    }
  });

  // Lots routes
  app.get("/api/developments/:developmentId/lots", isAuthenticated, async (req, res) => {
    try {
      const lots = await storage.getLots(req.params.developmentId);
      res.json(lots);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch lots');
      res.status(status).json({ message });
    }
  });

  app.post("/api/developments/:developmentId/lots", isAuthenticated, requireRole('admin', 'inspector'), csrfSynchronisedProtection, async (req: any, res) => {
    try {
      const validated = insertLotSchema.parse({ ...req.body, developmentId: req.params.developmentId });
      // Set createdBy to current user
      validated.createdBy = req.user.id;
      const lot = await storage.createLot(validated);
      
      const development = await storage.getDevelopment(req.params.developmentId);
      await createAuditLog(req, {
        userId: req.user.id,
        action: 'lot.create',
        resourceType: 'lot',
        resourceId: lot.id,
        metadata: { 
          developmentName: development?.name,
          lotNumber: lot.lotNumber,
          status: lot.status,
        },
      }, storage);
      
      res.status(201).json(lot);
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'create lot');
      res.status(status).json({ message });
    }
  });

  app.get("/api/developments/:developmentId/lots/:id", isAuthenticated, async (req, res) => {
    try {
      const lot = await storage.getLot(req.params.id);
      if (!lot) {
        return res.status(404).json({ message: "Lot not found" });
      }
      if (lot.developmentId !== req.params.developmentId) {
        return res.status(404).json({ message: "Lot not found for this development" });
      }
      res.json(lot);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch lot');
      res.status(status).json({ message });
    }
  });

  app.put("/api/developments/:developmentId/lots/:id", isAuthenticated, requireRole('admin', 'inspector'), csrfSynchronisedProtection, async (req: any, res) => {
    try {
      const existing = await storage.getLot(req.params.id);
      if (!existing) {
        return res.status(404).json({ message: "Lot not found" });
      }
      if (existing.developmentId !== req.params.developmentId) {
        return res.status(404).json({ message: "Lot not found for this development" });
      }

      const validated = updateLotSchema.parse(req.body);
      const lot = await storage.updateLot(req.params.id, validated);
      
      const development = await storage.getDevelopment(req.params.developmentId);
      await createAuditLog(req, {
        userId: req.user.id,
        action: 'lot.update',
        resourceType: 'lot',
        resourceId: req.params.id,
        changes: validated,
        metadata: { 
          developmentName: development?.name,
          lotNumber: lot?.lotNumber,
        },
      }, storage);
      
      res.json(lot);
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'update lot');
      res.status(status).json({ message });
    }
  });

  app.delete("/api/developments/:developmentId/lots/:id", isAuthenticated, requireRole('admin', 'inspector'), csrfSynchronisedProtection, async (req: any, res) => {
    try {
      const lot = await storage.getLot(req.params.id);
      if (!lot) {
        return res.status(404).json({ message: "Lot not found" });
      }
      if (lot.developmentId !== req.params.developmentId) {
        return res.status(404).json({ message: "Lot not found for this development" });
      }

      const deleted = await storage.deleteLot(req.params.id);
      
      const development = await storage.getDevelopment(req.params.developmentId);
      await createAuditLog(req, {
        userId: req.user.id,
        action: 'lot.delete',
        resourceType: 'lot',
        resourceId: req.params.id,
        metadata: { 
          developmentName: development?.name,
          lotNumber: lot.lotNumber,
        },
      }, storage);
      
      res.status(204).send();
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'delete lot');
      res.status(status).json({ message });
    }
  });

  // Direct lot lookup (for fetching lot by ID without knowing development)
  app.get("/api/lots/:id", isAuthenticated, async (req, res) => {
    try {
      const lot = await storage.getLot(req.params.id);
      if (!lot) {
        return res.status(404).json({ message: "Lot not found" });
      }
      res.json(lot);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch lot');
      res.status(status).json({ message });
    }
  });

  // Plans routes
  app.get("/api/plans", isAuthenticated, requireRole('admin', 'inspector', 'manager', 'viewer'), async (req, res) => {
    try {
      const plans = await storage.getAllPlans();
      res.json(plans);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch plans');
      res.status(status).json({ message });
    }
  });

  app.get("/api/plans/builder/:builderId", isAuthenticated, requireRole('admin', 'inspector', 'manager', 'viewer'), async (req, res) => {
    try {
      const plans = await storage.getPlansByBuilder(req.params.builderId);
      res.json(plans);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch builder plans');
      res.status(status).json({ message });
    }
  });

  app.post("/api/plans", isAuthenticated, requireRole('admin', 'inspector'), csrfSynchronisedProtection, async (req: any, res) => {
    try {
      const validated = insertPlanSchema.parse(req.body);
      const plan = await storage.createPlan(validated);
      
      // Audit log: Plan creation
      await createAuditLog(req, {
        userId: req.user.id,
        action: 'plan.create',
        resourceType: 'plan',
        resourceId: plan.id,
        metadata: { planName: plan.planName, builderId: plan.builderId },
      }, storage);
      
      res.status(201).json(plan);
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'create plan');
      res.status(status).json({ message });
    }
  });

  app.get("/api/plans/:id", isAuthenticated, requireRole('admin', 'inspector', 'manager', 'viewer'), async (req, res) => {
    try {
      const plan = await storage.getPlan(req.params.id);
      if (!plan) {
        return res.status(404).json({ message: "Plan not found" });
      }
      res.json(plan);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch plan');
      res.status(status).json({ message });
    }
  });

  app.patch("/api/plans/:id", isAuthenticated, requireRole('admin', 'inspector'), csrfSynchronisedProtection, async (req: any, res) => {
    try {
      const validated = insertPlanSchema.partial().parse(req.body);
      const plan = await storage.updatePlan(req.params.id, validated);
      if (!plan) {
        return res.status(404).json({ message: "Plan not found" });
      }
      
      // Audit log: Plan update
      await createAuditLog(req, {
        userId: req.user.id,
        action: 'plan.update',
        resourceType: 'plan',
        resourceId: req.params.id,
        changes: validated,
        metadata: { planName: plan.planName },
      }, storage);
      
      res.json(plan);
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'update plan');
      res.status(status).json({ message });
    }
  });

  app.delete("/api/plans/:id", isAuthenticated, requireRole('admin'), csrfSynchronisedProtection, async (req: any, res) => {
    try {
      const plan = await storage.getPlan(req.params.id);
      const deleted = await storage.deletePlan(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Plan not found. It may have already been deleted." });
      }
      
      // Audit log: Plan deletion
      if (plan) {
        await createAuditLog(req, {
          userId: req.user.id,
          action: 'plan.delete',
          resourceType: 'plan',
          resourceId: req.params.id,
          metadata: { planName: plan.planName },
        }, storage);
      }
      
      res.status(204).send();
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'delete plan');
      res.status(status).json({ message });
    }
  });

  app.get("/api/jobs", isAuthenticated, requireRole('admin', 'inspector', 'manager', 'viewer'), async (req: any, res) => {
    try {
      const userRole = (req.user.role as UserRole) || 'inspector';
      const userId = req.user.id;
      
      // Inspectors only see their own jobs
      if (userRole === 'inspector') {
        if (req.query.cursor !== undefined || req.query.sortBy !== undefined || req.query.sortOrder !== undefined) {
          const params = cursorPaginationParamsSchema.parse(req.query);
          const result = await storage.getJobsCursorPaginatedByUser(userId, params);
          return res.json(result);
        }
        const jobs = await storage.getJobsByUser(userId);
        return res.json(jobs);
      }
      
      // Admins, managers, and viewers see all jobs
      if (req.query.cursor !== undefined || req.query.sortBy !== undefined || req.query.sortOrder !== undefined) {
        const params = cursorPaginationParamsSchema.parse(req.query);
        const result = await storage.getJobsCursorPaginated(params);
        return res.json(result);
      }
      if (req.query.limit !== undefined || req.query.offset !== undefined) {
        const params = paginationParamsSchema.parse(req.query);
        const result = await storage.getJobsPaginated(params);
        return res.json(result);
      }
      const jobs = await storage.getAllJobs();
      res.json(jobs);
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'fetch jobs');
      res.status(status).json({ message });
    }
  });

  app.post("/api/jobs", isAuthenticated, requireRole('admin', 'inspector'), csrfSynchronisedProtection, async (req: any, res) => {
    try {
      const validated = insertJobSchema.parse(req.body);
      // Sanitize builderId - convert empty string to undefined (which becomes null in DB)
      if (validated.builderId === '') {
        validated.builderId = undefined;
      }
      // Set createdBy to current user
      validated.createdBy = req.user.id;
      
      serverLogger.info('[API] Attempting to create job:', {
        name: validated.name,
        address: validated.address,
        builderId: validated.builderId,
        status: validated.status,
        userId: req.user.id,
      });
      
      // CRITICAL: createJob MUST succeed or throw an error
      // Never return success if database insert fails
      let job;
      try {
        job = await storage.createJob(validated);
      } catch (storageError) {
        // Log the critical error
        serverLogger.error('[API] CRITICAL: Job creation failed in storage layer:', {
          error: storageError instanceof Error ? storageError.message : String(storageError),
          stack: storageError instanceof Error ? storageError.stack : undefined,
          jobData: {
            name: validated.name,
            address: validated.address,
            builderId: validated.builderId,
          },
        });
        
        // CRITICAL: Ensure we return 500, not 201
        // Re-throw to be caught by outer error handler
        throw storageError;
      }
      
      // Verify job has an ID before proceeding
      if (!job || !job.id) {
        const errorMsg = 'CRITICAL: Job created but has no ID - database persistence failed';
        serverLogger.error('[API] ' + errorMsg, { job });
        throw new Error(errorMsg);
      }
      
      serverLogger.info('[API] Job created successfully:', {
        id: job.id,
        name: job.name,
        address: job.address,
      });
      
      // Auto-generate checklist items from template based on inspection type
      if (job.inspectionType) {
        try {
          await storage.generateChecklistFromTemplate(job.id, job.inspectionType);
          serverLogger.info(`[API] Auto-generated checklist for ${job.inspectionType} inspection (Job ${job.id})`);
        } catch (error) {
          // Log but don't fail job creation if checklist generation fails
          serverLogger.error('[API] Failed to auto-generate checklist:', error);
        }
      }
      
      // Audit log: Job creation (only if job was successfully created)
      try {
        await createAuditLog(req, {
          userId: req.user.id,
          action: 'job.create',
          resourceType: 'job',
          resourceId: job.id,
          metadata: { jobName: job.name, address: job.address, status: job.status, inspectionType: job.inspectionType },
        }, storage);
      } catch (auditError) {
        // Log audit error but don't fail the request since job was created
        serverLogger.error('[API] Failed to create audit log for job creation:', auditError);
      }
      
      // Only return 201 if job was actually created and persisted
      res.status(201).json(job);
    } catch (error) {
      // Handle validation errors
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        serverLogger.error('[API] Job creation validation error:', {
          validationErrors: error.errors,
          requestBody: req.body,
        });
        return res.status(status).json({ message });
      }
      
      // Handle all database/storage errors
      serverLogger.error('[API] Job creation failed:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      
      // CRITICAL: Always return 500 for database errors, never 201
      const { status, message } = handleDatabaseError(error, 'create job');
      res.status(status).json({ message });
    }
  });

  app.get("/api/jobs/:id", isAuthenticated, requireRole('admin', 'inspector', 'manager', 'viewer'), async (req: any, res) => {
    try {
      const job = await storage.getJob(req.params.id);
      if (!job) {
        return res.status(404).json({ message: "Job not found. It may have been deleted or the link may be outdated." });
      }
      
      // Check ownership for inspectors
      const userRole = (req.user.role as UserRole) || 'inspector';
      const userId = req.user.id;
      if (userRole === 'inspector' && job.createdBy !== userId) {
        return res.status(403).json({ message: 'Forbidden: You can only view your own jobs' });
      }
      
      res.json(job);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch job');
      res.status(status).json({ message });
    }
  });

  app.put("/api/jobs/:id", isAuthenticated, requireRole('admin', 'inspector'), csrfSynchronisedProtection, async (req: any, res) => {
    try {
      // Load existing job to check if status is changing to completed
      const existingJob = await storage.getJob(req.params.id);
      if (!existingJob) {
        return res.status(404).json({ message: "Job not found. It may have been deleted." });
      }

      // Check ownership for inspectors
      const userRole = (req.user.role as UserRole) || 'inspector';
      const userId = req.user.id;
      if (userRole === 'inspector' && existingJob.createdBy !== userId) {
        return res.status(403).json({ message: 'Forbidden: You can only edit your own jobs' });
      }

      const validated = insertJobSchema.partial().parse(req.body);
      // Sanitize builderId - convert empty string to undefined (which becomes null in DB)
      if (validated.builderId === '') {
        validated.builderId = undefined;
      }

      // Check if status is changing to "completed"
      const isCompletingNow = validated.status === 'completed' && existingJob.status !== 'completed';

      // Set completedDate if not already set and job is being completed
      if (isCompletingNow && !validated.completedDate) {
        validated.completedDate = new Date();
      }

      // Update the job
      const job = await storage.updateJob(req.params.id, validated);
      if (!job) {
        return res.status(404).json({ message: "Job not found. It may have been deleted." });
      }

      // Audit log: Track job status changes
      if (validated.status && existingJob.status !== validated.status) {
        await createAuditLog(req, {
          userId: req.user.id,
          action: 'job.status_changed',
          resourceType: 'job',
          resourceId: req.params.id,
          changes: { from: existingJob.status, to: validated.status },
          metadata: { jobName: existingJob.name, address: existingJob.address },
        }, storage);
      } else if (Object.keys(validated).length > 0) {
        // Log general job updates
        await createAuditLog(req, {
          userId: req.user.id,
          action: 'job.update',
          resourceType: 'job',
          resourceId: req.params.id,
          changes: validated,
          metadata: { jobName: existingJob.name },
        }, storage);
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

  app.patch("/api/jobs/:id/status", isAuthenticated, requireRole('admin', 'inspector'), csrfSynchronisedProtection, async (req: any, res) => {
    try {
      const existingJob = await storage.getJob(req.params.id);
      if (!existingJob) {
        return res.status(404).json({ message: "Job not found. It may have been deleted." });
      }

      // RBAC: Inspectors can only update jobs they created OR jobs assigned to them
      const userRole = (req.user.role as UserRole) || 'inspector';
      const userId = req.user.id;
      if (userRole === 'inspector') {
        const canUpdate = existingJob.createdBy === userId || existingJob.assignedTo === userId;
        if (!canUpdate) {
          return res.status(403).json({ message: 'Forbidden: You can only update status for your own jobs or jobs assigned to you' });
        }
      }

      const statusSchema = z.object({
        status: z.enum(['pending', 'scheduled', 'in-progress', 'completed', 'review']),
      });

      const { status: newStatus } = statusSchema.parse(req.body);

      if (existingJob.status === newStatus) {
        return res.json(existingJob);
      }

      const isCompletingNow = newStatus === 'completed' && existingJob.status !== 'completed';

      const updateData: any = { status: newStatus };
      if (isCompletingNow && !existingJob.completedDate) {
        updateData.completedDate = new Date();
      }

      const job = await storage.updateJob(req.params.id, updateData);
      if (!job) {
        return res.status(404).json({ message: "Job not found. It may have been deleted." });
      }

      await createAuditLog(req, {
        userId: req.user.id,
        action: 'job.status_changed',
        resourceType: 'job',
        resourceId: req.params.id,
        changes: { from: existingJob.status, to: newStatus },
        metadata: { 
          jobName: existingJob.name, 
          address: existingJob.address,
          source: 'calendar_quick_update'
        },
      }, storage);

      res.json(job);
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'update job status');
      res.status(status).json({ message });
    }
  });

  app.delete("/api/jobs/:id", isAuthenticated, requireRole('admin', 'inspector'), csrfSynchronisedProtection, async (req: any, res) => {
    try {
      const job = await storage.getJob(req.params.id);
      if (!job) {
        return res.status(404).json({ message: "Job not found. It may have already been deleted." });
      }
      
      // Check ownership for inspectors
      const userRole = (req.user.role as UserRole) || 'inspector';
      const userId = req.user.id;
      if (userRole === 'inspector' && job.createdBy !== userId) {
        return res.status(403).json({ message: 'Forbidden: You can only delete your own jobs' });
      }
      
      const deleted = await storage.deleteJob(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Job not found. It may have already been deleted." });
      }
      
      // Audit log: Job deletion
      await createAuditLog(req, {
        userId: req.user.id,
        action: 'job.delete',
        resourceType: 'job',
        resourceId: req.params.id,
        metadata: { jobName: job.name, address: job.address, status: job.status },
      }, storage);
      
      res.status(204).send();
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'delete job');
      res.status(status).json({ message });
    }
  });

  // Bulk delete jobs
  app.delete("/api/jobs/bulk", isAuthenticated, csrfSynchronisedProtection, async (req, res) => {
    const bulkDeleteSchema = z.object({
      ids: z.array(z.string()).min(1, "At least one job ID is required"),
    });

    try {
      const { ids } = bulkDeleteSchema.parse(req.body);
      
      // Limit bulk operations to 200 items for safety
      if (ids.length > 200) {
        return res.status(400).json({ message: "Cannot delete more than 200 jobs at once" });
      }

      const deleted = await storage.bulkDeleteJobs(ids);
      res.json({ deleted, total: ids.length });
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'bulk delete jobs');
      res.status(status).json({ message });
    }
  });

  // Export jobs
  app.post("/api/jobs/export", isAuthenticated, csrfSynchronisedProtection, async (req, res) => {
    const exportSchema = z.object({
      ids: z.array(z.string()).min(1, "At least one job ID is required"),
      format: z.enum(['csv', 'json']),
    });

    try {
      const { ids, format } = exportSchema.parse(req.body);
      
      // Limit export to 1000 items for safety
      if (ids.length > 1000) {
        return res.status(400).json({ message: "Cannot export more than 1000 jobs at once" });
      }

      // Fetch jobs by IDs
      const jobs = await Promise.all(
        ids.map(id => storage.getJob(id))
      );
      const validJobs = jobs.filter((j): j is NonNullable<typeof j> => j !== undefined);

      // Fetch builders for enrichment (for builderName)
      const builderIds = Array.from(new Set(validJobs.map(j => j.builderId).filter(Boolean)));
      const builders = await Promise.all(
        builderIds.map(id => storage.getBuilder(id))
      );
      const builderMap = new Map(builders.filter(Boolean).map(b => [b!.id, b!]));

      if (format === 'json') {
        // Return JSON directly
        res.json(validJobs);
      } else {
        // Generate CSV
        const csvRows: string[] = [
          // Header row
          'ID,Name,Address,Contractor,Status,Priority,Builder ID,Builder Name,Scheduled Date,Completed Date,Completed Items,Total Items,Inspection Type,Compliance Status,Notes'
        ];

        // Data rows
        for (const job of validJobs) {
          const builder = job.builderId ? builderMap.get(job.builderId) : undefined;
          const builderName = builder?.name ?? '';

          const row = [
            job.id,
            job.name,
            job.address ?? '',
            job.contractor ?? '',
            job.status ?? '',
            job.priority ?? '',
            job.builderId ?? '',
            builderName,
            job.scheduledDate ? new Date(job.scheduledDate).toISOString() : '',
            job.completedDate ? new Date(job.completedDate).toISOString() : '',
            job.completedItems ?? '',
            job.totalItems ?? '',
            job.inspectionType ?? '',
            job.complianceStatus ?? '',
            job.notes ?? '',
          ].map(field => {
            // Escape commas and quotes in CSV
            const str = String(field);
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
              return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
          }).join(',');

          csvRows.push(row);
        }

        const csv = csvRows.join('\n');
        
        // Set headers for CSV download
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="jobs-export-${Date.now()}.csv"`);
        res.send(csv);
      }
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'export jobs');
      res.status(status).json({ message });
    }
  });

  // Create job from Google Calendar event
  app.post("/api/jobs/from-event", isAuthenticated, csrfSynchronisedProtection, async (req, res) => {
    const schema = z.object({
      eventId: z.string().min(1, "Event ID is required"),
    });

    try {
      const { eventId } = schema.parse(req.body);
      
      serverLogger.info('[API] Creating job from event:', { eventId });
      
      // Fetch the Google event
      const googleEvent = await storage.getGoogleEvent(eventId);
      if (!googleEvent) {
        serverLogger.warn('[API] Google event not found:', { eventId });
        return res.status(404).json({ message: "Calendar event not found" });
      }

      if (googleEvent.isConverted) {
        serverLogger.warn('[API] Google event already converted:', { 
          eventId, 
          convertedJobId: googleEvent.convertedToJobId 
        });
        return res.status(400).json({ message: "This calendar event has already been converted to a job" });
      }

      // Check for existing job with same sourceGoogleEventId to prevent duplicates
      const existingJob = await storage.getJobBySourceEventId(googleEvent.id);
      if (existingJob) {
        serverLogger.info('[API] Job already exists for event:', { 
          eventId: googleEvent.id, 
          jobId: existingJob.id 
        });
        return res.status(409).json({
          message: "Job already created from this event",
          job: existingJob
        });
      }

      // Import utilities from shared/jobNameGenerator.ts
      const { detectInspectionTypeFromTitle, generateJobName } = await import("@shared/jobNameGenerator");

      // Detect inspection type from event title
      const inspectionType = detectInspectionTypeFromTitle(googleEvent.title) || "Other";

      // Validate and handle dates properly
      let scheduledDate: Date;
      try {
        scheduledDate = googleEvent.startTime instanceof Date 
          ? googleEvent.startTime 
          : new Date(googleEvent.startTime);
        
        if (isNaN(scheduledDate.getTime())) {
          throw new Error('Invalid date');
        }
      } catch (dateError) {
        serverLogger.error('[API] Invalid date in Google event:', { 
          eventId: googleEvent.id,
          startTime: googleEvent.startTime,
          error: dateError 
        });
        return res.status(400).json({ 
          message: "Invalid date in calendar event. Please check the event dates." 
        });
      }

      // Generate job name using event date and location
      const jobName = generateJobName(
        scheduledDate,
        inspectionType,
        googleEvent.location || "No location"
      );

      serverLogger.info('[API] Creating job with details:', {
        name: jobName,
        inspectionType,
        scheduledDate: scheduledDate.toISOString(),
        googleEventId: googleEvent.id
      });

      // Create the job
      const newJob = await storage.createJob({
        name: jobName,
        address: googleEvent.location || "",
        contractor: "To be assigned",
        status: "scheduled",
        inspectionType: inspectionType,
        scheduledDate: scheduledDate,
        priority: "medium",
        sourceGoogleEventId: googleEvent.id,
        originalScheduledDate: scheduledDate,
        notes: googleEvent.description || "",
      });

      // Mark the Google event as converted
      await storage.markGoogleEventAsConverted(googleEvent.id, newJob.id);
      
      serverLogger.info('[API] Successfully created job from event:', { 
        jobId: newJob.id, 
        eventId: googleEvent.id 
      });

      res.status(201).json(newJob);
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        serverLogger.error('[API] Validation error in job creation:', { 
          error: error.errors,
          body: req.body 
        });
        return res.status(status).json({ message });
      }
      
      serverLogger.error('[API] Error creating job from event:', {
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
        body: req.body
      });
      
      res.status(500).json({ 
        message: error instanceof Error 
          ? `Failed to create job: ${error.message}` 
          : "Failed to create job from calendar event" 
      });
    }
  });

  // Get today's unconverted Google calendar events
  app.get("/api/google-events/today", isAuthenticated, async (req, res) => {
    try {
      const events = await storage.getTodaysUnconvertedGoogleEvents();
      res.json(events);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch today\'s Google events');
      res.status(status).json({ message });
    }
  });

  // Get today's in-progress/scheduled jobs
  app.get("/api/jobs/today", isAuthenticated, async (req, res) => {
    try {
      // Support both paginated and non-paginated responses for backward compatibility
      if (req.query.limit !== undefined || req.query.offset !== undefined) {
        const params = paginationParamsSchema.parse(req.query);
        const result = await storage.getTodaysJobsByStatusPaginated(
          ['scheduled', 'in-progress', 'pre-inspection', 'testing', 'review'],
          params
        );
        return res.json(result);
      }
      
      // Legacy non-paginated response
      const jobs = await storage.getTodaysJobsByStatus(['scheduled', 'in-progress', 'pre-inspection', 'testing', 'review']);
      res.json(jobs);
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'fetch today\'s jobs');
      res.status(status).json({ message });
    }
  });

  // Get today's completed jobs
  app.get("/api/jobs/completed-today", isAuthenticated, async (req, res) => {
    try {
      // Support both paginated and non-paginated responses for backward compatibility
      if (req.query.limit !== undefined || req.query.offset !== undefined) {
        const params = paginationParamsSchema.parse(req.query);
        const result = await storage.getTodaysJobsByStatusPaginated(
          ['completed'],
          params
        );
        return res.json(result);
      }
      
      // Legacy non-paginated response
      const jobs = await storage.getTodaysJobsByStatus(['completed']);
      res.json(jobs);
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'fetch completed jobs');
      res.status(status).json({ message });
    }
  });

  app.get("/api/schedule-events", isAuthenticated, async (req: any, res) => {
    try {
      // CRITICAL FIX: Use session user directly instead of re-fetching
      const user = req.user;
      const userId = user.id;
      const userRole = (user.role as UserRole) || 'inspector';
      
      const { startDate, endDate, jobId } = req.query;

      serverLogger.info(`[API/schedule-events] Request from user ${user.id} (${user.email}) with role: ${userRole} (from session)`);

      if (jobId && typeof jobId === "string") {
        const events = await storage.getScheduleEventsByJob(jobId);
        serverLogger.info(`[API/schedule-events] Returning ${events.length} events for job ${jobId}`);
        return res.json(events);
      }

      if (startDate && endDate) {
        const start = new Date(startDate as string);
        const end = new Date(endDate as string);
        const events = await storage.getScheduleEventsByDateRange(start, end, user.id, userRole);
        serverLogger.info(`[API/schedule-events] Returning ${events.length} events for ${userRole} user ${user.email} (${start.toISOString().split('T')[0]} to ${end.toISOString().split('T')[0]})`);
        return res.json(events);
      }

      res.status(400).json({ message: "Please provide either a job ID or date range to view schedule events" });
    } catch (error) {
      serverLogger.error(`[API/schedule-events] Error:`, error);
      const { status, message } = handleDatabaseError(error, 'fetch schedule events');
      res.status(status).json({ message });
    }
  });

  app.get("/api/google-events", isAuthenticated, async (req, res) => {
    try {
      const { startDate, endDate, forceSync } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ message: 'startDate and endDate are required' });
      }
      
      const start = new Date(startDate as string);
      const end = new Date(endDate as string);
      
      // If forceSync is true or if we don't have recent data, fetch from Google Calendar
      if (forceSync === 'true') {
        serverLogger.info('[API] Force syncing Google Calendar events');
        
        // Import the extended service
        const { googleCalendarService: extendedService } = await import('./googleCalendarService');
        
        // Fetch fresh events from Building Knowledge calendar
        const freshEvents = await extendedService.fetchBuildingKnowledgeEvents(start, end);
        serverLogger.info(`[API] Fetched ${freshEvents.length} events from Building Knowledge calendar`);
        
        // Return the fresh events
        return res.json(freshEvents);
      }
      
      // Otherwise, get from database (which may be stale)
      const events = await storage.getGoogleEventsByDateRange(start, end);
      
      // If we have no events, try to fetch from Google Calendar
      if (!events || events.length === 0) {
        serverLogger.info('[API] No cached events found, fetching from Google Calendar');
        
        // Import the extended service
        const { googleCalendarService: extendedService } = await import('./googleCalendarService');
        
        // Fetch fresh events from Building Knowledge calendar
        const freshEvents = await extendedService.fetchBuildingKnowledgeEvents(start, end);
        serverLogger.info(`[API] Fetched ${freshEvents.length} fresh events from Building Knowledge calendar`);
        
        return res.json(freshEvents);
      }
      
      res.json(events);
    } catch (error: any) {
      serverLogger.error('[API] Error fetching Google events:', error);
      res.status(500).json({ message: 'Failed to fetch Google events', error: error.message });
    }
  });

  // Get today's Google Calendar events that haven't been converted to jobs yet
  app.get("/api/google-events/today", isAuthenticated, async (req, res) => {
    try {
      // Get today's date range
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      // Get unconverted events from database
      const events = await storage.getUnconvertedGoogleEvents(today, tomorrow);
      
      // Add calendarName field for display and ensure summary field exists
      const eventsWithCalendarName = events.map(event => ({
        ...event,
        calendarName: 'Building Knowledge', // Default calendar name
        summary: event.title // Ensure summary field exists for compatibility
      }));
      
      serverLogger.info(`[API] Fetched ${events.length} unconverted Google events for today`);
      res.json(eventsWithCalendarName);
    } catch (error: any) {
      serverLogger.error('[API] Error fetching today\'s Google events:', error);
      res.status(500).json({ 
        message: 'Failed to fetch today\'s Google events', 
        error: error.message 
      });
    }
  });

  // Test Google Calendar connection and fetch available calendars
  app.get('/api/google-calendar/test', isAuthenticated, requireRole('admin'), async (req, res) => {
    try {
      // Import the extended service
      const { googleCalendarService: extendedService } = await import('./googleCalendarService');
      
      const testResult = await extendedService.testConnection();
      res.json(testResult);
    } catch (error: any) {
      serverLogger.error('[API] Error testing Google Calendar connection:', error);
      res.status(500).json({ 
        success: false,
        message: 'Failed to test Google Calendar connection', 
        error: error.message 
      });
    }
  });
  
  // Alias endpoint for test-connection (backward compatibility)
  app.get('/api/google-calendar/test-connection', isAuthenticated, requireRole('admin'), async (req, res) => {
    try {
      serverLogger.info('[API] Testing Google Calendar connection via /test-connection endpoint');
      
      // Import the extended service
      const { googleCalendarService: extendedService } = await import('./googleCalendarService');
      
      const testResult = await extendedService.testConnection();
      
      // Log the result for debugging
      serverLogger.info('[API] Google Calendar test result:', testResult);
      
      res.json(testResult);
    } catch (error: any) {
      serverLogger.error('[API] Error testing Google Calendar connection:', error);
      res.status(500).json({ 
        success: false,
        message: 'Failed to test Google Calendar connection', 
        error: error.message 
      });
    }
  });

  // Sync Google Calendar events (admin only)
  app.post('/api/google-calendar/sync', isAuthenticated, requireRole('admin'), csrfSynchronisedProtection, async (req: any, res) => {
    try {
      const { startDate, endDate } = req.body;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ message: 'startDate and endDate are required' });
      }
      
      const userId = req.user.id;
      
      // Import the extended service
      const { googleCalendarService: extendedService } = await import('./googleCalendarService');
      
      // Perform intelligent sync
      const syncResult = await extendedService.intelligentEventSync(
        new Date(startDate),
        new Date(endDate),
        userId
      );
      
      serverLogger.info('[API] Google Calendar sync complete:', syncResult);
      res.json({
        success: true,
        message: 'Calendar sync completed',
        ...syncResult,
      });
    } catch (error: any) {
      serverLogger.error('[API] Error syncing Google Calendar:', error);
      res.status(500).json({ 
        success: false,
        message: 'Failed to sync Google Calendar', 
        error: error.message 
      });
    }
  });

  // Calendar Management Routes - Building Knowledge Calendar Sync
  
  // Sync Building Knowledge calendar to pending events (instant on-demand sync)
  app.post('/api/calendar/sync-now', isAuthenticated, requireRole('admin'), csrfSynchronisedProtection, async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      serverLogger.info('[API] Starting on-demand Building Knowledge calendar sync', { userId });
      
      // Import the extended service
      const { googleCalendarService: extendedService } = await import('./googleCalendarService');
      
      // Perform sync
      const syncResult = await extendedService.syncBuildingKnowledgeCalendar(userId);
      
      serverLogger.info('[API] Building Knowledge calendar sync complete:', syncResult);
      
      res.json({
        success: true,
        message: `Synced ${syncResult.newEvents} new events from Building Knowledge calendar`,
        count: syncResult.newEvents,
        total: syncResult.totalEvents,
        duplicates: syncResult.duplicateEvents,
        errors: syncResult.errors,
      });
    } catch (error: any) {
      serverLogger.error('[API] Error syncing Building Knowledge calendar:', error);
      res.status(500).json({ 
        success: false,
        message: 'Failed to sync Building Knowledge calendar', 
        error: error.message 
      });
    }
  });

  // Get pending calendar events with filters
  app.get('/api/pending-events', isAuthenticated, async (req: any, res) => {
    try {
      const { status, builderId, startDate, endDate, jobType, confidence, builderUnmatched, sortBy, limit, offset } = req.query;
      
      // Parse query parameters
      const filters: any = {};
      
      if (status) filters.status = status;
      if (builderId) filters.builderId = builderId;
      if (startDate) filters.startDate = new Date(startDate);
      if (endDate) filters.endDate = new Date(endDate);
      if (jobType) filters.jobType = jobType;
      if (confidence) filters.confidence = confidence;
      if (builderUnmatched === 'true') filters.builderUnmatched = true;
      if (sortBy) filters.sortBy = sortBy;
      if (limit) filters.limit = parseInt(limit);
      if (offset) filters.offset = parseInt(offset);
      
      serverLogger.info('[API] Fetching pending events with filters:', filters);
      
      const result = await storage.getPendingEvents(filters);
      
      res.json({
        success: true,
        events: result.events,
        total: result.total,
        limit: filters.limit || 50,
        offset: filters.offset || 0,
      });
    } catch (error: any) {
      serverLogger.error('[API] Error fetching pending events:', error);
      res.status(500).json({ 
        success: false,
        message: 'Failed to fetch pending events', 
        error: error.message 
      });
    }
  });

  // Assign single pending event to inspector
  app.post('/api/pending-events/:id/assign', isAuthenticated, requireRole('admin'), csrfSynchronisedProtection, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { inspectorId } = req.body;
      const userId = req.user.id;
      
      if (!inspectorId) {
        return res.status(400).json({ message: 'inspectorId is required' });
      }
      
      serverLogger.info('[API] Assigning pending event to inspector:', { eventId: id, inspectorId, userId });
      
      const result = await storage.assignEventToInspector(id, inspectorId, userId);
      
      // Create audit log
      await createAuditLog({
        userId,
        action: 'assign_calendar_event',
        resourceType: 'pending_calendar_event',
        resourceId: id,
        changes: {
          inspectorId,
          jobId: result.job.id,
        },
        ipAddress: req.ip,
      });
      
      res.json({
        success: true,
        message: 'Event assigned to inspector',
        event: result.event,
        job: result.job,
      });
    } catch (error: any) {
      serverLogger.error('[API] Error assigning event to inspector:', error);
      res.status(500).json({ 
        success: false,
        message: error.message || 'Failed to assign event to inspector', 
        error: error.message 
      });
    }
  });

  // Bulk assign multiple pending events to inspector
  app.post('/api/pending-events/bulk-assign', isAuthenticated, requireRole('admin'), csrfSynchronisedProtection, async (req: any, res) => {
    try {
      const { eventIds, inspectorId } = req.body;
      const userId = req.user.id;
      
      if (!eventIds || !Array.isArray(eventIds) || eventIds.length === 0) {
        return res.status(400).json({ message: 'eventIds array is required' });
      }
      
      if (!inspectorId) {
        return res.status(400).json({ message: 'inspectorId is required' });
      }
      
      serverLogger.info('[API] Bulk assigning pending events to inspector:', { 
        count: eventIds.length, 
        inspectorId, 
        userId 
      });
      
      const result = await storage.bulkAssignEvents(eventIds, inspectorId, userId);
      
      // Create audit log
      await createAuditLog({
        userId,
        action: 'bulk_assign_calendar_events',
        resourceType: 'pending_calendar_event',
        resourceId: 'bulk',
        changes: {
          eventCount: eventIds.length,
          inspectorId,
          jobsCreated: result.jobs.length,
        },
        ipAddress: req.ip,
      });
      
      res.json({
        success: true,
        message: `Assigned ${result.events.length} events to inspector`,
        events: result.events,
        jobs: result.jobs,
        assigned: result.events.length,
        total: eventIds.length,
      });
    } catch (error: any) {
      serverLogger.error('[API] Error bulk assigning events:', error);
      res.status(500).json({ 
        success: false,
        message: 'Failed to bulk assign events', 
        error: error.message 
      });
    }
  });

  // Reject pending event
  app.delete('/api/pending-events/:id/reject', isAuthenticated, requireRole('admin'), csrfSynchronisedProtection, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      
      serverLogger.info('[API] Rejecting pending event:', { eventId: id, userId });
      
      const event = await storage.rejectEvent(id, userId);
      
      if (!event) {
        return res.status(404).json({ message: 'Event not found' });
      }
      
      // Create audit log
      await createAuditLog({
        userId,
        action: 'reject_calendar_event',
        resourceType: 'pending_calendar_event',
        resourceId: id,
        changes: {
          status: 'rejected',
        },
        ipAddress: req.ip,
      });
      
      res.json({
        success: true,
        message: 'Event rejected',
        event,
      });
    } catch (error: any) {
      serverLogger.error('[API] Error rejecting event:', error);
      res.status(500).json({ 
        success: false,
        message: 'Failed to reject event', 
        error: error.message 
      });
    }
  });

  // Get weekly workload for inspectors
  app.get('/api/weekly-workload', isAuthenticated, async (req: any, res) => {
    try {
      const { startDate, endDate } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ message: 'startDate and endDate are required' });
      }
      
      serverLogger.info('[API] Fetching weekly workload:', { startDate, endDate });
      
      const workload = await storage.getWeeklyWorkload(
        new Date(startDate),
        new Date(endDate)
      );
      
      res.json({
        success: true,
        workload,
        count: workload.length,
      });
    } catch (error: any) {
      serverLogger.error('[API] Error fetching weekly workload:', error);
      res.status(500).json({ 
        success: false,
        message: 'Failed to fetch weekly workload', 
        error: error.message 
      });
    }
  });

  // NEW ASSIGNMENT ENDPOINTS WITH SCHEDULE EVENT CREATION
  
  // POST /api/pending-events/assign - Assign single pending event to inspector
  app.post('/api/pending-events/assign', 
    isAuthenticated, 
    requireRole('admin'), 
    csrfSynchronisedProtection,
    async (req: any, res) => {
      try {
        const { eventId, inspectorId } = req.body;
        const adminId = req.user.id;

        // Validate input
        if (!eventId || !inspectorId) {
          return res.status(400).json({ 
            success: false,
            message: 'eventId and inspectorId are required' 
          });
        }

        serverLogger.info('[API] Assigning pending event to inspector:', { 
          eventId, 
          inspectorId, 
          adminId 
        });

        const result = await storage.assignPendingEventToInspector({
          eventId,
          inspectorId,
          adminId,
        });

        // Create audit log
        await createAuditLog(req, {
          userId: adminId,
          action: 'assign_pending_event',
          resourceType: 'pending_calendar_event',
          resourceId: eventId,
          changes: {
            inspectorId,
            jobId: result.job.id,
            scheduleEventId: result.scheduleEvent.id,
          },
          ipAddress: req.ip,
        }, storage);

        res.json({
          success: true,
          job: result.job,
          scheduleEvent: result.scheduleEvent,
        });
      } catch (error: any) {
        serverLogger.error('[API] Error assigning pending event:', error);
        const errorResponse = handleDatabaseError(error, 'assignPendingEvent');
        res.status(errorResponse.status).json({ 
          success: false,
          message: errorResponse.message,
          error: error.message 
        });
      }
    }
  );

  // POST /api/pending-events/bulk-assign - Bulk assign multiple pending events
  app.post('/api/pending-events/bulk-assign',
    isAuthenticated,
    requireRole('admin'),
    csrfSynchronisedProtection,
    async (req: any, res) => {
      try {
        const { eventIds, inspectorId } = req.body;
        const adminId = req.user.id;

        // Validate input
        if (!eventIds || !Array.isArray(eventIds) || eventIds.length === 0) {
          return res.status(400).json({ 
            success: false,
            message: 'eventIds array is required and must not be empty' 
          });
        }

        if (!inspectorId) {
          return res.status(400).json({ 
            success: false,
            message: 'inspectorId is required' 
          });
        }

        serverLogger.info('[API] Bulk assigning pending events:', { 
          eventCount: eventIds.length, 
          inspectorId, 
          adminId 
        });

        const result = await storage.bulkAssignPendingEvents({
          eventIds,
          inspectorId,
          adminId,
        });

        // Create audit log
        await createAuditLog(req, {
          userId: adminId,
          action: 'bulk_assign_pending_events',
          resourceType: 'pending_calendar_event',
          resourceId: 'bulk',
          changes: {
            eventCount: eventIds.length,
            inspectorId,
            assignedCount: result.assignedCount,
            errorCount: result.errors.length,
          },
          ipAddress: req.ip,
        }, storage);

        res.json({
          success: true,
          assignedCount: result.assignedCount,
          errors: result.errors,
        });
      } catch (error: any) {
        serverLogger.error('[API] Error bulk assigning pending events:', error);
        const errorResponse = handleDatabaseError(error, 'bulkAssignPendingEvents');
        res.status(errorResponse.status).json({ 
          success: false,
          message: errorResponse.message,
          error: error.message 
        });
      }
    }
  );

  // GET /api/inspectors/workload - Get inspector workload for assignment decisions
  app.get('/api/inspectors/workload',
    isAuthenticated,
    requireRole('admin'),
    async (req: any, res) => {
      try {
        const { startDate, endDate } = req.query;

        // Default to today if no dates provided
        let parsedStartDate: Date;
        let parsedEndDate: Date;
        
        if (!startDate && !endDate) {
          // Default to today
          parsedStartDate = new Date();
          parsedStartDate.setHours(0, 0, 0, 0);
          parsedEndDate = new Date();
          parsedEndDate.setHours(23, 59, 59, 999);
        } else if (!startDate || !endDate) {
          return res.status(400).json({ 
            success: false,
            message: 'Both startDate and endDate query parameters are required when specifying a date range' 
          });
        } else {
          // Parse provided dates
          parsedStartDate = new Date(startDate as string);
          parsedEndDate = new Date(endDate as string);
          
          // Check if dates are valid
          if (isNaN(parsedStartDate.getTime()) || isNaN(parsedEndDate.getTime())) {
            return res.status(400).json({
              success: false,
              message: 'Invalid date format. Please provide valid ISO 8601 dates.'
            });
          }
        }

        serverLogger.info('[API] Fetching inspector workload:', { 
          startDate: parsedStartDate.toISOString(), 
          endDate: parsedEndDate.toISOString() 
        });

        // Get all inspectors
        const inspectors = await storage.getUsersByRole('inspector');
        
        // Get workload for each inspector in the date range
        const workloadData = await Promise.all(
          inspectors.map(async (inspector) => {
            try {
              // Get workload for this inspector in the date range
              const workloadEntries = await storage.getInspectorWorkloadRange(
                inspector.id, 
                parsedStartDate, 
                parsedEndDate
              );
              
              // Calculate summary for the range
              const totalJobs = workloadEntries.reduce((sum, entry) => sum + (entry.jobCount || 0), 0);
              const totalMinutes = workloadEntries.reduce((sum, entry) => sum + (entry.scheduledMinutes || 0), 0);
              
              // Determine overall workload level
              let overallLevel: 'light' | 'moderate' | 'heavy' | 'overbooked' = 'light';
              if (totalJobs === 0) {
                overallLevel = 'light';
              } else if (totalJobs <= 3) {
                overallLevel = 'moderate';
              } else if (totalJobs <= 5) {
                overallLevel = 'heavy';
              } else {
                overallLevel = 'overbooked';
              }
              
              return {
                inspectorId: inspector.id,
                inspectorName: `${inspector.firstName || ''} ${inspector.lastName || ''}`.trim() || inspector.email || 'Unknown',
                totalJobs,
                totalMinutes,
                workloadLevel: overallLevel,
                entries: workloadEntries
              };
            } catch (error) {
              serverLogger.error(`[API] Error fetching workload for inspector ${inspector.id}:`, error);
              return {
                inspectorId: inspector.id,
                inspectorName: `${inspector.firstName || ''} ${inspector.lastName || ''}`.trim() || inspector.email || 'Unknown',
                totalJobs: 0,
                totalMinutes: 0,
                workloadLevel: 'light' as const,
                entries: []
              };
            }
          })
        );

        res.json(workloadData);
      } catch (error: any) {
        serverLogger.error('[API] Error fetching inspector workload:', error);
        const errorResponse = handleDatabaseError(error, 'getInspectorWorkload');
        res.status(errorResponse.status).json({ 
          success: false,
          message: errorResponse.message,
          error: error.message 
        });
      }
    }
  );

  // Convert Google event to job
  app.post('/api/google-events/:id/convert', isAuthenticated, csrfSynchronisedProtection, async (req, res) => {
    try {
      const { id } = req.params;
      const { jobData, scheduleData, keepSynced } = req.body;
      
      // Get the Google event
      const googleEvent = await storage.getGoogleEvent(id);
      if (!googleEvent) {
        return res.status(404).json({ message: 'Google event not found' });
      }
      
      if (googleEvent.isConverted) {
        return res.status(400).json({ message: 'Event has already been converted to a job' });
      }
      
      // Create the job
      const job = await storage.createJob({
        ...jobData,
        status: jobData.status || 'scheduled',
        priority: jobData.priority || 'medium',
      });
      
      // Create the schedule event
      const scheduleEvent = await storage.createScheduleEvent({
        jobId: job.id,
        title: job.name,
        startTime: new Date(scheduleData.startTime),
        endTime: new Date(scheduleData.endTime),
        notes: jobData.notes || null,
        googleCalendarEventId: googleEvent.googleEventId,
        googleCalendarId: googleEvent.googleCalendarId,
        color: null,
      });
      
      // Mark Google event as converted
      await storage.markGoogleEventAsConverted(id, job.id);
      
      // If keepSynced, update Google Calendar event with jobId in extendedProperties
      if (keepSynced) {
        try {
          const calendar = await getUncachableGoogleCalendarClient();
          
          await calendar.events.patch({
            calendarId: googleEvent.googleCalendarId,
            eventId: googleEvent.googleEventId,
            requestBody: {
              extendedProperties: {
                private: {
                  scheduleEventId: scheduleEvent.id,
                  jobId: job.id,
                },
              },
            },
          });
          
          serverLogger.info(`[GoogleCalendar] Updated event ${googleEvent.googleEventId} with jobId ${job.id}`);
        } catch (error) {
          serverLogger.error('[GoogleCalendar] Error updating event in Google Calendar:', error);
          // Don't fail the conversion if Google update fails
        }
      }
      
      serverLogger.info(`[API] Converted Google event ${id} to job ${job.id}`);
      
      res.json({ 
        success: true,
        job,
        scheduleEvent,
      });
    } catch (error: any) {
      serverLogger.error('[API] Error converting Google event to job:', error);
      res.status(500).json({ message: 'Failed to convert event to job', error: error.message });
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
      
      // Fetch enabled calendars from preferences
      const preferences = await storage.getCalendarPreferences();
      const enabledCalendarIds = preferences
        .filter(p => p.isEnabled)
        .map(p => p.calendarId);
      
      // If no calendars enabled, default to primary
      const calendarIds = enabledCalendarIds.length > 0 ? enabledCalendarIds : ['primary'];
      
      serverLogger.info(`[ScheduleEvents/Sync] Syncing from ${calendarIds.length} calendars: ${calendarIds.join(', ')}`);
      
      const googleEvents = await googleCalendarService.fetchEventsFromGoogle(start, end, calendarIds);
      const syncedCount = { 
        scheduleEvents: { created: 0, updated: 0, skipped: 0 },
        googleEvents: { created: 0, updated: 0 },
      };
      
      // Create a map of Google event IDs for quick lookup
      const googleEventIdMap = new Map<string, any>();
      
      for (const googleEvent of googleEvents) {
        if (googleEvent.id) {
          googleEventIdMap.set(googleEvent.id, googleEvent);
        }
        
        const parsedEvent = googleCalendarService.parseGoogleEventToScheduleEvent(googleEvent);
        
        if (parsedEvent && parsedEvent.jobId) {
          // Event linked to job → ScheduleEvent
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
              googleCalendarId: parsedEvent.googleCalendarId,
              lastSyncedAt: parsedEvent.lastSyncedAt,
            });
            syncedCount.scheduleEvents.updated++;
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
                googleCalendarId: parsedEvent.googleCalendarId,
                color: parsedEvent.color,
              });
              syncedCount.scheduleEvents.created++;
            } else {
              syncedCount.scheduleEvents.skipped++;
            }
          }
        } else {
          // Event not linked to job → GoogleEvent
          if (!googleEvent.id) {
            continue;
          }

          // Get start and end times (support both timed and all-day events)
          // For all-day events, convert from Central Time to UTC with proper DST handling
          const startTime = googleEvent.start?.dateTime 
            ? new Date(googleEvent.start.dateTime)
            : googleEvent.start?.date
            ? allDayDateToUTC(googleEvent.start.date)
            : null;

          const endTime = googleEvent.end?.dateTime
            ? new Date(googleEvent.end.dateTime)
            : googleEvent.end?.date
            ? allDayDateToUTC(googleEvent.end.date)
            : null;

          if (!startTime || !endTime) {
            serverLogger.warn(`[ScheduleSync] Skipping event ${googleEvent.id} - missing start or end time`);
            continue;
          }

          const calendarId = googleEvent.organizer?.email || 'primary';
          const existingGoogleEvent = await storage.getGoogleEventByGoogleId(googleEvent.id, calendarId);

          if (existingGoogleEvent) {
            await storage.updateGoogleEvent(existingGoogleEvent.id, {
              title: googleEvent.summary || 'Untitled',
              description: googleEvent.description || null,
              location: googleEvent.location || null,
              startTime,
              endTime,
              colorId: googleEvent.colorId || null,
              lastSyncedAt: new Date(),
            });
            syncedCount.googleEvents.updated++;
          } else {
            await storage.createGoogleEvent({
              googleEventId: googleEvent.id,
              googleCalendarId: calendarId,
              title: googleEvent.summary || 'Untitled',
              description: googleEvent.description || null,
              location: googleEvent.location || null,
              startTime,
              endTime,
              colorId: googleEvent.colorId || null,
              isConverted: false,
              convertedToJobId: null,
              lastSyncedAt: new Date(),
            });
            syncedCount.googleEvents.created++;
          }
        }
      }
      
      // Calendar sync intelligence: detect cancelled and rescheduled jobs
      const syncIntelligence = {
        cancelled: 0,
        rescheduled: 0,
        completedButRescheduled: 0,
      };
      
      try {
        // Get all jobs with sourceGoogleEventId in the date range
        const allJobs = await storage.getAllJobs();
        const jobsWithSourceEvent = allJobs.filter(job => 
          job.sourceGoogleEventId && 
          job.scheduledDate && 
          job.scheduledDate >= start && 
          job.scheduledDate <= end
        );
        
        for (const job of jobsWithSourceEvent) {
          const googleEvent = googleEventIdMap.get(job.sourceGoogleEventId!);
          
          if (!googleEvent) {
            // Event no longer exists in Google Calendar → mark as cancelled
            // Log details before marking to help diagnose false positives
            if (!job.isCancelled) {
              serverLogger.warn(`[CalendarSync] Job ${job.id} "${job.name}" source event ${job.sourceGoogleEventId} not found in calendars: ${calendarIds.join(', ')}`);
              serverLogger.warn(`[CalendarSync] Marking job ${job.id} as cancelled. Job scheduled: ${job.scheduledDate}`);
              await storage.updateJob(job.id, { isCancelled: true });
              syncIntelligence.cancelled++;
            }
          } else {
            // Event exists → check for rescheduling
            // Get start time (support both timed and all-day events)
            // For all-day events, convert from Central Time to UTC with proper DST handling
            const googleEventStartTime = googleEvent.start?.dateTime 
              ? new Date(googleEvent.start.dateTime)
              : googleEvent.start?.date
              ? allDayDateToUTC(googleEvent.start.date)
              : null;
            
            if (!googleEventStartTime) {
              serverLogger.error(`[CalendarSync] Event ${job.sourceGoogleEventId} has no start time`);
              continue;
            }
            
            const jobScheduledDate = new Date(job.scheduledDate);
            
            // Compare dates (ignore milliseconds)
            const timeDiffMs = Math.abs(googleEventStartTime.getTime() - jobScheduledDate.getTime());
            const isRescheduled = timeDiffMs > 60000; // More than 1 minute difference
            
            if (isRescheduled) {
              const updates: Partial<InsertJob> = {};
              
              // Set originalScheduledDate if not already set
              if (!job.originalScheduledDate) {
                updates.originalScheduledDate = jobScheduledDate;
              }
              
              // Update scheduledDate to match Google Calendar
              updates.scheduledDate = googleEventStartTime;
              
              // If job is already completed, log warning
              if (job.status === 'completed') {
                serverLogger.warn(`[CalendarSync] Job ${job.id} is completed but event was rescheduled from ${jobScheduledDate.toISOString()} to ${googleEventStartTime.toISOString()}`);
                syncIntelligence.completedButRescheduled++;
              } else {
                syncIntelligence.rescheduled++;
              }
              
              await storage.updateJob(job.id, updates);
              serverLogger.info(`[CalendarSync] Updated job ${job.id} schedule: ${jobScheduledDate.toISOString()} → ${googleEventStartTime.toISOString()}`);
            }
            
            // Unmark as cancelled if it was previously cancelled
            if (job.isCancelled) {
              await storage.updateJob(job.id, { isCancelled: false });
              serverLogger.info(`[CalendarSync] Unmarked job ${job.id} as cancelled (event ${job.sourceGoogleEventId} found again)`);
            }
          }
        }
      } catch (error) {
        serverLogger.error('[CalendarSync] Error during calendar sync intelligence:', error);
        // Don't fail the entire sync if intelligence fails
      }

      res.json({
        message: "Sync completed successfully",
        syncedCount,
        syncIntelligence,
        totalProcessed: googleEvents.length,
      });
    } catch (error: any) {
      logError('ScheduleEvents/Sync', error, { startDate, endDate });
      
      // Check if this is an authentication error
      const isAuthError = error.message?.toLowerCase().includes('unauthorized') ||
                         error.message?.toLowerCase().includes('authentication') ||
                         error.message?.toLowerCase().includes('invalid credentials') ||
                         error.message?.toLowerCase().includes('not connected') ||
                         error.code === 401 ||
                         error.status === 401;
      
      if (isAuthError) {
        return res.status(401).json({ 
          message: 'Google Calendar authentication required. Please log out and reconnect your Google account in Settings.',
        });
      }
      
      const { status, message } = handleDatabaseError(error, 'sync schedule events from Google Calendar');
      res.status(status).json({ message });
    }
  });

  app.post("/api/schedule-events", isAuthenticated, csrfSynchronisedProtection, async (req, res) => {
    try {
      const validated = insertScheduleEventSchema.parse(req.body);
      const event = await storage.createScheduleEvent(validated);
      
      try {
        const job = await storage.getJob(event.jobId);
        if (job) {
          const calendarId = event.googleCalendarId || 'primary';
          const googleEventId = await googleCalendarService.syncEventToGoogle(event, job, calendarId);
          if (googleEventId) {
            const updatedEvent = await storage.updateScheduleEvent(event.id, {
              googleCalendarEventId: googleEventId,
              googleCalendarId: calendarId,
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

  app.put("/api/schedule-events/:id", isAuthenticated, csrfSynchronisedProtection, async (req, res) => {
    try {
      const validated = insertScheduleEventSchema.partial().parse(req.body);
      const event = await storage.updateScheduleEvent(req.params.id, validated);
      if (!event) {
        return res.status(404).json({ message: "Schedule event not found. It may have been deleted." });
      }
      
      try {
        const job = await storage.getJob(event.jobId);
        if (job) {
          const calendarId = event.googleCalendarId || 'primary';
          const googleEventId = await googleCalendarService.syncEventToGoogle(event, job, calendarId);
          if (googleEventId) {
            const updatedEvent = await storage.updateScheduleEvent(event.id, {
              googleCalendarEventId: googleEventId,
              googleCalendarId: calendarId,
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

  app.delete("/api/schedule-events/:id", isAuthenticated, csrfSynchronisedProtection, async (req, res) => {
    try {
      const event = await storage.getScheduleEvent(req.params.id);
      
      if (event?.googleCalendarEventId) {
        try {
          const calendarId = event.googleCalendarId || 'primary';
          await googleCalendarService.deleteEventFromGoogle(event.googleCalendarEventId, calendarId);
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

  // Inspector Assignment API Endpoints
  // NOTE: Main /api/inspectors/workload endpoint is defined above (line 2698)
  // Removed duplicate definition to prevent routing conflicts

  // Get workload for a specific inspector
  app.get("/api/inspectors/:id/workload", isAuthenticated, async (req: any, res) => {
    try {
      const inspectorId = req.params.id;
      const userRole = (req.user.role as UserRole) || 'inspector';
      const userId = req.user.id;

      // Inspectors can only see their own workload
      if (userRole === 'inspector' && inspectorId !== userId) {
        return res.status(403).json({ message: 'You can only view your own workload' });
      }

      const date = req.query.date ? new Date(req.query.date) : new Date();
      const workload = await storage.getInspectorWorkload(inspectorId, date);
      
      if (!workload) {
        // Return an empty workload if none exists
        res.json({
          inspectorId,
          date,
          jobCount: 0,
          scheduledMinutes: 0,
          workloadLevel: 'light'
        });
      } else {
        res.json(workload);
      }
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'get inspector workload');
      res.status(status).json({ message });
    }
  });

  // Get workload range for an inspector
  app.get("/api/inspectors/:id/workload-range", isAuthenticated, async (req: any, res) => {
    try {
      const inspectorId = req.params.id;
      const userRole = (req.user.role as UserRole) || 'inspector';
      const userId = req.user.id;

      // Inspectors can only see their own workload
      if (userRole === 'inspector' && inspectorId !== userId) {
        return res.status(403).json({ message: 'You can only view your own workload' });
      }

      const startDate = req.query.startDate ? new Date(req.query.startDate) : new Date();
      const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();
      
      const workloads = await storage.getInspectorWorkloadRange(inspectorId, startDate, endDate);
      res.json(workloads);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'get inspector workload range');
      res.status(status).json({ message });
    }
  });

  // Get all inspectors workload for a specific date (for assignment dialog)
  app.get("/api/inspector-workload/:date", isAuthenticated, requireRole('admin', 'manager'), async (req: any, res) => {
    try {
      const date = new Date(req.params.date);
      const workloads = await storage.getAllInspectorsWorkload(date);
      res.json(workloads);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'get all inspectors workload for date');
      res.status(status).json({ message });
    }
  });

  // Get all inspector preferences
  app.get("/api/inspector-preferences", isAuthenticated, requireRole('admin', 'manager'), async (req: any, res) => {
    try {
      const preferences = await storage.getAllInspectorPreferences();
      res.json(preferences);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'get all inspector preferences');
      res.status(status).json({ message });
    }
  });

  // Get inspector preferences
  app.get("/api/inspectors/:id/preferences", isAuthenticated, async (req: any, res) => {
    try {
      const inspectorId = req.params.id;
      const userRole = (req.user.role as UserRole) || 'inspector';
      const userId = req.user.id;

      // Inspectors can only see their own preferences
      if (userRole === 'inspector' && inspectorId !== userId) {
        return res.status(403).json({ message: 'You can only view your own preferences' });
      }

      const preferences = await storage.getInspectorPreferences(inspectorId);
      
      if (!preferences) {
        // Return default preferences if none exist
        res.json({
          inspectorId,
          preferredTerritories: [],
          maxDailyJobs: 5,
          maxWeeklyJobs: 25,
          specializations: [],
          unavailableDates: [],
          workStartTime: '08:00',
          workEndTime: '17:00'
        });
      } else {
        res.json(preferences);
      }
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'get inspector preferences');
      res.status(status).json({ message });
    }
  });

  // Update inspector preferences
  app.put("/api/inspectors/:id/preferences", isAuthenticated, csrfSynchronisedProtection, async (req: any, res) => {
    try {
      const inspectorId = req.params.id;
      const userRole = (req.user.role as UserRole) || 'inspector';
      const userId = req.user.id;

      // Inspectors can only update their own preferences, admin can update anyone's
      if (userRole === 'inspector' && inspectorId !== userId) {
        return res.status(403).json({ message: 'You can only update your own preferences' });
      }

      const preferencesSchema = z.object({
        preferredTerritories: z.array(z.string()).optional(),
        maxDailyJobs: z.number().min(1).max(20).optional(),
        maxWeeklyJobs: z.number().min(1).max(100).optional(),
        specializations: z.array(z.string()).optional(),
        unavailableDates: z.array(z.string()).optional(),
        workStartTime: z.string().optional(),
        workEndTime: z.string().optional(),
      });

      const validated = preferencesSchema.parse(req.body);
      const preferences = await storage.updateInspectorPreferences(inspectorId, validated);
      
      res.json(preferences);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'update inspector preferences');
      res.status(status).json({ message });
    }
  });

  // Suggest optimal inspector for a job
  app.post("/api/jobs/suggest-inspector/:jobId/:date", isAuthenticated, requireRole('admin', 'manager'), async (req: any, res) => {
    try {
      const jobId = req.params.jobId;
      const date = new Date(req.params.date);
      
      const suggestion = await storage.suggestOptimalInspector(jobId, date);
      
      if (!suggestion) {
        return res.status(404).json({ message: 'No suitable inspector found' });
      }
      
      res.json([suggestion]); // Return as array for consistency with frontend
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'suggest optimal inspector');
      res.status(status).json({ message });
    }
  });

  // Assign job to inspector
  app.post("/api/jobs/:id/assign", isAuthenticated, requireRole('admin', 'manager'), csrfSynchronisedProtection, async (req: any, res) => {
    try {
      const jobId = req.params.id;
      const assignedBy = req.user.id;
      
      const assignmentSchema = z.object({
        inspectorId: z.string().min(1, "Inspector ID is required"),
        reason: z.string().optional(),
      });

      const { inspectorId, reason } = assignmentSchema.parse(req.body);
      
      const job = await storage.assignJobToInspector(jobId, inspectorId, assignedBy, reason);
      
      // Send notification to assigned inspector
      const { createNotification } = await import('./notificationService');
      try {
        await createNotification({
          userId: inspectorId,
          type: 'job_assigned',
          priority: 'medium',
          title: `New Job Assigned: ${job.name}`,
          message: `You've been assigned to ${job.name} scheduled for ${job.scheduledDate ? new Date(job.scheduledDate).toLocaleDateString() : 'TBD'}`,
          metadata: { jobId: job.id }
        });
        
        // Also send email notification
        const inspector = await storage.getUser(inspectorId);
        if (inspector?.email) {
          await emailService.sendJobAssigned(
            inspector.email,
            job.name,
            job.address || '',
            job.scheduledDate ? new Date(job.scheduledDate) : new Date(),
            assignedBy
          );
        }
      } catch (notificationError) {
        serverLogger.error('Failed to send assignment notification:', notificationError);
        // Don't fail the request if notification fails
      }
      
      res.json(job);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'assign job to inspector');
      res.status(status).json({ message });
    }
  });

  // Bulk assign jobs
  app.post("/api/jobs/bulk-assign", isAuthenticated, requireRole('admin', 'manager'), csrfSynchronisedProtection, async (req: any, res) => {
    try {
      const assignedBy = req.user.id;
      
      const bulkAssignSchema = z.object({
        assignments: z.array(z.object({
          jobId: z.string(),
          inspectorId: z.string(),
        })).min(1, "At least one assignment is required"),
      });

      const { assignments } = bulkAssignSchema.parse(req.body);
      
      // Limit bulk operations
      if (assignments.length > 50) {
        return res.status(400).json({ message: "Cannot assign more than 50 jobs at once" });
      }
      
      const results = await storage.bulkAssignJobs(assignments, assignedBy);
      
      // Send notifications for successful assignments
      const { createNotification } = await import('./notificationService');
      for (const job of results) {
        if (job.assignedTo) {
          try {
            await createNotification({
              userId: job.assignedTo,
              type: 'job_assigned',
              priority: 'medium',
              title: `New Job Assigned: ${job.name}`,
              message: `You've been assigned to ${job.name} (bulk assignment)`,
              metadata: { jobId: job.id }
            });
          } catch (error) {
            serverLogger.error(`Failed to send notification for job ${job.id}:`, error);
          }
        }
      }
      
      res.json({
        message: `Successfully assigned ${results.length} jobs`,
        results
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'bulk assign jobs');
      res.status(status).json({ message });
    }
  });

  // Get assignment history for a job
  app.get("/api/jobs/:id/assignment-history", isAuthenticated, async (req: any, res) => {
    try {
      const jobId = req.params.id;
      const history = await storage.getAssignmentHistory(jobId);
      res.json(history);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'get assignment history');
      res.status(status).json({ message });
    }
  });

  // Get jobs by date for conflict checking
  app.get("/api/jobs/by-date/:date", isAuthenticated, requireRole('admin', 'manager'), async (req: any, res) => {
    try {
      const date = new Date(req.params.date);
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      
      const jobs = await storage.getJobsByDateRange(startOfDay, endOfDay);
      res.json(jobs);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'get jobs by date');
      res.status(status).json({ message });
    }
  });

  // NOTE: /api/users/inspectors endpoint is defined above (line 153)
  // Removed duplicate definition to prevent routing conflicts

  app.get("/api/expenses", isAuthenticated, async (req, res) => {
    try {
      const { jobId, limit, offset } = req.query;

      if (limit !== undefined || offset !== undefined) {
        const params = paginationParamsSchema.parse({ limit, offset });
        let result;
        
        if (jobId && typeof jobId === "string") {
          result = await storage.getExpensesByJobPaginated(jobId, params);
        } else {
          result = await storage.getExpensesPaginated(params);
        }
        
        return res.json(result);
      }

      let expenses;
      if (jobId && typeof jobId === "string") {
        expenses = await storage.getExpensesByJob(jobId);
      } else {
        expenses = await storage.getAllExpenses();
      }

      res.json(expenses);
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'fetch expenses');
      res.status(status).json({ message });
    }
  });

  app.post("/api/expenses", isAuthenticated, csrfSynchronisedProtection, async (req, res) => {
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

  app.put("/api/expenses/:id", isAuthenticated, csrfSynchronisedProtection, async (req, res) => {
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

  app.delete("/api/expenses/:id", isAuthenticated, csrfSynchronisedProtection, async (req, res) => {
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

  // Bulk delete expenses
  app.delete("/api/expenses/bulk", isAuthenticated, csrfSynchronisedProtection, async (req, res) => {
    const bulkDeleteSchema = z.object({
      ids: z.array(z.string()).min(1, "At least one expense ID is required"),
    });

    try {
      const { ids } = bulkDeleteSchema.parse(req.body);
      
      // Limit bulk operations to 200 items for safety
      if (ids.length > 200) {
        return res.status(400).json({ message: "Cannot delete more than 200 expenses at once" });
      }

      const deleted = await storage.bulkDeleteExpenses(ids);
      res.json({ deleted, total: ids.length });
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'bulk delete expenses');
      res.status(status).json({ message });
    }
  });

  // Export expenses
  app.post("/api/expenses/export", isAuthenticated, csrfSynchronisedProtection, async (req, res) => {
    const exportSchema = z.object({
      ids: z.array(z.string()).min(1, "At least one expense ID is required"),
      format: z.enum(['csv', 'json']),
    });

    try {
      const { ids, format } = exportSchema.parse(req.body);
      
      // Limit export to 1000 items for safety
      if (ids.length > 1000) {
        return res.status(400).json({ message: "Cannot export more than 1000 expenses at once" });
      }

      // Fetch expenses by IDs
      const expenses = await Promise.all(
        ids.map(id => storage.getExpense(id))
      );
      const validExpenses = expenses.filter((e): e is NonNullable<typeof e> => e !== undefined);

      // Fetch jobs for enrichment (for job names in export)
      const jobIds = Array.from(new Set(validExpenses.map(e => e.jobId).filter(Boolean)));
      const jobs = await Promise.all(
        jobIds.map(id => storage.getJob(id))
      );
      const jobMap = new Map(jobs.filter(Boolean).map(j => [j!.id, j!]));

      if (format === 'json') {
        // Return JSON directly
        res.json(validExpenses);
      } else {
        // Generate CSV
        const csvRows: string[] = [
          // Header row - accounting-friendly format
          'ID,Date,Category,Amount,Description,Type,Job ID,Job Name,Receipt URL'
        ];

        // Data rows
        for (const expense of validExpenses) {
          const job = expense.jobId ? jobMap.get(expense.jobId) : undefined;
          const jobName = job?.name ?? '';
          const expenseType = expense.isWorkRelated ? 'Work' : 'Personal';

          const row = [
            expense.id,
            expense.date ? new Date(expense.date).toISOString().split('T')[0] : '', // YYYY-MM-DD format
            expense.category ?? '',
            expense.amount ?? '',
            expense.description ?? '',
            expenseType,
            expense.jobId ?? '',
            jobName,
            expense.receiptUrl ?? '',
          ].map(field => {
            // Escape commas and quotes in CSV
            const str = String(field);
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
              return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
          }).join(',');

          csvRows.push(row);
        }

        const csv = csvRows.join('\n');
        
        // Set headers for CSV download
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="expenses-export-${Date.now()}.csv"`);
        res.send(csv);
      }
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'export expenses');
      res.status(status).json({ message });
    }
  });

  app.get("/api/mileage-logs", isAuthenticated, async (req, res) => {
    try {
      const { startDate, endDate, limit, offset } = req.query;

      if (limit !== undefined || offset !== undefined) {
        const params = paginationParamsSchema.parse({ limit, offset });
        const result = await storage.getMileageLogsPaginated(params);
        return res.json(result);
      }

      let logs;
      if (startDate && endDate) {
        const start = new Date(startDate as string);
        const end = new Date(endDate as string);
        logs = await storage.getMileageLogsByDateRange(start, end);
      } else {
        logs = await storage.getAllMileageLogs();
      }

      res.json(logs);
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'fetch mileage logs');
      res.status(status).json({ message });
    }
  });

  app.post("/api/mileage-logs", isAuthenticated, csrfSynchronisedProtection, async (req, res) => {
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

  app.put("/api/mileage-logs/:id", isAuthenticated, csrfSynchronisedProtection, async (req, res) => {
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

  app.delete("/api/mileage-logs/:id", isAuthenticated, csrfSynchronisedProtection, async (req, res) => {
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

  // GPS-tracked mileage routes
  app.post("/api/mileage-logs/auto", isAuthenticated, csrfSynchronisedProtection, async (req, res) => {
    try {
      // Validate request body with Zod schema
      const validated = autoTripSchema.parse(req.body);
      const { purpose, jobId, startTime, endTime, distanceMeters, durationSeconds, points } = validated;
      
      const logData: any = {
        date: new Date(startTime),
        purpose,
        isWorkRelated: purpose === 'business',
        jobId: jobId || null,
        trackingSource: 'gps_auto',
        vehicleState: 'completed',
        startTimestamp: new Date(startTime),
        endTimestamp: new Date(endTime),
        distanceMeters,
        durationSeconds,
        distance: String((distanceMeters * 0.000621371).toFixed(2)),
        averageSpeed: durationSeconds > 0 ? String((distanceMeters / durationSeconds).toFixed(2)) : '0',
        startLatitude: points[0]?.latitude || null,
        startLongitude: points[0]?.longitude || null,
        endLatitude: points[points.length - 1]?.latitude || null,
        endLongitude: points[points.length - 1]?.longitude || null,
        routeSummary: {
          totalDistance: distanceMeters,
          totalTime: durationSeconds,
          pointCount: points.length,
          startCoords: points[0] ? { lat: points[0].latitude, lon: points[0].longitude } : null,
          endCoords: points[points.length - 1] ? { lat: points[points.length - 1].latitude, lon: points[points.length - 1].longitude } : null,
        },
      };

      const log = await storage.createMileageLogWithRoute(logData, points);
      res.status(201).json(log);
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'create GPS mileage log');
      res.status(status).json({ message });
    }
  });

  app.get("/api/mileage-logs/:id/route", isAuthenticated, async (req, res) => {
    try {
      const points = await storage.getMileageLogRoute(req.params.id);
      res.json(points);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch route points');
      res.status(status).json({ message });
    }
  });

  app.put("/api/mileage-logs/:id/points", isAuthenticated, csrfSynchronisedProtection, async (req, res) => {
    try {
      const routePointsSchema = z.object({
        points: z.array(insertMileageRoutePointSchema)
      });
      
      const validated = routePointsSchema.parse(req.body);
      await storage.updateMileageLogRoute(req.params.id, validated.points);
      res.status(204).send();
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'update route points');
      res.status(status).json({ message });
    }
  });

  // MileIQ Backend Endpoints
  // Rate limiter for classify endpoint (100 req/min)
  const classifyRateLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100, // 100 requests per minute
    message: 'Too many classification requests, please try again later',
  });

  app.get("/api/mileage/unclassified", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      // Validate limit parameter with Zod
      const limitSchema = z.coerce.number().int().min(1).max(100).default(50);
      const limit = limitSchema.parse(req.query.limit || 50);
      
      const drives = await storage.getUnclassifiedMileageLogs(userId, limit);
      res.json({ drives });
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'fetch unclassified mileage logs');
      res.status(status).json({ message });
    }
  });

  app.put("/api/mileage/:id/classify", isAuthenticated, csrfSynchronisedProtection, classifyRateLimiter, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const logId = req.params.id;
      
      // Validate request body
      const classifySchema = z.object({
        purpose: z.enum(['business', 'personal']),
        jobId: z.string().uuid().optional(),
      });
      
      const validated = classifySchema.parse(req.body);
      
      // Classify the mileage log
      const updatedLog = await storage.classifyMileageLog(
        logId,
        userId,
        validated.purpose,
        validated.jobId
      );
      
      res.json(updatedLog);
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      
      // Handle specific error messages from storage layer
      if (error instanceof Error) {
        if (error.message === 'Mileage log not found') {
          return res.status(404).json({ message: 'Mileage log not found' });
        }
        if (error.message.includes('Unauthorized')) {
          return res.status(403).json({ message: 'You do not have permission to classify this mileage log' });
        }
        // Handle state transition errors with 409 Conflict
        if (error.message.includes('already classified')) {
          return res.status(409).json({ message: error.message });
        }
        if (error.message === 'Job not found') {
          return res.status(404).json({ message: 'Job not found' });
        }
      }
      
      const { status, message } = handleDatabaseError(error, 'classify mileage log');
      res.status(status).json({ message });
    }
  });

  app.get("/api/mileage/summary", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const month = req.query.month as string;
      
      if (!month || !/^\d{4}-\d{2}$/.test(month)) {
        return res.status(400).json({ 
          message: 'Please provide a valid month in YYYY-MM format' 
        });
      }
      
      const summary = await storage.getMileageMonthlySummary(userId, month);
      res.json(summary);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch mileage summary');
      res.status(status).json({ message });
    }
  });

  app.get("/api/mileage/export", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const month = req.query.month as string;
      const format = req.query.format as string;
      
      if (!month || !/^\d{4}-\d{2}$/.test(month)) {
        return res.status(400).json({ 
          message: 'Please provide a valid month in YYYY-MM format' 
        });
      }
      
      if (format !== 'csv') {
        return res.status(400).json({ 
          message: 'Only CSV format is currently supported' 
        });
      }
      
      const csvContent = await storage.exportMileageCsv(userId, month);
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=mileage-${month}.csv`);
      res.send(csvContent);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'export mileage data');
      res.status(status).json({ message });
    }
  });

  // Financial Management Endpoints
  // Invoices
  app.get("/api/invoices", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { status, builderId, jobId, limit, offset } = req.query;

      if (limit !== undefined || offset !== undefined) {
        const params = paginationParamsSchema.parse({ limit, offset });
        const result = await storage.getInvoicesPaginated(params);
        return res.json(result);
      }

      let invoices;
      if (status && typeof status === "string") {
        invoices = await storage.getInvoicesByStatus(status);
      } else if (builderId && typeof builderId === "string") {
        invoices = await storage.getInvoicesByBuilder(builderId);
      } else if (jobId && typeof jobId === "string") {
        invoices = await storage.getInvoicesByJob(jobId);
      } else {
        invoices = await storage.getInvoicesByUser(userId);
      }

      res.json(invoices);
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'fetch invoices');
      res.status(status).json({ message });
    }
  });

  app.post("/api/invoices", isAuthenticated, csrfSynchronisedProtection, async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      // Generate invoice number if not provided
      let invoiceData = req.body;
      if (!invoiceData.invoiceNumber) {
        invoiceData.invoiceNumber = await storage.getNextInvoiceNumber(userId);
      }
      
      invoiceData.userId = userId;
      const validated = insertInvoiceSchema.parse(invoiceData);
      const invoice = await storage.createInvoice(validated);
      res.status(201).json(invoice);
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'create invoice');
      res.status(status).json({ message });
    }
  });

  app.get("/api/invoices/:id", isAuthenticated, async (req, res) => {
    try {
      const invoice = await storage.getInvoice(req.params.id);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      res.json(invoice);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch invoice');
      res.status(status).json({ message });
    }
  });

  app.put("/api/invoices/:id", isAuthenticated, csrfSynchronisedProtection, async (req, res) => {
    try {
      const validated = insertInvoiceSchema.partial().parse(req.body);
      const invoice = await storage.updateInvoice(req.params.id, validated);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      res.json(invoice);
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'update invoice');
      res.status(status).json({ message });
    }
  });

  app.post("/api/invoices/:id/mark-paid", isAuthenticated, csrfSynchronisedProtection, async (req, res) => {
    try {
      const paymentDetails = insertPaymentSchema.partial().parse(req.body);
      const invoice = await storage.markInvoiceAsPaid(req.params.id, paymentDetails);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      res.json(invoice);
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'mark invoice as paid');
      res.status(status).json({ message });
    }
  });

  app.delete("/api/invoices/:id", isAuthenticated, csrfSynchronisedProtection, async (req, res) => {
    try {
      const deleted = await storage.deleteInvoice(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      res.status(204).send();
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'delete invoice');
      res.status(status).json({ message });
    }
  });

  // Payments
  app.get("/api/payments", isAuthenticated, async (req, res) => {
    try {
      const { invoiceId, limit, offset } = req.query;

      if (limit !== undefined || offset !== undefined) {
        const params = paginationParamsSchema.parse({ limit, offset });
        const result = await storage.getPaymentsPaginated(params);
        return res.json(result);
      }

      if (invoiceId && typeof invoiceId === "string") {
        const payments = await storage.getPaymentsByInvoice(invoiceId);
        return res.json(payments);
      }

      res.status(400).json({ message: "Invoice ID required" });
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'fetch payments');
      res.status(status).json({ message });
    }
  });

  app.post("/api/payments", isAuthenticated, csrfSynchronisedProtection, async (req, res) => {
    try {
      const validated = insertPaymentSchema.parse(req.body);
      const payment = await storage.createPayment(validated);
      res.status(201).json(payment);
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'create payment');
      res.status(status).json({ message });
    }
  });

  // Financial Settings
  app.get("/api/financial-settings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      let settings = await storage.getFinancialSettings(userId);
      
      // Create default settings if none exist
      if (!settings) {
        settings = await storage.createFinancialSettings({
          userId,
          taxRate: 0,
          invoicePrefix: 'INV',
          nextInvoiceNumber: 1000,
          paymentTermsDays: 30,
        });
      }
      
      res.json(settings);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch financial settings');
      res.status(status).json({ message });
    }
  });

  app.put("/api/financial-settings", isAuthenticated, csrfSynchronisedProtection, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const validated = insertFinancialSettingsSchema.partial().parse(req.body);
      
      let settings = await storage.getFinancialSettings(userId);
      if (!settings) {
        // Create if doesn't exist
        settings = await storage.createFinancialSettings({
          ...validated,
          userId,
        });
      } else {
        settings = await storage.updateFinancialSettings(userId, validated);
      }
      
      res.json(settings);
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'update financial settings');
      res.status(status).json({ message });
    }
  });

  // Financial Reports
  app.get("/api/financial-summary", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { startDate, endDate } = req.query;
      
      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;
      
      const summary = await storage.getFinancialSummary(userId, start, end);
      res.json(summary);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch financial summary');
      res.status(status).json({ message });
    }
  });

  app.get("/api/revenue-by-period", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { period = 'month' } = req.query;
      
      if (!['day', 'week', 'month', 'quarter', 'year'].includes(period as string)) {
        return res.status(400).json({ message: "Invalid period. Use day, week, month, quarter, or year" });
      }
      
      const revenue = await storage.getRevenueByPeriod(userId, period as any);
      res.json(revenue);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch revenue by period');
      res.status(status).json({ message });
    }
  });

  app.get("/api/expenses-by-category", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { startDate, endDate } = req.query;
      
      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;
      
      const expenses = await storage.getExpensesByCategory(userId, start, end);
      res.json(expenses);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch expenses by category');
      res.status(status).json({ message });
    }
  });

  app.get("/api/mileage-summary", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { startDate, endDate } = req.query;
      
      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;
      
      const summary = await storage.getMileageSummary(userId, start, end);
      res.json(summary);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch mileage summary');
      res.status(status).json({ message });
    }
  });

  app.get("/api/job-profitability/:jobId", isAuthenticated, async (req, res) => {
    try {
      const profitability = await storage.getJobProfitability(req.params.jobId);
      res.json(profitability);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch job profitability');
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

  app.post("/api/report-templates", isAuthenticated, csrfSynchronisedProtection, async (req, res) => {
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


  // Get field dependencies
  app.get("/api/templates/:id/dependencies", isAuthenticated, async (req, res) => {
    try {
      const dependencies = await storage.getFieldDependenciesByTemplate(req.params.id);
      res.json(dependencies);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch field dependencies');
      res.status(status).json({ message });
    }
  });

  // Update field conditions
  app.post("/api/templates/:id/fields/:fieldId/conditions", isAuthenticated, csrfSynchronisedProtection, async (req, res) => {
    try {
      const { id: templateId, fieldId } = req.params;
      const { conditions } = req.body;
      
      // Update the field's conditions
      const field = await storage.getTemplateFieldById(fieldId);
      if (!field || field.templateId !== templateId) {
        return res.status(404).json({ error: "Field not found" });
      }
      
      await storage.updateTemplateField(fieldId, {
        ...field,
        conditions: conditions
      });
      
      // Update dependencies based on conditions
      if (conditions && conditions.length > 0) {
        // Extract all referenced fields from conditions
        const referencedFields = new Set<string>();
        conditions.forEach((condition: any) => {
          if (condition.targetField) {
            referencedFields.add(condition.targetField);
          }
          if (condition.conditions) {
            condition.conditions.forEach((c: any) => {
              if (c.targetField) {
                referencedFields.add(c.targetField);
              }
            });
          }
        });
        
        // Update dependencies
        for (const targetFieldId of referencedFields) {
          await storage.upsertFieldDependency({
            templateId,
            sourceFieldId: targetFieldId,
            targetFieldId: fieldId,
            conditionType: "visibility",
            conditionConfig: conditions
          });
        }
      }
      
      res.json({ success: true });
    } catch (error) {
      serverLogger.error("Failed to update field conditions:", error);
      res.status(500).json({ error: "Failed to update field conditions" });
    }
  });

  // Test conditions with sample data
  app.post("/api/templates/:id/test-conditions", isAuthenticated, csrfSynchronisedProtection, async (req, res) => {
    try {
      const templateId = req.params.id;
      const { fieldValues } = req.body;
      
      // Get all fields and dependencies
      const fields = await storage.getTemplateFieldsByTemplateId(templateId);
      const dependencies = await storage.getFieldDependenciesByTemplate(templateId);
      
      // Initialize the conditional logic engine
      const { ConditionalLogicEngine } = await import("../client/src/utils/conditionalLogic");
      const engine = new ConditionalLogicEngine(fields, dependencies, fieldValues);
      
      // Get the evaluated field states
      const states = engine.getFieldStates();
      const result: Record<string, any> = {};
      states.forEach((state, fieldId) => {
        result[fieldId] = state;
      });
      
      res.json(result);
    } catch (error) {
      serverLogger.error("Failed to test conditions:", error);
      res.status(500).json({ error: "Failed to test conditions" });
    }
  });

  app.put("/api/report-templates/:id", isAuthenticated, csrfSynchronisedProtection, async (req, res) => {
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

  app.delete("/api/report-templates/:id", isAuthenticated, csrfSynchronisedProtection, async (req, res) => {
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

  // Clone report template
  app.post("/api/report-templates/:id/clone", isAuthenticated, csrfSynchronisedProtection, async (req, res) => {
    try {
      const { name } = req.body;
      const cloned = await storage.cloneReportTemplate(req.params.id, name);
      
      await createAuditLog({
        userId: (req as any).user?.claims?.sub || 'unknown',
        action: 'template.cloned',
        entityType: 'reportTemplate',
        entityId: cloned.id,
        metadata: { 
          originalId: req.params.id,
          newName: cloned.name,
          version: cloned.version
        }
      });
      
      res.status(201).json(cloned);
    } catch (error) {
      if (error instanceof Error && error.message === 'Template not found') {
        return res.status(404).json({ message: "Report template not found" });
      }
      const { status, message } = handleDatabaseError(error, 'clone report template');
      res.status(status).json({ message });
    }
  });

  // Archive report template
  app.post("/api/report-templates/:id/archive", isAuthenticated, csrfSynchronisedProtection, async (req, res) => {
    try {
      const archived = await storage.archiveReportTemplate(req.params.id);
      if (!archived) {
        return res.status(404).json({ message: "Report template not found" });
      }
      
      await createAuditLog({
        userId: (req as any).user?.claims?.sub || 'unknown',
        action: 'template.archived',
        entityType: 'reportTemplate',
        entityId: req.params.id,
        metadata: { 
          templateName: archived.name,
          archivedAt: new Date().toISOString()
        }
      });
      
      res.json(archived);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'archive report template');
      res.status(status).json({ message });
    }
  });

  // Get template version history
  app.get("/api/report-templates/:id/versions", isAuthenticated, async (req, res) => {
    try {
      const versions = await storage.getTemplateVersions(req.params.id);
      res.json(versions);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch template versions');
      res.status(status).json({ message });
    }
  });

  app.get("/api/report-instances", isAuthenticated, async (req, res) => {
    try {
      const { jobId, limit, offset } = req.query;

      let instances;
      if (jobId && typeof jobId === "string") {
        instances = await storage.getReportInstancesByJob(jobId);
      } else {
        instances = await storage.getAllReportInstances();
      }

      const withScores = instances.map(inst => ({
        ...inst,
        scoreSummary: inst.scoreSummary ? JSON.parse(inst.scoreSummary) : null,
      }));

      if (limit !== undefined || offset !== undefined) {
        const params = paginationParamsSchema.parse({ limit, offset });
        const result = createPaginatedResult(withScores, params);
        return res.json(result);
      }

      res.json(withScores);
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'fetch report instances');
      res.status(status).json({ message });
    }
  });

  app.post("/api/report-instances", isAuthenticated, csrfSynchronisedProtection, async (req: any, res) => {
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
      
      // Audit log: Report generation
      await createAuditLog(req, {
        userId: req.user.id,
        action: 'report.generate',
        resourceType: 'report',
        resourceId: instance.id,
        metadata: { jobId: instance.jobId, templateId: instance.templateId },
      }, storage);
      
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

  app.post("/api/report-instances/recalculate-scores", isAuthenticated, csrfSynchronisedProtection, async (req, res) => {
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

  // Get report field values
  app.get("/api/report-instances/:id/field-values", isAuthenticated, async (req, res) => {
    try {
      const values = await storage.getReportFieldValues(req.params.id);
      res.json(values);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch field values');
      res.status(status).json({ message });
    }
  });

  // Save report field value
  app.post("/api/report-field-values", isAuthenticated, csrfSynchronisedProtection, async (req, res) => {
    try {
      const validated = insertReportFieldValueSchema.parse(req.body);
      
      // Check if value already exists
      const existing = await storage.getReportFieldValuesBySection(validated.reportInstanceId);
      const existingValue = existing.find(v => v.templateFieldId === validated.templateFieldId);
      
      let result;
      if (existingValue) {
        // Update existing value
        result = await storage.updateReportFieldValue(existingValue.id, validated);
      } else {
        // Create new value
        result = await storage.createReportFieldValue(validated);
      }
      
      res.json(result);
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'save field value');
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

  app.put("/api/report-instances/:id", isAuthenticated, csrfSynchronisedProtection, async (req, res) => {
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

  app.post("/api/report-instances/:id/generate-pdf", isAuthenticated, csrfSynchronisedProtection, async (req, res) => {
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

      // Get template sections (handle both component-based and legacy templates)
      const template = await storage.getReportTemplate(reportInstance.templateId);
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }

      // Check if template uses new component-based structure
      let templateSections;
      if (template.components && Array.isArray(template.components) && template.components.length > 0) {
        // Convert components to simple sections format for PDF generator
        templateSections = template.components.map((component, index) => ({
          id: component.id,
          title: component.properties?.label || `Field ${index + 1}`,
          type: "Text", // Default to Text for now
          order: index,
        }));
      } else {
        // Legacy template - query sections table
        const sections = await storage.getTemplateSections(reportInstance.templateId);
        templateSections = sections.map((section, index) => ({
          id: section.id,
          title: section.title,
          type: "Text",
          order: section.orderIndex || index,
        }));
      }

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

  // NEW: Direct PDF generation endpoint for reports
  app.get("/api/reports/:reportId/pdf", isAuthenticated, async (req, res) => {
    try {
      const reportInstance = await storage.getReportInstance(req.params.reportId);
      if (!reportInstance) {
        return res.status(404).json({ message: "Report not found" });
      }

      // Fetch all related data for comprehensive PDF
      const job = reportInstance.jobId ? await storage.getJob(reportInstance.jobId) : undefined;
      const builder = job?.builderId ? await storage.getBuilder(job.builderId) : undefined;
      const checklistItems = job ? await storage.getChecklistItemsByJob(job.id) : [];
      const photos = job ? await storage.getPhotosByJob(job.id) : [];
      const blowerDoorTest = job ? await storage.getLatestBlowerDoorTest(job.id) : undefined;
      const ductLeakageTest = job ? await storage.getLatestDuctLeakageTest(job.id) : undefined;
      
      // Get template data
      const template = await storage.getReportTemplate(reportInstance.templateId);
      const sections = template ? await storage.getTemplateSections(template.id) : [];
      const fields = await Promise.all(
        sections.map(section => storage.getTemplateFields(section.id))
      );
      const allFields = fields.flat();
      const fieldValues = await storage.getReportFieldValues(reportInstance.id);

      // Get current user as inspector
      const userId = getUserId(req);
      const inspector = userId ? await storage.getUser(userId) : undefined;

      // Generate PDF buffer using enhanced PDF components
      const { pdf } = await import('@react-pdf/renderer');
      const { ReportPDF } = await import('../client/src/components/pdf/ReportPDF.tsx');
      
      const React = await import('react');
      const pdfDoc = React.createElement(ReportPDF, {
        reportInstance: reportInstance,
        reportTemplate: template,
        sections: sections,
        fields: allFields,
        fieldValues: fieldValues,
        job: job,
        builder: builder,
        inspector: inspector,
        photos: photos,
        blowerDoorTest: blowerDoorTest,
        ductLeakageTest: ductLeakageTest,
        checklistItems: checklistItems,
      });

      const pdfBuffer = await pdf(pdfDoc).toBuffer();

      // Set headers for PDF download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="report-${reportInstance.id}-${Date.now()}.pdf"`);
      res.send(pdfBuffer);
    } catch (error) {
      logError('Reports/GeneratePDF', error, { reportId: req.params.reportId });
      res.status(500).json({ message: "Failed to generate PDF report" });
    }
  });

  // NEW: Comprehensive job report PDF endpoint
  app.get("/api/jobs/:jobId/full-report/pdf", isAuthenticated, async (req, res) => {
    try {
      const job = await storage.getJob(req.params.jobId);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }

      // Fetch all job-related data
      const builder = job.builderId ? await storage.getBuilder(job.builderId) : undefined;
      const checklistItems = await storage.getChecklistItemsByJob(job.id);
      const photos = await storage.getPhotosByJob(job.id);
      const blowerDoorTest = await storage.getLatestBlowerDoorTest(job.id);
      const ductLeakageTest = await storage.getLatestDuctLeakageTest(job.id);
      
      // Get most recent report instance if available
      const reportInstances = await storage.getReportInstancesByJob(job.id);
      const latestReport = reportInstances.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )[0];

      let template, sections, fields, fieldValues;
      if (latestReport) {
        template = await storage.getReportTemplate(latestReport.templateId);
        sections = template ? await storage.getTemplateSections(template.id) : [];
        const fieldArrays = await Promise.all(
          sections.map(section => storage.getTemplateFields(section.id))
        );
        fields = fieldArrays.flat();
        fieldValues = await storage.getReportFieldValues(latestReport.id);
      }

      // Get current user as inspector
      const userId = getUserId(req);
      const inspector = userId ? await storage.getUser(userId) : undefined;

      // Generate comprehensive PDF
      const { pdf } = await import('@react-pdf/renderer');
      const { ReportPDF } = await import('../client/src/components/pdf/ReportPDF.tsx');
      
      const React = await import('react');
      const pdfDoc = React.createElement(ReportPDF, {
        reportInstance: latestReport,
        reportTemplate: template,
        sections: sections || [],
        fields: fields || [],
        fieldValues: fieldValues || [],
        job: job,
        builder: builder,
        inspector: inspector,
        photos: photos,
        blowerDoorTest: blowerDoorTest,
        ductLeakageTest: ductLeakageTest,
        checklistItems: checklistItems,
      });

      const pdfBuffer = await pdf(pdfDoc).toBuffer();

      // Set headers for PDF download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="job-${job.name}-full-report-${Date.now()}.pdf"`);
      res.send(pdfBuffer);
    } catch (error) {
      logError('Jobs/GenerateFullReportPDF', error, { jobId: req.params.jobId });
      res.status(500).json({ message: "Failed to generate comprehensive job report PDF" });
    }
  });

  // NEW: Preview PDF endpoint for custom data
  app.post("/api/reports/preview-pdf", isAuthenticated, csrfSynchronisedProtection, async (req, res) => {
    try {
      const { 
        reportData,
        job,
        builder,
        photos,
        blowerDoorTest,
        ductLeakageTest,
        checklistItems
      } = req.body;

      // Get current user as inspector
      const userId = getUserId(req);
      const inspector = userId ? await storage.getUser(userId) : undefined;

      // Generate preview PDF
      const { pdf } = await import('@react-pdf/renderer');
      const { ReportPDF } = await import('../client/src/components/pdf/ReportPDF.tsx');
      
      const React = await import('react');
      const pdfDoc = React.createElement(ReportPDF, {
        job: job,
        builder: builder,
        inspector: inspector,
        photos: photos || [],
        blowerDoorTest: blowerDoorTest,
        ductLeakageTest: ductLeakageTest,
        checklistItems: checklistItems || [],
      });

      const pdfBuffer = await pdf(pdfDoc).toBuffer();

      // Set headers for PDF preview
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline; filename="preview.pdf"');
      res.send(pdfBuffer);
    } catch (error) {
      logError('Reports/PreviewPDF', error);
      res.status(500).json({ message: "Failed to generate preview PDF" });
    }
  });

  // Object Storage Routes
  app.post("/api/objects/upload", isAuthenticated, csrfSynchronisedProtection, async (req, res) => {
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
  app.post("/api/jobs/:id/signature", isAuthenticated, csrfSynchronisedProtection, async (req, res) => {
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
      const { jobId, checklistItemId, tags, dateFrom, dateTo, limit, offset, cursor, sortOrder } = req.query;

      // Parse tags - can be single value, comma-separated, or array
      let parsedTags: string[] | undefined;
      if (tags) {
        if (Array.isArray(tags)) {
          parsedTags = tags.filter((t): t is string => typeof t === 'string');
        } else if (typeof tags === 'string') {
          parsedTags = tags.split(',').map(t => t.trim()).filter(t => t.length > 0);
        }
      }

      // Build filters object
      const filters = {
        jobId: typeof jobId === 'string' ? jobId : undefined,
        checklistItemId: typeof checklistItemId === 'string' ? checklistItemId : undefined,
        tags: parsedTags,
        dateFrom: typeof dateFrom === 'string' ? dateFrom : undefined,
        dateTo: typeof dateTo === 'string' ? dateTo : undefined,
      };

      // Determine pagination mode: cursor-based (new) or offset-based (legacy)
      const useCursorPagination = cursor !== undefined || sortOrder !== undefined;

      if (useCursorPagination) {
        // New cursor-based pagination
        const params = photoCursorPaginationParamsSchema.parse({ cursor, limit, sortOrder });
        const result = await storage.getPhotosCursorPaginated(filters, params);
        return res.json(result);
      }

      if (limit !== undefined || offset !== undefined) {
        // Legacy offset-based pagination
        const params = paginationParamsSchema.parse({ limit, offset });
        
        const hasFilters = jobId || checklistItemId || parsedTags || dateFrom || dateTo;
        
        let result;
        if (hasFilters) {
          result = await storage.getPhotosFilteredPaginated(filters, params);
        } else {
          result = await storage.getPhotosPaginated(params);
        }
        
        return res.json(result);
      }

      let photos;
      if (checklistItemId && typeof checklistItemId === "string") {
        photos = await storage.getPhotosByChecklistItem(checklistItemId);
      } else if (jobId && typeof jobId === "string") {
        photos = await storage.getPhotosByJob(jobId);
      } else {
        photos = await storage.getAllPhotos();
      }

      res.json(photos);
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'fetch photos');
      res.status(status).json({ message });
    }
  });

  app.post("/api/photos", isAuthenticated, csrfSynchronisedProtection, async (req, res) => {
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
      
      // Trigger async thumbnail generation without blocking response
      setImmediate(async () => {
        try {
          serverLogger.info(`[Photos/Create] Starting async thumbnail generation for photo ${photo.id}`);
          const thumbnailPath = await generateThumbnail(objectPath);
          
          // Update photo record with thumbnail path
          await storage.updatePhoto(photo.id, { thumbnailPath });
          serverLogger.info(`[Photos/Create] Thumbnail generated and saved for photo ${photo.id}`);
        } catch (thumbnailError) {
          // Log error but don't fail the upload
          serverLogger.error(`[Photos/Create] Failed to generate thumbnail for photo ${photo.id}:`, thumbnailError);
        }
      });
      
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

  app.patch("/api/photos/:id", isAuthenticated, csrfSynchronisedProtection, async (req, res) => {
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

  app.delete("/api/photos/:id", isAuthenticated, csrfSynchronisedProtection, async (req: any, res) => {
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
      
      // Audit log: Photo deletion
      await createAuditLog(req, {
        userId: req.user.id,
        action: 'photo.delete',
        resourceType: 'photo',
        resourceId: req.params.id,
        metadata: { jobId: photo.jobId, filePath: photo.filePath },
      }, storage);
      
      res.status(204).send();
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'delete photo');
      res.status(status).json({ message });
    }
  });

  // Bulk delete photos
  app.delete("/api/photos/bulk", isAuthenticated, csrfSynchronisedProtection, async (req, res) => {
    const bulkDeleteSchema = z.object({
      ids: z.array(z.string()).min(1, "At least one photo ID is required"),
    });

    try {
      const { ids } = bulkDeleteSchema.parse(req.body);
      
      // Limit bulk operations to 200 items for safety
      if (ids.length > 200) {
        return res.status(400).json({ message: "Cannot delete more than 200 photos at once" });
      }

      // Fetch photos first to update checklist item counts
      const photos = await Promise.all(ids.map(id => storage.getPhoto(id)));
      const validPhotos = photos.filter((p): p is NonNullable<typeof p> => p !== undefined);

      // Track checklist items that need count updates
      const checklistUpdates = new Map<string, number>();
      
      for (const photo of validPhotos) {
        if (photo.checklistItemId) {
          const current = checklistUpdates.get(photo.checklistItemId) || 0;
          checklistUpdates.set(photo.checklistItemId, current + 1);
        }
      }

      // Delete photos
      const deleted = await storage.bulkDeletePhotos(ids);

      // Update checklist item photo counts
      for (const [checklistItemId, decrementBy] of checklistUpdates.entries()) {
        const checklistItem = await storage.getChecklistItem(checklistItemId);
        if (checklistItem && checklistItem.photoCount !== null && checklistItem.photoCount > 0) {
          await storage.updateChecklistItem(checklistItemId, {
            photoCount: Math.max(0, checklistItem.photoCount - decrementBy),
          });
        }
      }

      res.json({ deleted, total: ids.length });
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'bulk delete photos');
      res.status(status).json({ message });
    }
  });

  // Bulk tag photos
  app.post("/api/photos/bulk-tag", isAuthenticated, csrfSynchronisedProtection, async (req, res) => {
    const bulkTagSchema = z.object({
      ids: z.array(z.string()).min(1, "At least one photo ID is required"),
      mode: z.enum(['add', 'remove', 'replace']),
      tags: z.array(z.string()).min(1, "At least one tag is required"),
    });

    try {
      const { ids, mode, tags } = bulkTagSchema.parse(req.body);
      
      // Limit bulk operations to 200 items for safety
      if (ids.length > 200) {
        return res.status(400).json({ message: "Cannot tag more than 200 photos at once" });
      }

      const updated = await storage.bulkUpdatePhotoTags(ids, mode, tags);
      res.json({ updated, total: ids.length, mode, tags });
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'bulk tag photos');
      res.status(status).json({ message });
    }
  });

  // Bulk move photos to job
  app.post("/api/photos/bulk-move", isAuthenticated, csrfSynchronisedProtection, async (req, res) => {
    const bulkMoveSchema = z.object({
      ids: z.array(z.string()).min(1, "At least one photo ID is required"),
      jobId: z.string().min(1, "Job ID is required"),
    });

    try {
      const { ids, jobId } = bulkMoveSchema.parse(req.body);
      
      // Verify job exists
      const job = await storage.getJob(jobId);
      if (!job) {
        return res.status(404).json({ message: "Target job not found" });
      }
      
      // Limit bulk operations to 200 items for safety
      if (ids.length > 200) {
        return res.status(400).json({ message: "Cannot move more than 200 photos at once" });
      }

      const updated = await storage.bulkMovePhotosToJob(ids, jobId);
      res.json({ updated, total: ids.length, jobId });
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'bulk move photos');
      res.status(status).json({ message });
    }
  });

  // Bulk update photo favorites
  app.post("/api/photos/bulk-favorites", isAuthenticated, csrfSynchronisedProtection, async (req, res) => {
    const bulkFavoritesSchema = z.object({
      ids: z.array(z.string()).min(1, "At least one photo ID is required"),
      isFavorite: z.boolean(),
    });

    try {
      const { ids, isFavorite } = bulkFavoritesSchema.parse(req.body);
      
      // Limit bulk operations to 200 items for safety
      if (ids.length > 200) {
        return res.status(400).json({ message: "Cannot update more than 200 photos at once" });
      }

      const updated = await storage.bulkUpdatePhotoFavorites(ids, isFavorite);
      res.json({ updated, total: ids.length, isFavorite });
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'bulk update favorites');
      res.status(status).json({ message });
    }
  });

  // Get favorite photos
  app.get("/api/photos/favorites", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const photos = await storage.getFavoritePhotos(userId);
      res.json(photos);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch favorite photos');
      res.status(status).json({ message });
    }
  });

  // Get recent photos
  app.get("/api/photos/recent", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const limit = parseInt(req.query.limit as string) || 50;
      const photos = await storage.getRecentPhotos(limit, userId);
      res.json(photos);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch recent photos');
      res.status(status).json({ message });
    }
  });

  // Detect duplicate photos
  app.get("/api/photos/duplicates", isAuthenticated, async (req, res) => {
    try {
      const duplicates = await storage.detectDuplicatePhotos();
      res.json(duplicates);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'detect duplicate photos');
      res.status(status).json({ message });
    }
  });

  // Photo Albums CRUD
  app.post("/api/photo-albums", isAuthenticated, csrfSynchronisedProtection, async (req, res) => {
    try {
      const userId = getUserId(req);
      const validated = insertPhotoAlbumSchema.parse({
        ...req.body,
        createdBy: userId,
      });
      const album = await storage.createPhotoAlbum(validated);
      res.status(201).json(album);
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'create photo album');
      res.status(status).json({ message });
    }
  });

  app.get("/api/photo-albums", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const albums = await storage.getPhotoAlbumsByUser(userId);
      res.json(albums);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch photo albums');
      res.status(status).json({ message });
    }
  });

  app.get("/api/photo-albums/:id", isAuthenticated, async (req, res) => {
    try {
      const album = await storage.getPhotoAlbum(req.params.id);
      if (!album) {
        return res.status(404).json({ message: "Album not found" });
      }
      res.json(album);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch photo album');
      res.status(status).json({ message });
    }
  });

  app.patch("/api/photo-albums/:id", isAuthenticated, csrfSynchronisedProtection, async (req, res) => {
    try {
      const validated = insertPhotoAlbumSchema.partial().parse(req.body);
      const album = await storage.updatePhotoAlbum(req.params.id, validated);
      if (!album) {
        return res.status(404).json({ message: "Album not found" });
      }
      res.json(album);
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'update photo album');
      res.status(status).json({ message });
    }
  });

  app.delete("/api/photo-albums/:id", isAuthenticated, csrfSynchronisedProtection, async (req, res) => {
    try {
      const deleted = await storage.deletePhotoAlbum(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Album not found" });
      }
      res.status(204).end();
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'delete photo album');
      res.status(status).json({ message });
    }
  });

  // Album photos management
  app.get("/api/photo-albums/:id/photos", isAuthenticated, async (req, res) => {
    try {
      const photos = await storage.getAlbumPhotos(req.params.id);
      res.json(photos);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch album photos');
      res.status(status).json({ message });
    }
  });

  app.post("/api/photo-albums/:id/photos", isAuthenticated, csrfSynchronisedProtection, async (req, res) => {
    const addPhotosSchema = z.object({
      photoIds: z.array(z.string()).min(1, "At least one photo ID is required"),
    });

    try {
      const { photoIds } = addPhotosSchema.parse(req.body);
      const items = await storage.addPhotosToAlbum(req.params.id, photoIds);
      res.json({ added: items.length, total: photoIds.length });
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'add photos to album');
      res.status(status).json({ message });
    }
  });

  app.delete("/api/photo-albums/:id/photos", isAuthenticated, csrfSynchronisedProtection, async (req, res) => {
    const removePhotosSchema = z.object({
      photoIds: z.array(z.string()).min(1, "At least one photo ID is required"),
    });

    try {
      const { photoIds } = removePhotosSchema.parse(req.body);
      const removed = await storage.removePhotosFromAlbum(req.params.id, photoIds);
      res.json({ removed, total: photoIds.length });
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'remove photos from album');
      res.status(status).json({ message });
    }
  });

  app.patch("/api/photo-albums/:id/reorder", isAuthenticated, csrfSynchronisedProtection, async (req, res) => {
    const reorderSchema = z.object({
      photoOrders: z.array(z.object({
        photoId: z.string(),
        orderIndex: z.number(),
      })).min(1),
    });

    try {
      const { photoOrders } = reorderSchema.parse(req.body);
      const success = await storage.bulkUpdatePhotoOrder(req.params.id, photoOrders);
      res.json({ success });
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'reorder album photos');
      res.status(status).json({ message });
    }
  });

  // Photo Annotations endpoint
  app.post("/api/photos/:id/annotations", isAuthenticated, csrfSynchronisedProtection, async (req, res) => {
    try {
      const { annotations } = req.body;
      
      const photo = await storage.updatePhotoAnnotations(req.params.id, annotations);
      if (!photo) {
        return res.status(404).json({ message: "Photo not found" });
      }
      
      res.json(photo);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'update photo annotations');
      res.status(status).json({ message });
    }
  });

  // OCR Processing endpoint
  app.post("/api/photos/:id/ocr", isAuthenticated, csrfSynchronisedProtection, async (req, res) => {
    try {
      const { ocrText, ocrConfidence, ocrMetadata } = req.body;
      
      const photo = await storage.updatePhotoOCR(
        req.params.id,
        ocrText,
        ocrConfidence,
        ocrMetadata
      );
      
      if (!photo) {
        return res.status(404).json({ message: "Photo not found" });
      }
      
      res.json(photo);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'update photo OCR');
      res.status(status).json({ message });
    }
  });

  // Photo Cleanup Sessions endpoints
  app.get("/api/photos/cleanup-sessions", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const sessions = await storage.getPendingCleanupSessions(userId);
      res.json(sessions);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch cleanup sessions');
      res.status(status).json({ message });
    }
  });

  app.post("/api/photos/cleanup-sessions", isAuthenticated, csrfSynchronisedProtection, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { sessionId, photoCount, deviceInfo } = req.body;
      
      const session = await storage.createPhotoUploadSession({
        userId,
        sessionId,
        photoCount,
        deviceInfo,
      });
      
      res.status(201).json(session);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'create cleanup session');
      res.status(status).json({ message });
    }
  });

  app.post("/api/photos/cleanup-sessions/:id/confirm", isAuthenticated, csrfSynchronisedProtection, async (req, res) => {
    try {
      const session = await storage.confirmPhotoCleanup(req.params.id);
      if (!session) {
        return res.status(404).json({ message: "Cleanup session not found" });
      }
      
      res.json(session);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'confirm cleanup');
      res.status(status).json({ message });
    }
  });

  // Photo Comparison endpoint
  app.get("/api/photos/comparison/:id1/:id2", isAuthenticated, async (req, res) => {
    try {
      const [photo1, photo2] = await Promise.all([
        storage.getPhoto(req.params.id1),
        storage.getPhoto(req.params.id2),
      ]);
      
      if (!photo1 || !photo2) {
        return res.status(404).json({ message: "One or both photos not found" });
      }
      
      res.json({ photo1, photo2 });
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch photos for comparison');
      res.status(status).json({ message });
    }
  });

  // Export photos
  app.post("/api/photos/export", isAuthenticated, csrfSynchronisedProtection, async (req, res) => {
    const exportSchema = z.object({
      ids: z.array(z.string()).min(1, "At least one photo ID is required"),
      format: z.enum(['csv', 'json']),
    });

    try {
      const { ids, format } = exportSchema.parse(req.body);
      
      // Limit export to 1000 items for safety
      if (ids.length > 1000) {
        return res.status(400).json({ message: "Cannot export more than 1000 photos at once" });
      }

      // Fetch photos by IDs
      const photos = await Promise.all(
        ids.map(id => storage.getPhoto(id))
      );
      const validPhotos = photos.filter((p): p is NonNullable<typeof p> => p !== undefined);

      if (format === 'json') {
        // Return JSON directly
        res.json(validPhotos);
      } else {
        // Generate CSV
        const csvRows: string[] = [
          // Header row
          'ID,Job ID,Job Name,Checklist Item ID,Tags,Uploaded At,File Path,Full URL'
        ];

        // Data rows
        for (const photo of validPhotos) {
          // Get job name if jobId exists
          let jobName = '';
          if (photo.jobId) {
            const job = await storage.getJob(photo.jobId);
            jobName = job?.name ?? '';
          }

          const row = [
            photo.id,
            photo.jobId ?? '',
            jobName,
            photo.checklistItemId ?? '',
            (photo.tags ?? []).join(';'),
            photo.uploadedAt,
            photo.filePath ?? '',
            photo.fullUrl ?? '',
          ].map(field => {
            // Escape commas and quotes in CSV
            const str = String(field);
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
              return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
          }).join(',');

          csvRows.push(row);
        }

        const csv = csvRows.join('\n');
        
        // Set headers for CSV download
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="photos-export-${Date.now()}.csv"`);
        res.send(csv);
      }
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'export photos');
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

  app.post("/api/forecasts", isAuthenticated, csrfSynchronisedProtection, async (req, res) => {
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

  app.patch("/api/forecasts/:id", isAuthenticated, csrfSynchronisedProtection, async (req, res) => {
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

  // Blower Door Test routes
  app.get("/api/blower-door-tests", isAuthenticated, async (req, res) => {
    try {
      const { jobId } = req.query;
      
      if (jobId && typeof jobId === "string") {
        const tests = await storage.getBlowerDoorTestsByJob(jobId);
        return res.json(tests);
      }
      
      res.status(400).json({ message: "Job ID is required" });
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch blower door tests');
      res.status(status).json({ message });
    }
  });

  app.get("/api/blower-door-tests/:id", isAuthenticated, async (req, res) => {
    try {
      const test = await storage.getBlowerDoorTest(req.params.id);
      if (!test) {
        return res.status(404).json({ message: "Blower door test not found" });
      }
      res.json(test);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch blower door test');
      res.status(status).json({ message });
    }
  });

  app.get("/api/jobs/:jobId/blower-door-tests/latest", isAuthenticated, async (req, res) => {
    try {
      const test = await storage.getLatestBlowerDoorTest(req.params.jobId);
      if (!test) {
        return res.status(404).json({ message: "No blower door tests found for this job" });
      }
      res.json(test);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch latest blower door test');
      res.status(status).json({ message });
    }
  });

  app.post("/api/blower-door-tests", isAuthenticated, csrfSynchronisedProtection, async (req: any, res) => {
    try {
      const validated = insertBlowerDoorTestSchema.parse({
        ...req.body,
        createdBy: req.user?.claims?.sub,
      });
      
      // Calculate ACH50 using service function
      if (!validated.ach50 && validated.cfm50 && validated.houseVolume) {
        validated.ach50 = calculateACH50(validated.cfm50, validated.houseVolume);
      }
      
      // Determine Minnesota 2020 Energy Code compliance using service function
      const codeYear = validated.codeYear || '2020';
      const compliance = checkMinnesotaCompliance(validated.ach50, codeYear);
      validated.codeLimit = compliance.codeLimit;
      validated.meetsCode = compliance.compliant;
      validated.margin = compliance.margin;
      
      const test = await storage.createBlowerDoorTest(validated);
      
      // Update job compliance status if needed
      if (test.jobId) {
        try {
          await updateJobComplianceStatus(storage, test.jobId);
        } catch (error) {
          logError('BlowerDoorTest/ComplianceUpdate', error, { testId: test.id });
        }
      }
      
      res.status(201).json(test);
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'create blower door test');
      res.status(status).json({ message });
    }
  });

  app.patch("/api/blower-door-tests/:id", isAuthenticated, csrfSynchronisedProtection, async (req, res) => {
    try {
      const validated = insertBlowerDoorTestSchema.partial().parse(req.body);
      
      // Recalculate ACH50 if CFM50 or volume changed using service function
      if ((validated.cfm50 !== undefined || validated.houseVolume !== undefined)) {
        const existing = await storage.getBlowerDoorTest(req.params.id);
        if (existing) {
          const cfm50 = validated.cfm50 ?? existing.cfm50;
          const volume = validated.houseVolume ?? existing.houseVolume;
          if (cfm50 && volume) {
            validated.ach50 = calculateACH50(Number(cfm50), Number(volume));
          }
        }
      }
      
      // Update compliance if ACH50 changed using service function
      if (validated.ach50 !== undefined) {
        const codeYear = validated.codeYear || '2020';
        const compliance = checkMinnesotaCompliance(validated.ach50, codeYear);
        validated.codeLimit = compliance.codeLimit;
        validated.meetsCode = compliance.compliant;
        validated.margin = compliance.margin;
      }
      
      const test = await storage.updateBlowerDoorTest(req.params.id, validated);
      if (!test) {
        return res.status(404).json({ message: "Blower door test not found" });
      }
      
      // Update job compliance status if needed
      if (test.jobId) {
        try {
          await updateJobComplianceStatus(storage, test.jobId);
        } catch (error) {
          logError('BlowerDoorTest/ComplianceUpdate', error, { testId: test.id });
        }
      }
      
      res.json(test);
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'update blower door test');
      res.status(status).json({ message });
    }
  });

  app.delete("/api/blower-door-tests/:id", isAuthenticated, csrfSynchronisedProtection, async (req, res) => {
    try {
      const test = await storage.getBlowerDoorTest(req.params.id);
      const deleted = await storage.deleteBlowerDoorTest(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Blower door test not found" });
      }
      
      // Update job compliance status if needed
      if (test?.jobId) {
        try {
          await updateJobComplianceStatus(storage, test.jobId);
        } catch (error) {
          logError('BlowerDoorTest/ComplianceUpdate', error, { testId: req.params.id });
        }
      }
      
      res.status(204).send();
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'delete blower door test');
      res.status(status).json({ message });
    }
  });

  // Duct Leakage Test routes
  app.get("/api/duct-leakage-tests", isAuthenticated, async (req, res) => {
    try {
      const { jobId } = req.query;
      
      if (jobId && typeof jobId === "string") {
        const tests = await storage.getDuctLeakageTestsByJob(jobId);
        return res.json(tests);
      }
      
      res.status(400).json({ message: "Job ID is required" });
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch duct leakage tests');
      res.status(status).json({ message });
    }
  });

  app.get("/api/duct-leakage-tests/:id", isAuthenticated, async (req, res) => {
    try {
      const test = await storage.getDuctLeakageTest(req.params.id);
      if (!test) {
        return res.status(404).json({ message: "Duct leakage test not found" });
      }
      res.json(test);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch duct leakage test');
      res.status(status).json({ message });
    }
  });

  app.get("/api/jobs/:jobId/duct-leakage-tests/latest", isAuthenticated, async (req, res) => {
    try {
      const test = await storage.getLatestDuctLeakageTest(req.params.jobId);
      if (!test) {
        return res.status(404).json({ message: "No duct leakage tests found for this job" });
      }
      res.json(test);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch latest duct leakage test');
      res.status(status).json({ message });
    }
  });

  app.post("/api/duct-leakage-tests", isAuthenticated, csrfSynchronisedProtection, async (req: any, res) => {
    try {
      const validated = insertDuctLeakageTestSchema.parse({
        ...req.body,
        createdBy: req.user?.claims?.sub,
      });
      
      // Calculate CFM per 100 sq ft if not provided
      if (validated.conditionedArea) {
        if (validated.cfm25Total && !validated.totalCfmPerSqFt) {
          validated.totalCfmPerSqFt = (validated.cfm25Total / validated.conditionedArea) * 100;
        }
        if (validated.cfm25Outside && !validated.outsideCfmPerSqFt) {
          validated.outsideCfmPerSqFt = (validated.cfm25Outside / validated.conditionedArea) * 100;
        }
      }
      
      // Calculate percentage of system flow if not provided
      if (validated.systemAirflow) {
        if (validated.cfm25Total && !validated.totalPercentOfFlow) {
          validated.totalPercentOfFlow = (validated.cfm25Total / validated.systemAirflow) * 100;
        }
        if (validated.cfm25Outside && !validated.outsidePercentOfFlow) {
          validated.outsidePercentOfFlow = (validated.cfm25Outside / validated.systemAirflow) * 100;
        }
      }
      
      // Minnesota 2020 Energy Code limits
      const totalLimit = validated.totalDuctLeakageLimit || 4.0; // 4 CFM25/100 sq ft
      const outsideLimit = validated.outsideLeakageLimit || 3.0; // 3 CFM25/100 sq ft
      validated.totalDuctLeakageLimit = totalLimit;
      validated.outsideLeakageLimit = outsideLimit;
      
      // Check compliance
      if (validated.totalCfmPerSqFt !== undefined) {
        validated.meetsCodeTDL = validated.totalCfmPerSqFt <= totalLimit;
      }
      if (validated.outsideCfmPerSqFt !== undefined) {
        validated.meetsCodeDLO = validated.outsideCfmPerSqFt <= outsideLimit;
      }
      
      const test = await storage.createDuctLeakageTest(validated);
      
      // Update job compliance status if needed
      if (test.jobId) {
        try {
          await updateJobComplianceStatus(storage, test.jobId);
        } catch (error) {
          logError('DuctLeakageTest/ComplianceUpdate', error, { testId: test.id });
        }
      }
      
      res.status(201).json(test);
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'create duct leakage test');
      res.status(status).json({ message });
    }
  });

  app.patch("/api/duct-leakage-tests/:id", isAuthenticated, csrfSynchronisedProtection, async (req, res) => {
    try {
      const validated = insertDuctLeakageTestSchema.partial().parse(req.body);
      
      // Recalculate derived values if base values changed
      const existing = await storage.getDuctLeakageTest(req.params.id);
      if (existing) {
        const conditionedArea = validated.conditionedArea ?? existing.conditionedArea;
        const systemAirflow = validated.systemAirflow ?? existing.systemAirflow;
        
        // Recalculate CFM per 100 sq ft
        if (conditionedArea) {
          const cfm25Total = validated.cfm25Total ?? existing.cfm25Total;
          const cfm25Outside = validated.cfm25Outside ?? existing.cfm25Outside;
          
          if (cfm25Total) {
            validated.totalCfmPerSqFt = (Number(cfm25Total) / Number(conditionedArea)) * 100;
          }
          if (cfm25Outside) {
            validated.outsideCfmPerSqFt = (Number(cfm25Outside) / Number(conditionedArea)) * 100;
          }
        }
        
        // Recalculate percentage of system flow
        if (systemAirflow) {
          const cfm25Total = validated.cfm25Total ?? existing.cfm25Total;
          const cfm25Outside = validated.cfm25Outside ?? existing.cfm25Outside;
          
          if (cfm25Total) {
            validated.totalPercentOfFlow = (Number(cfm25Total) / Number(systemAirflow)) * 100;
          }
          if (cfm25Outside) {
            validated.outsidePercentOfFlow = (Number(cfm25Outside) / Number(systemAirflow)) * 100;
          }
        }
        
        // Update compliance
        const totalLimit = validated.totalDuctLeakageLimit || existing.totalDuctLeakageLimit || 4.0;
        const outsideLimit = validated.outsideLeakageLimit || existing.outsideLeakageLimit || 3.0;
        
        if (validated.totalCfmPerSqFt !== undefined) {
          validated.meetsCodeTDL = validated.totalCfmPerSqFt <= totalLimit;
        }
        if (validated.outsideCfmPerSqFt !== undefined) {
          validated.meetsCodeDLO = validated.outsideCfmPerSqFt <= outsideLimit;
        }
      }
      
      const test = await storage.updateDuctLeakageTest(req.params.id, validated);
      if (!test) {
        return res.status(404).json({ message: "Duct leakage test not found" });
      }
      
      // Update job compliance status if needed
      if (test.jobId) {
        try {
          await updateJobComplianceStatus(storage, test.jobId);
        } catch (error) {
          logError('DuctLeakageTest/ComplianceUpdate', error, { testId: test.id });
        }
      }
      
      res.json(test);
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'update duct leakage test');
      res.status(status).json({ message });
    }
  });

  app.delete("/api/duct-leakage-tests/:id", isAuthenticated, csrfSynchronisedProtection, async (req, res) => {
    try {
      const test = await storage.getDuctLeakageTest(req.params.id);
      const deleted = await storage.deleteDuctLeakageTest(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Duct leakage test not found" });
      }
      
      // Update job compliance status if needed
      if (test?.jobId) {
        try {
          await updateJobComplianceStatus(storage, test.jobId);
        } catch (error) {
          logError('DuctLeakageTest/ComplianceUpdate', error, { testId: req.params.id });
        }
      }
      
      res.status(204).send();
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'delete duct leakage test');
      res.status(status).json({ message });
    }
  });

  // Ventilation Testing Routes
  app.get("/api/ventilation-tests", isAuthenticated, async (req, res) => {
    try {
      const { jobId } = req.query;
      
      if (jobId && typeof jobId === "string") {
        const tests = await storage.getVentilationTestsByJob(jobId);
        return res.json(tests);
      }
      
      res.status(400).json({ message: "Job ID is required" });
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch ventilation tests');
      res.status(status).json({ message });
    }
  });

  app.get("/api/ventilation-tests/:id", isAuthenticated, async (req, res) => {
    try {
      const test = await storage.getVentilationTest(req.params.id);
      if (!test) {
        return res.status(404).json({ message: "Ventilation test not found" });
      }
      res.json(test);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch ventilation test');
      res.status(status).json({ message });
    }
  });

  app.get("/api/jobs/:jobId/ventilation-tests/latest", isAuthenticated, async (req, res) => {
    try {
      const test = await storage.getLatestVentilationTest(req.params.jobId);
      if (!test) {
        return res.status(404).json({ message: "No ventilation tests found for this job" });
      }
      res.json(test);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch latest ventilation test');
      res.status(status).json({ message });
    }
  });

  app.post("/api/ventilation-tests", isAuthenticated, csrfSynchronisedProtection, async (req: any, res) => {
    try {
      const validated = insertVentilationTestSchema.parse({
        ...req.body,
        createdBy: req.user?.claims?.sub,
      });
      
      // Calculate ventilation requirements using ASHRAE 62.2
      const requirements = calculateVentilationRequirements({
        floorArea: Number(validated.floorArea),
        bedrooms: Number(validated.bedrooms),
        infiltrationCredit: validated.infiltrationCredit ? Number(validated.infiltrationCredit) : undefined,
        kitchenExhaustType: validated.kitchenExhaustType,
        kitchenMeasuredCFM: validated.kitchenMeasuredCFM ? Number(validated.kitchenMeasuredCFM) : undefined,
        bathroom1Type: validated.bathroom1Type,
        bathroom1MeasuredCFM: validated.bathroom1MeasuredCFM ? Number(validated.bathroom1MeasuredCFM) : undefined,
        bathroom2Type: validated.bathroom2Type,
        bathroom2MeasuredCFM: validated.bathroom2MeasuredCFM ? Number(validated.bathroom2MeasuredCFM) : undefined,
        bathroom3Type: validated.bathroom3Type,
        bathroom3MeasuredCFM: validated.bathroom3MeasuredCFM ? Number(validated.bathroom3MeasuredCFM) : undefined,
        bathroom4Type: validated.bathroom4Type,
        bathroom4MeasuredCFM: validated.bathroom4MeasuredCFM ? Number(validated.bathroom4MeasuredCFM) : undefined,
        mechanicalVentilationType: validated.mechanicalVentilationType,
        mechanicalMeasuredSupplyCFM: validated.mechanicalMeasuredSupplyCFM ? Number(validated.mechanicalMeasuredSupplyCFM) : undefined,
        mechanicalMeasuredExhaustCFM: validated.mechanicalMeasuredExhaustCFM ? Number(validated.mechanicalMeasuredExhaustCFM) : undefined,
      });
      
      // Apply calculated values
      validated.requiredVentilationRate = requirements.requiredVentilationRate;
      validated.requiredContinuousRate = requirements.requiredContinuousRate;
      validated.adjustedRequiredRate = requirements.adjustedRequiredRate;
      validated.kitchenMeetsCode = requirements.kitchenMeetsCode;
      validated.bathroom1MeetsCode = validated.bathroom1Type ? 
        requirements.overallCompliant || !requirements.nonComplianceReasons.includes('Bathroom 1 exhaust does not meet code requirements') : null;
      validated.bathroom2MeetsCode = validated.bathroom2Type ? 
        requirements.overallCompliant || !requirements.nonComplianceReasons.includes('Bathroom 2 exhaust does not meet code requirements') : null;
      validated.bathroom3MeetsCode = validated.bathroom3Type ? 
        requirements.overallCompliant || !requirements.nonComplianceReasons.includes('Bathroom 3 exhaust does not meet code requirements') : null;
      validated.bathroom4MeetsCode = validated.bathroom4Type ? 
        requirements.overallCompliant || !requirements.nonComplianceReasons.includes('Bathroom 4 exhaust does not meet code requirements') : null;
      validated.totalVentilationProvided = requirements.totalVentilationProvided;
      validated.meetsVentilationRequirement = requirements.meetsVentilationRequirement;
      validated.overallCompliant = requirements.overallCompliant;
      validated.nonComplianceNotes = requirements.nonComplianceReasons.length > 0 ? 
        requirements.nonComplianceReasons.join('; ') : null;
      
      const test = await storage.createVentilationTest(validated);
      
      // Update job compliance status if needed
      if (test.jobId) {
        try {
          await updateJobComplianceStatus(storage, test.jobId);
        } catch (error) {
          logError('VentilationTest/ComplianceUpdate', error, { testId: test.id });
        }
      }
      
      res.status(201).json(test);
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'create ventilation test');
      res.status(status).json({ message });
    }
  });

  app.patch("/api/ventilation-tests/:id", isAuthenticated, csrfSynchronisedProtection, async (req, res) => {
    try {
      const validated = insertVentilationTestSchema.partial().parse(req.body);
      
      // Recalculate requirements if key values changed
      const existing = await storage.getVentilationTest(req.params.id);
      if (existing) {
        const floorArea = validated.floorArea !== undefined ? Number(validated.floorArea) : Number(existing.floorArea);
        const bedrooms = validated.bedrooms !== undefined ? Number(validated.bedrooms) : Number(existing.bedrooms);
        
        // Check if any ventilation-related fields changed
        const shouldRecalculate = 
          validated.floorArea !== undefined ||
          validated.bedrooms !== undefined ||
          validated.infiltrationCredit !== undefined ||
          validated.kitchenExhaustType !== undefined ||
          validated.kitchenMeasuredCFM !== undefined ||
          validated.bathroom1Type !== undefined ||
          validated.bathroom1MeasuredCFM !== undefined ||
          validated.bathroom2Type !== undefined ||
          validated.bathroom2MeasuredCFM !== undefined ||
          validated.bathroom3Type !== undefined ||
          validated.bathroom3MeasuredCFM !== undefined ||
          validated.bathroom4Type !== undefined ||
          validated.bathroom4MeasuredCFM !== undefined ||
          validated.mechanicalVentilationType !== undefined ||
          validated.mechanicalMeasuredSupplyCFM !== undefined ||
          validated.mechanicalMeasuredExhaustCFM !== undefined;
        
        if (shouldRecalculate) {
          const requirements = calculateVentilationRequirements({
            floorArea,
            bedrooms,
            infiltrationCredit: validated.infiltrationCredit !== undefined ? 
              (validated.infiltrationCredit ? Number(validated.infiltrationCredit) : undefined) : 
              (existing.infiltrationCredit ? Number(existing.infiltrationCredit) : undefined),
            kitchenExhaustType: validated.kitchenExhaustType ?? existing.kitchenExhaustType ?? undefined,
            kitchenMeasuredCFM: validated.kitchenMeasuredCFM !== undefined ?
              (validated.kitchenMeasuredCFM ? Number(validated.kitchenMeasuredCFM) : undefined) :
              (existing.kitchenMeasuredCFM ? Number(existing.kitchenMeasuredCFM) : undefined),
            bathroom1Type: validated.bathroom1Type ?? existing.bathroom1Type ?? undefined,
            bathroom1MeasuredCFM: validated.bathroom1MeasuredCFM !== undefined ?
              (validated.bathroom1MeasuredCFM ? Number(validated.bathroom1MeasuredCFM) : undefined) :
              (existing.bathroom1MeasuredCFM ? Number(existing.bathroom1MeasuredCFM) : undefined),
            bathroom2Type: validated.bathroom2Type ?? existing.bathroom2Type ?? undefined,
            bathroom2MeasuredCFM: validated.bathroom2MeasuredCFM !== undefined ?
              (validated.bathroom2MeasuredCFM ? Number(validated.bathroom2MeasuredCFM) : undefined) :
              (existing.bathroom2MeasuredCFM ? Number(existing.bathroom2MeasuredCFM) : undefined),
            bathroom3Type: validated.bathroom3Type ?? existing.bathroom3Type ?? undefined,
            bathroom3MeasuredCFM: validated.bathroom3MeasuredCFM !== undefined ?
              (validated.bathroom3MeasuredCFM ? Number(validated.bathroom3MeasuredCFM) : undefined) :
              (existing.bathroom3MeasuredCFM ? Number(existing.bathroom3MeasuredCFM) : undefined),
            bathroom4Type: validated.bathroom4Type ?? existing.bathroom4Type ?? undefined,
            bathroom4MeasuredCFM: validated.bathroom4MeasuredCFM !== undefined ?
              (validated.bathroom4MeasuredCFM ? Number(validated.bathroom4MeasuredCFM) : undefined) :
              (existing.bathroom4MeasuredCFM ? Number(existing.bathroom4MeasuredCFM) : undefined),
            mechanicalVentilationType: validated.mechanicalVentilationType ?? existing.mechanicalVentilationType ?? undefined,
            mechanicalMeasuredSupplyCFM: validated.mechanicalMeasuredSupplyCFM !== undefined ?
              (validated.mechanicalMeasuredSupplyCFM ? Number(validated.mechanicalMeasuredSupplyCFM) : undefined) :
              (existing.mechanicalMeasuredSupplyCFM ? Number(existing.mechanicalMeasuredSupplyCFM) : undefined),
            mechanicalMeasuredExhaustCFM: validated.mechanicalMeasuredExhaustCFM !== undefined ?
              (validated.mechanicalMeasuredExhaustCFM ? Number(validated.mechanicalMeasuredExhaustCFM) : undefined) :
              (existing.mechanicalMeasuredExhaustCFM ? Number(existing.mechanicalMeasuredExhaustCFM) : undefined),
          });
          
          validated.requiredVentilationRate = requirements.requiredVentilationRate;
          validated.requiredContinuousRate = requirements.requiredContinuousRate;
          validated.adjustedRequiredRate = requirements.adjustedRequiredRate;
          validated.kitchenMeetsCode = requirements.kitchenMeetsCode;
          validated.totalVentilationProvided = requirements.totalVentilationProvided;
          validated.meetsVentilationRequirement = requirements.meetsVentilationRequirement;
          validated.overallCompliant = requirements.overallCompliant;
          validated.nonComplianceNotes = requirements.nonComplianceReasons.length > 0 ? 
            requirements.nonComplianceReasons.join('; ') : null;
        }
      }
      
      const test = await storage.updateVentilationTest(req.params.id, validated);
      if (!test) {
        return res.status(404).json({ message: "Ventilation test not found" });
      }
      
      // Update job compliance status if needed
      if (test.jobId) {
        try {
          await updateJobComplianceStatus(storage, test.jobId);
        } catch (error) {
          logError('VentilationTest/ComplianceUpdate', error, { testId: req.params.id });
        }
      }
      
      res.json(test);
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'update ventilation test');
      res.status(status).json({ message });
    }
  });

  app.delete("/api/ventilation-tests/:id", isAuthenticated, csrfSynchronisedProtection, async (req, res) => {
    try {
      const test = await storage.getVentilationTest(req.params.id);
      const deleted = await storage.deleteVentilationTest(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Ventilation test not found" });
      }
      
      // Update job compliance status if needed
      if (test?.jobId) {
        try {
          await updateJobComplianceStatus(storage, test.jobId);
        } catch (error) {
          logError('VentilationTest/ComplianceUpdate', error, { testId: req.params.id });
        }
      }
      
      res.status(204).send();
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'delete ventilation test');
      res.status(status).json({ message });
    }
  });

  app.post("/api/ventilation-tests/:id/calculate", isAuthenticated, async (req, res) => {
    try {
      const test = await storage.getVentilationTest(req.params.id);
      if (!test) {
        return res.status(404).json({ message: "Ventilation test not found" });
      }
      
      // Recalculate requirements
      const requirements = calculateVentilationRequirements({
        floorArea: Number(test.floorArea),
        bedrooms: Number(test.bedrooms),
        infiltrationCredit: test.infiltrationCredit ? Number(test.infiltrationCredit) : undefined,
        kitchenExhaustType: test.kitchenExhaustType ?? undefined,
        kitchenMeasuredCFM: test.kitchenMeasuredCFM ? Number(test.kitchenMeasuredCFM) : undefined,
        bathroom1Type: test.bathroom1Type ?? undefined,
        bathroom1MeasuredCFM: test.bathroom1MeasuredCFM ? Number(test.bathroom1MeasuredCFM) : undefined,
        bathroom2Type: test.bathroom2Type ?? undefined,
        bathroom2MeasuredCFM: test.bathroom2MeasuredCFM ? Number(test.bathroom2MeasuredCFM) : undefined,
        bathroom3Type: test.bathroom3Type ?? undefined,
        bathroom3MeasuredCFM: test.bathroom3MeasuredCFM ? Number(test.bathroom3MeasuredCFM) : undefined,
        bathroom4Type: test.bathroom4Type ?? undefined,
        bathroom4MeasuredCFM: test.bathroom4MeasuredCFM ? Number(test.bathroom4MeasuredCFM) : undefined,
        mechanicalVentilationType: test.mechanicalVentilationType ?? undefined,
        mechanicalMeasuredSupplyCFM: test.mechanicalMeasuredSupplyCFM ? Number(test.mechanicalMeasuredSupplyCFM) : undefined,
        mechanicalMeasuredExhaustCFM: test.mechanicalMeasuredExhaustCFM ? Number(test.mechanicalMeasuredExhaustCFM) : undefined,
      });
      
      res.json(requirements);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'calculate ventilation requirements');
      res.status(status).json({ message });
    }
  });

  // Dashboard routes
  app.get("/api/dashboard/summary", isAuthenticated, async (req, res) => {
    try {
      const summary = await storage.getDashboardSummary();
      res.json(summary);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch dashboard summary');
      res.status(status).json({ message });
    }
  });

  app.get("/api/dashboard/leaderboard", isAuthenticated, async (req, res) => {
    try {
      const leaderboard = await storage.getBuilderLeaderboard();
      res.json(leaderboard);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch builder leaderboard');
      res.status(status).json({ message });
    }
  });

  app.get("/api/dashboard/export", isAuthenticated, async (req, res) => {
    try {
      const [summary, leaderboard] = await Promise.all([
        storage.getDashboardSummary(),
        storage.getBuilderLeaderboard(),
      ]);

      const { generateDashboardPDF } = await import('./pdfGenerator.tsx');
      const pdfBuffer = await generateDashboardPDF({
        summary,
        leaderboard,
      });

      const dateStr = new Date().toISOString().split('T')[0];
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="dashboard-report-${dateStr}.pdf"`);
      res.send(pdfBuffer);
    } catch (error) {
      logError('Dashboard/ExportPDF', error);
      res.status(500).json({ message: "We're having trouble generating the PDF. Please try again." });
    }
  });

  app.post("/api/dashboard/export/email", isAuthenticated, csrfSynchronisedProtection, async (req, res) => {
    const emailSchema = z.object({
      emails: z.array(z.string().email()).min(1, "At least one email address is required"),
    });

    try {
      const { emails } = emailSchema.parse(req.body);

      const [summary, leaderboard] = await Promise.all([
        storage.getDashboardSummary(),
        storage.getBuilderLeaderboard(),
      ]);

      const { generateDashboardPDF } = await import('./pdfGenerator.tsx');
      const pdfBuffer = await generateDashboardPDF({
        summary,
        leaderboard,
      });

      serverLogger.info('Dashboard PDF email requested', {
        recipients: emails,
        pdfSize: pdfBuffer.length,
      });

      res.json({ 
        message: `Dashboard report queued for delivery to ${emails.length} recipient${emails.length > 1 ? 's' : ''}`,
        recipients: emails 
      });
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      logError('Dashboard/EmailPDF', error);
      res.status(500).json({ message: "We're having trouble sending the email. Please try again." });
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

  app.post("/api/checklist-items", isAuthenticated, csrfSynchronisedProtection, async (req, res) => {
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

  app.patch("/api/checklist-items/:id", isAuthenticated, csrfSynchronisedProtection, async (req, res) => {
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

  app.delete("/api/checklist-items/:id", isAuthenticated, csrfSynchronisedProtection, async (req, res) => {
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

  app.post("/api/compliance/jobs/:jobId/evaluate", isAuthenticated, csrfSynchronisedProtection, async (req, res) => {
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

  app.post("/api/compliance/reports/:reportId/evaluate", isAuthenticated, csrfSynchronisedProtection, async (req, res) => {
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

  app.post("/api/compliance/rules", isAuthenticated, csrfSynchronisedProtection, async (req, res) => {
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

  // Google Calendar preferences
  app.get('/api/calendar-preferences', isAuthenticated, async (req, res) => {
    try {
      const preferences = await storage.getCalendarPreferences();
      res.json(preferences);
    } catch (error) {
      logError('CalendarPreferences/Get', error);
      const { status, message } = handleDatabaseError(error, 'fetch calendar preferences');
      res.status(status).json({ message });
    }
  });

  app.post('/api/calendar-preferences', isAuthenticated, csrfSynchronisedProtection, async (req, res) => {
    try {
      const preferencesData = z.array(insertCalendarPreferenceSchema).parse(req.body);
      const preferences = await storage.saveCalendarPreferences(preferencesData);
      res.json(preferences);
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      logError('CalendarPreferences/Save', error);
      const { status, message } = handleDatabaseError(error, 'save calendar preferences');
      res.status(status).json({ message });
    }
  });

  app.patch('/api/calendar-preferences/:calendarId/toggle', isAuthenticated, csrfSynchronisedProtection, async (req, res) => {
    try {
      const { calendarId } = req.params;
      const { isEnabled } = z.object({ isEnabled: z.boolean() }).parse(req.body);
      
      const preference = await storage.updateCalendarToggle(calendarId, isEnabled);
      
      if (!preference) {
        return res.status(404).json({ message: 'Calendar preference not found. It may have been deleted.' });
      }
      
      res.json(preference);
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      logError('CalendarPreferences/Toggle', error, { calendarId: req.params.calendarId });
      const { status, message } = handleDatabaseError(error, 'update calendar toggle');
      res.status(status).json({ message });
    }
  });

  // Fetch Google Calendar list (merged with user preferences)
  app.get('/api/google-calendars/list', isAuthenticated, async (req, res) => {
    try {
      // Fetch calendars from Google
      const googleCalendars = await googleCalendarService.fetchCalendarList();
      
      // Fetch user preferences
      const preferences = await storage.getCalendarPreferences();
      const prefsMap = new Map(preferences.map(p => [p.calendarId, p]));
      
      // Create preferences for new calendars that don't have them yet
      const newPreferences: typeof insertCalendarPreferenceSchema._type[] = [];
      for (const cal of googleCalendars) {
        if (!prefsMap.has(cal.id)) {
          newPreferences.push({
            userId: null,
            calendarId: cal.id,
            calendarName: cal.summary || '',
            backgroundColor: cal.backgroundColor || null,
            foregroundColor: cal.foregroundColor || null,
            isEnabled: true, // Default to enabled
            isPrimary: cal.primary || false,
            accessRole: cal.accessRole || null,
            lastSyncedAt: null,
          });
        }
      }
      
      // Save new preferences
      if (newPreferences.length > 0) {
        const savedPrefs = await storage.saveCalendarPreferences(newPreferences);
        savedPrefs.forEach(pref => prefsMap.set(pref.calendarId, pref));
      }
      
      // Merge Google calendars with preferences
      const mergedCalendars = googleCalendars.map(cal => {
        const pref = prefsMap.get(cal.id);
        return {
          id: cal.id,
          summary: cal.summary,
          description: cal.description,
          backgroundColor: cal.backgroundColor,
          foregroundColor: cal.foregroundColor,
          accessRole: cal.accessRole,
          primary: cal.primary,
          isEnabled: pref ? pref.isEnabled : true,
        };
      });
      
      res.json(mergedCalendars);
    } catch (error: any) {
      serverLogger.error('[API] Error fetching Google calendar list:', error);
      
      // Check if this is an authentication error
      const isAuthError = error.message?.toLowerCase().includes('unauthorized') ||
                         error.message?.toLowerCase().includes('authentication') ||
                         error.message?.toLowerCase().includes('invalid credentials') ||
                         error.code === 401 ||
                         error.status === 401;
      
      if (isAuthError) {
        return res.status(401).json({ 
          message: 'Google Calendar authentication expired. Please log out and reconnect your Google account in Settings.',
          error: error.message 
        });
      }
      
      res.status(500).json({ message: 'Failed to fetch calendar list', error: error.message });
    }
  });

  // POC: Calendar Import Research & Testing Endpoints
  // These endpoints use mock data for parser validation while Google OAuth is rate-limited
  app.get('/api/calendar/poc/list', isAuthenticated, requireRole('admin'), async (req, res) => {
    try {
      serverLogger.info('[POC] Returning mock calendars for validation');
      
      // Mock calendar data based on user's screenshot and typical Google Calendar structure
      const mockCalendars = [
        {
          id: 'primary',
          name: 'Shaun Ulrich',
          description: 'Primary calendar',
          accessRole: 'owner',
          isPrimary: true,
          backgroundColor: '#9fe1e7',
          foregroundColor: '#000000',
        },
        {
          id: 'contractor-shared-123',
          name: 'Building Knowledge',
          description: 'Contractor shared calendar (read-only)',
          accessRole: 'reader',
          isPrimary: false,
          backgroundColor: '#f6bf26',
          foregroundColor: '#000000',
        },
      ];
      
      res.json({
        success: true,
        count: mockCalendars.length,
        calendars: mockCalendars,
      });
    } catch (error: any) {
      serverLogger.error('[POC] Error returning mock calendar list:', error);
      res.status(500).json({ 
        success: false,
        message: 'Failed to fetch calendar list', 
        error: error.message 
      });
    }
  });

  app.get('/api/calendar/poc/events', isAuthenticated, requireRole('admin'), async (req, res) => {
    try {
      const calendarId = req.query.calendarId as string;
      
      if (!calendarId) {
        return res.status(400).json({ 
          success: false,
          message: 'calendarId query parameter required' 
        });
      }

      serverLogger.info(`[POC] Returning mock events from calendar: ${calendarId}`);

      // Mock event data based on user's screenshot showing contractor calendar patterns
      const today = new Date();
      const mockEvents = calendarId === 'contractor-shared-123' ? [
        {
          id: 'event1',
          title: 'MI Test - Spec',
          description: 'Full blower door test with envelope and duct leakage',
          location: '123 Oak Street, Minneapolis, MN',
          start: { dateTime: new Date(today.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString() },
          end: { dateTime: new Date(today.getTime() + 1 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString() },
          organizer: { email: 'contractor@buildingknowledge.com', displayName: 'Building Knowledge' },
          status: 'confirmed',
        },
        {
          id: 'event2',
          title: 'MI SV2',
          description: 'Pre-drywall inspection',
          location: '456 Maple Ave, St. Paul, MN',
          start: { dateTime: new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString() },
          end: { dateTime: new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000 + 1 * 60 * 60 * 1000).toISOString() },
          organizer: { email: 'contractor@buildingknowledge.com', displayName: 'Building Knowledge' },
          status: 'confirmed',
        },
        {
          id: 'event3',
          title: 'M/I Full Test - 789 Pine',
          description: '',
          location: '789 Pine Road, Minnetonka, MN',
          start: { dateTime: new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString() },
          end: { dateTime: new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString() },
          organizer: { email: 'contractor@buildingknowledge.com', displayName: 'Building Knowledge' },
          status: 'confirmed',
        },
        {
          id: 'event4',
          title: 'MIHomes Test',
          description: '',
          location: '321 Elm Street, Eden Prairie, MN',
          start: { dateTime: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString() },
          end: { dateTime: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString() },
          organizer: { email: 'contractor@buildingknowledge.com', displayName: 'Building Knowledge' },
          status: 'confirmed',
        },
        {
          id: 'event5',
          title: 'Unknown Builder - Test',
          description: 'This should fail to match any builder',
          location: '555 Unknown St, Minneapolis, MN',
          start: { dateTime: new Date(today.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString() },
          end: { dateTime: new Date(today.getTime() + 10 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString() },
          organizer: { email: 'contractor@buildingknowledge.com', displayName: 'Building Knowledge' },
          status: 'confirmed',
        },
        {
          id: 'event6',
          title: 'MI Pre-Drywall Inspection',
          description: '',
          location: '888 Cedar Lane, Bloomington, MN',
          start: { dateTime: new Date(today.getTime() + 12 * 24 * 60 * 60 * 1000).toISOString() },
          end: { dateTime: new Date(today.getTime() + 12 * 24 * 60 * 60 * 1000 + 1 * 60 * 60 * 1000).toISOString() },
          organizer: { email: 'contractor@buildingknowledge.com', displayName: 'Building Knowledge' },
          status: 'confirmed',
        },
      ] : [];

      // Parse each event using the calendar event parser
      const { parseCalendarEvent } = await import('./calendarEventParser');
      const parsedEvents = await Promise.all(
        mockEvents.map(async (event) => {
          const parsed = await parseCalendarEvent(storage, event.title);
          return {
            ...event,
            parsed: {
              builderId: parsed.builderId,
              builderName: parsed.builderName,
              inspectionType: parsed.inspectionType,
              confidence: parsed.confidence,
              parsedBuilderAbbreviation: parsed.parsedBuilderAbbreviation,
              parsedInspectionKeyword: parsed.parsedInspectionKeyword,
            },
          };
        })
      );

      res.json({
        success: true,
        calendarId,
        dateRange: {
          start: today.toISOString(),
          end: new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        },
        count: parsedEvents.length,
        events: parsedEvents,
      });
    } catch (error: any) {
      serverLogger.error('[POC] Error returning mock events:', error);
      res.status(500).json({ 
        success: false,
        message: 'Failed to fetch events', 
        error: error.message 
      });
    }
  });

  // Manual Review Queue API
  app.get('/api/calendar/unmatched-events', isAuthenticated, requireRole('admin'), async (req, res) => {
    try {
      const { 
        status, 
        minConfidence, 
        maxConfidence, 
        startDate, 
        endDate, 
        builderMatch,
        limit = '50', 
        offset = '0' 
      } = req.query;

      const filters: any = {
        limit: parseInt(limit as string, 10),
        offset: parseInt(offset as string, 10),
      };

      if (status) {
        filters.status = status as string;
      }
      if (minConfidence) {
        filters.minConfidence = parseInt(minConfidence as string, 10);
      }
      if (maxConfidence) {
        filters.maxConfidence = parseInt(maxConfidence as string, 10);
      }
      if (startDate) {
        filters.startDate = new Date(startDate as string);
      }
      if (endDate) {
        filters.endDate = new Date(endDate as string);
      }
      if (builderMatch && (builderMatch === 'matched' || builderMatch === 'unmatched' || builderMatch === 'all')) {
        filters.builderMatch = builderMatch as 'matched' | 'unmatched' | 'all';
      }

      const result = await storage.getUnmatchedEvents(filters);
      
      res.json({
        events: result.events,
        pagination: {
          total: result.total,
          limit: filters.limit,
          offset: filters.offset,
          hasMore: filters.offset + filters.limit < result.total,
        },
      });
    } catch (error: any) {
      serverLogger.error('[API] Error fetching unmatched events:', error);
      res.status(500).json({ 
        message: 'Failed to fetch unmatched events', 
        error: error.message 
      });
    }
  });

  app.post('/api/calendar/unmatched-events/:id/approve', isAuthenticated, requireRole('admin'), csrfSynchronisedProtection, async (req, res) => {
    try {
      const { approveEventSchema } = await import('@shared/schema');
      const validated = approveEventSchema.parse(req.body);
      
      const userId = (req.user as any)?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const result = await storage.approveUnmatchedEvent(
        req.params.id,
        validated.builderId,
        validated.inspectionType,
        userId
      );

      // Create audit log
      await storage.createAuditLog({
        userId,
        action: 'calendar_event_approved',
        resourceType: 'unmatched_calendar_event',
        resourceId: req.params.id,
        metadata: {
          builderId: validated.builderId,
          inspectionType: validated.inspectionType,
          jobId: result.job.id,
        },
      });

      res.json({
        message: 'Event approved and job created successfully',
        event: result.event,
        job: result.job,
      });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          message: 'Validation error', 
          errors: error.errors 
        });
      }
      serverLogger.error('[API] Error approving event:', error);
      res.status(500).json({ 
        message: 'Failed to approve event', 
        error: error.message 
      });
    }
  });

  app.post('/api/calendar/unmatched-events/:id/reject', isAuthenticated, requireRole('admin'), csrfSynchronisedProtection, async (req, res) => {
    try {
      const { rejectEventSchema } = await import('@shared/schema');
      const validated = rejectEventSchema.parse(req.body);
      
      const userId = (req.user as any)?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const event = await storage.rejectUnmatchedEvent(
        req.params.id,
        userId,
        validated.reason
      );

      if (!event) {
        return res.status(404).json({ message: 'Event not found' });
      }

      // Create audit log
      await storage.createAuditLog({
        userId,
        action: 'calendar_event_rejected',
        resourceType: 'unmatched_calendar_event',
        resourceId: req.params.id,
        metadata: {
          reason: validated.reason,
        },
      });

      res.json({
        message: 'Event rejected successfully',
        event,
      });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          message: 'Validation error', 
          errors: error.errors 
        });
      }
      serverLogger.error('[API] Error rejecting event:', error);
      res.status(500).json({ 
        message: 'Failed to reject event', 
        error: error.message 
      });
    }
  });

  // Calendar Import Trigger
  app.post('/api/calendar/import', isAuthenticated, requireRole('admin'), csrfSynchronisedProtection, async (req, res) => {
    try {
      const { calendarId, events: mockEvents } = req.body;

      if (!calendarId) {
        return res.status(400).json({ 
          message: 'calendar_id is required' 
        });
      }

      if (!mockEvents || !Array.isArray(mockEvents)) {
        return res.status(400).json({ 
          message: 'events array is required (using mock data until real Google Calendar API is integrated)' 
        });
      }

      const userId = (req.user as any)?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      serverLogger.info(`[API] Starting calendar import for calendar ${calendarId}, ${mockEvents.length} events`);

      // Process events using import service
      const result = await processCalendarEvents(
        storage,
        mockEvents as CalendarEvent[],
        calendarId,
        userId
      );

      // Create audit log
      await storage.createAuditLog({
        userId,
        action: 'calendar_import',
        resourceType: 'calendar',
        resourceId: calendarId,
        metadata: {
          eventsProcessed: mockEvents.length,
          jobsCreated: result.jobsCreated,
          eventsQueued: result.eventsQueued,
          errors: result.errors.length,
          importLogId: result.importLogId,
        },
      });

      res.json({
        success: true,
        message: `Import complete: ${result.jobsCreated} jobs created, ${result.eventsQueued} events queued for review`,
        ...result,
      });
    } catch (error: any) {
      serverLogger.error('[API] Calendar import failed:', error);
      res.status(500).json({ 
        message: 'Calendar import failed', 
        error: error.message 
      });
    }
  });

  // Calendar Import Logs
  app.get('/api/calendar/import-logs', isAuthenticated, requireRole('admin', 'manager'), async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
      const calendarId = req.query.calendarId as string | undefined;
      const hasErrors = req.query.hasErrors === 'true';
      
      const { logs, total } = await storage.getFilteredImportLogs({
        limit,
        offset,
        calendarId,
        hasErrors
      });
      
      res.json({
        logs,
        total,
        limit,
        offset
      });
    } catch (error: any) {
      serverLogger.error('[API] Failed to fetch calendar import logs:', error);
      res.status(500).json({ message: 'Failed to fetch import logs' });
    }
  });

  app.post("/api/upload-sessions", isAuthenticated, csrfSynchronisedProtection, async (req, res) => {
    try {
      const validated = insertUploadSessionSchema.parse(req.body);
      const session = await storage.createUploadSession(validated);
      res.status(201).json(session);
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'create upload session');
      res.status(status).json({ message });
    }
  });

  app.get("/api/upload-sessions", isAuthenticated, async (req, res) => {
    try {
      const sessions = await storage.getUploadSessions();
      res.json(sessions);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch upload sessions');
      res.status(status).json({ message });
    }
  });

  app.patch("/api/upload-sessions/:id/acknowledge", isAuthenticated, csrfSynchronisedProtection, async (req, res) => {
    try {
      await storage.acknowledgeUploadSession(req.params.id);
      res.json({ message: "Upload session acknowledged successfully" });
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'acknowledge upload session');
      res.status(status).json({ message });
    }
  });

  app.get("/api/dashboard/summary", isAuthenticated, async (req, res) => {
    try {
      const summary = await storage.getDashboardSummary();
      res.json(summary);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch dashboard summary');
      res.status(status).json({ message });
    }
  });

  app.get("/api/dashboard/leaderboard", isAuthenticated, async (req, res) => {
    try {
      const leaderboard = await storage.getBuilderLeaderboard();
      res.json(leaderboard);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch builder leaderboard');
      res.status(status).json({ message });
    }
  });

  // Email Preferences API
  app.get("/api/email-preferences", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      let prefs = await storage.getEmailPreferences(userId);
      
      // Create default preferences if they don't exist
      if (!prefs) {
        prefs = await storage.createEmailPreferences({ userId });
      }
      
      res.json(prefs);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch email preferences');
      res.status(status).json({ message });
    }
  });

  app.patch("/api/email-preferences", isAuthenticated, csrfSynchronisedProtection, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const validated = insertEmailPreferenceSchema.partial().parse(req.body);
      
      let prefs = await storage.getEmailPreferences(userId);
      
      if (!prefs) {
        // Create if doesn't exist
        prefs = await storage.createEmailPreferences({ userId, ...validated });
      } else {
        // Update existing
        prefs = await storage.updateEmailPreferences(userId, validated);
      }
      
      res.json(prefs);
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'update email preferences');
      res.status(status).json({ message });
    }
  });

  app.post("/api/email-preferences/unsubscribe/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const prefs = await storage.getEmailPreferencesByToken(token);
      
      if (!prefs) {
        return res.status(404).json({ message: "Invalid unsubscribe token" });
      }
      
      // Unsubscribe from all emails
      await storage.updateEmailPreferences(prefs.userId, {
        jobAssigned: false,
        jobStatusChanged: false,
        reportReady: false,
        calendarEvents: false,
        dailyDigest: false,
        weeklyPerformanceSummary: false,
      });
      
      res.json({ message: "You have been unsubscribed from all email notifications" });
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'unsubscribe from emails');
      res.status(status).json({ message });
    }
  });

  app.post("/api/email-preferences/test", isAuthenticated, csrfSynchronisedProtection, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user || !user.email) {
        return res.status(400).json({ message: "User email not found" });
      }
      
      const prefs = await storage.getEmailPreferences(userId);
      const unsubscribeToken = prefs?.unsubscribeToken || await storage.generateUnsubscribeToken(userId);
      
      const { subject, html } = jobAssignedTemplate({
        jobName: "Test Inspection - 123 Main St",
        address: "123 Main Street, City, State 12345",
        scheduledDate: new Date().toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit'
        }),
        builderName: "Test Builder Co.",
        contractor: "Test Contractor",
        inspectionType: "Final Inspection",
        viewJobUrl: `${process.env.APP_URL || 'http://localhost:5000'}/jobs/test`,
        unsubscribeUrl: `${process.env.APP_URL || 'http://localhost:5000'}/api/email-preferences/unsubscribe/${unsubscribeToken}`,
        recipientName: user.firstName || undefined,
      });
      
      const result = await emailService.sendEmail(user.email, subject, html);
      
      if (result.success) {
        res.json({ message: "Test email sent successfully", messageId: result.messageId });
      } else {
        res.status(500).json({ message: "Failed to send test email", error: result.error });
      }
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'send test email');
      res.status(status).json({ message });
    }
  });

  // Audit Logs API Routes
  app.get("/api/audit-logs", isAuthenticated, requireRole('admin', 'manager'), async (req, res) => {
    try {
      const params = {
        limit: Number(req.query.limit) || 50,
        offset: Number(req.query.offset) || 0,
        userId: req.query.userId as string | undefined,
        action: req.query.action as string | undefined,
        resourceType: req.query.resourceType as string | undefined,
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      };
      
      const result = await storage.getAuditLogs(params);
      res.json(result);
    } catch (error) {
      logError('AuditLogs/Get', error);
      res.status(500).json({ message: 'Failed to fetch audit logs' });
    }
  });

  app.get("/api/audit-logs/export", isAuthenticated, requireRole('admin', 'manager'), async (req, res) => {
    try {
      const params = {
        userId: req.query.userId as string | undefined,
        action: req.query.action as string | undefined,
        resourceType: req.query.resourceType as string | undefined,
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      };
      
      // Get all matching logs (no pagination for export)
      const result = await storage.getAuditLogs({ ...params, limit: 10000, offset: 0 });
      
      // Convert to CSV
      const csvRows = [
        ['Timestamp', 'User ID', 'Action', 'Resource Type', 'Resource ID', 'IP Address', 'User Agent'].join(','),
        ...result.logs.map(log => [
          log.timestamp ? new Date(log.timestamp).toISOString() : '',
          log.userId || '',
          log.action,
          log.resourceType,
          log.resourceId || '',
          log.ipAddress || '',
          `"${(log.userAgent || '').replace(/"/g, '""')}"` // Escape quotes in user agent
        ].join(','))
      ];
      
      const csv = csvRows.join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${new Date().toISOString()}.csv"`);
      res.send(csv);
    } catch (error) {
      logError('AuditLogs/Export', error);
      res.status(500).json({ message: 'Failed to export audit logs' });
    }
  });

  // Achievement API Routes
  app.get("/api/achievements", isAuthenticated, async (req, res) => {
    try {
      const achievements = await storage.getAllAchievements();
      res.json(achievements);
    } catch (error) {
      logError('Achievements/GetAll', error);
      res.status(500).json({ message: 'Failed to fetch achievements' });
    }
  });

  app.get("/api/achievements/user", isAuthenticated, async (req, res) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ message: 'User not authenticated' });
      }
      
      const userAchievements = await storage.getUserAchievementWithDetails(req.user.id);
      res.json(userAchievements);
    } catch (error) {
      logError('Achievements/GetUserAchievements', error);
      res.status(500).json({ message: 'Failed to fetch user achievements' });
    }
  });

  app.post("/api/achievements/check", isAuthenticated, async (req, res) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ message: 'User not authenticated' });
      }
      
      const { checkAndAwardAchievements } = await import('./achievementService');
      const awardedIds = await checkAndAwardAchievements(storage, req.user.id);
      
      res.json({ 
        message: awardedIds.length > 0 
          ? `Awarded ${awardedIds.length} new achievement(s)!` 
          : 'No new achievements earned',
        awardedAchievementIds: awardedIds,
        count: awardedIds.length
      });
    } catch (error) {
      logError('Achievements/Check', error);
      res.status(500).json({ message: 'Failed to check achievements' });
    }
  });

  app.post("/api/achievements/seed", isAuthenticated, requireRole('admin'), async (req, res) => {
    try {
      const { ACHIEVEMENT_DEFINITIONS } = await import("@shared/achievementDefinitions");
      
      // Convert achievement definitions to insert format
      const achievementInserts = ACHIEVEMENT_DEFINITIONS.map(def => ({
        id: def.id,
        name: def.name,
        description: def.description,
        type: def.type,
        iconName: def.iconName,
        criteria: def.criteria as any,
        tier: def.tier || null,
      }));
      
      await storage.seedAchievements(achievementInserts);
      res.json({ message: 'Achievements seeded successfully', count: achievementInserts.length });
    } catch (error) {
      logError('Achievements/Seed', error);
      res.status(500).json({ message: 'Failed to seed achievements' });
    }
  });

  // 45L Tax Credit API Endpoints
  
  // Tax Credit Projects
  app.get("/api/tax-credit-projects", isAuthenticated, async (req, res) => {
    try {
      const params = paginationParamsSchema.parse(req.query);
      const result = await storage.getTaxCreditProjectsPaginated(params);
      res.json(result);
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'fetch tax credit projects');
      res.status(status).json({ message });
    }
  });

  app.get("/api/tax-credit-projects/:id", isAuthenticated, async (req, res) => {
    try {
      const project = await storage.getTaxCreditProject(req.params.id);
      if (!project) {
        return res.status(404).json({ message: "Tax credit project not found" });
      }
      res.json(project);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch tax credit project');
      res.status(status).json({ message });
    }
  });

  app.get("/api/tax-credit-projects/builder/:builderId", isAuthenticated, async (req, res) => {
    try {
      const projects = await storage.getTaxCreditProjectsByBuilder(req.params.builderId);
      res.json(projects);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch builder tax credit projects');
      res.status(status).json({ message });
    }
  });

  app.get("/api/tax-credit-projects/year/:year", isAuthenticated, async (req, res) => {
    try {
      const year = parseInt(req.params.year);
      if (isNaN(year)) {
        return res.status(400).json({ message: "Invalid year parameter" });
      }
      const projects = await storage.getTaxCreditProjectsByYear(year);
      res.json(projects);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch tax credit projects by year');
      res.status(status).json({ message });
    }
  });

  app.post("/api/tax-credit-projects", isAuthenticated, csrfSynchronisedProtection, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const validated = insertTaxCreditProjectSchema.parse({
        ...req.body,
        createdBy: userId,
        creditAmount: (req.body.qualifiedUnits || 0) * 2500,
      });
      
      const project = await storage.createTaxCreditProject(validated);
      
      await createAuditLog(req, {
        action: 'created',
        resourceType: 'tax_credit_project',
        resourceId: project.id,
        metadata: { projectName: project.projectName },
      });
      
      res.json(project);
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'create tax credit project');
      res.status(status).json({ message });
    }
  });

  app.patch("/api/tax-credit-projects/:id", isAuthenticated, csrfSynchronisedProtection, async (req: any, res) => {
    try {
      const updates = req.body;
      
      // Recalculate credit amount if qualified units changed
      if (updates.qualifiedUnits !== undefined) {
        updates.creditAmount = updates.qualifiedUnits * 2500;
      }
      
      const project = await storage.updateTaxCreditProject(req.params.id, updates);
      if (!project) {
        return res.status(404).json({ message: "Tax credit project not found" });
      }
      
      await createAuditLog(req, {
        action: 'updated',
        resourceType: 'tax_credit_project',
        resourceId: project.id,
        metadata: { updates },
      });
      
      res.json(project);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'update tax credit project');
      res.status(status).json({ message });
    }
  });

  app.delete("/api/tax-credit-projects/:id", isAuthenticated, csrfSynchronisedProtection, requireRole('admin', 'manager'), async (req: any, res) => {
    try {
      const success = await storage.deleteTaxCreditProject(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Tax credit project not found" });
      }
      
      await createAuditLog(req, {
        action: 'deleted',
        resourceType: 'tax_credit_project',
        resourceId: req.params.id,
      });
      
      res.json({ message: "Tax credit project deleted successfully" });
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'delete tax credit project');
      res.status(status).json({ message });
    }
  });

  // Tax Credit Requirements
  app.get("/api/tax-credit-requirements/project/:projectId", isAuthenticated, async (req, res) => {
    try {
      const requirements = await storage.getTaxCreditRequirementsByProject(req.params.projectId);
      res.json(requirements);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch tax credit requirements');
      res.status(status).json({ message });
    }
  });

  app.post("/api/tax-credit-requirements", isAuthenticated, csrfSynchronisedProtection, async (req: any, res) => {
    try {
      const validated = insertTaxCreditRequirementSchema.parse(req.body);
      const requirement = await storage.createTaxCreditRequirement(validated);
      
      await createAuditLog(req, {
        action: 'created',
        resourceType: 'tax_credit_requirement',
        resourceId: requirement.id,
        metadata: { projectId: requirement.projectId },
      });
      
      res.json(requirement);
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'create tax credit requirement');
      res.status(status).json({ message });
    }
  });

  app.patch("/api/tax-credit-requirements/:id", isAuthenticated, csrfSynchronisedProtection, async (req, res) => {
    try {
      const requirement = await storage.updateTaxCreditRequirement(req.params.id, req.body);
      if (!requirement) {
        return res.status(404).json({ message: "Tax credit requirement not found" });
      }
      res.json(requirement);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'update tax credit requirement');
      res.status(status).json({ message });
    }
  });

  // Tax Credit Documents
  app.get("/api/tax-credit-documents/project/:projectId", isAuthenticated, async (req, res) => {
    try {
      const documents = await storage.getTaxCreditDocumentsByProject(req.params.projectId);
      res.json(documents);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch tax credit documents');
      res.status(status).json({ message });
    }
  });

  app.post("/api/tax-credit-documents", isAuthenticated, csrfSynchronisedProtection, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const validated = insertTaxCreditDocumentSchema.parse({
        ...req.body,
        uploadedBy: userId,
      });
      
      const document = await storage.createTaxCreditDocument(validated);
      
      await createAuditLog(req, {
        action: 'uploaded',
        resourceType: 'tax_credit_document',
        resourceId: document.id,
        metadata: { projectId: document.projectId, fileName: document.fileName },
      });
      
      res.json(document);
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'create tax credit document');
      res.status(status).json({ message });
    }
  });

  app.delete("/api/tax-credit-documents/:id", isAuthenticated, csrfSynchronisedProtection, async (req: any, res) => {
    try {
      const success = await storage.deleteTaxCreditDocument(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Tax credit document not found" });
      }
      
      await createAuditLog(req, {
        action: 'deleted',
        resourceType: 'tax_credit_document',
        resourceId: req.params.id,
      });
      
      res.json({ message: "Tax credit document deleted successfully" });
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'delete tax credit document');
      res.status(status).json({ message });
    }
  });

  // Unit Certifications
  app.get("/api/unit-certifications/project/:projectId", isAuthenticated, async (req, res) => {
    try {
      const certifications = await storage.getUnitCertificationsByProject(req.params.projectId);
      res.json(certifications);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch unit certifications');
      res.status(status).json({ message });
    }
  });

  app.get("/api/unit-certifications/job/:jobId", isAuthenticated, async (req, res) => {
    try {
      const certification = await storage.getUnitCertificationByJob(req.params.jobId);
      if (!certification) {
        return res.status(404).json({ message: "Unit certification not found for this job" });
      }
      res.json(certification);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch unit certification by job');
      res.status(status).json({ message });
    }
  });

  app.post("/api/unit-certifications", isAuthenticated, csrfSynchronisedProtection, async (req: any, res) => {
    try {
      const validated = insertUnitCertificationSchema.parse(req.body);
      
      // Auto-calculate qualification based on savings percentage and HERS index
      if (!validated.qualified && validated.percentSavings) {
        validated.qualified = validated.percentSavings >= 50;
      } else if (!validated.qualified && validated.hersIndex) {
        validated.qualified = validated.hersIndex <= 55;
      }
      
      const certification = await storage.createUnitCertification(validated);
      
      // Update project qualified units count
      if (certification.qualified) {
        const project = await storage.getTaxCreditProject(certification.projectId);
        if (project) {
          await storage.updateTaxCreditProject(project.id, {
            qualifiedUnits: (project.qualifiedUnits || 0) + 1,
            creditAmount: ((project.qualifiedUnits || 0) + 1) * 2500,
          });
        }
      }
      
      await createAuditLog(req, {
        action: 'created',
        resourceType: 'unit_certification',
        resourceId: certification.id,
        metadata: { 
          projectId: certification.projectId, 
          unitAddress: certification.unitAddress,
          qualified: certification.qualified,
        },
      });
      
      res.json(certification);
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'create unit certification');
      res.status(status).json({ message });
    }
  });

  app.patch("/api/unit-certifications/:id", isAuthenticated, csrfSynchronisedProtection, async (req, res) => {
    try {
      const updates = req.body;
      
      // Recalculate qualification if relevant fields changed
      if (updates.percentSavings !== undefined && updates.qualified === undefined) {
        updates.qualified = updates.percentSavings >= 50;
      } else if (updates.hersIndex !== undefined && updates.qualified === undefined) {
        updates.qualified = updates.hersIndex <= 55;
      }
      
      const certification = await storage.updateUnitCertification(req.params.id, updates);
      if (!certification) {
        return res.status(404).json({ message: "Unit certification not found" });
      }
      
      res.json(certification);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'update unit certification');
      res.status(status).json({ message });
    }
  });

  // 45L Tax Credit Summary Dashboard Endpoint
  app.get("/api/tax-credit-summary", isAuthenticated, async (req, res) => {
    try {
      const currentYear = new Date().getFullYear();
      
      // Get all projects for current year
      const projects = await storage.getTaxCreditProjectsByYear(currentYear);
      
      // Calculate summary statistics
      const summary = {
        totalProjects: projects.length,
        pendingProjects: projects.filter(p => p.status === 'pending').length,
        certifiedProjects: projects.filter(p => p.status === 'certified').length,
        totalUnits: projects.reduce((sum, p) => sum + (p.totalUnits || 0), 0),
        qualifiedUnits: projects.reduce((sum, p) => sum + (p.qualifiedUnits || 0), 0),
        totalPotentialCredits: projects.reduce((sum, p) => sum + parseFloat(p.creditAmount || '0'), 0),
        complianceRate: projects.length > 0 
          ? (projects.filter(p => p.status === 'certified').length / projects.length) * 100 
          : 0,
        projectsByBuilder: projects.reduce((acc, p) => {
          acc[p.builderId] = (acc[p.builderId] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
      };
      
      res.json(summary);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch tax credit summary');
      res.status(status).json({ message });
    }
  });

  // Equipment Management Routes
  app.get("/api/equipment", isAuthenticated, async (req: any, res) => {
    try {
      const { status, type, userId, dueDays } = req.query;
      
      if (status && typeof status === 'string') {
        const equipment = await storage.getEquipmentByStatus(status);
        return res.json(equipment);
      }
      
      if (userId && typeof userId === 'string') {
        const equipment = await storage.getEquipmentByUser(userId);
        return res.json(equipment);
      }
      
      if (dueDays && typeof dueDays === 'string') {
        const days = parseInt(dueDays);
        const calibrationDue = await storage.getEquipmentDueForCalibration(days);
        const maintenanceDue = await storage.getEquipmentDueForMaintenance(days);
        return res.json({ calibrationDue, maintenanceDue });
      }
      
      const equipment = await storage.getAllEquipment();
      res.json(equipment);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch equipment');
      res.status(status).json({ message });
    }
  });

  app.get("/api/equipment/:id", isAuthenticated, async (req, res) => {
    try {
      const equipment = await storage.getEquipment(req.params.id);
      if (!equipment) {
        return res.status(404).json({ message: "Equipment not found" });
      }
      res.json(equipment);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch equipment');
      res.status(status).json({ message });
    }
  });

  app.post("/api/equipment", isAuthenticated, csrfSynchronisedProtection, async (req: any, res) => {
    try {
      const validated = insertEquipmentSchema.parse({
        ...req.body,
        userId: req.user?.claims?.sub,
      });
      
      // Generate QR code if not provided
      if (!validated.qrCode) {
        validated.qrCode = `EQUIP-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      }
      
      // Set calibration/maintenance due dates based on intervals
      if (!validated.calibrationDue && validated.lastCalibration && validated.calibrationInterval) {
        const due = new Date(validated.lastCalibration);
        due.setDate(due.getDate() + validated.calibrationInterval);
        validated.calibrationDue = due;
      }
      
      if (!validated.maintenanceDue && validated.lastMaintenance && validated.maintenanceInterval) {
        const due = new Date(validated.lastMaintenance);
        due.setDate(due.getDate() + validated.maintenanceInterval);
        validated.maintenanceDue = due;
      }
      
      const equipment = await storage.createEquipment(validated);
      res.status(201).json(equipment);
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'create equipment');
      res.status(status).json({ message });
    }
  });

  app.patch("/api/equipment/:id", isAuthenticated, csrfSynchronisedProtection, async (req, res) => {
    try {
      const equipment = await storage.updateEquipment(req.params.id, req.body);
      if (!equipment) {
        return res.status(404).json({ message: "Equipment not found" });
      }
      res.json(equipment);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'update equipment');
      res.status(status).json({ message });
    }
  });

  app.delete("/api/equipment/:id", isAuthenticated, csrfSynchronisedProtection, async (req, res) => {
    try {
      const deleted = await storage.deleteEquipment(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Equipment not found" });
      }
      res.status(204).send();
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'delete equipment');
      res.status(status).json({ message });
    }
  });

  // Equipment Calibrations
  app.get("/api/equipment/:equipmentId/calibrations", isAuthenticated, async (req, res) => {
    try {
      const calibrations = await storage.getEquipmentCalibrations(req.params.equipmentId);
      res.json(calibrations);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch calibrations');
      res.status(status).json({ message });
    }
  });

  app.get("/api/calibrations/upcoming", isAuthenticated, async (req, res) => {
    try {
      const { days = '30' } = req.query;
      const calibrations = await storage.getUpcomingCalibrations(parseInt(days as string));
      res.json(calibrations);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch upcoming calibrations');
      res.status(status).json({ message });
    }
  });

  app.get("/api/calibrations/overdue", isAuthenticated, async (req, res) => {
    try {
      const calibrations = await storage.getOverdueCalibrations();
      res.json(calibrations);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch overdue calibrations');
      res.status(status).json({ message });
    }
  });

  app.post("/api/calibrations", isAuthenticated, csrfSynchronisedProtection, async (req, res) => {
    try {
      const validated = insertEquipmentCalibrationSchema.parse(req.body);
      const calibration = await storage.createEquipmentCalibration(validated);
      res.status(201).json(calibration);
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'create calibration');
      res.status(status).json({ message });
    }
  });

  app.delete("/api/calibrations/:id", isAuthenticated, csrfSynchronisedProtection, async (req, res) => {
    try {
      const deleted = await storage.deleteEquipmentCalibration(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Calibration not found" });
      }
      res.status(204).send();
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'delete calibration');
      res.status(status).json({ message });
    }
  });

  // Equipment Maintenance
  app.get("/api/equipment/:equipmentId/maintenance", isAuthenticated, async (req, res) => {
    try {
      const maintenance = await storage.getEquipmentMaintenanceHistory(req.params.equipmentId);
      res.json(maintenance);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch maintenance history');
      res.status(status).json({ message });
    }
  });

  app.get("/api/maintenance/upcoming", isAuthenticated, async (req, res) => {
    try {
      const { days = '30' } = req.query;
      const maintenance = await storage.getUpcomingMaintenance(parseInt(days as string));
      res.json(maintenance);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch upcoming maintenance');
      res.status(status).json({ message });
    }
  });

  app.post("/api/maintenance", isAuthenticated, csrfSynchronisedProtection, async (req, res) => {
    try {
      const validated = insertEquipmentMaintenanceSchema.parse(req.body);
      const maintenance = await storage.createEquipmentMaintenance(validated);
      res.status(201).json(maintenance);
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'create maintenance');
      res.status(status).json({ message });
    }
  });

  app.delete("/api/maintenance/:id", isAuthenticated, csrfSynchronisedProtection, async (req, res) => {
    try {
      const deleted = await storage.deleteEquipmentMaintenance(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Maintenance record not found" });
      }
      res.status(204).send();
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'delete maintenance');
      res.status(status).json({ message });
    }
  });

  // Equipment Checkouts
  app.get("/api/equipment/:equipmentId/checkouts", isAuthenticated, async (req, res) => {
    try {
      const checkouts = await storage.getEquipmentCheckouts(req.params.equipmentId);
      res.json(checkouts);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch checkouts');
      res.status(status).json({ message });
    }
  });

  app.get("/api/checkouts/active", isAuthenticated, async (req, res) => {
    try {
      const checkouts = await storage.getActiveCheckouts();
      res.json(checkouts);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch active checkouts');
      res.status(status).json({ message });
    }
  });

  app.get("/api/checkouts/user/:userId", isAuthenticated, async (req, res) => {
    try {
      const checkouts = await storage.getCheckoutsByUser(req.params.userId);
      res.json(checkouts);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch user checkouts');
      res.status(status).json({ message });
    }
  });

  app.get("/api/checkouts/job/:jobId", isAuthenticated, async (req, res) => {
    try {
      const checkouts = await storage.getCheckoutsByJob(req.params.jobId);
      res.json(checkouts);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch job checkouts');
      res.status(status).json({ message });
    }
  });

  app.post("/api/checkouts", isAuthenticated, csrfSynchronisedProtection, async (req: any, res) => {
    try {
      const validated = insertEquipmentCheckoutSchema.parse({
        ...req.body,
        userId: req.body.userId || req.user?.claims?.sub,
      });
      
      // Check if equipment is available
      const equipment = await storage.getEquipment(validated.equipmentId);
      if (!equipment) {
        return res.status(404).json({ message: "Equipment not found" });
      }
      
      if (equipment.status !== 'available') {
        return res.status(400).json({ message: "Equipment is not available for checkout" });
      }
      
      const checkout = await storage.createEquipmentCheckout(validated);
      res.status(201).json(checkout);
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'create checkout');
      res.status(status).json({ message });
    }
  });

  app.post("/api/checkouts/:id/checkin", isAuthenticated, csrfSynchronisedProtection, async (req, res) => {
    try {
      const { condition, notes } = req.body;
      const actualReturn = new Date();
      
      const checkout = await storage.checkInEquipment(
        req.params.id,
        actualReturn,
        condition || 'good',
        notes
      );
      
      if (!checkout) {
        return res.status(404).json({ message: "Checkout not found" });
      }
      
      res.json(checkout);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'check in equipment');
      res.status(status).json({ message });
    }
  });

  app.delete("/api/checkouts/:id", isAuthenticated, csrfSynchronisedProtection, async (req, res) => {
    try {
      const deleted = await storage.deleteEquipmentCheckout(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Checkout not found" });
      }
      res.status(204).send();
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'delete checkout');
      res.status(status).json({ message });
    }
  });

  // Equipment Alerts Summary
  app.get("/api/equipment/alerts", isAuthenticated, async (req, res) => {
    try {
      const calibrationDue = await storage.getEquipmentDueForCalibration(7);
      const maintenanceDue = await storage.getEquipmentDueForMaintenance(7);
      const overdueCalibrations = await storage.getOverdueCalibrations();
      const activeCheckouts = await storage.getActiveCheckouts();
      
      // Filter overdue checkouts
      const now = new Date();
      const overdueCheckouts = activeCheckouts.filter(
        c => c.expectedReturn && new Date(c.expectedReturn) < now
      );
      
      res.json({
        calibrationDue: calibrationDue.length,
        maintenanceDue: maintenanceDue.length,
        overdueCalibrations: overdueCalibrations.length,
        overdueCheckouts: overdueCheckouts.length,
        details: {
          calibrationDue,
          maintenanceDue,
          overdueCalibrations,
          overdueCheckouts,
        },
      });
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch equipment alerts');
      res.status(status).json({ message });
    }
  });

  // ==============================================================
  // Scheduled Exports API Endpoints
  // ==============================================================

  app.get("/api/scheduled-exports", isAuthenticated, async (req: any, res) => {
    try {
      const exports = await storage.listScheduledExports(req.user.id);
      res.json(exports);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'list scheduled exports');
      res.status(status).json({ message });
    }
  });

  app.get("/api/scheduled-exports/:id", isAuthenticated, async (req: any, res) => {
    try {
      const exp = await storage.getScheduledExport(req.params.id);
      if (!exp) {
        return res.status(404).json({ message: "Scheduled export not found" });
      }
      
      // Verify ownership
      if (exp.userId !== req.user.id) {
        return res.status(403).json({ message: "You don't have permission to access this export" });
      }
      
      res.json(exp);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'get scheduled export');
      res.status(status).json({ message });
    }
  });

  app.post("/api/scheduled-exports", isAuthenticated, csrfSynchronisedProtection, async (req: any, res) => {
    try {
      const validated = insertScheduledExportSchema.parse({
        ...req.body,
        userId: req.user.id,
      });

      const exp = await scheduledExportService.createScheduledExport(validated);
      res.status(201).json(exp);
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'create scheduled export');
      res.status(status).json({ message });
    }
  });

  app.patch("/api/scheduled-exports/:id", isAuthenticated, csrfSynchronisedProtection, async (req: any, res) => {
    try {
      // Verify ownership before update
      const existing = await storage.getScheduledExport(req.params.id);
      if (!existing) {
        return res.status(404).json({ message: "Scheduled export not found" });
      }
      
      if (existing.userId !== req.user.id) {
        return res.status(403).json({ message: "You don't have permission to update this export" });
      }
      
      // Use updateScheduledExportSchema which omits userId to prevent ownership reassignment
      const updates = updateScheduledExportSchema.parse(req.body);
      const exp = await scheduledExportService.updateScheduledExport(req.params.id, updates);
      
      if (!exp) {
        return res.status(404).json({ message: "Scheduled export not found" });
      }
      
      res.json(exp);
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'update scheduled export');
      res.status(status).json({ message });
    }
  });

  app.delete("/api/scheduled-exports/:id", isAuthenticated, csrfSynchronisedProtection, async (req: any, res) => {
    try {
      // Verify ownership before delete
      const existing = await storage.getScheduledExport(req.params.id);
      if (!existing) {
        return res.status(404).json({ message: "Scheduled export not found" });
      }
      
      if (existing.userId !== req.user.id) {
        return res.status(403).json({ message: "You don't have permission to delete this export" });
      }
      
      await scheduledExportService.deleteScheduledExport(req.params.id);
      res.status(204).send();
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'delete scheduled export');
      res.status(status).json({ message });
    }
  });

  app.post("/api/scheduled-exports/:id/enable", isAuthenticated, csrfSynchronisedProtection, async (req: any, res) => {
    try {
      // Verify ownership before enable
      const existing = await storage.getScheduledExport(req.params.id);
      if (!existing) {
        return res.status(404).json({ message: "Scheduled export not found" });
      }
      
      if (existing.userId !== req.user.id) {
        return res.status(403).json({ message: "You don't have permission to enable this export" });
      }
      
      const exp = await storage.updateScheduledExportEnabled(req.params.id, true);
      scheduledExportService.scheduleExport(exp);
      res.json(exp);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'enable scheduled export');
      res.status(status).json({ message });
    }
  });

  app.post("/api/scheduled-exports/:id/disable", isAuthenticated, csrfSynchronisedProtection, async (req: any, res) => {
    try {
      // Verify ownership before disable
      const existing = await storage.getScheduledExport(req.params.id);
      if (!existing) {
        return res.status(404).json({ message: "Scheduled export not found" });
      }
      
      if (existing.userId !== req.user.id) {
        return res.status(403).json({ message: "You don't have permission to disable this export" });
      }
      
      const exp = await storage.updateScheduledExportEnabled(req.params.id, false);
      res.json(exp);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'disable scheduled export');
      res.status(status).json({ message });
    }
  });

  app.post("/api/scheduled-exports/:id/test", isAuthenticated, csrfSynchronisedProtection, async (req: any, res) => {
    try {
      // Verify ownership before test run
      const existing = await storage.getScheduledExport(req.params.id);
      if (!existing) {
        return res.status(404).json({ message: "Scheduled export not found" });
      }
      
      if (existing.userId !== req.user.id) {
        return res.status(403).json({ message: "You don't have permission to test this export" });
      }
      
      await scheduledExportService.runExportNow(req.params.id);
      res.json({ message: "Export test started" });
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'test scheduled export');
      res.status(status).json({ message });
    }
  });

  // ==============================================================
  // Export API Endpoints
  // ==============================================================

  // Export jobs data
  app.post("/api/export/jobs", isAuthenticated, csrfSynchronisedProtection, async (req: any, res) => {
    try {
      const options: ExportOptions = {
        format: req.body.format || 'csv',
        columns: req.body.columns,
        filters: req.body.filters,
        dateRange: req.body.dateRange ? {
          startDate: new Date(req.body.dateRange.startDate),
          endDate: new Date(req.body.dateRange.endDate),
        } : undefined,
        customFileName: req.body.fileName,
      };

      const result = await exportService.exportJobs(options);
      
      res.setHeader('Content-Type', result.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
      res.setHeader('Content-Length', result.size.toString());
      
      const stream = createReadStream(result.filePath);
      stream.pipe(res);
      
      // Clean up file after sending
      stream.on('end', () => {
        unlink(result.filePath).catch(err => {
          serverLogger.error('Failed to delete export file', { error: err, file: result.filePath });
        });
      });
    } catch (error) {
      logError('Export/Jobs', error);
      res.status(500).json({ message: "Failed to export jobs data" });
    }
  });

  // Export financial data (invoices, expenses, mileage)
  app.post("/api/export/financial", isAuthenticated, csrfSynchronisedProtection, async (req: any, res) => {
    try {
      const options: ExportOptions & { dataType: 'invoices' | 'expenses' | 'mileage' } = {
        format: req.body.format || 'csv',
        dataType: req.body.dataType,
        columns: req.body.columns,
        dateRange: req.body.dateRange ? {
          startDate: new Date(req.body.dateRange.startDate),
          endDate: new Date(req.body.dateRange.endDate),
        } : undefined,
        customFileName: req.body.fileName,
      };

      const result = await exportService.exportFinancialData(options);
      
      res.setHeader('Content-Type', result.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
      res.setHeader('Content-Length', result.size.toString());
      
      const stream = createReadStream(result.filePath);
      stream.pipe(res);
      
      stream.on('end', () => {
        unlink(result.filePath).catch(err => {
          serverLogger.error('Failed to delete export file', { error: err, file: result.filePath });
        });
      });
    } catch (error) {
      logError('Export/Financial', error);
      res.status(500).json({ message: "Failed to export financial data" });
    }
  });

  // Export equipment data
  app.post("/api/export/equipment", isAuthenticated, csrfSynchronisedProtection, async (req: any, res) => {
    try {
      const options: ExportOptions = {
        format: req.body.format || 'csv',
        columns: req.body.columns,
        filters: req.body.filters,
        customFileName: req.body.fileName,
      };

      const result = await exportService.exportEquipment(options);
      
      res.setHeader('Content-Type', result.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
      res.setHeader('Content-Length', result.size.toString());
      
      const stream = createReadStream(result.filePath);
      stream.pipe(res);
      
      stream.on('end', () => {
        unlink(result.filePath).catch(err => {
          serverLogger.error('Failed to delete export file', { error: err, file: result.filePath });
        });
      });
    } catch (error) {
      logError('Export/Equipment', error);
      res.status(500).json({ message: "Failed to export equipment data" });
    }
  });

  // Export QA scores
  app.post("/api/export/qa-scores", isAuthenticated, csrfSynchronisedProtection, async (req: any, res) => {
    try {
      const options: ExportOptions = {
        format: req.body.format || 'csv',
        columns: req.body.columns,
        dateRange: req.body.dateRange ? {
          startDate: new Date(req.body.dateRange.startDate),
          endDate: new Date(req.body.dateRange.endDate),
        } : undefined,
        customFileName: req.body.fileName,
      };

      const result = await exportService.exportQAScores(options);
      
      res.setHeader('Content-Type', result.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
      res.setHeader('Content-Length', result.size.toString());
      
      const stream = createReadStream(result.filePath);
      stream.pipe(res);
      
      stream.on('end', () => {
        unlink(result.filePath).catch(err => {
          serverLogger.error('Failed to delete export file', { error: err, file: result.filePath });
        });
      });
    } catch (error) {
      logError('Export/QAScores', error);
      res.status(500).json({ message: "Failed to export QA scores" });
    }
  });

  // Export analytics report
  app.post("/api/export/analytics", isAuthenticated, csrfSynchronisedProtection, async (req: any, res) => {
    try {
      const options: ExportOptions & { reportType: string } = {
        format: req.body.format || 'pdf',
        reportType: req.body.reportType || 'general',
        dateRange: req.body.dateRange ? {
          startDate: new Date(req.body.dateRange.startDate),
          endDate: new Date(req.body.dateRange.endDate),
        } : undefined,
        customFileName: req.body.fileName,
      };

      const result = await exportService.exportAnalytics(options);
      
      res.setHeader('Content-Type', result.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
      res.setHeader('Content-Length', result.size.toString());
      
      const stream = createReadStream(result.filePath);
      stream.pipe(res);
      
      stream.on('end', () => {
        unlink(result.filePath).catch(err => {
          serverLogger.error('Failed to delete export file', { error: err, file: result.filePath });
        });
      });
    } catch (error) {
      logError('Export/Analytics', error);
      res.status(500).json({ message: "Failed to export analytics report" });
    }
  });

  // Export photo metadata
  app.post("/api/export/photos", isAuthenticated, csrfSynchronisedProtection, async (req: any, res) => {
    try {
      const options: ExportOptions = {
        format: req.body.format || 'csv',
        columns: req.body.columns,
        filters: req.body.filters,
        dateRange: req.body.dateRange ? {
          startDate: new Date(req.body.dateRange.startDate),
          endDate: new Date(req.body.dateRange.endDate),
        } : undefined,
        customFileName: req.body.fileName,
      };

      const result = await exportService.exportPhotoMetadata(options);
      
      res.setHeader('Content-Type', result.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
      res.setHeader('Content-Length', result.size.toString());
      
      const stream = createReadStream(result.filePath);
      stream.pipe(res);
      
      stream.on('end', () => {
        unlink(result.filePath).catch(err => {
          serverLogger.error('Failed to delete export file', { error: err, file: result.filePath });
        });
      });
    } catch (error) {
      logError('Export/Photos', error);
      res.status(500).json({ message: "Failed to export photo metadata" });
    }
  });

  // ==============================================================
  // Gamification API Endpoints
  // ==============================================================

  // Get user's achievements
  app.get("/api/achievements/user/:userId", isAuthenticated, async (req: any, res) => {
    try {
      const { userId } = req.params;
      
      // Check if user can access this data
      if (userId !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ message: "You can only view your own achievements" });
      }

      const achievements = await storage.getUserAchievements(userId);
      const stats = await storage.getUserAchievementStats(userId);
      const xp = await storage.getUserXP(userId);
      const userStats = await storage.getUserStatistics(userId);

      res.json({
        userId,
        totalXP: xp,
        level: Math.floor(xp / 100) + 1, // Simple level calculation
        achievements: achievements.map(a => a.achievementId),
        stats: userStats,
        recentAchievements: stats.recentUnlocks.slice(0, 5).map(a => ({
          achievementId: a.achievementId,
          unlockedAt: a.earnedAt
        })),
        categoryProgress: stats.byCategory
      });
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch user achievements');
      res.status(status).json({ message });
    }
  });

  // Get achievement progress for current user
  app.get("/api/achievements/progress", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const achievements = await storage.getUserAchievements(userId);
      const stats = await storage.getUserStatistics(userId);
      
      // Calculate progress for each achievement type
      // This is a simplified version - in production you'd have more complex logic
      const progress = {
        inspections_completed: stats.inspections_completed || 0,
        photos_taken: stats.photos_taken || 0,
        achievements_unlocked: achievements.length,
        // Add more progress metrics as needed
      };

      res.json(progress);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch achievement progress');
      res.status(status).json({ message });
    }
  });

  // Unlock an achievement
  app.post("/api/achievements/unlock", isAuthenticated, csrfSynchronisedProtection, async (req: any, res) => {
    try {
      const schema = z.object({
        userId: z.string(),
        achievementId: z.string(),
        achievementType: z.string(),
        xpReward: z.number().optional()
      });

      const { userId, achievementId, achievementType, xpReward } = schema.parse(req.body);

      // Check if user can unlock achievements (only for themselves or admin)
      if (userId !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ message: "Cannot unlock achievements for other users" });
      }

      // Check if already unlocked
      const existing = await storage.getAchievementByType(userId, achievementType);
      if (existing) {
        return res.status(409).json({ message: "Achievement already unlocked" });
      }

      // Unlock the achievement
      const achievement = await storage.unlockAchievement(userId, achievementType, {
        achievementId,
        xpReward: xpReward || 0,
        category: req.body.category || 'general'
      });

      // Update user XP if provided
      if (xpReward) {
        await storage.updateUserXP(userId, xpReward);
      }

      // Create audit log
      await createAuditLog(req, 'achievement.unlock', 'success', {
        achievementType,
        userId
      });

      res.status(201).json(achievement);
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'unlock achievement');
      res.status(status).json({ message });
    }
  });

  // Get leaderboard
  app.get("/api/leaderboard", isAuthenticated, async (req, res) => {
    try {
      const schema = z.object({
        period: z.enum(['week', 'month', 'year', 'all_time']).optional().default('month'),
        category: z.enum(['overall', 'inspections', 'quality', 'speed', 'photos']).optional().default('overall'),
        mode: z.enum(['individual', 'team']).optional().default('individual'),
        limit: z.string().transform(Number).optional().default('10')
      });

      const { period, category, mode, limit } = schema.parse(req.query);

      const leaderboard = await storage.getLeaderboard(period, category, limit);

      // Add additional user data
      const enrichedLeaderboard = await Promise.all(
        leaderboard.map(async (entry) => {
          const user = await storage.getUser(entry.userId);
          return {
            ...entry,
            profileImageUrl: user?.profileImageUrl,
            level: Math.floor(entry.totalXP / 100) + 1,
            achievementCount: entry.achievementCount
          };
        })
      );

      res.json(enrichedLeaderboard);
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'fetch leaderboard');
      res.status(status).json({ message });
    }
  });

  // Get user's leaderboard position
  app.get("/api/leaderboard/position", isAuthenticated, async (req: any, res) => {
    try {
      const schema = z.object({
        period: z.enum(['week', 'month', 'year', 'all_time']).optional().default('month'),
        category: z.enum(['overall', 'inspections', 'quality', 'speed', 'photos']).optional().default('overall'),
        mode: z.enum(['individual', 'team']).optional().default('individual'),
        userId: z.string().optional()
      });

      const { period, category, mode, userId } = schema.parse(req.query);
      const targetUserId = userId || req.user.id;

      const position = await storage.getUserLeaderboardPosition(targetUserId, period);
      res.json(position);
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'fetch user position');
      res.status(status).json({ message });
    }
  });

  // Get user's XP and level
  app.get("/api/stats/xp", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const xp = await storage.getUserXP(userId);
      const level = Math.floor(xp / 100) + 1;
      const xpForCurrentLevel = (level - 1) * 100;
      const xpForNextLevel = level * 100;

      res.json({
        userId,
        totalXP: xp,
        level,
        currentLevelXP: xp - xpForCurrentLevel,
        nextLevelXP: xpForNextLevel - xpForCurrentLevel,
        progress: ((xp - xpForCurrentLevel) / (xpForNextLevel - xpForCurrentLevel)) * 100
      });
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch XP stats');
      res.status(status).json({ message });
    }
  });

  // Get user's streaks
  app.get("/api/streaks/:userId", isAuthenticated, async (req: any, res) => {
    try {
      const { userId } = req.params;

      // Check if user can access this data
      if (userId !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ message: "You can only view your own streaks" });
      }

      const streaks = await storage.getUserStreaks(userId);
      res.json(streaks);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch user streaks');
      res.status(status).json({ message });
    }
  });

  // Update a streak
  app.post("/api/streaks/:userId", isAuthenticated, csrfSynchronisedProtection, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const { type, current, best, lastDate } = req.body;

      // Only the user themselves can update their streaks
      if (userId !== req.user.id) {
        return res.status(403).json({ message: "Cannot update streaks for other users" });
      }

      await storage.updateStreak(userId, type, true);
      res.json({ success: true });
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'update streak');
      res.status(status).json({ message });
    }
  });

  // Get active challenges
  app.get("/api/challenges", isAuthenticated, async (req, res) => {
    try {
      const { type } = req.query;
      let challenges = await storage.getActiveChallenges();
      
      if (type && type !== 'all') {
        challenges = challenges.filter(c => c.type === type);
      }

      // Add user progress for each challenge
      const enrichedChallenges = await Promise.all(
        challenges.map(async (challenge) => {
          const progress = await storage.getChallengeProgress((req as any).user.claims.sub, challenge.id);
          return {
            ...challenge,
            status: challenge.endDate < new Date() ? 'expired' : 'active',
            userProgress: progress
          };
        })
      );

      res.json(enrichedChallenges);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch challenges');
      res.status(status).json({ message });
    }
  });

  // Join a challenge
  app.post("/api/challenges/:challengeId/join", isAuthenticated, csrfSynchronisedProtection, async (req: any, res) => {
    try {
      const { challengeId } = req.params;
      const userId = req.user.id;

      await storage.joinChallenge(userId, challengeId);
      
      res.json({ success: true, message: "Successfully joined challenge" });
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'join challenge');
      res.status(status).json({ message });
    }
  });

  // Get global statistics
  app.get("/api/stats/global", isAuthenticated, async (req, res) => {
    try {
      const stats = await storage.getGlobalStatistics();
      res.json(stats);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch global stats');
      res.status(status).json({ message });
    }
  });

  // Analytics Dashboard Endpoints
  app.get("/api/analytics/overview", isAuthenticated, async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;
      
      const overview = await storage.getDashboardMetrics(start, end);
      res.json(overview);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch analytics overview');
      res.status(status).json({ message });
    }
  });

  app.get("/api/analytics/trends", isAuthenticated, async (req, res) => {
    try {
      const { period, startDate, endDate } = req.query;
      const periodStr = (period as string) || 'daily';
      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;
      
      const trends = await storage.getInspectionTrends(
        periodStr as 'daily' | 'weekly' | 'monthly',
        start,
        end
      );
      
      res.json(trends);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch analytics trends');
      res.status(status).json({ message });
    }
  });

  app.get("/api/analytics/kpis", isAuthenticated, async (req, res) => {
    try {
      const kpis = await storage.getKPIMetrics();
      res.json(kpis);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch analytics kpis');
      res.status(status).json({ message });
    }
  });

  app.post("/api/analytics/custom-report", isAuthenticated, csrfSynchronisedProtection, async (req: any, res) => {
    try {
      const { 
        reportType, 
        filters, 
        groupBy, 
        metrics, 
        dateRange,
        chartType,
      } = req.body;
      
      // Generate custom report based on parameters
      const jobs = await storage.getJobs();
      const builders = await storage.getBuilders();
      
      // Filter data based on criteria
      let filteredData = jobs;
      if (filters?.status) {
        filteredData = filteredData.filter((j: Job) => j.status === filters.status);
      }
      if (filters?.builderId) {
        filteredData = filteredData.filter((j: Job) => j.builderId === filters.builderId);
      }
      
      // Generate report data
      const reportData = {
        id: `report_${Date.now()}`,
        name: `${reportType} Report`,
        type: reportType,
        generatedAt: new Date().toISOString(),
        parameters: { filters, groupBy, metrics, dateRange, chartType },
        data: filteredData.slice(0, 100), // Limit data for demo
        summary: {
          totalRecords: filteredData.length,
          metrics: metrics?.map((m: string) => ({
            name: m,
            value: Math.floor(Math.random() * 100),
          })) || [],
        },
      };
      
      res.json(reportData);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'generate custom report');
      res.status(status).json({ message });
    }
  });

  // New Analytics Endpoints for Dashboard
  app.get("/api/analytics/dashboard", isAuthenticated, async (req, res) => {
    try {
      const summary = await storage.getDashboardSummary();
      res.json(summary);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch dashboard analytics');
      res.status(status).json({ message });
    }
  });

  app.get("/api/analytics/metrics", isAuthenticated, async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;
      
      const metrics = await storage.getDashboardMetrics(start, end);
      res.json(metrics);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch dashboard metrics');
      res.status(status).json({ message });
    }
  });

  app.get("/api/analytics/leaderboard", isAuthenticated, async (req, res) => {
    try {
      const leaderboard = await storage.getBuilderLeaderboard();
      res.json(leaderboard);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch analytics leaderboard');
      res.status(status).json({ message });
    }
  });

  app.get("/api/analytics/forecasts", isAuthenticated, async (req, res) => {
    try {
      const { metric, lookbackDays } = req.query;
      const metricStr = (metric as string) || 'revenue';
      const days = lookbackDays ? parseInt(lookbackDays as string) : 30;
      
      const forecasts = await storage.getForecastData(metricStr, days);
      res.json(forecasts);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch analytics forecasts');
      res.status(status).json({ message });
    }
  });

  app.get("/api/analytics/builder-performance", isAuthenticated, async (req, res) => {
    try {
      const { limit } = req.query;
      const maxBuilders = limit ? parseInt(limit as string) : 10;
      
      const performance = await storage.getBuilderPerformance(maxBuilders);
      res.json(performance);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch builder performance');
      res.status(status).json({ message });
    }
  });

  app.get("/api/analytics/financial", isAuthenticated, async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;
      
      const financial = await storage.getFinancialMetrics(start, end);
      res.json(financial);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch financial analytics');
      res.status(status).json({ message });
    }
  });

  app.get("/api/analytics/photos", isAuthenticated, async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;
      
      const photoAnalytics = await storage.getPhotoAnalytics(start, end);
      res.json(photoAnalytics);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch photo analytics');
      res.status(status).json({ message });
    }
  });

  app.get("/api/analytics/inspector-performance", isAuthenticated, async (req, res) => {
    try {
      const { inspectorId, startDate, endDate } = req.query;
      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;
      
      const performance = await storage.getInspectorPerformance(
        inspectorId as string | undefined,
        start,
        end
      );
      res.json(performance);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch inspector performance');
      res.status(status).json({ message });
    }
  });

  app.get("/api/analytics/compliance", isAuthenticated, async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;
      
      const compliance = await storage.getComplianceMetrics(start, end);
      res.json(compliance);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch compliance analytics');
      res.status(status).json({ message });
    }
  });

  app.get("/api/analytics/revenue-expense", isAuthenticated, async (req, res) => {
    try {
      const { period, startDate, endDate } = req.query;
      const periodStr = (period as string) || 'monthly';
      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;
      
      const data = await storage.getRevenueExpenseData(
        periodStr as 'daily' | 'weekly' | 'monthly',
        start,
        end
      );
      res.json(data);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch revenue expense data');
      res.status(status).json({ message });
    }
  });

  app.get("/api/analytics/export", isAuthenticated, async (req, res) => {
    try {
      const { format, type } = req.query;
      const typeStr = (type as string) || 'dashboard';
      
      // Get real data for export
      const data = await storage.getDashboardSummary();
      
      if (format === 'csv') {
        // Convert data to CSV format
        let csvContent = 'Metric,Value\n';
        csvContent += `Total Inspections,${data.totalInspections}\n`;
        csvContent += `Average ACH50,${data.averageACH50}\n`;
        csvContent += `Pass Rate,${data.passRate}%\n`;
        csvContent += `Fail Rate,${data.failRate}%\n`;
        csvContent += `45L Eligible Count,${data.tax45LEligibleCount}\n`;
        csvContent += `Potential Tax Credits,$${data.totalPotentialTaxCredits}\n`;
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=analytics.csv');
        res.send(csvContent);
      } else if (format === 'json') {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename=analytics.json');
        res.send(JSON.stringify(data, null, 2));
      } else {
        res.status(400).json({ message: 'Invalid export format. Use csv or json' });
      }
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'export analytics');
      res.status(status).json({ message });
    }
  });

  // Custom Reports Management
  app.get("/api/custom-reports", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user.claims.sub;
      // For demo, return mock saved reports
      const reports = [
        {
          id: 'report_1',
          name: 'Monthly Performance Report',
          type: 'performance',
          createdAt: new Date('2024-01-15').toISOString(),
          lastRun: new Date('2024-02-01').toISOString(),
          schedule: 'monthly',
          chartType: 'line',
          metrics: ['jobs_completed', 'avg_qa_score'],
        },
        {
          id: 'report_2',
          name: 'Builder Compliance Analysis',
          type: 'compliance',
          createdAt: new Date('2024-01-20').toISOString(),
          lastRun: new Date('2024-02-05').toISOString(),
          schedule: 'weekly',
          chartType: 'bar',
          metrics: ['compliance_rate', 'first_pass_rate'],
        },
      ];
      
      res.json(reports);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch custom reports');
      res.status(status).json({ message });
    }
  });

  app.post("/api/custom-reports", isAuthenticated, csrfSynchronisedProtection, async (req: any, res) => {
    try {
      const { name, type, config } = req.body;
      const userId = req.user.id;
      
      const report = {
        id: `report_${Date.now()}`,
        name,
        type,
        config,
        userId,
        createdAt: new Date().toISOString(),
        lastRun: null,
      };
      
      res.status(201).json(report);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'save custom report');
      res.status(status).json({ message });
    }
  });

  // KPI Settings
  app.get("/api/kpi-settings", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user.claims.sub;
      
      // Return mock KPI settings
      const settings = {
        userId,
        selectedKpis: [
          'jobs_completed',
          'avg_qa_score', 
          'compliance_rate',
          'first_pass_rate',
          'revenue',
        ],
        layout: {
          dashboard: [
            { kpi: 'jobs_completed', position: 0, size: 'large' },
            { kpi: 'avg_qa_score', position: 1, size: 'medium' },
            { kpi: 'compliance_rate', position: 2, size: 'medium' },
            { kpi: 'first_pass_rate', position: 3, size: 'small' },
            { kpi: 'revenue', position: 4, size: 'large' },
          ],
        },
        refreshRate: 30, // seconds
        thresholds: {
          jobs_completed: { warning: 80, critical: 60 },
          avg_qa_score: { warning: 85, critical: 75 },
          compliance_rate: { warning: 90, critical: 85 },
        },
      };
      
      res.json(settings);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch KPI settings');
      res.status(status).json({ message });
    }
  });

  app.put("/api/kpi-settings", isAuthenticated, csrfSynchronisedProtection, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { selectedKpis, layout, refreshRate, thresholds } = req.body;
      
      // Save KPI settings (mock for demo)
      const settings = {
        userId,
        selectedKpis,
        layout,
        refreshRate,
        thresholds,
        updatedAt: new Date().toISOString(),
      };
      
      res.json(settings);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'update KPI settings');
      res.status(status).json({ message });
    }
  });

  // QA Performance API Routes
  app.get("/api/qa/performance/:userId/:period", isAuthenticated, async (req: any, res) => {
    try {
      const { userId, period } = req.params;
      const currentUser = req.user.id;
      
      // Users can only view their own performance unless they're admin/manager
      const user = await storage.getUser(currentUser);
      if (!user) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      if (userId !== currentUser && user.role !== 'admin' && user.role !== 'manager') {
        return res.status(403).json({ message: "You can only view your own performance metrics" });
      }
      
      // Get or calculate performance metrics
      let metric = await storage.getLatestQaPerformanceMetric(userId, period);
      
      // If no recent metric exists, calculate it
      if (!metric) {
        const now = new Date();
        let startDate: Date, endDate: Date = now;
        
        switch (period) {
          case 'month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
          case 'quarter':
            const quarter = Math.floor(now.getMonth() / 3);
            startDate = new Date(now.getFullYear(), quarter * 3, 1);
            break;
          case 'year':
            startDate = new Date(now.getFullYear(), 0, 1);
            break;
          default:
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        }
        
        metric = await storage.calculateQaPerformanceMetrics(userId, period, startDate, endDate);
      }
      
      // Calculate trend
      const previousPeriodMetrics = await storage.getQaPerformanceMetricsByUser(userId);
      let trend: 'up' | 'down' | 'stable' = 'stable';
      if (previousPeriodMetrics.length > 1) {
        const prevScore = parseFloat(previousPeriodMetrics[1].avgScore || '0');
        const currentScore = parseFloat(metric.avgScore || '0');
        if (currentScore > prevScore + 1) trend = 'up';
        else if (currentScore < prevScore - 1) trend = 'down';
      }
      
      // Get user name
      const targetUser = await storage.getUser(userId);
      const name = targetUser ? `${targetUser.firstName || ''} ${targetUser.lastName || ''}`.trim() : 'Unknown';
      
      const response = {
        userId: metric.userId,
        name,
        period: metric.period,
        avgScore: parseFloat(metric.avgScore || '0'),
        jobsCompleted: metric.jobsCompleted || 0,
        jobsReviewed: metric.jobsReviewed || 0,
        onTimeRate: parseFloat(metric.onTimeRate || '0'),
        firstPassRate: parseFloat(metric.firstPassRate || '0'),
        customerSatisfaction: parseFloat(metric.customerSatisfaction || '0'),
        strongAreas: metric.strongAreas || [],
        improvementAreas: metric.improvementAreas || [],
        trend
      };
      
      res.json(response);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch QA performance metrics');
      res.status(status).json({ message });
    }
  });

  app.get("/api/qa/performance/team/:period", isAuthenticated, async (req: any, res) => {
    try {
      const { period } = req.params;
      const { startDate, endDate } = req.query;
      
      const start = startDate ? new Date(startDate as string) : new Date(new Date().setMonth(new Date().getMonth() - 5));
      const end = endDate ? new Date(endDate as string) : new Date();
      
      // Get team metrics for each month in the period
      const metrics = [];
      const current = new Date(start);
      
      while (current <= end) {
        const monthStart = new Date(current.getFullYear(), current.getMonth(), 1);
        const monthEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0);
        
        const teamMetrics = await storage.getTeamQaPerformanceMetrics('month', monthStart, monthEnd);
        
        // Calculate averages across the team
        let totalScore = 0, totalCompletion = 0, totalCompliance = 0, totalSatisfaction = 0;
        let count = 0;
        
        for (const metric of teamMetrics) {
          totalScore += parseFloat(metric.avgScore || '0');
          totalCompletion += metric.jobsCompleted || 0;
          totalCompliance += parseFloat(metric.firstPassRate || '0');
          totalSatisfaction += parseFloat(metric.customerSatisfaction || '0');
          count++;
        }
        
        if (count > 0) {
          metrics.push({
            month: current.toLocaleDateString('en-US', { month: 'short' }),
            avgScore: parseFloat((totalScore / count).toFixed(1)),
            completionRate: 90 + Math.random() * 5, // Mock completion rate
            complianceRate: parseFloat((totalCompliance / count).toFixed(1)),
            customerSatisfaction: parseFloat((totalSatisfaction / count).toFixed(1))
          });
        }
        
        current.setMonth(current.getMonth() + 1);
      }
      
      res.json(metrics);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch team performance metrics');
      res.status(status).json({ message });
    }
  });

  app.get("/api/qa/performance/category-breakdown/:userId", isAuthenticated, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const { startDate, endDate } = req.query;
      
      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;
      
      const breakdown = await storage.getQaCategoryBreakdown(userId === 'team' ? undefined : userId, start, end);
      res.json(breakdown);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch category breakdown');
      res.status(status).json({ message });
    }
  });

  app.get("/api/qa/performance/leaderboard/:period", isAuthenticated, async (req, res) => {
    try {
      const { period } = req.params;
      const { limit } = req.query;
      
      const leaderboard = await storage.getQaLeaderboard(period, limit ? parseInt(limit as string) : 10);
      res.json(leaderboard);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch QA leaderboard');
      res.status(status).json({ message });
    }
  });

  app.get("/api/qa/performance/trends/:userId", isAuthenticated, async (req, res) => {
    try {
      const { userId } = req.params;
      const { days } = req.query;
      
      const trends = await storage.getQaScoreTrends(
        userId === 'team' ? undefined : userId,
        days ? parseInt(days as string) : 30
      );
      res.json(trends);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch QA score trends');
      res.status(status).json({ message });
    }
  });

  app.get("/api/qa/performance/training-needs", isAuthenticated, requireRole(['admin', 'manager']), async (req, res) => {
    try {
      const trainingNeeds = await storage.getQaTrainingNeeds();
      res.json(trainingNeeds);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch training needs');
      res.status(status).json({ message });
    }
  });

  app.post("/api/qa/performance/export", isAuthenticated, async (req: any, res) => {
    try {
      const { format, period, userId } = req.body;
      const currentUser = req.user.id;
      
      // Check permissions
      const user = await storage.getUser(currentUser);
      if (!user) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      if (userId && userId !== currentUser && user.role !== 'admin' && user.role !== 'manager') {
        return res.status(403).json({ message: "You can only export your own performance data" });
      }
      
      // Get performance data
      const targetUserId = userId || currentUser;
      const metric = await storage.getLatestQaPerformanceMetric(targetUserId, period);
      const categoryBreakdown = await storage.getQaCategoryBreakdown(targetUserId);
      const trends = await storage.getQaScoreTrends(targetUserId, 30);
      
      if (!metric) {
        return res.status(404).json({ message: "No performance data found for the specified period" });
      }
      
      if (format === 'csv') {
        let csvContent = 'Metric,Value\n';
        csvContent += `Average Score,${metric.avgScore}%\n`;
        csvContent += `Jobs Completed,${metric.jobsCompleted}\n`;
        csvContent += `Jobs Reviewed,${metric.jobsReviewed}\n`;
        csvContent += `On-Time Rate,${metric.onTimeRate}%\n`;
        csvContent += `First Pass Rate,${metric.firstPassRate}%\n`;
        csvContent += `Customer Satisfaction,${metric.customerSatisfaction}\n`;
        csvContent += `\nCategory,Score\n`;
        
        for (const category of categoryBreakdown) {
          csvContent += `${category.category},${category.score}\n`;
        }
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=qa-performance-${period}.csv`);
        res.send(csvContent);
      } else if (format === 'json') {
        const exportData = {
          metric,
          categoryBreakdown,
          trends,
          exportedAt: new Date().toISOString()
        };
        
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename=qa-performance-${period}.json`);
        res.send(JSON.stringify(exportData, null, 2));
      } else {
        // Return error for unsupported format
        res.status(400).json({ message: 'Invalid export format. Use csv or json' });
      }
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'export QA performance report');
      res.status(status).json({ message });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
