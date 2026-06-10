"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { Shield, KeyRound, Loader2, Eye, EyeOff, AlertTriangle, CheckCircle2 } from "lucide-react";
import { forceChangeUserPassword } from "@/actions/system-user";

export default function MudarSenhaPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccess("");

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

    if (password === "Mudar@123") {
      setError("Você não pode utilizar a senha provisória padrão.");
      setIsLoading(false);
      return;
    }

    try {
      const res = await forceChangeUserPassword(password, confirmPassword);
      if (res.success) {
        setSuccess("Senha alterada com sucesso! Desconectando em instantes...");
        // Aguarda 2 segundos para o usuário ler o feedback positivo e então desloga
        setTimeout(() => {
          signOut({ callbackUrl: "/login" });
        }, 2000);
      }
    } catch (err: any) {
      setError(err.message || "Ocorreu um erro ao redefinir sua senha.");
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-gradient-to-br from-gray-900 via-blue-950 to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md my-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-600 rounded-2xl shadow-lg shadow-orange-950/50 mb-4">
            <KeyRound className="w-8 h-8 text-white animate-pulse" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Alteração Obrigatória</h1>
          <p className="text-orange-300 mt-1 text-sm font-semibold uppercase tracking-wider">
            Troca de Senha Exigida
          </p>
        </div>

        {/* Card */}
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8 shadow-2xl">
          <p className="text-sm text-gray-300 mb-6 text-center">
            Sua conta está usando uma senha provisória definida pelo administrador. Para continuar acessando o sistema, por favor defina uma nova senha forte.
          </p>

          {error && (
            <div className="bg-red-500/20 border border-red-500/50 text-red-200 rounded-lg px-4 py-3 mb-5 text-sm flex items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" /> {error}
            </div>
          )}

          {success && (
            <div className="bg-green-500/20 border border-green-500/50 text-green-200 rounded-lg px-4 py-3 mb-5 text-sm flex items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-green-400 animate-bounce" /> {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-blue-200 mb-1.5">Nova Senha</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  disabled={isLoading || !!success}
                  className="w-full bg-white/10 border border-white/20 text-white placeholder-white/30 rounded-lg px-4 py-2.5 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading || !!success}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80 transition disabled:opacity-50"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-blue-200 mb-1.5">Confirmar Nova Senha</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  disabled={isLoading || !!success}
                  className="w-full bg-white/10 border border-white/20 text-white placeholder-white/30 rounded-lg px-4 py-2.5 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={isLoading || !!success}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80 transition disabled:opacity-50"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !!success}
              className="w-full flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-500 disabled:bg-orange-800 text-white font-semibold py-3 rounded-lg transition-all shadow-lg shadow-orange-950/40 disabled:opacity-60 mt-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Salvando nova senha...
                </>
              ) : (
                <>
                  <KeyRound className="w-5 h-5" />
                  Salvar Nova Senha
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-white/20 text-xs mt-6">
          © 2026 Falcon Monitoramento e Serviços LTDA.
        </p>
      </div>
    </div>
  );
}
