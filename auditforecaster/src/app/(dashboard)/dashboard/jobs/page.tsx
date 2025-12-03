import { prisma } from "@/lib/prisma"
import { JobBoard } from "@/components/jobs/job-board"
import { JobDialog } from "@/components/jobs/job-dialog"

import { auth } from "@/auth"
import { redirect } from "next/navigation"

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')

  const query = (await searchParams).q || ""
  const status = (await searchParams).status || "ALL"

  const where: Record<string, unknown> = {}

  // Multi-Tenancy: Filter by Role
  if (session.user.role === 'BUILDER' && session.user.builderId) {
    where.builderId = session.user.builderId
  } else if (session.user.role === 'INSPECTOR') {
    where.inspectorId = session.user.id
  }

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
      inspector: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          role: true,
        }
      }
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  const builders = await prisma.builder.findMany()
  const inspectors = await prisma.user.findMany({
    where: { role: 'INSPECTOR' },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
    }
  })

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Jobs</h1>
          <p className="text-gray-500">Manage inspection jobs and assignments.</p>
        </div>
        <JobDialog builders={builders} inspectors={inspectors} />
      </div>

      <JobBoard jobs={jobs} />
    </div>
  )
}
