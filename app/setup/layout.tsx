// Layout da página de primeiro acesso — usa posição fixed para cobrir a sidebar herdada do RootLayout
export default function SetupLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50">
      {children}
    </div>
  );
}
