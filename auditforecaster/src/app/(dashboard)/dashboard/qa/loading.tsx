import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <Skeleton className="h-8 w-[200px]" />
                <Skeleton className="h-4 w-[300px]" />
            </div>

            <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="border rounded-lg p-6 space-y-4">
                        <div className="flex items-start justify-between">
                            <div className="space-y-2">
                                <Skeleton className="h-6 w-[250px]" />
                                <Skeleton className="h-4 w-[200px]" />
                            </div>
                            <Skeleton className="h-6 w-20" />
                        </div>
                        <div className="flex gap-2">
                            <Skeleton className="h-9 w-24" />
                            <Skeleton className="h-9 w-24" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
