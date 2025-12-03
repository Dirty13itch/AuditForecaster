
'use client'

import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useRouter, useSearchParams } from "next/navigation"
import { useCallback, useEffect, useState } from "react"
import { useDebounce } from "use-debounce"

export function JobFilters() {
    const router = useRouter()
    const searchParams = useSearchParams()

    const [query, setQuery] = useState(searchParams.get('q') || '')
    const [status, setStatus] = useState(searchParams.get('status') || 'ALL')

    const [debouncedQuery] = useDebounce(query, 500)

    const createQueryString = useCallback(
        (name: string, value: string) => {
            const params = new URLSearchParams(searchParams.toString())
            if (value && value !== 'ALL') {
                params.set(name, value)
            } else {
                params.delete(name)
            }
            return params.toString()
        },
        [searchParams]
    )

    useEffect(() => {
        const params = new URLSearchParams(searchParams.toString())
        if (debouncedQuery) {
            params.set('q', debouncedQuery)
        } else {
            params.delete('q')
        }

        if (status && status !== 'ALL') {
            params.set('status', status)
        } else {
            params.delete('status')
        }

        router.push(`?${params.toString()}`)
    }, [debouncedQuery, status, router, searchParams])

    return (
        <div className="flex gap-4 mb-6">
            <div className="flex-1 max-w-sm">
                <Input
                    placeholder="Search jobs..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                />
            </div>
            <div className="w-[200px]">
                <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger>
                        <SelectValue placeholder="Filter by Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">All Statuses</SelectItem>
                        <SelectItem value="PENDING">Pending</SelectItem>
                        <SelectItem value="ASSIGNED">Assigned</SelectItem>
                        <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                        <SelectItem value="COMPLETED">Completed</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>
    )
}
