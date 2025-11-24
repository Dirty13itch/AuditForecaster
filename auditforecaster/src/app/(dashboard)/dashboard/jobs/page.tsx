import { prisma } from "@/lib/prisma"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PlusCircle, Search } from "lucide-react"
import { redirect } from "next/navigation"
import { CreateJobForm } from "@/components/create-job-form"
import { JobsView } from "@/components/jobs-view"

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>
}) {
  const query = (await searchParams).q || ""
  const status = (await searchParams).status || "ALL"

  const where: Record<string, unknown> = {}

  if (query) {
    where.OR = [
      { streetAddress: { contains: query, mode: 'insensitive' } },
      { city: { contains: query, mode: 'insensitive' } },
      { builder: { name: { contains: query, mode: 'insensitive' } } },
    ]
  }

  if (status && status !== 'ALL') {
    where.status = status
  }

  const jobs = await prisma.job.findMany({
    where,
    include: {
      builder: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  const builders = await prisma.builder.findMany()
  const inspectors = await prisma.user.findMany({
    where: { role: 'INSPECTOR' }
  })

  async function searchAction(formData: FormData) {
    'use server'
    const q = formData.get('q')
    const status = formData.get('status')
    const params = new URLSearchParams()
    if (q) params.set('q', q as string)
    if (status && status !== 'ALL') params.set('status', status as string)
    redirect(`/dashboard/jobs?${params.toString()}`)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Jobs</h1>
          <p className="text-gray-500">Manage inspection jobs</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Column: Filters & Create Job */}
        <div className="space-y-6">
          {/* Search & Filter */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Search & Filter</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={searchAction} className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                  <Input name="q" placeholder="Search address or builder..." className="pl-8" defaultValue={query} />
                </div>
                <Select name="status" defaultValue={status}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Statuses</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="ASSIGNED">Assigned</SelectItem>
                    <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                    <SelectItem value="REVIEWED">Reviewed</SelectItem>
                    <SelectItem value="INVOICED">Invoiced</SelectItem>
                  </SelectContent>
                </Select>
                <Button type="submit" variant="secondary" className="w-full">Apply Filters</Button>
              </form>
            </CardContent>
          </Card>

          {/* Create Job Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <PlusCircle className="h-5 w-5" />
                <span>New Job</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CreateJobForm builders={builders} inspectors={inspectors} />
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Jobs List */}
        <div className="md:col-span-2">
          <JobsView jobs={jobs} />
        </div>
      </div>
    </div>
  )
}
