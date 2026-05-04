import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import UserTable from "./components/UserTable";
import UserFormModal from "./components/UserFormModal";
import { ShieldAlert, Users } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function UsuariosConfigPage() {
  const session = await getServerSession(authOptions);

  // Verificação de segurança: apenas ADMIN pode acessar
  if (!session || (session.user as any).role !== "ADMIN") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
        <div className="bg-red-100 p-4 rounded-full mb-4">
          <ShieldAlert className="h-12 w-12 text-red-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Acesso Negado</h1>
        <p className="text-gray-500 mt-2 max-w-md">
          Você não tem permissão para acessar as configurações de usuários.
          Entre em contato com um administrador se acreditar que isso é um erro.
        </p>
      </div>
    );
  }

  const users = await prisma.systemUser.findMany({
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
