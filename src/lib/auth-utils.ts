import { auth } from "@/auth"
import { Role } from "@prisma/client"

export async function checkRole(role: Role) {
    const session = await auth()
    return session?.user?.role === role
}

export async function getCurrentUser() {
    const session = await auth()
    return session?.user
}
