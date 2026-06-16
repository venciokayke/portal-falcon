"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createInitialAdmin } from "@/actions/system-user";
import { Shield, User, Lock, Key, Check, Loader2, AlertTriangle } from "lucide-react";

export default function SetupForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (password !== confirmPassword) {
      setError("As senhas não coincidem.");
      setIsLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.");
      setIsLoading(false);
      return;
    }

    try {
      const result = await createInitialAdmin(formData);
      if (result.success) {
        setSuccess(true);
        setTimeout(() => {
          router.push("/login");
          router.refresh();
        }, 2000);
      }
    } catch (err: any) {
      setError(err.message || "Ocorreu um erro ao criar o administrador.");
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8 shadow-2xl">
      <h2 className="text-xl font-semibold text-white mb-2">Primeiro Acesso</h2>
      <p className="text-blue-200/70 text-xs mb-6">
        Nenhum usuário cadastrado foi detectado. Configure as credenciais do Administrador Geral do Portal.
      </p>

      {error && (
        <div className="bg-red-500/20 border border-red-500/50 text-red-200 rounded-lg px-4 py-3 mb-5 text-sm flex items-center gap-2 animate-shake">
          <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {success && (
        <div className="bg-green-500/20 border border-green-500/50 text-green-200 rounded-lg px-4 py-3 mb-5 text-sm flex items-center gap-2">
          <Check className="w-4 h-4 shrink-0 text-green-400" /> Administrador configurado! Redirecionando para login...
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Nome Completo */}
        <div>
          <label className="block text-xs font-semibold text-blue-200 uppercase tracking-wider mb-1">
            Nome Completo
          </label>
          <div className="relative">
            <input
              type="text"
              name="name"
              placeholder="Ex: Administrador"
              required
              disabled={isLoading || success}
              className="w-full bg-white/10 border border-white/20 text-white placeholder-white/30 rounded-lg px-4 py-2.5 pl-10 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition disabled:opacity-50 text-sm font-medium"
            />
            <User className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>
        </div>

        {/* Usuário */}
        <div>
          <label className="block text-xs font-semibold text-blue-200 uppercase tracking-wider mb-1">
            Usuário de Acesso
          </label>
          <div className="relative">
            <input
              type="text"
              name="username"
              placeholder="Ex: admin"
              required
              disabled={isLoading || success}
              autoComplete="off"
              className="w-full bg-white/10 border border-white/20 text-white placeholder-white/30 rounded-lg px-4 py-2.5 pl-10 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition disabled:opacity-50 text-sm font-medium"
            />
            <Shield className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>
        </div>

        {/* Senha */}
        <div>
          <label className="block text-xs font-semibold text-blue-200 uppercase tracking-wider mb-1">
            Senha (Mín. 6 caracteres)
          </label>
          <div className="relative">
            <input
              type="password"
              name="password"
              placeholder="Digite uma senha segura"
              required
              disabled={isLoading || success}
              className="w-full bg-white/10 border border-white/20 text-white placeholder-white/30 rounded-lg px-4 py-2.5 pl-10 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition disabled:opacity-50 text-sm font-medium"
            />
            <Lock className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>
        </div>

        {/* Confirmar Senha */}
        <div>
          <label className="block text-xs font-semibold text-blue-200 uppercase tracking-wider mb-1">
            Confirmar Senha
          </label>
          <div className="relative">
            <input
              type="password"
              name="confirmPassword"
              placeholder="Confirme a senha"
              required
              disabled={isLoading || success}
              className="w-full bg-white/10 border border-white/20 text-white placeholder-white/30 rounded-lg px-4 py-2.5 pl-10 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition disabled:opacity-50 text-sm font-medium"
            />
            <Key className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>
        </div>

        {/* Botão de Envio */}
        <button
          type="submit"
          disabled={isLoading || success}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-semibold py-3 rounded-lg transition-all shadow-lg shadow-blue-900/40 disabled:opacity-60 mt-4 text-sm"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Configurando...
            </>
          ) : (
            <>
              <Check className="w-4 h-4" />
              Criar Administrador
            </>
          )}
        </button>
      </form>
    </div>
  );
}
