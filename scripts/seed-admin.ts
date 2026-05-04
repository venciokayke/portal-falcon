// Script de seed: cria o usuário admin inicial
// Execute com: node --require ts-node/register scripts/seed-admin.ts
// OU se quiser rodar via tsx: npx tsx scripts/seed-admin.ts

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const name = "Administrador";
  const username = "admin";
  const plainPassword = "falcon@2026"; // Troque para a senha desejada!

  const hashedPassword = await bcrypt.hash(plainPassword, 10);

  const existing = await prisma.systemUser.findUnique({ where: { username } });

  if (existing) {
    console.log(`✅ Usuário "${username}" já existe. Nenhuma ação necessária.`);
    return;
  }

  const user = await prisma.systemUser.create({
    data: {
      name,
      username,
      password: hashedPassword,
      role: "ADMIN",
    },
  });

  console.log(`🎉 Usuário admin criado com sucesso!`);
  console.log(`   Usuário: ${user.username}`);
  console.log(`   Senha:   ${plainPassword}`);
  console.log(`   ⚠️  Guarde essas credenciais em local seguro!`);
}

main()
  .catch((e) => {
    console.error("Erro ao criar usuário:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
