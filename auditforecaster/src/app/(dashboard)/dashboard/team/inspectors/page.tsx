import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, Pencil } from "lucide-react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { UserForm } from "@/components/user-form"
import { DeleteUserButton } from "@/components/delete-user-button"

export default async function InspectorsPage() {
    const inspectors = await prisma.user.findMany({
        where: {
            role: 'INSPECTOR'
        },
        include: {
            _count: {
                select: {
                    jobs: true
                }
            }
        },
        orderBy: { name: 'asc' }
    })

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Inspectors</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Manage field inspection team
                    </p>
                </div>
                <Dialog>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Add Inspector
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle>Add New Inspector</DialogTitle>
                            <DialogDescription>
                                Create a new inspector account.
                            </DialogDescription>
                        </DialogHeader>
                        <UserForm onSuccess={() => { }} defaultRole="INSPECTOR" />
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {inspectors.length === 0 ? (
                    <div className="col-span-full text-center py-12 text-gray-500">
                        No inspectors found. Add one to get started.
                    </div>
                ) : (
                    inspectors.map((user) => (
                        <Card key={user.id}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <div className="flex items-center gap-4">
                                    <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg">
                                        {user.name?.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <CardTitle className="text-base">{user.name}</CardTitle>
                                        <p className="text-sm text-gray-500">{user.email}</p>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="mt-4 space-y-3">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">Status</span>
                                        <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                                            Active
                                        </Badge>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">Assigned Jobs</span>
                                        <span className="font-medium">{user._count.jobs}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">Certifications</span>
                                        <span className="font-medium text-gray-400 italic">None recorded</span>
                                    </div>

                                    <div className="pt-4 flex gap-2">
                                        <Dialog>
                                            <DialogTrigger asChild>
                                                <Button variant="outline" size="sm" className="w-full">
                                                    <Pencil className="mr-2 h-3 w-3" /> Edit
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent className="sm:max-w-[500px]">
                                                <DialogHeader>
                                                    <DialogTitle>Edit Inspector</DialogTitle>
                                                </DialogHeader>
                                                <UserForm user={user} onSuccess={() => { }} />
                                            </DialogContent>
                                        </Dialog>
                                        <DeleteUserButton id={user.id} />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    )
}
