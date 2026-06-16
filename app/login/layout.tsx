import { hasNoSystemUsers } from "@/actions/system-user";
import { redirect } from "next/navigation";

// Layout da página de login — usa posição fixed para cobrir a sidebar herdada do RootLayout
export default async function LoginLayout({ children }: { children: React.ReactNode }) {
  const isFirstRun = await hasNoSystemUsers();
  if (isFirstRun) {
    redirect("/setup");
  }

  return (
    <div className="fixed inset-0 z-50">
      {children}
    </div>
  );
}
