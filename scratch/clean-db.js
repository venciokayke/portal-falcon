const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando limpeza total do banco de dados...');

  // Deleta dependências primeiro
  const delShifts = await prisma.shift.deleteMany();
  console.log(`Apagados ${delShifts.count} turnos.`);

  const delReceipts = await prisma.payrollReceipt.deleteMany();
  console.log(`Apagados ${delReceipts.count} recibos.`);

  // Deleta a tabela principal
  const delEmp = await prisma.employee.deleteMany();
  console.log(`Apagados ${delEmp.count} colaboradores.`);

  console.log('Limpeza concluída!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
