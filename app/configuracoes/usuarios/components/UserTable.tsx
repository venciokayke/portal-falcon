"use client";

import { useTransition } from "react";
import { deleteSystemUser } from "@/actions/system-user";
import { Trash2, ShieldCheck, Shield, User } from "lucide-react";
import PasswordChangeModal from "./PasswordChangeModal";

const ROLE_CONFIG: Record<string, { label: string; class: string; icon: any }> = {
  ADMIN:   { label: "Admin",   class: "bg-purple-100 text-purple-700 border-purple-200", icon: ShieldCheck },
  MANAGER: { label: "Gerente", class: "bg-blue-100 text-blue-700 border-blue-200",       icon: Shield },
  USER:    { label: "Operacional", class: "bg-gray-100 text-gray-600 border-gray-200",   icon: User },
};

export default function UserTable({ users }: { users: any[] }) {
  const [isPending, startTransition] = useTransition();

  function handleDelete(id: string, name: string) {
    if (confirm(`⚠️ Deseja realmente excluir o usuário "${name}"?\nEsta ação não pode ser desfeita.`)) {
      startTransition(() => {
        deleteSystemUser(id);
      });
    }
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead className="bg-gray-50 border-b border-gray-200 text-gray-700">
          <tr>
            <th className="px-6 py-4 font-semibold">Nome</th>
            <th className="px-6 py-4 font-semibold">Usuário</th>
            <th className="px-6 py-4 font-semibold">Cargo</th>
            <th className="px-6 py-4 font-semibold text-right">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {users.map((user) => (
            <tr key={user.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-6 py-4 font-medium text-gray-900">
                {user.name}
              </td>
              <td className="px-6 py-4 text-gray-600 font-mono text-sm">{user.username}</td>
              <td className="px-6 py-4">
                {(() => {
                  const cfg = ROLE_CONFIG[user.role] ?? ROLE_CONFIG.USER;
                  const Icon = cfg.icon;
                  return (
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.class}`}>
                      <Icon className="h-3.5 w-3.5" />
                      {cfg.label}
                    </span>
                  );
                })()}
              </td>
              <td className="px-6 py-4 text-right">
                <div className="flex items-center justify-end gap-2">
                  <PasswordChangeModal userId={user.id} userName={user.name} />
                  <button
                    onClick={() => handleDelete(user.id, user.name)}
                    disabled={isPending}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-colors disabled:opacity-50"
                    title="Excluir Usuário"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
