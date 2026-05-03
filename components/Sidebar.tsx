"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Clock, Wallet, Printer, FileSpreadsheet, Ticket } from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();

  const links = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/colaboradores", label: "Colaboradores", icon: Users },
    { href: "/ponto", label: "Lançamento de Ponto", icon: Clock },
    { href: "/folha", label: "Fechamento de Folha", icon: Wallet },
    { href: "/imprimir", label: "Relatórios", icon: Printer },
    { href: "/relatorio-contabilidade", label: "Horas Intervalares", icon: FileSpreadsheet },
    { href: "/relatorio-beneficios", label: "Relatório de Benefícios", icon: Ticket },
  ];

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

      <nav className="flex-1 py-6 px-4 space-y-2 overflow-y-auto">
        {links.map((link) => {
          const Icon = link.icon;
          // Regra inteligente para manter o menu aceso quando estiver nas subpáginas (ex: /ponto/[id])
          const isActive = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));

          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium group ${isActive
                ? "bg-blue-600 text-white shadow-md shadow-blue-900/20"
                : "text-gray-400 hover:text-white hover:bg-gray-800"
                }`}
            >
              <Icon className={`w-5 h-5 transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-6 border-t border-gray-800 text-xs text-gray-500 text-center font-medium">
        © 2026 Falcon Monitoramento e Serviços LTDA.
      </div>
    </aside>
  );
}
