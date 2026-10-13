import { eq } from "drizzle-orm";

import { db } from "@/server/db";
import { user } from "@/server/db/schema";

export type UserAccess = {
  banned: boolean | null;
  bannedReason: string | null;
  isAdmin: boolean | null;
  deletedAt: Date | null;
};

/**
 * Access columns for the signed-in user.
 * With self-hosted NextAuth, the user row is created at registration time.
 */
export async function ensureUser(userId: string): Promise<UserAccess | undefined> {
  const existing = await db.query.user.findFirst({
    where: eq(user.id, userId),
    columns: { banned: true, bannedReason: true, isAdmin: true, deletedAt: true },
  });
  return existing ?? undefined;
}
