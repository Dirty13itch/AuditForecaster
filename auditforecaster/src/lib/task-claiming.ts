import { prisma } from "@/lib/prisma";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { logger } from "@/lib/logger";

export type ClaimTaskResult =
    | { success: true; claimed: boolean; expiresAt?: Date }
    | { success: false; message: string }
    | { success: false; claimedBy?: string; expiresAt?: Date; message?: string }

export async function claimTask(taskId: string, userId: string, durationSeconds = 300): Promise<ClaimTaskResult> {
    if (!isFeatureEnabled('ENABLE_TASK_CLAIMING')) {
        return { success: true, claimed: false }; // Feature disabled, allow access
    }

    // Cleanup expired claims first (lazy cleanup)
    await prisma.taskClaim.deleteMany({
        where: { expiresAt: { lt: new Date() } }
    });

    try {
        const expiresAt = new Date(Date.now() + durationSeconds * 1000);

        await prisma.taskClaim.create({
            data: {
                taskId,
                userId,
                expiresAt
            }
        });
        return { success: true, claimed: true, expiresAt };
    } catch {
        // Unique constraint violation means it's already claimed
        const existing = await prisma.taskClaim.findUnique({
            where: { taskId },
            include: { user: true }
        });

        if (existing && existing.userId === userId) {
            // Extend own claim
            const expiresAt = new Date(Date.now() + durationSeconds * 1000);
            await prisma.taskClaim.update({
                where: { id: existing.id },
                data: { expiresAt }
            });
            return { success: true, claimed: true, expiresAt };
        }

        return {
            success: false,
            claimedBy: existing?.user.name || 'Unknown',
            expiresAt: existing?.expiresAt
        };
    }
}

export async function releaseTask(taskId: string, userId: string) {
    if (!isFeatureEnabled('ENABLE_TASK_CLAIMING')) return;

    try {
        await prisma.taskClaim.deleteMany({
            where: {
                taskId,
                userId
            }
        });
    } catch (error) {
        logger.error("Failed to release task claim", { error });
    }
}
