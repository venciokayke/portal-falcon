const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const updated = await prisma.employee.updateMany({
    where: { workSchedule: 'FIXED_180' },
    data: { workSchedule: 'FIXED_220' }
  });
  console.log(`Migrados ${updated.count} funcionários de FIXED_180 para FIXED_220.`);
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
