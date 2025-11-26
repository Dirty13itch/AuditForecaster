
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    const password = 'password123'
    const hashedPassword = await bcrypt.hash(password, 10)

    await prisma.user.update({
        where: { email: 'admin@ulrich.com' },
        data: { passwordHash: hashedPassword }
    })

    console.log('Password updated for admin@ulrich.com')
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
