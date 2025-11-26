import { z } from 'zod';

/**
 * Zod schema for the expected SupplyPro/BuildPro webhook payload.
 * Based on standard construction scheduling data structures.
 * Note: This is a tentative schema to be refined with actual API docs.
 */
export const SupplyProWebhookSchema = z.object({
    orderId: z.string(),
    builderName: z.string(),
    subdivisionName: z.string().optional(),
    lotNumber: z.string(),
    streetAddress: z.string(),
    city: z.string(),
    zipCode: z.string().optional(),
    scheduledDate: z.string().datetime().optional(), // ISO string
    status: z.string().optional(),
    instructions: z.string().optional(),
});

export type SupplyProWebhookPayload = z.infer<typeof SupplyProWebhookSchema>;

/**
 * Helper to normalize builder names for matching.
 * e.g., "DR Horton - Austin" -> "DR Horton"
 */
export function normalizeBuilderName(name: string): string {
    return name.trim();
}
