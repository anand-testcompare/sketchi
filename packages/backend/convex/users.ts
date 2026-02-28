import { mutation, query } from "./_generated/server";
import {
  ensureViewerUser,
  getIdentityEmail,
  getIdentityImage,
  getIdentityName,
  getViewerWithUser,
} from "./lib/users";

export const me = query({
  args: {},
  handler: async (ctx) => {
    const { identity, user, isAdmin } = await getViewerWithUser(ctx);

    if (!user) {
      return {
        user: null,
        identity: {
          email: getIdentityEmail(identity),
          name: getIdentityName(identity),
          image: getIdentityImage(identity),
          isAdmin,
        },
      };
    }

    return {
      user: {
        _id: user._id,
        externalId: user.externalId,
        email: user.email,
        name: user.name,
        image: user.image,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      identity: {
        email: getIdentityEmail(identity),
        name: getIdentityName(identity),
        image: getIdentityImage(identity),
        isAdmin,
      },
    };
  },
});

export const ensure = mutation({
  args: {},
  handler: async (ctx) => {
    const { user, isAdmin } = await ensureViewerUser(ctx);
    return {
      _id: user._id,
      role: user.role,
      isAdmin,
    };
  },
});
