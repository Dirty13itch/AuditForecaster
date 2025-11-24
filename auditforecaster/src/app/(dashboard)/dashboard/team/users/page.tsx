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

export default async function UsersPage() {
    const users = await prisma.user.findMany({
        include: {
            _count: {
                select: {
                    jobs: true
                }
            }
        },
        orderBy: { name: 'asc' }
    })

    const getRoleBadge = (role: string) => {
        const colors = {
            ADMIN: 'bg-purple-100 text-purple-800',
            INSPECTOR: 'bg-blue-100 text-blue-800',
            QA: 'bg-green-100 text-green-800',
        }
        return colors[role as keyof typeof colors] || 'bg-gray-100 text-gray-800'
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Manage user accounts and permissions
                    </p>
                </div>
                <Dialog>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Add User
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle>Add New User</DialogTitle>
                            <DialogDescription>
                                Create a new user account. They will use their email to log in.
                            </DialogDescription>
                        </DialogHeader>
                        <UserForm onSuccess={() => { }} />
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid gap-4">
                {users.map((user) => (
                    <Card key={user.id}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg">
                                    {user.name?.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <CardTitle className="text-base">{user.name}</CardTitle>
                                    <p className="text-sm text-gray-500">{user.email}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <Badge className={getRoleBadge(user.role)}>
                                    {user.role}
                                </Badge>
                                <Dialog>
                                    <DialogTrigger asChild>
                                        <Button variant="outline" size="sm">
                                            <Pencil className="mr-2 h-3 w-3" />
                                            Edit
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="sm:max-w-[500px]">
                                        <DialogHeader>
                                            <DialogTitle>Edit User</DialogTitle>
                                        </DialogHeader>
                                        <UserForm user={user} onSuccess={() => { }} />
                                    </DialogContent>
                                </Dialog>
                                <DeleteUserButton id={user.id} />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-3 gap-4 text-sm">
                                <div>
                                    <p className="text-gray-500">Assigned Jobs</p>
                                    <p className="font-medium text-lg">{user._count.jobs}</p>
                                </div>
                                <div>
                                    <p className="text-gray-500">Role</p>
                                    <p className="font-medium text-lg capitalize">{user.role.toLowerCase()}</p>
                                </div>
                                <div>
                                    <p className="text-gray-500">Status</p>
                                    <p className="font-medium text-green-600">Active</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}
