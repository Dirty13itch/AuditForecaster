import { z } from "zod";
import { sanitizeInput } from "./security-client";

export const EquipmentClientSchema = z.object({
  name: z.string().min(2, "Name required").transform(sanitizeInput),
  type: z.string().min(2, "Type required").transform(sanitizeInput),
  serialNumber: z.string().min(1, "Serial Number required").transform(sanitizeInput),
  status: z.enum(["ACTIVE", "CALIBRATION_DUE", "REPAIR", "RETIRED"]).default("ACTIVE"),
  lastCalibration: z.date().optional(),
  nextCalibration: z.date().optional(),
  calibrationCertUrl: z.string().optional().transform(val => val ? sanitizeInput(val) : val),
  notes: z.string().optional().transform(val => val ? sanitizeInput(val) : val),
});

export type EquipmentClientInput = z.infer<typeof EquipmentClientSchema>;

export const EquipmentDatabaseSchema = EquipmentClientSchema.extend({
  id: z.string().cuid().optional(),
  purchasePrice: z.number().optional(),
  purchaseDate: z.date().optional(),
  assignedTo: z.string().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export type EquipmentDatabaseInput = z.infer<typeof EquipmentDatabaseSchema>;

// Legacy export to prevent breaking existing code temporarily
export const EquipmentSchema = EquipmentClientSchema;
export type EquipmentInput = EquipmentClientInput;

export const JobSchema = z.object({
  builderId: z.string().min(1, "Builder is required"),
  lotNumber: z.string().min(1, "Lot Number is required").transform(sanitizeInput),
  streetAddress: z.string().min(1, "Street Address is required").transform(sanitizeInput),
  city: z.string().min(1, "City is required").transform(sanitizeInput),
  scheduledDate: z.union([z.string(), z.date()]).optional().transform(val => val ? new Date(val) : undefined),
  inspectorId: z.string().optional(),
  status: z.enum(["PENDING", "ASSIGNED", "IN_PROGRESS", "COMPLETED", "REVIEWED", "INVOICED"]).default("PENDING"),
});

export type JobInput = z.infer<typeof JobSchema>;
