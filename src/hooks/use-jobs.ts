import { useQuery } from '@tanstack/react-query';
import { db, LocalJob } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';

// Mock server fetch
async function fetchJobsFromServer(): Promise<LocalJob[]> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    return [
        { id: '1', address: '123 Main St', status: 'PENDING', scheduledDate: '2023-10-27', inspectorId: '1', builderName: 'M/I Homes', syncStatus: 'synced' },
        { id: '2', address: '456 Oak Ave', status: 'ASSIGNED', scheduledDate: '2023-10-28', inspectorId: '1', builderName: 'Lennar', syncStatus: 'synced' },
        { id: '3', address: '789 Pine Ln', status: 'COMPLETED', scheduledDate: '2023-10-26', inspectorId: '1', builderName: 'DR Horton', syncStatus: 'synced' },
    ];
}

export function useJobs() {
    // Query for server data
    const { data: serverJobs, isFetching } = useQuery({
        queryKey: ['jobs'],
        queryFn: fetchJobsFromServer,
    });

    // Sync server data to local DB
    if (serverJobs) {
        db.jobs.bulkPut(serverJobs);
    }

    // Live query from local DB
    const jobs = useLiveQuery(() => db.jobs.toArray());

    return {
        jobs,
        isLoading: !jobs && isFetching,
    };
}
