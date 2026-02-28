import { api } from "@sketchi/backend/convex/_generated/api";
import { createTraceId, normalizeTraceId } from "@sketchi/shared";
import { ConvexHttpClient } from "convex/browser";

const convexUrl =
  process.env.NEXT_PUBLIC_CONVEX_URL ??
  (() => {
    throw new Error(
      "Missing NEXT_PUBLIC_CONVEX_URL for device auth start route"
    );
  })();

export async function POST(request: Request) {
  const traceId =
    normalizeTraceId(request.headers.get("x-trace-id")) ?? createTraceId();

  try {
    const convex = new ConvexHttpClient(convexUrl);
    const started = await convex.mutation(api.deviceAuth.start, {});

    const verificationUrl = new URL(started.verificationPath, request.url);
    verificationUrl.searchParams.set("userCode", started.userCode);

    return Response.json(
      {
        deviceCode: started.deviceCode,
        userCode: started.userCode,
        interval: started.interval,
        expiresIn: started.expiresIn,
        verificationUrl: verificationUrl.toString(),
      },
      {
        headers: {
          "cache-control": "no-store",
          "x-trace-id": traceId,
        },
      }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to start device flow";
    return Response.json(
      { error: message },
      {
        status: 500,
        headers: {
          "cache-control": "no-store",
          "x-trace-id": traceId,
        },
      }
    );
  }
}
