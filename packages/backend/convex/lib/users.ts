import type { UserIdentity } from "convex/server";

import type { Doc } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

const ADMIN_EMAILS = new Set(
  (process.env.SKETCHI_ADMIN_EMAILS ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter((value) => value.length > 0)
);

const ADMIN_SUBJECTS = new Set(
  (process.env.SKETCHI_ADMIN_SUBJECTS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0)
);

function normalizeEmail(email: string | null | undefined): string | undefined {
  if (!email) {
    return undefined;
  }
  const normalized = email.trim().toLowerCase();
  return normalized.length > 0 ? normalized : undefined;
}

function normalizeName(name: string | null | undefined): string | undefined {
  if (!name) {
    return undefined;
  }
  const normalized = name.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function normalizeImage(url: string | null | undefined): string | undefined {
  if (!url) {
    return undefined;
  }
  const normalized = url.trim();
  return normalized.length > 0 ? normalized : undefined;
}

export function getIdentityExternalId(identity: UserIdentity): string {
  return identity.subject ?? identity.tokenIdentifier;
}

export function getIdentityEmail(identity: UserIdentity): string | undefined {
  return normalizeEmail(identity.email);
}

export function getIdentityName(identity: UserIdentity): string | undefined {
  return normalizeName(identity.name);
}

export function getIdentityImage(identity: UserIdentity): string | undefined {
  return normalizeImage(identity.pictureUrl);
}

export function isIdentityAdmin(identity: UserIdentity): boolean {
  const email = getIdentityEmail(identity);
  return (
    (email ? ADMIN_EMAILS.has(email) : false) ||
    ADMIN_SUBJECTS.has(getIdentityExternalId(identity))
  );
}

export async function findUserByExternalId(
  ctx: QueryCtx | MutationCtx,
  externalId: string
): Promise<Doc<"users"> | null> {
  return await ctx.db
    .query("users")
    .withIndex("by_externalId", (q) => q.eq("externalId", externalId))
    .unique();
}

export async function getViewerWithUser(ctx: QueryCtx | MutationCtx): Promise<{
  identity: UserIdentity;
  user: Doc<"users"> | null;
  isAdmin: boolean;
}> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Unauthorized");
  }

  const user = await findUserByExternalId(ctx, getIdentityExternalId(identity));

  return {
    identity,
    user,
    isAdmin: isIdentityAdmin(identity),
  };
}

export async function ensureViewerUser(ctx: MutationCtx): Promise<{
  identity: UserIdentity;
  user: Doc<"users">;
  isAdmin: boolean;
}> {
  const { identity, user, isAdmin } = await getViewerWithUser(ctx);
  const externalId = getIdentityExternalId(identity);
  const email = getIdentityEmail(identity);
  const name = getIdentityName(identity);
  const image = getIdentityImage(identity);
  const role = isAdmin ? "admin" : "user";
  const now = Date.now();

  if (!user) {
    const userId = await ctx.db.insert("users", {
      externalId,
      email,
      name,
      image,
      role,
      createdAt: now,
      updatedAt: now,
    });
    const inserted = await ctx.db.get(userId);
    if (!inserted) {
      throw new Error("Failed to create user");
    }
    return {
      identity,
      user: inserted,
      isAdmin,
    };
  }

  if (
    user.email !== email ||
    user.name !== name ||
    user.image !== image ||
    user.role !== role
  ) {
    await ctx.db.patch(user._id, {
      email,
      name,
      image,
      role,
      updatedAt: now,
    });

    const refreshed = await ctx.db.get(user._id);
    if (!refreshed) {
      throw new Error("User not found after update");
    }

    return {
      identity,
      user: refreshed,
      isAdmin,
    };
  }

  return {
    identity,
    user,
    isAdmin,
  };
}
