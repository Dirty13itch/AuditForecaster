import type { Express } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { isAuthenticated } from "../auth";
import { requireRole, requirePermission } from "../middleware/permissions";
import { createAuditLog } from "../auditLogger";
import { 
  insertOrganizationSchema, 
  insertOrganizationUserSchema,
  insertOrganizationSettingSchema,
  insertUserInvitationSchema,
  type Organization,
  type OrganizationUser,
  type OrganizationSetting,
  type UserInvitation
} from "@shared/schema";
import { emailService } from "../email/emailService";
import { serverLogger } from "../logger";
import { db } from "../db";
import { eq, and, or, desc } from "drizzle-orm";
import { 
  organizations, 
  organizationUsers, 
  organizationSettings, 
  userInvitations,
  users 
} from "@shared/schema";
import { nanoid } from "nanoid";
import { ObjectStorageService, objectStorageClient } from "../objectStorage";

// Validation schemas
const updateOrganizationSchema = z.object({
  name: z.string().min(1).optional(),
  resnetCertification: z.string().optional(),
  insuranceProvider: z.string().optional(),
  insurancePolicyNumber: z.string().optional(),
  serviceAreas: z.array(z.string()).optional(),
  primaryContactEmail: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
});

const updateOrganizationUserSchema = z.object({
  role: z.enum(["owner", "admin", "inspector", "contractor"]).optional(),
  permissions: z.record(z.boolean()).optional(),
  status: z.enum(["active", "deactivated"]).optional(),
});

const inviteUserSchema = z.object({
  email: z.string().email(),
  role: z.enum(["admin", "inspector", "contractor"]),
  permissions: z.record(z.boolean()).optional(),
});

const updateSettingsSchema = z.object({
  settings: z.array(z.object({
    key: z.string(),
    value: z.any(),
  })),
});

// Helper to get user's organization
async function getUserOrganization(userId: string): Promise<string | null> {
  try {
    const orgUser = await db.query.organizationUsers.findFirst({
      where: and(
        eq(organizationUsers.userId, userId),
        eq(organizationUsers.status, "active")
      ),
    });
    return orgUser?.organizationId || null;
  } catch (error) {
    serverLogger.error("[Settings] Failed to get user organization:", error);
    return null;
  }
}

// Helper to check if user has permission
async function hasOrgPermission(userId: string, orgId: string, requiredRole?: string[]): Promise<boolean> {
  try {
    const orgUser = await db.query.organizationUsers.findFirst({
      where: and(
        eq(organizationUsers.organizationId, orgId),
        eq(organizationUsers.userId, userId),
        eq(organizationUsers.status, "active")
      ),
    });
    
    if (!orgUser) return false;
    if (!requiredRole) return true;
    
    return requiredRole.includes(orgUser.role);
  } catch (error) {
    serverLogger.error("[Settings] Failed to check org permission:", error);
    return false;
  }
}

export function registerSettingsRoutes(app: Express) {
  // Organization Management Routes
  
  // GET /api/organization - Get current organization details
  app.get("/api/organization", isAuthenticated, async (req: any, res) => {
    try {
      const orgId = await getUserOrganization(req.user.id);
      if (!orgId) {
        return res.status(404).json({ message: "Organization not found" });
      }

      const org = await db.query.organizations.findFirst({
        where: eq(organizations.id, orgId),
      });

      if (!org) {
        return res.status(404).json({ message: "Organization not found" });
      }

      res.json(org);
    } catch (error) {
      serverLogger.error("[Settings] Failed to get organization:", error);
      res.status(500).json({ message: "Failed to get organization details" });
    }
  });

  // PATCH /api/organization - Update organization profile
  app.patch("/api/organization", isAuthenticated, async (req: any, res) => {
    try {
      const orgId = await getUserOrganization(req.user.id);
      if (!orgId) {
        return res.status(404).json({ message: "Organization not found" });
      }

      // Check if user is owner or admin
      const hasPermission = await hasOrgPermission(req.user.id, orgId, ["owner", "admin"]);
      if (!hasPermission) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const data = updateOrganizationSchema.parse(req.body);
      
      await db.update(organizations)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(organizations.id, orgId));

      await createAuditLog({
        action: "UPDATE",
        resourceType: "organization",
        resourceId: orgId,
        userId: req.user.id,
        details: { changes: data },
      });

      const updated = await db.query.organizations.findFirst({
        where: eq(organizations.id, orgId),
      });

      res.json(updated);
    } catch (error) {
      serverLogger.error("[Settings] Failed to update organization:", error);
      res.status(500).json({ message: "Failed to update organization" });
    }
  });

  // POST /api/organization/logo - Upload company logo
  app.post("/api/organization/logo", isAuthenticated, async (req: any, res) => {
    try {
      const orgId = await getUserOrganization(req.user.id);
      if (!orgId) {
        return res.status(404).json({ message: "Organization not found" });
      }

      const hasPermission = await hasOrgPermission(req.user.id, orgId, ["owner", "admin"]);
      if (!hasPermission) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      // Handle file upload (assuming multer or similar middleware)
      const file = req.file;
      if (!file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Upload to object storage
      const key = `organizations/${orgId}/logo-${Date.now()}.${file.originalname.split('.').pop()}`;
      const result = await objectStorageClient.uploadObject({
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      });

      // Update organization with logo URL
      await db.update(organizations)
        .set({
          logoUrl: result.url,
          updatedAt: new Date(),
        })
        .where(eq(organizations.id, orgId));

      await createAuditLog({
        action: "UPDATE",
        resourceType: "organization",
        resourceId: orgId,
        userId: req.user.id,
        details: { action: "logo_upload", url: result.url },
      });

      res.json({ logoUrl: result.url });
    } catch (error) {
      serverLogger.error("[Settings] Failed to upload logo:", error);
      res.status(500).json({ message: "Failed to upload logo" });
    }
  });

  // User Management Routes

  // GET /api/organization/users - List all users with roles
  app.get("/api/organization/users", isAuthenticated, async (req: any, res) => {
    try {
      const orgId = await getUserOrganization(req.user.id);
      if (!orgId) {
        return res.status(404).json({ message: "Organization not found" });
      }

      const orgUsers = await db
        .select({
          id: organizationUsers.id,
          userId: organizationUsers.userId,
          role: organizationUsers.role,
          permissions: organizationUsers.permissions,
          status: organizationUsers.status,
          joinedAt: organizationUsers.joinedAt,
          user: {
            id: users.id,
            email: users.email,
            firstName: users.firstName,
            lastName: users.lastName,
            profileImageUrl: users.profileImageUrl,
          },
        })
        .from(organizationUsers)
        .leftJoin(users, eq(organizationUsers.userId, users.id))
        .where(eq(organizationUsers.organizationId, orgId))
        .orderBy(desc(organizationUsers.createdAt));

      res.json(orgUsers);
    } catch (error) {
      serverLogger.error("[Settings] Failed to get organization users:", error);
      res.status(500).json({ message: "Failed to get users" });
    }
  });

  // POST /api/organization/users/invite - Send invitation email
  app.post("/api/organization/users/invite", isAuthenticated, async (req: any, res) => {
    try {
      const orgId = await getUserOrganization(req.user.id);
      if (!orgId) {
        return res.status(404).json({ message: "Organization not found" });
      }

      const hasPermission = await hasOrgPermission(req.user.id, orgId, ["owner", "admin"]);
      if (!hasPermission) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const data = inviteUserSchema.parse(req.body);
      
      // Check if user already exists in organization
      const existingUser = await db.query.users.findFirst({
        where: eq(users.email, data.email),
      });

      if (existingUser) {
        const existingOrgUser = await db.query.organizationUsers.findFirst({
          where: and(
            eq(organizationUsers.organizationId, orgId),
            eq(organizationUsers.userId, existingUser.id)
          ),
        });

        if (existingOrgUser) {
          return res.status(400).json({ message: "User already exists in organization" });
        }
      }

      // Create invitation
      const token = nanoid(32);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

      const invitation = await db.insert(userInvitations).values({
        organizationId: orgId,
        email: data.email,
        role: data.role,
        token,
        invitedBy: req.user.id,
        expiresAt,
        status: "pending",
      }).returning();

      // Get organization details for email
      const org = await db.query.organizations.findFirst({
        where: eq(organizations.id, orgId),
      });

      // Send invitation email
      await emailService.sendEmail({
        to: data.email,
        subject: `Invitation to join ${org?.name || 'our organization'}`,
        html: `
          <h2>You've been invited!</h2>
          <p>${req.user.firstName} ${req.user.lastName} has invited you to join ${org?.name} as a ${data.role}.</p>
          <p>Click the link below to accept the invitation:</p>
          <a href="${process.env.APP_URL}/accept-invitation?token=${token}" style="display: inline-block; padding: 10px 20px; background-color: #2E5BBA; color: white; text-decoration: none; border-radius: 4px;">
            Accept Invitation
          </a>
          <p>This invitation will expire in 7 days.</p>
        `,
      });

      await createAuditLog({
        action: "CREATE",
        resourceType: "invitation",
        resourceId: invitation[0].id,
        userId: req.user.id,
        details: { email: data.email, role: data.role },
      });

      res.json({ message: "Invitation sent successfully", invitation: invitation[0] });
    } catch (error) {
      serverLogger.error("[Settings] Failed to send invitation:", error);
      res.status(500).json({ message: "Failed to send invitation" });
    }
  });

  // PATCH /api/organization/users/:id - Update user role/permissions
  app.patch("/api/organization/users/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const orgId = await getUserOrganization(req.user.id);
      if (!orgId) {
        return res.status(404).json({ message: "Organization not found" });
      }

      const hasPermission = await hasOrgPermission(req.user.id, orgId, ["owner", "admin"]);
      if (!hasPermission) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const data = updateOrganizationUserSchema.parse(req.body);

      // Check if target user exists in organization
      const targetUser = await db.query.organizationUsers.findFirst({
        where: and(
          eq(organizationUsers.id, id),
          eq(organizationUsers.organizationId, orgId)
        ),
      });

      if (!targetUser) {
        return res.status(404).json({ message: "User not found in organization" });
      }

      // Prevent demoting the last owner
      if (targetUser.role === "owner" && data.role && data.role !== "owner") {
        const ownerCount = await db
          .select()
          .from(organizationUsers)
          .where(and(
            eq(organizationUsers.organizationId, orgId),
            eq(organizationUsers.role, "owner"),
            eq(organizationUsers.status, "active")
          ));

        if (ownerCount.length <= 1) {
          return res.status(400).json({ message: "Cannot demote the last owner" });
        }
      }

      await db.update(organizationUsers)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(and(
          eq(organizationUsers.id, id),
          eq(organizationUsers.organizationId, orgId)
        ));

      await createAuditLog({
        action: "UPDATE",
        resourceType: "organization_user",
        resourceId: id,
        userId: req.user.id,
        details: { changes: data },
      });

      res.json({ message: "User updated successfully" });
    } catch (error) {
      serverLogger.error("[Settings] Failed to update user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  // DELETE /api/organization/users/:id - Deactivate user
  app.delete("/api/organization/users/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const orgId = await getUserOrganization(req.user.id);
      if (!orgId) {
        return res.status(404).json({ message: "Organization not found" });
      }

      const hasPermission = await hasOrgPermission(req.user.id, orgId, ["owner", "admin"]);
      if (!hasPermission) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      // Check if target user exists
      const targetUser = await db.query.organizationUsers.findFirst({
        where: and(
          eq(organizationUsers.id, id),
          eq(organizationUsers.organizationId, orgId)
        ),
      });

      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Prevent removing the last owner
      if (targetUser.role === "owner") {
        const ownerCount = await db
          .select()
          .from(organizationUsers)
          .where(and(
            eq(organizationUsers.organizationId, orgId),
            eq(organizationUsers.role, "owner"),
            eq(organizationUsers.status, "active")
          ));

        if (ownerCount.length <= 1) {
          return res.status(400).json({ message: "Cannot remove the last owner" });
        }
      }

      // Deactivate user
      await db.update(organizationUsers)
        .set({
          status: "deactivated",
          updatedAt: new Date(),
        })
        .where(and(
          eq(organizationUsers.id, id),
          eq(organizationUsers.organizationId, orgId)
        ));

      await createAuditLog({
        action: "DELETE",
        resourceType: "organization_user",
        resourceId: id,
        userId: req.user.id,
        details: { action: "deactivated" },
      });

      res.json({ message: "User deactivated successfully" });
    } catch (error) {
      serverLogger.error("[Settings] Failed to deactivate user:", error);
      res.status(500).json({ message: "Failed to deactivate user" });
    }
  });

  // GET /api/invitations - List pending invitations
  app.get("/api/invitations", isAuthenticated, async (req: any, res) => {
    try {
      const orgId = await getUserOrganization(req.user.id);
      if (!orgId) {
        return res.status(404).json({ message: "Organization not found" });
      }

      const invitations = await db
        .select({
          id: userInvitations.id,
          email: userInvitations.email,
          role: userInvitations.role,
          status: userInvitations.status,
          expiresAt: userInvitations.expiresAt,
          createdAt: userInvitations.createdAt,
          invitedBy: {
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            email: users.email,
          },
        })
        .from(userInvitations)
        .leftJoin(users, eq(userInvitations.invitedBy, users.id))
        .where(and(
          eq(userInvitations.organizationId, orgId),
          eq(userInvitations.status, "pending")
        ))
        .orderBy(desc(userInvitations.createdAt));

      res.json(invitations);
    } catch (error) {
      serverLogger.error("[Settings] Failed to get invitations:", error);
      res.status(500).json({ message: "Failed to get invitations" });
    }
  });

  // POST /api/invitations/:token/resend - Resend invitation
  app.post("/api/invitations/:token/resend", isAuthenticated, async (req: any, res) => {
    try {
      const { token } = req.params;
      const orgId = await getUserOrganization(req.user.id);
      if (!orgId) {
        return res.status(404).json({ message: "Organization not found" });
      }

      const hasPermission = await hasOrgPermission(req.user.id, orgId, ["owner", "admin"]);
      if (!hasPermission) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const invitation = await db.query.userInvitations.findFirst({
        where: and(
          eq(userInvitations.token, token),
          eq(userInvitations.organizationId, orgId)
        ),
      });

      if (!invitation) {
        return res.status(404).json({ message: "Invitation not found" });
      }

      // Update expiry date
      const newExpiresAt = new Date();
      newExpiresAt.setDate(newExpiresAt.getDate() + 7);

      await db.update(userInvitations)
        .set({
          expiresAt: newExpiresAt,
        })
        .where(eq(userInvitations.id, invitation.id));

      // Get organization details
      const org = await db.query.organizations.findFirst({
        where: eq(organizations.id, orgId),
      });

      // Resend email
      await emailService.sendEmail({
        to: invitation.email,
        subject: `Reminder: Invitation to join ${org?.name || 'our organization'}`,
        html: `
          <h2>Invitation Reminder</h2>
          <p>You have a pending invitation to join ${org?.name} as a ${invitation.role}.</p>
          <p>Click the link below to accept the invitation:</p>
          <a href="${process.env.APP_URL}/accept-invitation?token=${token}" style="display: inline-block; padding: 10px 20px; background-color: #2E5BBA; color: white; text-decoration: none; border-radius: 4px;">
            Accept Invitation
          </a>
          <p>This invitation will expire in 7 days.</p>
        `,
      });

      res.json({ message: "Invitation resent successfully" });
    } catch (error) {
      serverLogger.error("[Settings] Failed to resend invitation:", error);
      res.status(500).json({ message: "Failed to resend invitation" });
    }
  });

  // DELETE /api/invitations/:token - Cancel invitation
  app.delete("/api/invitations/:token", isAuthenticated, async (req: any, res) => {
    try {
      const { token } = req.params;
      const orgId = await getUserOrganization(req.user.id);
      if (!orgId) {
        return res.status(404).json({ message: "Organization not found" });
      }

      const hasPermission = await hasOrgPermission(req.user.id, orgId, ["owner", "admin"]);
      if (!hasPermission) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const invitation = await db.query.userInvitations.findFirst({
        where: and(
          eq(userInvitations.token, token),
          eq(userInvitations.organizationId, orgId)
        ),
      });

      if (!invitation) {
        return res.status(404).json({ message: "Invitation not found" });
      }

      await db.update(userInvitations)
        .set({
          status: "cancelled",
        })
        .where(eq(userInvitations.id, invitation.id));

      await createAuditLog({
        action: "DELETE",
        resourceType: "invitation",
        resourceId: invitation.id,
        userId: req.user.id,
        details: { action: "cancelled" },
      });

      res.json({ message: "Invitation cancelled successfully" });
    } catch (error) {
      serverLogger.error("[Settings] Failed to cancel invitation:", error);
      res.status(500).json({ message: "Failed to cancel invitation" });
    }
  });

  // Settings Management Routes

  // GET /api/organization/settings/:category - Get settings by category
  app.get("/api/organization/settings/:category", isAuthenticated, async (req: any, res) => {
    try {
      const { category } = req.params;
      const orgId = await getUserOrganization(req.user.id);
      if (!orgId) {
        return res.status(404).json({ message: "Organization not found" });
      }

      const settings = await db.query.organizationSettings.findMany({
        where: and(
          eq(organizationSettings.organizationId, orgId),
          eq(organizationSettings.category, category as any)
        ),
      });

      // Transform to key-value object
      const settingsObject = settings.reduce((acc: any, setting) => {
        acc[setting.key] = setting.value;
        return acc;
      }, {});

      res.json(settingsObject);
    } catch (error) {
      serverLogger.error("[Settings] Failed to get settings:", error);
      res.status(500).json({ message: "Failed to get settings" });
    }
  });

  // PATCH /api/organization/settings/:category - Update settings
  app.patch("/api/organization/settings/:category", isAuthenticated, async (req: any, res) => {
    try {
      const { category } = req.params;
      const orgId = await getUserOrganization(req.user.id);
      if (!orgId) {
        return res.status(404).json({ message: "Organization not found" });
      }

      const hasPermission = await hasOrgPermission(req.user.id, orgId, ["owner", "admin"]);
      if (!hasPermission) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const data = updateSettingsSchema.parse(req.body);

      // Update each setting
      for (const setting of data.settings) {
        const existing = await db.query.organizationSettings.findFirst({
          where: and(
            eq(organizationSettings.organizationId, orgId),
            eq(organizationSettings.category, category as any),
            eq(organizationSettings.key, setting.key)
          ),
        });

        if (existing) {
          await db.update(organizationSettings)
            .set({
              value: setting.value,
              updatedBy: req.user.id,
              updatedAt: new Date(),
            })
            .where(eq(organizationSettings.id, existing.id));
        } else {
          await db.insert(organizationSettings).values({
            organizationId: orgId,
            category: category as any,
            key: setting.key,
            value: setting.value,
            updatedBy: req.user.id,
          });
        }
      }

      await createAuditLog({
        action: "UPDATE",
        resourceType: "settings",
        resourceId: orgId,
        userId: req.user.id,
        details: { category, settings: data.settings },
      });

      res.json({ message: "Settings updated successfully" });
    } catch (error) {
      serverLogger.error("[Settings] Failed to update settings:", error);
      res.status(500).json({ message: "Failed to update settings" });
    }
  });

  // GET /api/organization/settings/export - Export all settings
  app.get("/api/organization/settings/export", isAuthenticated, async (req: any, res) => {
    try {
      const orgId = await getUserOrganization(req.user.id);
      if (!orgId) {
        return res.status(404).json({ message: "Organization not found" });
      }

      const hasPermission = await hasOrgPermission(req.user.id, orgId, ["owner", "admin"]);
      if (!hasPermission) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      // Get all settings
      const settings = await db.query.organizationSettings.findMany({
        where: eq(organizationSettings.organizationId, orgId),
      });

      // Get organization details
      const org = await db.query.organizations.findFirst({
        where: eq(organizations.id, orgId),
      });

      const exportData = {
        organization: org,
        settings: settings.reduce((acc: any, setting) => {
          if (!acc[setting.category]) {
            acc[setting.category] = {};
          }
          acc[setting.category][setting.key] = setting.value;
          return acc;
        }, {}),
        exportedAt: new Date().toISOString(),
        exportedBy: req.user.email,
      };

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="settings-${orgId}-${Date.now()}.json"`);
      res.json(exportData);
    } catch (error) {
      serverLogger.error("[Settings] Failed to export settings:", error);
      res.status(500).json({ message: "Failed to export settings" });
    }
  });

  // POST /api/organization/settings/import - Import settings backup
  app.post("/api/organization/settings/import", isAuthenticated, async (req: any, res) => {
    try {
      const orgId = await getUserOrganization(req.user.id);
      if (!orgId) {
        return res.status(404).json({ message: "Organization not found" });
      }

      const hasPermission = await hasOrgPermission(req.user.id, orgId, ["owner"]);
      if (!hasPermission) {
        return res.status(403).json({ message: "Only owners can import settings" });
      }

      const importData = req.body;
      if (!importData.settings) {
        return res.status(400).json({ message: "Invalid import file" });
      }

      // Import settings by category
      for (const [category, categorySettings] of Object.entries(importData.settings)) {
        for (const [key, value] of Object.entries(categorySettings as any)) {
          const existing = await db.query.organizationSettings.findFirst({
            where: and(
              eq(organizationSettings.organizationId, orgId),
              eq(organizationSettings.category, category as any),
              eq(organizationSettings.key, key)
            ),
          });

          if (existing) {
            await db.update(organizationSettings)
              .set({
                value,
                updatedBy: req.user.id,
                updatedAt: new Date(),
              })
              .where(eq(organizationSettings.id, existing.id));
          } else {
            await db.insert(organizationSettings).values({
              organizationId: orgId,
              category: category as any,
              key,
              value,
              updatedBy: req.user.id,
            });
          }
        }
      }

      await createAuditLog({
        action: "CREATE",
        resourceType: "settings_import",
        resourceId: orgId,
        userId: req.user.id,
        details: { source: "backup_import" },
      });

      res.json({ message: "Settings imported successfully" });
    } catch (error) {
      serverLogger.error("[Settings] Failed to import settings:", error);
      res.status(500).json({ message: "Failed to import settings" });
    }
  });

  serverLogger.info("[Settings] Routes registered successfully");
}