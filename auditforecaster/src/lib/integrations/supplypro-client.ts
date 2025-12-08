import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

// Schema for SupplyPro Order (based on typical construction ERPs)
export const SupplyProOrderSchema = z.object({
    OrderID: z.string(),
    BuilderName: z.string(),
    Subdivision: z.string().optional(),
    LotNumber: z.string(),
    Address: z.string(),
    City: z.string(),
    State: z.string(),
    Zip: z.string(),
    TaskDate: z.string(), // ISO Date
    TaskName: z.string(),
    Status: z.string(),
});

type SupplyProOrder = z.infer<typeof SupplyProOrderSchema>;

export class SupplyProClient {
    private apiKey: string;
    private baseUrl: string;

    constructor(apiKey: string) {
        this.apiKey = apiKey;
        this.baseUrl = 'https://api.supplypro.com/v1'; // Placeholder URL
    }

    /**
     * Fetches new orders from SupplyPro
     */
    async fetchNewOrders(startDate: Date): Promise<SupplyProOrder[]> {
        if (!this.apiKey) {
            logger.warn('SupplyPro Sync Skipped: No API Key');
            return [];
        }

        // Mock Implementation
        // In reality, this would be an axios/fetch call
        logger.info(`Fetching SupplyPro orders since ${startDate.toISOString()}`);
        return [];
    }

    /**
     * Syncs orders to local Jobs
     */
    async syncOrdersToJobs() {
        const orders = await this.fetchNewOrders(new Date()); // Fetch for today

        for (const order of orders) {
            // Check if job exists
            const existingJob = await prisma.job.findUnique({
                where: { buildProOrderId: order.OrderID }
            });

            if (!existingJob) {
                // Create Job
                await prisma.job.create({
                    data: {
                        buildProOrderId: order.OrderID,
                        builder: {
                            connectOrCreate: {
                                where: { id: 'unknown' }, // Ideally match by name
                                create: { name: order.BuilderName }
                            }
                        },
                        lotNumber: order.LotNumber,
                        streetAddress: order.Address,
                        city: order.City,
                        address: `${order.Address}, ${order.City}, ${order.State} ${order.Zip}`,
                        scheduledDate: new Date(order.TaskDate),
                        status: 'PENDING',
                        buildProSyncedAt: new Date(),
                    }
                });
            }
        }
    }
}
