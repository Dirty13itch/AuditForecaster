import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="space-y-2">
                    <Skeleton className="h-8 w-[200px]" />
                    <Skeleton className="h-4 w-[300px]" />
                </div>
                <Skeleton className="h-10 w-[150px]" />
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="border rounded-lg p-6 space-y-4">
                        <Skeleton className="h-6 w-[180px]" />
                        <Skeleton className="h-4 w-[120px]" />
                        <Skeleton className="h-4 w-[100px]" />
                        <div className="flex gap-2 pt-2">
                            <Skeleton className="h-9 w-20" />
                            <Skeleton className="h-9 w-20" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
