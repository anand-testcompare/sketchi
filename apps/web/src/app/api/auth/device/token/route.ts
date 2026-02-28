import { api } from "@sketchi/backend/convex/_generated/api";
import { createTraceId, normalizeTraceId } from "@sketchi/shared";
import { ConvexHttpClient } from "convex/browser";

const convexUrl =
  process.env.NEXT_PUBLIC_CONVEX_URL ??
  (() => {
    throw new Error(
      "Missing NEXT_PUBLIC_CONVEX_URL for device auth token route"
    );
  })();

export async function POST(request: Request) {
  const traceId =
    normalizeTraceId(request.headers.get("x-trace-id")) ?? createTraceId();

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json(
      { error: "Invalid JSON payload" },
      {
        status: 400,
        headers: {
          "cache-control": "no-store",
          "x-trace-id": traceId,
        },
      }
    );
  }

  const deviceCode =
    payload && typeof payload === "object" && "deviceCode" in payload
      ? (payload.deviceCode as string)
      : undefined;

  if (!(typeof deviceCode === "string" && deviceCode.trim().length > 0)) {
    return Response.json(
      { error: "deviceCode is required" },
      {
        status: 400,
        headers: {
          "cache-control": "no-store",
          "x-trace-id": traceId,
        },
      }
    );
  }

  try {
    const convex = new ConvexHttpClient(convexUrl);
    const result = await convex.mutation(api.deviceAuth.poll, {
      deviceCode,
    });

    return Response.json(result, {
      headers: {
        "cache-control": "no-store",
        "x-trace-id": traceId,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to poll device flow";
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
