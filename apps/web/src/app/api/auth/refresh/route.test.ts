import { beforeEach, describe, expect, it, vi } from "vitest";

const refreshWorkOsAccessToken = vi.fn();

vi.mock("@/lib/workos-device-auth", () => ({
  refreshWorkOsAccessToken,
}));

describe("POST /api/auth/refresh", () => {
  beforeEach(() => {
    refreshWorkOsAccessToken.mockReset();
  });

  it("returns 400 for invalid JSON payloads", async () => {
    const { POST } = await import("./route");
    const traceId = "11111111-1111-4111-8111-111111111111";

    const response = await POST(
      new Request("http://localhost/api/auth/refresh", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-trace-id": traceId,
        },
        body: "{",
      })
    );

    expect(response.status).toBe(400);
    expect(response.headers.get("x-trace-id")).toBe(traceId);
    await expect(response.json()).resolves.toEqual({
      error: "Invalid JSON payload",
    });
  });

  it("returns 400 when refreshToken is missing", async () => {
    const { POST } = await import("./route");
    const traceId = "22222222-2222-4222-8222-222222222222";

    const response = await POST(
      new Request("http://localhost/api/auth/refresh", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-trace-id": traceId,
        },
        body: JSON.stringify({}),
      })
    );

    expect(response.status).toBe(400);
    expect(response.headers.get("x-trace-id")).toBe(traceId);
    await expect(response.json()).resolves.toEqual({
      error: "refreshToken is required",
    });
    expect(refreshWorkOsAccessToken).not.toHaveBeenCalled();
  });

  it("returns refreshed credentials on success", async () => {
    refreshWorkOsAccessToken.mockResolvedValue({
      status: "success",
      accessToken: "fresh-access",
      refreshToken: "fresh-refresh",
      accessTokenExpiresAt: 123,
    });

    const { POST } = await import("./route");
    const traceId = "33333333-3333-4333-8333-333333333333";

    const response = await POST(
      new Request("http://localhost/api/auth/refresh", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-trace-id": traceId,
        },
        body: JSON.stringify({ refreshToken: "stored-refresh-token" }),
      })
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("x-trace-id")).toBe(traceId);
    expect(refreshWorkOsAccessToken).toHaveBeenCalledWith({
      refreshToken: "stored-refresh-token",
    });
    await expect(response.json()).resolves.toEqual({
      status: "success",
      accessToken: "fresh-access",
      refreshToken: "fresh-refresh",
      accessTokenExpiresAt: 123,
    });
  });

  it("passes through invalid_grant responses", async () => {
    refreshWorkOsAccessToken.mockResolvedValue({
      status: "invalid_grant",
    });

    const { POST } = await import("./route");
    const traceId = "44444444-4444-4444-8444-444444444444";

    const response = await POST(
      new Request("http://localhost/api/auth/refresh", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-trace-id": traceId,
        },
        body: JSON.stringify({ refreshToken: "expired-refresh-token" }),
      })
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("x-trace-id")).toBe(traceId);
    await expect(response.json()).resolves.toEqual({
      status: "invalid_grant",
    });
  });
});
