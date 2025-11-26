import { mockDeep, mockReset } from 'vitest-mock-extended'
import { PrismaClient } from '@prisma/client'
import { beforeEach } from 'vitest'

export const prismaMock = mockDeep<PrismaClient>()

beforeEach(() => {
    mockReset(prismaMock)
})
