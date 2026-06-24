const fs = require('fs');
const path = require('path');

const targetPath = path.join('c:', 'Users', 'klgam', 'OneDrive', 'Documentos', 'Programacao', 'portal-falcon', 'components', 'Sidebar.tsx');
let content = fs.readFileSync(targetPath, 'utf8');

const replacement = `  const isAdmin = (session?.user as any)?.role === "ADMIN";
  const permissions = (session?.user as any)?.permissions || [];
  const mustChangePassword = (session?.user as any)?.mustChangePassword;

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
    ...(isAdmin ? [{ href: "/configuracoes/usuarios", label: "Usuários do Sistema", icon: Shield }] : []),
    ...(hasPerm("VIEW_AUDIT") ? [{ href: "/configuracoes/auditoria", label: "Auditoria", icon: Shield }] : []),
  ];`;

content = content.replace(
  `  const isAdmin = (session?.user as any)?.role === "ADMIN";
  const mustChangePassword = (session?.user as any)?.mustChangePassword;

  if (pathname === "/login" || pathname === "/setup" || pathname === "/mudar-senha" || mustChangePassword) {
    return null;
  }

  const mainLinks = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/colaboradores", label: "Colaboradores", icon: Users },
    { href: "/ponto", label: "Lançamento de Ponto", icon: Clock },
    { href: "/horas-extras", label: "Horas Extras", icon: Timer },
    { href: "/folha", label: "Fechamento de Folha", icon: Wallet },
  ];

  const reportLinks = [
    { href: "/imprimir", label: "Folhas de Ponto", icon: Printer },
    { href: "/relatorio-contabilidade", label: "Relatório Contabilidade", icon: FileSpreadsheet },
    { href: "/relatorio-beneficios", label: "Relatório de Benefícios", icon: Ticket },
    { href: "/gerador-recibos", label: "Gerador de Recibos", icon: Receipt },
  ];

  const adminLinks = [
    { href: "/configuracoes/usuarios", label: "Usuários do Sistema", icon: Shield },
  ];`,
  replacement
);

content = content.replace(
  `        {/* Configurações Admin */}\n        {isAdmin && (\n          <div className="space-y-1">\n            <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold px-4 mb-2">Administração</p>\n            {adminLinks.map(renderLink)}\n          </div>\n        )}`,
  `        {/* Configurações Admin */}\n        {adminLinks.length > 0 && (\n          <div className="space-y-1">\n            <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold px-4 mb-2">Administração</p>\n            {adminLinks.map(renderLink)}\n          </div>\n        )}`
);

fs.writeFileSync(targetPath, content, 'utf8');
console.log('Sidebar updated');
