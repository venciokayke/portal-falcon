"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, Clock, Wallet, Printer,
  FileSpreadsheet, Ticket, Receipt, LogOut, Settings, Shield,
  Timer, MapPin, ChevronLeft, ChevronRight
} from "lucide-react";
import { signOut, useSession } from "next-auth/react";

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isAdmin = (session?.user as any)?.role === "ADMIN";
  const permissions = (session?.user as any)?.permissions || [];
  const mustChangePassword = (session?.user as any)?.mustChangePassword;

  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("sidebar-collapsed");
    if (stored === "true") {
      setIsCollapsed(true);
    }
  }, []);

  const toggleCollapse = (value: boolean) => {
    setIsCollapsed(value);
    localStorage.setItem("sidebar-collapsed", String(value));
  };

  if (pathname === "/login" || pathname === "/setup" || pathname === "/mudar-senha" || mustChangePassword) {
    return null;
  }

  const hasPerm = (p: string) => isAdmin || permissions.includes(p);

  const mainLinks = [
    ...(hasPerm("VIEW_DASHBOARD") ? [{ href: "/", label: "Dashboard", icon: LayoutDashboard }] : []),
    ...(hasPerm("MANAGE_EMPLOYEES") ? [{ href: "/colaboradores", label: "Colaboradores", icon: Users }] : []),
    ...(hasPerm("MANAGE_SHIFTS") ? [{ href: "/ponto", label: "Lançamento de Ponto", icon: Clock }, { href: "/horas-extras", label: "Horas Extras", icon: Timer }] : []),
    ...(hasPerm("MANAGE_PAYROLL") ? [{ href: "/folha", label: "Fechamento de Folha", icon: Wallet }] : []),
  ];

  const reportLinks = [
    ...(hasPerm("MANAGE_SHIFTS") ? [{ href: "/imprimir", label: "Folhas de Ponto", icon: Printer }] : []),
    ...(hasPerm("VIEW_REPORTS") ? [
      { href: "/relatorio-contabilidade", label: "Relatório Contabilidade", icon: FileSpreadsheet },
      { href: "/relatorio-beneficios", label: "Relatório de Benefícios", icon: Ticket },
      { href: "/gerador-recibos", label: "Gerador de Recibos", icon: Receipt }
    ] : []),
  ];

  const adminLinks = [
    ...(isAdmin ? [
      { href: "/configuracoes/usuarios", label: "Usuários do Sistema", icon: Shield },
      { href: "/configuracoes/locais", label: "Locais de Trabalho", icon: MapPin }
    ] : []),
    ...(hasPerm("VIEW_AUDIT") ? [{ href: "/configuracoes/auditoria", label: "Auditoria", icon: Shield }] : []),
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
          } ${isCollapsed ? 'justify-center px-2' : ''}`}
        title={isCollapsed ? link.label : undefined}
      >
        <Icon className={`w-5 h-5 transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
        {!isCollapsed && <span className="text-sm animate-in fade-in duration-200">{link.label}</span>}
      </Link>
    );
  };

  return (
    <aside className={`${isCollapsed ? 'w-20' : 'w-64'} h-screen bg-gray-900 text-white flex flex-col shadow-xl border-r border-gray-800 print:hidden shrink-0 transition-all duration-300 ease-in-out`}>
      <div className={`p-4 border-b border-gray-800 flex ${isCollapsed ? 'flex-col items-center gap-3' : 'items-center justify-between'}`}>
        {!isCollapsed ? (
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2 animate-in fade-in duration-200">
            <span className="bg-blue-600 text-white w-8 h-8 rounded-lg flex items-center justify-center shadow-inner shrink-0">
              F
            </span>
            <span className="text-lg">Portal Falcon</span>
          </h2>
        ) : (
          <div className="bg-blue-600 text-white w-8 h-8 rounded-lg flex items-center justify-center shadow-inner shrink-0">
            F
          </div>
        )}
        <button
          onClick={() => toggleCollapse(!isCollapsed)}
          className="text-gray-400 hover:text-white p-1.5 hover:bg-gray-800 rounded-lg transition-colors duration-200 shrink-0"
          title={isCollapsed ? "Expandir menu" : "Recolher menu"}
        >
          {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
      </div>

      <nav className="flex-1 py-6 px-4 space-y-6 overflow-y-auto custom-scrollbar">
        {/* Menu Principal */}
        <div className="space-y-1">
          {!isCollapsed && <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold px-4 mb-2">Principal</p>}
          {mainLinks.map(renderLink)}
        </div>

        {/* Relatórios */}
        <div className="space-y-1">
          {!isCollapsed && <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold px-4 mb-2">Relatórios e Folhas</p>}
          {reportLinks.map(renderLink)}
        </div>

        {/* Configurações Admin */}
        {adminLinks.length > 0 && (
          <div className="space-y-1">
            {!isCollapsed && <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold px-4 mb-2">Administração</p>}
            {adminLinks.map(renderLink)}
          </div>
        )}
      </nav>

      <div className="p-4 border-t border-gray-800 flex flex-col gap-2">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-gray-400 hover:text-white hover:bg-red-900/40 transition-all duration-200 font-medium w-full text-left group ${isCollapsed ? 'justify-center px-2' : ''}`}
          title={isCollapsed ? "Sair" : undefined}
        >
          <LogOut className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" />
          {!isCollapsed && <span className="text-sm">Sair</span>}
        </button>
        {!isCollapsed && (
          <p className="text-[10px] text-gray-600 text-center font-medium px-2 animate-in fade-in duration-200">
            © 2026 Falcon Monitoramento e Serviços LTDA.
          </p>
        )}
      </div>
    </aside>
  );
}
