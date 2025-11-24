import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="space-y-2">
                    <Skeleton className="h-8 w-[200px]" />
                    <Skeleton className="h-4 w-[300px]" />
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 9 }).map((_, i) => (
                    <div key={i} className="border rounded-lg p-6 space-y-3">
                        <div className="flex items-center gap-3">
                            <Skeleton className="h-12 w-12 rounded" />
                            <div className="space-y-2 flex-1">
                                <Skeleton className="h-5 w-[150px]" />
                                <Skeleton className="h-4 w-[100px]" />
                            </div>
                        </div>
                        <Skeleton className="h-9 w-full" />
                    </div>
                ))}
            </div>
        </div>
    )
}
