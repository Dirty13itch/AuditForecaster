import {
    enqueueMutation,
    getMutationQueue,
    removeMutation,
    addFailedMutation,
    MutationQueueItem
} from './offline-storage';
// import { EquipmentClientInput, JobInput } from '@/lib/schemas';

// Adapters moved to sync-actions.ts

export class SyncEngine {
    private isProcessing = false;
    private subscribers: ((isSyncing: boolean) => void)[] = [];

    subscribe(callback: (isSyncing: boolean) => void) {
        this.subscribers.push(callback);
        return () => {
            this.subscribers = this.subscribers.filter(cb => cb !== callback);
        };
    }

    private notify(isSyncing: boolean) {
        this.subscribers.forEach(cb => cb(isSyncing));
    }

    async enqueue(
        type: MutationQueueItem['type'],
        resource: MutationQueueItem['resource'],
        payload: unknown
    ) {
        const item: MutationQueueItem = {
            id: crypto.randomUUID(),
            type,
            resource,
            payload,
            createdAt: Date.now(),
            retryCount: 0
        };

        await enqueueMutation(item);
        this.triggerSync(); // Try to sync immediately
    }

    async triggerSync() {
        if (this.isProcessing) return;
        if (!navigator.onLine) return;

        this.isProcessing = true;
        this.notify(true);

        try {
            await this.processQueue();
        } finally {
            this.isProcessing = false;
            this.notify(false);
        }
    }

    private async processQueue() {
        const queue = await getMutationQueue();
        if (queue.length === 0) return;

        const isV2 = typeof window !== 'undefined' && process.env.NEXT_PUBLIC_ENABLE_OFFLINE_SYNC_V2 === 'true';

        // Process sequentially (FIFO)
        for (const item of queue) {
            const actionKey = `${item.resource}:${item.type}`;

            // Dynamically import ACTION_MAP to avoid circular dependencies
            const { ACTION_MAP } = await import('./sync-actions');
            const action = ACTION_MAP[actionKey];

            if (!action) {
                console.error(`[SyncEngine] No action found for ${actionKey}`);
                await removeMutation(item.id);
                continue;
            }

            try {
                console.log(`[SyncEngine] Processing ${actionKey} (${item.id})`);

                // Execute Server Action
                const result = await action(item.payload);

                if (result.success) {
                    // Success! Remove from queue
                    await removeMutation(item.id);
                    console.log(`[SyncEngine] Synced ${item.id}`);
                } else {
                    // Server returned failure
                    console.error(`[SyncEngine] Server error for ${item.id}:`, result.message);

                    if (isV2) {
                        // V2: Handle Retries
                        if (item.retryCount < 3) {
                            item.retryCount++;
                            item.error = result.message;
                            await enqueueMutation(item); // Update in DB
                            console.log(`[SyncEngine] Retrying ${item.id} (Attempt ${item.retryCount}/3)`);

                            // Exponential Backoff: 1s, 2s, 4s
                            const delay = Math.pow(2, item.retryCount) * 1000;
                            await new Promise(resolve => setTimeout(resolve, delay));
                            continue; // Try again (or move to next if we want to skip head-of-line blocking, but FIFO implies we should probably stop or retry this one)
                            // Actually, if we continue, we process the next item. But if this one failed, dependent items might fail.
                            // For V2, let's stop processing to preserve order.
                            break;
                        } else {
                            // Max retries reached
                            console.error(`[SyncEngine] Max retries reached for ${item.id}. Moving to DLQ.`);
                            await addFailedMutation(item);
                            await removeMutation(item.id);
                        }
                    } else {
                        throw new Error(result.message);
                    }
                }

            } catch (error) {
                console.error(`[SyncEngine] Network/System error for ${item.id}:`, error);

                if (isV2) {
                    if (item.retryCount < 3) {
                        item.retryCount++;
                        item.error = String(error);
                        await enqueueMutation(item);
                        break; // Stop processing on network error
                    } else {
                        await removeMutation(item.id);
                    }
                }
                break;
            }
        }
    }
}

export const syncEngine = new SyncEngine();

// Auto-start sync when coming online
if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
        console.log('[SyncEngine] Online detected, triggering sync...');
        syncEngine.triggerSync();
    });
}
