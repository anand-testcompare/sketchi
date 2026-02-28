import { v } from "convex/values";

import { mutation } from "./_generated/server";
import { ensureViewerUser, getIdentityExternalId } from "./lib/users";

const DEVICE_CODE_BYTES = 32;
const USER_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const USER_CODE_LENGTH = 8;
const USER_CODE_GROUP_SIZE = 4;
const DEVICE_EXPIRES_IN_MS = 10 * 60 * 1000;
const DEVICE_POLL_INTERVAL_SECONDS = 5;

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    ""
  );
}

function createRandomHex(bytes: number): string {
  const random = new Uint8Array(bytes);
  crypto.getRandomValues(random);
  return bytesToHex(random);
}

function createUserCode(): string {
  const random = new Uint8Array(USER_CODE_LENGTH);
  crypto.getRandomValues(random);
  let normalized = "";
  for (const byte of random) {
    normalized += USER_CODE_CHARS[byte % USER_CODE_CHARS.length];
  }
  const prefix = normalized.slice(0, USER_CODE_GROUP_SIZE);
  const suffix = normalized.slice(USER_CODE_GROUP_SIZE);
  return `${prefix}-${suffix}`;
}

function normalizeUserCode(value: string): string {
  const normalized = value.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (normalized.length !== USER_CODE_LENGTH) {
    return normalized;
  }

  const prefix = normalized.slice(0, USER_CODE_GROUP_SIZE);
  const suffix = normalized.slice(USER_CODE_GROUP_SIZE);
  return `${prefix}-${suffix}`;
}

async function hashDeviceCode(deviceCode: string): Promise<string> {
  const pepper = process.env.SKETCHI_DEVICE_AUTH_PEPPER ?? "";
  const payload = `${pepper}:${deviceCode.trim()}`;
  const bytes = new TextEncoder().encode(payload);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return bytesToHex(new Uint8Array(digest));
}

export const start = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const expiresAt = now + DEVICE_EXPIRES_IN_MS;

    let deviceCode = "";
    let deviceCodeHash = "";
    while (!deviceCode) {
      const candidate = createRandomHex(DEVICE_CODE_BYTES);
      const candidateHash = await hashDeviceCode(candidate);
      const existing = await ctx.db
        .query("oauthDeviceFlows")
        .withIndex("by_deviceCodeHash", (q) =>
          q.eq("deviceCodeHash", candidateHash)
        )
        .unique();

      if (!existing) {
        deviceCode = candidate;
        deviceCodeHash = candidateHash;
      }
    }

    let userCode = "";
    while (!userCode) {
      const candidate = createUserCode();
      const existing = await ctx.db
        .query("oauthDeviceFlows")
        .withIndex("by_userCode", (q) => q.eq("userCode", candidate))
        .unique();

      if (!existing) {
        userCode = candidate;
      }
    }

    await ctx.db.insert("oauthDeviceFlows", {
      deviceCodeHash,
      userCode,
      status: "pending",
      createdAt: now,
      expiresAt,
      intervalSeconds: DEVICE_POLL_INTERVAL_SECONDS,
      lastPolledAt: undefined,
      approvedAt: undefined,
      approvedByExternalId: undefined,
      consumedAt: undefined,
      accessToken: undefined,
      accessTokenExpiresAt: undefined,
    });

    return {
      deviceCode,
      userCode,
      expiresIn: Math.floor(DEVICE_EXPIRES_IN_MS / 1000),
      interval: DEVICE_POLL_INTERVAL_SECONDS,
      verificationPath: "/opencode/device",
    };
  },
});

export const approve = mutation({
  args: {
    userCode: v.string(),
    accessToken: v.string(),
    accessTokenExpiresAt: v.optional(v.number()),
  },
  handler: async (ctx, { userCode, accessToken, accessTokenExpiresAt }) => {
    const { identity } = await ensureViewerUser(ctx);
    const normalizedCode = normalizeUserCode(userCode.trim());
    if (!normalizedCode) {
      throw new Error("Invalid user code");
    }

    const flow = await ctx.db
      .query("oauthDeviceFlows")
      .withIndex("by_userCode", (q) => q.eq("userCode", normalizedCode))
      .unique();

    if (!flow) {
      throw new Error("Invalid user code");
    }

    const now = Date.now();
    if (now >= flow.expiresAt) {
      await ctx.db.patch(flow._id, {
        status: "expired",
        accessToken: undefined,
      });
      return { status: "expired" as const };
    }

    if (flow.status === "consumed") {
      return { status: "already_used" as const };
    }

    if (flow.status === "approved") {
      return { status: "already_approved" as const };
    }

    const trimmedToken = accessToken.trim();
    if (!trimmedToken) {
      throw new Error("Access token is required");
    }

    await ctx.db.patch(flow._id, {
      status: "approved",
      approvedAt: now,
      approvedByExternalId: getIdentityExternalId(identity),
      accessToken: trimmedToken,
      accessTokenExpiresAt,
    });

    return {
      status: "approved" as const,
    };
  },
});

export const poll = mutation({
  args: {
    deviceCode: v.string(),
  },
  handler: async (ctx, { deviceCode }) => {
    const normalizedCode = deviceCode.trim();
    if (!normalizedCode) {
      return { status: "invalid_grant" as const };
    }

    const deviceCodeHash = await hashDeviceCode(normalizedCode);
    const flow = await ctx.db
      .query("oauthDeviceFlows")
      .withIndex("by_deviceCodeHash", (q) =>
        q.eq("deviceCodeHash", deviceCodeHash)
      )
      .unique();

    if (!flow) {
      return { status: "invalid_grant" as const };
    }

    const now = Date.now();
    if (now >= flow.expiresAt || flow.status === "expired") {
      if (flow.status !== "expired") {
        await ctx.db.patch(flow._id, {
          status: "expired",
          accessToken: undefined,
        });
      }
      return { status: "expired_token" as const };
    }

    if (
      typeof flow.lastPolledAt === "number" &&
      now - flow.lastPolledAt < flow.intervalSeconds * 1000
    ) {
      return {
        status: "slow_down" as const,
        interval: flow.intervalSeconds,
      };
    }

    await ctx.db.patch(flow._id, { lastPolledAt: now });

    if (flow.status === "pending") {
      return {
        status: "authorization_pending" as const,
        interval: flow.intervalSeconds,
      };
    }

    if (flow.status === "consumed") {
      return { status: "invalid_grant" as const };
    }

    if (flow.status !== "approved" || !flow.accessToken) {
      return { status: "invalid_grant" as const };
    }

    await ctx.db.patch(flow._id, {
      status: "consumed",
      consumedAt: now,
      accessToken: undefined,
      accessTokenExpiresAt: undefined,
    });

    return {
      status: "success" as const,
      accessToken: flow.accessToken,
      accessTokenExpiresAt: flow.accessTokenExpiresAt,
    };
  },
});
