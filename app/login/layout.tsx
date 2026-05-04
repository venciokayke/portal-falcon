// Layout da página de login — usa posição fixed para cobrir a sidebar herdada do RootLayout
export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50">
      {children}
    </div>
  );
}
