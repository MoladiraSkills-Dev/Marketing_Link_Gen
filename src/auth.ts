import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { authConfig } from "@/auth.config";
import { db } from "@/server/db";
import { user } from "@/server/db/schema";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  // Override providers with the full version that actually hits the DB.
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const email = String(credentials.email).toLowerCase().trim();
        const dbUser = await db.query.user.findFirst({
          where: eq(user.email, email),
        });
        if (!dbUser?.password) return null;
        const valid = await bcrypt.compare(
          String(credentials.password),
          dbUser.password,
        );
        return valid ? { id: dbUser.id, email: dbUser.email, name: dbUser.name } : null;
      },
    }),
  ],
});
