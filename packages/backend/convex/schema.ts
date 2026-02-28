import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const styleSettings = v.object({
  strokeColor: v.string(),
  backgroundColor: v.string(),
  strokeWidth: v.number(),
  strokeStyle: v.union(
    v.literal("solid"),
    v.literal("dashed"),
    v.literal("dotted")
  ),
  fillStyle: v.union(
    v.literal("solid"),
    v.literal("hachure"),
    v.literal("cross-hatch"),
    v.literal("zigzag")
  ),
  roughness: v.number(),
  opacity: v.number(),
});

const userRole = v.union(v.literal("user"), v.literal("admin"));
const libraryVisibility = v.union(v.literal("public"), v.literal("private"));

export default defineSchema({
  users: defineTable({
    externalId: v.string(),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    role: userRole,
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_externalId", ["externalId"])
    .index("by_email", ["email"]),
  oauthDeviceFlows: defineTable({
    deviceCodeHash: v.string(),
    userCode: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("consumed"),
      v.literal("expired")
    ),
    createdAt: v.number(),
    expiresAt: v.number(),
    intervalSeconds: v.number(),
    lastPolledAt: v.optional(v.number()),
    approvedAt: v.optional(v.number()),
    approvedByExternalId: v.optional(v.string()),
    consumedAt: v.optional(v.number()),
    accessToken: v.optional(v.string()),
    accessTokenExpiresAt: v.optional(v.number()),
  })
    .index("by_deviceCodeHash", ["deviceCodeHash"])
    .index("by_userCode", ["userCode"]),
  iconLibraries: defineTable({
    name: v.string(),
    slug: v.string(),
    description: v.optional(v.string()),
    styleSettings,
    visibility: v.optional(libraryVisibility),
    ownerUserId: v.optional(v.id("users")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_visibility", ["visibility"])
    .index("by_ownerUserId", ["ownerUserId"]),
  iconItems: defineTable({
    libraryId: v.id("iconLibraries"),
    storageId: v.id("_storage"),
    originalName: v.string(),
    fileName: v.string(),
    contentHash: v.string(),
    byteSize: v.number(),
    sortOrder: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_library", ["libraryId"])
    .index("by_library_order", ["libraryId", "sortOrder"]),
  diagramSessions: defineTable({
    sessionId: v.string(),
    ownerUserId: v.optional(v.id("users")),
    latestScene: v.optional(
      v.object({
        elements: v.array(v.any()),
        appState: v.any(),
      })
    ),
    latestSceneVersion: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
    threadId: v.optional(v.string()),
  })
    .index("by_sessionId", ["sessionId"])
    .index("by_ownerUserId", ["ownerUserId"]),
});
