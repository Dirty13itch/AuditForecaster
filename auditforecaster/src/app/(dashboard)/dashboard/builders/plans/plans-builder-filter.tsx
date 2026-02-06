'use client'

import { useRouter, useSearchParams } from "next/navigation"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

interface PlansBuilderFilterProps {
    builders: { id: string; name: string }[]
    currentBuilderId: string
}

export function PlansBuilderFilter({ builders, currentBuilderId }: PlansBuilderFilterProps) {
    const router = useRouter()
    const searchParams = useSearchParams()

    function handleBuilderChange(value: string) {
        const params = new URLSearchParams(searchParams.toString())
        if (value === "all") {
            params.delete('builderId')
        } else {
            params.set('builderId', value)
        }
        // Reset to page 1 when filter changes
        params.delete('page')
        router.push(`/dashboard/builders/plans?${params.toString()}`)
    }

    return (
        <div className="flex items-center gap-3">
            <label htmlFor="builder-filter" className="text-sm font-medium text-muted-foreground">
                Filter by builder:
            </label>
            <Select
                value={currentBuilderId || "all"}
                onValueChange={handleBuilderChange}
            >
                <SelectTrigger id="builder-filter" className="w-[220px]">
                    <SelectValue placeholder="All Builders" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Builders</SelectItem>
                    {builders.map((builder) => (
                        <SelectItem key={builder.id} value={builder.id}>
                            {builder.name}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    )
}
