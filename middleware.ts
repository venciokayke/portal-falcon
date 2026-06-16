import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const isMustChange = token?.mustChangePassword === true;
    const { pathname } = req.nextUrl;

    if (isMustChange && pathname !== "/mudar-senha") {
      return NextResponse.redirect(new URL("/mudar-senha", req.url));
    }

    if (!isMustChange && pathname === "/mudar-senha") {
      return NextResponse.redirect(new URL("/", req.url));
    }
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: [
    /*
     * Protege todas as rotas EXCETO:
     * - /setup (página de primeiro acesso)
     * - /login (página de login)
     * - /api/auth/* (endpoints internos do NextAuth)
     * - Arquivos estáticos (_next, favicon, etc.)
     */
    "/((?!setup|login|api/auth|_next/static|_next/image|favicon.ico).*)",
  ],
};
