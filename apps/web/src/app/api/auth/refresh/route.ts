import { createTraceId, normalizeTraceId } from "@sketchi/shared";

import { refreshWorkOsAccessToken } from "@/lib/workos-device-auth";

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

  const refreshToken =
    payload && typeof payload === "object" && "refreshToken" in payload
      ? (payload.refreshToken as string)
      : undefined;

  if (!(typeof refreshToken === "string" && refreshToken.trim().length > 0)) {
    return Response.json(
      { error: "refreshToken is required" },
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
    const result = await refreshWorkOsAccessToken({
      refreshToken,
    });

    return Response.json(result, {
      headers: {
        "cache-control": "no-store",
        "x-trace-id": traceId,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to refresh access token";

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
