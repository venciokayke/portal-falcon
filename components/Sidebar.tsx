"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, Users, Clock, Wallet, Printer, 
  FileSpreadsheet, Ticket, Receipt, LogOut, Settings, Shield 
} from "lucide-react";
import { signOut, useSession } from "next-auth/react";

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isAdmin = (session?.user as any)?.role === "ADMIN";

  const mainLinks = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/colaboradores", label: "Colaboradores", icon: Users },
    { href: "/ponto", label: "Lançamento de Ponto", icon: Clock },
    { href: "/folha", label: "Fechamento de Folha", icon: Wallet },
  ];

  const reportLinks = [
    { href: "/imprimir", label: "Folhas de Ponto", icon: Printer },
    { href: "/relatorio-contabilidade", label: "Horas Intervalares", icon: FileSpreadsheet },
    { href: "/relatorio-beneficios", label: "Relatório de Benefícios", icon: Ticket },
    { href: "/gerador-recibos", label: "Gerador de Recibos", icon: Receipt },
  ];

  const adminLinks = [
    { href: "/configuracoes/usuarios", label: "Usuários do Sistema", icon: Shield },
  ];

  const renderLink = (link: { href: string; label: string; icon: any }) => {
    const Icon = link.icon;
    const isActive = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));

    return (
      <Link
        key={link.href}
        href={link.href}
        className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 font-medium group ${isActive
          ? "bg-blue-600 text-white shadow-md shadow-blue-900/20"
          : "text-gray-400 hover:text-white hover:bg-gray-800"
          }`}
      >
        <Icon className={`w-5 h-5 transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
        <span className="text-sm">{link.label}</span>
      </Link>
    );
  };

  return (
    <aside className="w-64 h-screen bg-gray-900 text-white flex flex-col shadow-xl border-r border-gray-800 print:hidden shrink-0">
      <div className="p-6 border-b border-gray-800 flex items-center justify-center">
        <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          <span className="bg-blue-600 text-white w-8 h-8 rounded-lg flex items-center justify-center shadow-inner">
            F
          </span>
          Portal Falcon
        </h2>
      </div>

      <nav className="flex-1 py-6 px-4 space-y-6 overflow-y-auto custom-scrollbar">
        {/* Menu Principal */}
        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold px-4 mb-2">Principal</p>
          {mainLinks.map(renderLink)}
        </div>

        {/* Relatórios */}
        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold px-4 mb-2">Relatórios e Folhas</p>
          {reportLinks.map(renderLink)}
        </div>

        {/* Configurações Admin */}
        {isAdmin && (
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold px-4 mb-2">Administração</p>
            {adminLinks.map(renderLink)}
          </div>
        )}
      </nav>

      <div className="p-4 border-t border-gray-800 flex flex-col gap-2">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-gray-400 hover:text-white hover:bg-red-900/40 transition-all duration-200 font-medium w-full text-left group"
        >
          <LogOut className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" />
          <span className="text-sm">Sair</span>
        </button>
        <p className="text-[10px] text-gray-600 text-center font-medium px-2">
          © 2026 Falcon Monitoramento e Serviços LTDA.
        </p>
      </div>
    </aside>
  );
}

