import Sidebar from "@/components/Sidebar";

// Este layout envolve todas as páginas internas (autenticadas) com a Sidebar
export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden print:h-auto print:overflow-visible print:w-full print:block">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-8 print:h-auto print:overflow-visible print:w-full print:block print:p-0">
        <div className="max-w-7xl mx-auto print:max-w-none">
          {children}
        </div>
      </main>
    </div>
  );
}
