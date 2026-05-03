import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "Portal Falcon",
  description: "Sistema de Controle de Ponto e Folha de Pagamento",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased flex h-screen overflow-hidden bg-gray-50 text-gray-900 print:h-auto print:overflow-visible print:w-full print:block">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-8 print:h-auto print:overflow-visible print:w-full print:block print:p-0">
          <div className="max-w-7xl mx-auto print:max-w-none">
            {children}
          </div>
        </main>
      </body>
    </html>
  );
}
