import { v } from "convex/values";
import { generateIntermediate } from "../lib/agents";
import { action } from "./_generated/server";

export const generateIntermediateFromPrompt = action({
  args: {
    prompt: v.string(),
    profileId: v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    const result = await generateIntermediate(args.prompt, {
      profileId: args.profileId,
    });

    console.log(
      JSON.stringify({
        event: "intermediate_generated",
        traceId: result.traceId,
        profileId: result.profileId,
        nodeCount: result.intermediate.nodes.length,
        edgeCount: result.intermediate.edges.length,
        iterations: result.iterations,
        tokens: result.tokens,
        durationMs: result.durationMs,
      })
    );

    return result;
  },
});
