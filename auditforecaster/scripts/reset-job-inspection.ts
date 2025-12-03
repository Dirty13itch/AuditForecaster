
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const jobId = 'cmipl4vhw0001108omixo0z81'
  
  const deleted = await prisma.inspection.deleteMany({
    where: { jobId }
  })

  console.log(`DELETED_INSPECTIONS_COUNT: ${deleted.count}`)
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
