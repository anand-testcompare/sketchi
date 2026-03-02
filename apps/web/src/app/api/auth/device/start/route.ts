import { createTraceId, normalizeTraceId } from "@sketchi/shared";
import { startWorkOsDeviceFlow } from "@/lib/workos-device-auth";

export async function POST(request: Request) {
  const traceId =
    normalizeTraceId(request.headers.get("x-trace-id")) ?? createTraceId();

  try {
    const started = await startWorkOsDeviceFlow();

    return Response.json(
      {
        deviceCode: started.deviceCode,
        userCode: started.userCode,
        interval: started.interval,
        expiresIn: started.expiresIn,
        verificationUrl: started.verificationUrl,
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
