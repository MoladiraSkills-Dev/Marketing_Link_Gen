import { auth } from "@/auth";
import type { Session } from "next-auth";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";

import { DEFAULT_PLATFORM_DOMAIN } from "@/lib/constants/domains";
import { db } from "@/server/db";
import { ensureUser, type UserAccess } from "@/server/lib/ensure-user";
import {
  resolveWorkspaceContext,
  userHasUltraPlan,
  WorkspaceContext,
} from "@/server/lib/workspace";

import type { inferAsyncReturnType } from "@trpc/server";

export const createTRPCContext = async (opts: {
  auth: Session | null;
  headers: Headers;
}) => {
  return {
    db,
    headers: opts.headers,
    auth: opts.auth
      ? {
          ...opts.auth,
          userId: (opts.auth.user?.id as string) ?? undefined,
        }
      : null,
  };
};

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  // eslint-disable-next-line anti-slop/no-shape-in-symbol-names -- tRPC errorFormatter API name
  errorFormatter({ shape: formatted, error }) {
    return {
      ...formatted,
      data: {
        ...formatted.data,
        zodError: error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;
export const middleware = t.middleware;

// Base context type
export type TRPCContext = inferAsyncReturnType<typeof createTRPCContext>;

// Protected context type with enforced userId
export type ProtectedTRPCContext = Omit<TRPCContext, "auth"> & {
  auth: NonNullable<TRPCContext["auth"]> & {
    userId: string;
    user: NonNullable<NonNullable<TRPCContext["auth"]>["user"]> & {
      id: string;
    };
  };
  /** Whether the user has isAdmin=true, fetched once during auth */
  isAdmin: boolean;
  deletedAt: Date | null;
};

// Per-request memo so batched procedures share one ban/admin lookup.
// Keyed on the ctx object — same request = same ctx = same cached promise.
const currentUserCache = new WeakMap<object, Promise<UserAccess | undefined>>();

// Like protectedProcedure, but still reachable after a soft delete.
export const softDeletedProcedure = t.procedure.use(async ({ ctx, next }) => {
  const userId = ctx.auth?.user?.id;
  if (!userId) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  let cached = currentUserCache.get(ctx);
  if (!cached) {
    cached = ensureUser(userId);
    currentUserCache.set(ctx, cached);
  }
  const currentUser = await cached;

  if (currentUser?.banned) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Your account has been suspended. Please contact support for more information.",
    });
  }

  const protectedCtx: ProtectedTRPCContext = {
    ...ctx,
    auth: {
      ...ctx.auth!,
      userId,
      user: {
        ...ctx.auth!.user!,
        id: userId,
      },
    },
    isAdmin: currentUser?.isAdmin ?? false,
    deletedAt: currentUser?.deletedAt ?? null,
  };

  return next({ ctx: protectedCtx });
});

// Protected procedure middleware
export const protectedProcedure = softDeletedProcedure.use(({ ctx, next }) => {
  if (ctx.deletedAt) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "This account is scheduled for deletion. Restore it to keep using iShortn.",
    });
  }

  return next({ ctx });
});

// ============================================================================
// WORKSPACE-AWARE PROCEDURES
// ============================================================================

/**
 * Context type with workspace information
 */
export type WorkspaceTRPCContext = ProtectedTRPCContext & {
  workspace: WorkspaceContext;
};

/**
 * Workspace-aware procedure that resolves the current workspace from the hostname.
 * This should be used for all operations that need workspace context.
 */
export const workspaceProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  const hostname = ctx.headers.get("host") ?? DEFAULT_PLATFORM_DOMAIN;

  const workspace = await resolveWorkspaceContext(ctx.auth.user.id, hostname, ctx.db);

  return next({ ctx: { ...ctx, workspace } });
});

/**
 * Context type for team-only procedures
 */
export type TeamTRPCContext = ProtectedTRPCContext & {
  workspace: Extract<WorkspaceContext, { type: "team" }>;
};

/**
 * Procedure that requires a team workspace.
 * Throws FORBIDDEN if called from a personal workspace.
 */
export const teamProcedure = workspaceProcedure.use(({ ctx, next }) => {
  if (ctx.workspace.type !== "team") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "This action requires a team workspace",
    });
  }

  return next({ ctx: { ...ctx, workspace: ctx.workspace } });
});

/**
 * Procedure that requires the user to have an Ultra plan.
 * Used for team creation and other Ultra-only features.
 */
export const ultraProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  const hasUltra = await userHasUltraPlan(ctx.auth.user.id, ctx.db);

  if (!hasUltra) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "This feature requires an Ultra plan subscription",
    });
  }

  return next({ ctx });
});

/**
 * Admin procedure that requires the user to have isAdmin=true.
 * Reads from context (already fetched in protectedProcedure) — no extra DB query.
 */
export const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!ctx.isAdmin) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Admin access required",
    });
  }

  return next({ ctx });
});

export type PublicTRPCContext = {
  db: TRPCContext["db"];
  headers: TRPCContext["headers"];
};
