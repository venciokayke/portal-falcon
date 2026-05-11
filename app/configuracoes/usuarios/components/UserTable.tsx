"use client";

import { useTransition } from "react";
import { deleteSystemUser } from "@/actions/system-user";
import { Trash2, ShieldCheck, Shield, User } from "lucide-react";
import PasswordChangeModal from "./PasswordChangeModal";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { useState } from "react";

const ROLE_CONFIG: Record<string, { label: string; class: string; icon: any }> = {
  ADMIN:   { label: "Admin",   class: "bg-purple-100 text-purple-700 border-purple-200", icon: ShieldCheck },
  MANAGER: { label: "Gerente", class: "bg-blue-100 text-blue-700 border-blue-200",       icon: Shield },
  USER:    { label: "Operacional", class: "bg-gray-100 text-gray-600 border-gray-200",   icon: User },
};

export default function UserTable({ users }: { users: any[] }) {
  const [isPending, startTransition] = useTransition();

  const [confirmModal, setConfirmModal] = useState<{isOpen: boolean; userId: string; userName: string}>({isOpen: false, userId: "", userName: ""});

  function handleDeleteRequest(id: string, name: string) {
    setConfirmModal({ isOpen: true, userId: id, userName: name });
  }

  function handleConfirmDelete() {
    startTransition(() => {
      deleteSystemUser(confirmModal.userId);
    });
  }

  return (
    <div className="overflow-x-auto">
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={handleConfirmDelete}
        title="Excluir Usuário"
        message={`Deseja realmente excluir o usuário "${confirmModal.userName}"?\nEsta ação não pode ser desfeita.`}
      />
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
                    onClick={() => handleDeleteRequest(user.id, user.name)}
                    disabled={isPending}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Excluir"
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
