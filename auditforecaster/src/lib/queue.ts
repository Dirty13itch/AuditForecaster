import { Queue, Worker, ConnectionOptions } from 'bullmq';
// import IORedis from 'ioredis';

const connectionOptions: ConnectionOptions = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
};

// Singleton to prevent multiple connections in dev/serverless
class QueueFactory {
    private static queues: Record<string, Queue> = {};
    private static workers: Record<string, Worker> = {};

    static getQueue(name: string): Queue {
        if (!this.queues[name]) {
            this.queues[name] = new Queue(name, { connection: connectionOptions });
        }
        return this.queues[name];
    }

    static createWorker(name: string, processor: (job: unknown) => Promise<unknown>): Worker {
        if (!this.workers[name]) {
            this.workers[name] = new Worker(name, processor, {
                connection: connectionOptions,
                concurrency: 5 // Process 5 sync jobs concurrently
            });
        }
        return this.workers[name];
    }
}

export const syncQueue = QueueFactory.getQueue('sync-queue');
export const reportQueue = QueueFactory.getQueue('report-queue');
export const QueueConnection = connectionOptions;
