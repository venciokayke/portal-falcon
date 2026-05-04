export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    /*
     * Protege todas as rotas EXCETO:
     * - /login (página de login)
     * - /api/auth/* (endpoints internos do NextAuth)
     * - Arquivos estáticos (_next, favicon, etc.)
     */
    "/((?!login|api/auth|_next/static|_next/image|favicon.ico).*)",
  ],
};
