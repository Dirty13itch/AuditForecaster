import { z } from "zod";
import { sanitizeInput } from "./security-client";

export const SubcontractorSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").transform(sanitizeInput),
  type: z.enum(["Individual", "Company"], {
    required_error: "Please select a type",
  }),
  email: z.string().email("Invalid email address").optional().or(z.literal("")).transform(val => val ? sanitizeInput(val) : val),
  phone: z.string().min(10, "Phone number must be at least 10 digits").optional().or(z.literal("")).transform(val => val ? sanitizeInput(val) : val),
  taxId: z.string().optional().transform(val => val ? sanitizeInput(val) : val),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
});

export type SubcontractorInput = z.infer<typeof SubcontractorSchema>;

export const CertificationSchema = z.object({
  name: z.string().min(2, "Certification name required").transform(sanitizeInput),
  licenseNumber: z.string().optional().transform(val => val ? sanitizeInput(val) : val),
  expirationDate: z.date().optional(),
});

export const InspectorSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").transform(sanitizeInput),
  email: z.string().email("Invalid email address").transform(sanitizeInput),
  phone: z.string().optional().transform(val => val ? sanitizeInput(val) : val),
  role: z.literal("INSPECTOR"),
  hersRaterId: z.string().optional().transform(val => val ? sanitizeInput(val) : val),
  baseRate: z.coerce.number().min(0).optional(),
  certifications: z.array(CertificationSchema).optional(),
  onboarding: z.object({
    uniformIssued: z.boolean().default(false),
    ipadIssued: z.boolean().default(false),
    badgePrinted: z.boolean().default(false),
    trainingComplete: z.boolean().default(false),
    notes: z.string().optional().transform(val => val ? sanitizeInput(val) : val),
  }).optional(),
});

export type InspectorInput = z.infer<typeof InspectorSchema>;

export const EquipmentClientSchema = z.object({
  name: z.string().min(2, "Name required").transform(sanitizeInput),
  type: z.string().min(2, "Type required").transform(sanitizeInput), // e.g. "Blower Door"
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

export const VehicleSchema = z.object({
  name: z.string().min(2, "Name required").transform(sanitizeInput),
  make: z.string().min(2, "Make required").transform(sanitizeInput),
  model: z.string().min(2, "Model required").transform(sanitizeInput),
  year: z.coerce.number().min(1900).max(new Date().getFullYear() + 1),
  licensePlate: z.string().min(2, "License Plate required").transform(sanitizeInput),
  vin: z.string().optional().transform(val => val ? sanitizeInput(val) : val),
  mileage: z.coerce.number().min(0),
  status: z.enum(["ACTIVE", "MAINTENANCE", "RETIRED"]).default("ACTIVE"),
  assignedTo: z.string().optional().or(z.literal("")),
  nextService: z.string().optional().transform(val => val ? new Date(val) : undefined),
});

export type VehicleInput = z.infer<typeof VehicleSchema>;

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


