import { hasNoSystemUsers } from "@/actions/system-user";
import { redirect } from "next/navigation";
import SetupForm from "./components/SetupForm";
import { Shield } from "lucide-react";

export default async function SetupPage() {
  const isFirstRun = await hasNoSystemUsers();
  if (!isFirstRun) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-950 to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo / Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-600 rounded-2xl shadow-lg shadow-blue-900/50 mb-3 animate-pulse">
            <Shield className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Portal Falcon</h1>
          <p className="text-blue-300 text-xs mt-0.5">Configuração Inicial do Sistema</p>
        </div>

        {/* Formulário Cliente */}
        <SetupForm />

        <p className="text-center text-white/20 text-[10px] mt-6">
          © 2026 Falcon Monitoramento e Serviços LTDA.
        </p>
      </div>
    </div>
  );
}
