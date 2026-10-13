import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";

/**
 * Edge-safe Auth.js config — no Node.js-only imports (no DB, no bcrypt).
 * Used by middleware for JWT session verification.
 * The full auth (with DB + bcrypt) lives in auth.ts.
 */
export const authConfig = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/auth/sign-in",
  },
  secret: process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET,
  providers: [
    // Credentials provider stub — actual authorize() only runs on the Node
    // runtime (in auth.ts). Middleware only needs session/JWT callbacks.
    Credentials({}),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id as string;
      return session;
    },
    authorized({ auth, request }) {
      const isProtected = request.nextUrl.pathname.startsWith("/dashboard");
      if (isProtected && !auth) {
        return Response.redirect(new URL("/auth/sign-in", request.url));
      }
      return true;
    },
  },
} satisfies NextAuthConfig;
