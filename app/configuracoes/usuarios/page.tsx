import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import UserTable from "./components/UserTable";
import UserFormModal from "./components/UserFormModal";
import { Users } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function UsuariosConfigPage() {
  await requireRole("ADMIN");
  const users = await prisma.systemUser.findMany({
    select: { id: true, name: true, username: true, role: true, permissions: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-gray-900">
            <Users className="h-6 w-6 text-blue-600" />
            Usuários do Sistema
          </h1>
          <p className="text-gray-500 text-sm mt-1">Gerencie as contas que podem acessar o Portal Falcon.</p>
        </div>
        <UserFormModal />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <UserTable users={users} />
      </div>
    </div>
  );
}
