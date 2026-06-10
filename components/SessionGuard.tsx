"use client";

import { useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";

export const SESSION_KEY = "falcon_tab_active";

/**
 * SessionGuard: encerra a sessão quando não há marca de aba ativa.
 * O token é CRIADO na página de login (após signIn bem-sucedido).
 * O sessionStorage é destruído automaticamente ao fechar a aba.
 */
export default function SessionGuard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === "loading") return;

    if (status === "authenticated") {
      const tabToken = sessionStorage.getItem(SESSION_KEY);
      if (!tabToken) {
        // JWT válido mas aba foi fechada/reaberta sem login — encerra
        signOut({ callbackUrl: "/login" });
        return;
      }

      // Redirecionamento cliente do mustChangePassword
      if ((session?.user as any)?.mustChangePassword && pathname !== "/mudar-senha") {
        router.push("/mudar-senha");
      }
    }

    if (status === "unauthenticated") {
      sessionStorage.removeItem(SESSION_KEY);
    }
  }, [status, session, pathname, router]);

  return null;
}
