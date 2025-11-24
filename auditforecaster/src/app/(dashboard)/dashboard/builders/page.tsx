import { prisma } from "@/lib/prisma"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { PlusCircle, Building, Pencil } from "lucide-react"
import Link from "next/link"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { BuilderForm } from "@/components/builder-form"
import { DeleteBuilderButton } from "@/components/delete-builder-button"

export default async function BuildersPage() {
  const builders = await prisma.builder.findMany({
    orderBy: {
      name: 'asc',
    },
    include: {
      _count: {
        select: { jobs: true }
      }
    }
  })

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Builders</h1>
          <p className="text-gray-500">Manage builder partnerships</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Builder
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Add New Builder</DialogTitle>
              <DialogDescription>
                Create a new builder partnership.
              </DialogDescription>
            </DialogHeader>
            <BuilderForm onSuccess={() => { }} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Builders List */}
        <div className="md:col-span-3 space-y-4">
          {builders.map((builder) => (
            <Card key={builder.id}>
              <CardContent className="p-6 flex justify-between items-center">
                <div className="flex items-center space-x-4">
                  <div className="h-12 w-12 bg-gray-100 rounded-full flex items-center justify-center">
                    <Building className="h-6 w-6 text-gray-500" />
                  </div>
                  <div>
                    <Link href={`/dashboard/builders/${builder.id}`} className="hover:underline">
                      <h3 className="font-semibold text-lg">{builder.name}</h3>
                    </Link>
                    <div className="text-sm text-gray-500">
                      {builder.email || 'No email'} • {builder.phone || 'No phone'}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {builder.address}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right mr-4">
                    <div className="text-2xl font-bold">{builder._count.jobs}</div>
                    <div className="text-xs text-gray-500">Total Jobs</div>
                  </div>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Pencil className="mr-2 h-3 w-3" />
                        Edit
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                      <DialogHeader>
                        <DialogTitle>Edit Builder</DialogTitle>
                      </DialogHeader>
                      <BuilderForm builder={builder} onSuccess={() => { }} />
                    </DialogContent>
                  </Dialog>
                  <DeleteBuilderButton id={builder.id} />
                </div>
              </CardContent>
            </Card>
          ))}
          {builders.length === 0 && (
            <div className="text-center py-12 text-gray-500 bg-white rounded-lg border border-dashed">
              No builders found. Add one to get started.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
