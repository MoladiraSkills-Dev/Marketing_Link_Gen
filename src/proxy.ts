import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";
import type { NextRequest } from "next/server";

/**
 * Middleware runs in the Edge runtime — only import edge-safe modules here.
 * authConfig has no Node.js-only dependencies (no mysql2, no bcrypt, no DB).
 */
const { auth } = NextAuth(authConfig);

export async function proxy(req: NextRequest) {
  return auth(req as Parameters<typeof auth>[0]);
}

export const config = {
  matcher: ["/((?!_next|favicon|.*\\.(?:css|js|jpg|png|svg|ico)).*)" ],
};
