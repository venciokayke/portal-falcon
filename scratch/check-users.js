const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.systemUser.findMany();
  console.log("Registered Users:", users.map(u => ({ id: u.id, name: u.name, username: u.username, role: u.role })));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
