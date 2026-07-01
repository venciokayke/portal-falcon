const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const prisma = new PrismaClient();

async function main() {
  const username = "admin";
  const existing = await prisma.systemUser.findUnique({ where: { username } });
  if (!existing) {
    const hashedPassword = await bcrypt.hash("password123", 10);
    await prisma.systemUser.create({
      data: {
        name: "Administrador Falcon",
        username,
        password: hashedPassword,
        role: "ADMIN"
      }
    });
    console.log("Admin user seeded successfully!");
  } else {
    console.log("Admin user already exists.");
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
