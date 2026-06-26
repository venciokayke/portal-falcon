"use client";

import { useState } from "react";
import { createSystemUser, updateSystemUser } from "@/actions/system-user";
import { UserPlus, Pencil, X, Loader2, AlertTriangle } from "lucide-react";
import { AlertModal } from "@/components/ui/AlertModal";

export default function UserFormModal({
  user,
  trigger,
}: {
  user?: any;
  trigger?: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [alertModal, setAlertModal] = useState<{ isOpen: boolean; title: string; message: string }>({ isOpen: false, title: "", message: "" });

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (!user || password || confirmPassword) {
      if (password !== confirmPassword) {
        setAlertModal({ isOpen: true, title: "Atenção", message: "As senhas não coincidem." });
        setIsLoading(false);
        return;
      }
      if (password && password.length < 6) {
        setAlertModal({ isOpen: true, title: "Atenção", message: "A senha deve ter pelo menos 6 caracteres." });
        setIsLoading(false);
        return;
      }
    }

    try {
      if (user) {
        await updateSystemUser(user.id, formData);
      } else {
        await createSystemUser(formData);
      }
      setIsOpen(false);
    } catch (err: any) {
      setAlertModal({ isOpen: true, title: "Erro ao salvar", message: err.message || (user ? "Erro ao editar usuário." : "Erro ao criar usuário.") });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <div onClick={() => setIsOpen(true)} className="inline-block cursor-pointer">
        {trigger || (
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors font-medium shadow-sm">
            <UserPlus className="h-5 w-5" />
            Novo Usuário
          </button>
        )}
      </div>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4 text-left">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50/50">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                {user ? (
                  <>
                    <Pencil className="h-6 w-6 text-blue-600" />
                    Editar Usuário do Sistema
                  </>
                ) : (
                  <>
                    <UserPlus className="h-6 w-6 text-blue-600" />
                    Novo Usuário do Sistema
                  </>
                )}
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Nome Completo</label>
                <input
                  name="name"
                  type="text"
                  required
                  defaultValue={user?.name || ""}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  placeholder="Ex: João Silva"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Usuário (Username)</label>
                <input
                  name="username"
                  type="text"
                  required
                  defaultValue={user?.username || ""}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  placeholder="Ex: joao.silva"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Senha {user && "(opcional)"}
                  </label>
                  <input
                    name="password"
                    type="password"
                    required={!user}
                    minLength={6}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    placeholder="••••••"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Confirmar Senha {user && "(opcional)"}
                  </label>
                  <input
                    name="confirmPassword"
                    type="password"
                    required={!user}
                    minLength={6}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    placeholder="••••••"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Nível de Acesso</label>
                <select
                  name="role"
                  defaultValue={user?.role || "USER"}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white transition-all"
                >
                  <option value="USER">USER — Operacional / DP</option>
                  <option value="MANAGER">MANAGER — Gerência / Proprietário</option>
                  <option value="ADMIN">ADMIN — Acesso Total</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Permissões Adicionais</label>
                <div className="space-y-2 bg-white border border-gray-200 p-3 rounded-lg max-h-[260px] overflow-y-auto scrollbar-thin">
                  {[
                    { value: "VIEW_DASHBOARD", label: "Acessar Dashboard", desc: "Ver indicadores e resumos na página inicial" },
                    { value: "MANAGE_EMPLOYEES", label: "Gerenciar Colaboradores", desc: "Cadastrar, editar e arquivar funcionários" },
                    { value: "MANAGE_SHIFTS", label: "Lançar / Editar Ponto", desc: "Registrar turnos, observações e paridades" },
                    { value: "MANAGE_PAYROLL", label: "Gerenciar Folha e Pagamentos", desc: "Fechar folhas e registrar pagamentos" },
                    { value: "VIEW_REPORTS", label: "Acessar Relatórios", desc: "Visualizar relatórios contábeis e de benefícios" },
                    { value: "VIEW_AUDIT", label: "Visualizar Auditoria", desc: "Consultar histórico de ações administrativas" },
                  ].map((perm) => (
                    <label
                      key={perm.value}
                      className="flex items-start gap-3 p-2.5 bg-gray-50 border border-gray-150 rounded-lg cursor-pointer hover:bg-blue-50/40 hover:border-blue-200 transition-colors select-none"
                    >
                      <input
                        type="checkbox"
                        name="permissions"
                        value={perm.value}
                        defaultChecked={user?.permissions?.includes(perm.value)}
                        className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4 mt-0.5 border-gray-300 transition-colors"
                      />
                      <div className="flex flex-col leading-tight">
                        <span className="text-sm font-semibold text-gray-800">{perm.label}</span>
                        <span className="text-xs text-gray-500 mt-0.5">{perm.desc}</span>
                      </div>
                    </label>
                  ))}
                </div>
                <p className="text-[11px] text-gray-500 mt-2 leading-relaxed">
                  Usuários <strong className="text-gray-700">ADMIN</strong> já possuem todas as permissões. Use esta seção para modular o acesso de usuários <strong className="text-gray-700">USER</strong> ou <strong className="text-gray-700">MANAGER</strong>.
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      {user ? "Salvando..." : "Criando..."}
                    </>
                  ) : (
                    user ? "Salvar Alterações" : "Criar Usuário"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal(prev => ({ ...prev, isOpen: false }))}
        title={alertModal.title}
        message={alertModal.message}
        type="error"
      />
    </>
  );
}
