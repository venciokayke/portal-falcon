"use client";

import { useState } from "react";
import { updateSystemUserPassword } from "@/actions/system-user";
import { Key, X, Loader2, AlertTriangle } from "lucide-react";

export default function PasswordChangeModal({ userId, userName }: { userId: string, userName: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    if (password !== confirmPassword) {
      setError("As senhas não coincidem.");
      setIsLoading(false);
      return;
    }

    try {
      await updateSystemUserPassword(userId, password);
      setIsOpen(false);
      setPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setError(err.message || "Erro ao alterar senha.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="text-orange-600 hover:text-orange-800 hover:bg-orange-50 p-2 rounded-lg transition-colors"
        title="Alterar Senha"
      >
        <Key className="h-5 w-5" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50/50">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Key className="h-6 w-6 text-orange-500" />
                Alterar Senha
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="bg-orange-50 text-orange-700 p-3 rounded-lg text-sm mb-4">
                Alterando a senha do usuário: <span className="font-bold">{userName}</span>
              </div>

              {error && (
                <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm border border-red-200 mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Nova Senha</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                  placeholder="••••••"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Confirmar Nova Senha</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                  placeholder="••••••"
                />
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
                  className="flex-1 px-4 py-2.5 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    "Salvar Nova Senha"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
