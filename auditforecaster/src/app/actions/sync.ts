'use server';

import { syncQueue } from '@/lib/queue';
import { auth } from '@/auth';

export async function enqueueSyncJob(
    resource: string,
    type: string,
    payload: unknown
) {
    const session = await auth();
    if (!session?.user?.id) {
        throw new Error('Unauthorized');
    }

    const job = await syncQueue.add('sync-mutation', {
        resource,
        type,
        payload,
        userId: session.user.id,
        timestamp: Date.now(),
    });

    return { success: true, jobId: job.id };
}
