'use server'

import { claimTask as claimTaskLib, releaseTask as releaseTaskLib } from "@/lib/task-claiming"
import type { ClaimTaskResult } from "@/lib/task-claiming"
import { auth } from "@/auth"

export async function claimTaskAction(taskId: string): Promise<ClaimTaskResult> {
    const session = await auth()
    if (!session?.user?.id) return { success: false, message: "Unauthorized" }

    const role = (session.user as any).role
    if (role !== 'ADMIN' && role !== 'INSPECTOR') {
        return { success: false, message: "Unauthorized: Insufficient permissions" }
    }

    return await claimTaskLib(taskId, session.user.id)
}

export async function releaseTaskAction(taskId: string) {
    const session = await auth()
    if (!session?.user?.id) return { success: false, message: "Unauthorized" }

    const role = (session.user as any).role
    if (role !== 'ADMIN' && role !== 'INSPECTOR') {
        return { success: false, message: "Unauthorized: Insufficient permissions" }
    }

    await releaseTaskLib(taskId, session.user.id)
    return { success: true }
}
