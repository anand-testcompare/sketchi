import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  pollWorkOsDeviceFlow,
  refreshWorkOsAccessToken,
  startWorkOsDeviceFlow,
} from "./workos-device-auth";

const originalFetch = globalThis.fetch;
const originalClientId = process.env.WORKOS_CLIENT_ID;
const originalDeviceAuthBaseUrl = process.env.WORKOS_DEVICE_AUTH_BASE_URL;

describe("workos-device-auth", () => {
  beforeEach(() => {
    process.env.WORKOS_CLIENT_ID = "client_test_123";
    process.env.WORKOS_DEVICE_AUTH_BASE_URL = "https://api.workos.com";
  });

  afterEach(() => {
    if (originalClientId === undefined) {
      process.env.WORKOS_CLIENT_ID = undefined;
    } else {
      process.env.WORKOS_CLIENT_ID = originalClientId;
    }

    if (originalDeviceAuthBaseUrl === undefined) {
      process.env.WORKOS_DEVICE_AUTH_BASE_URL = undefined;
    } else {
      process.env.WORKOS_DEVICE_AUTH_BASE_URL = originalDeviceAuthBaseUrl;
    }

    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("startWorkOsDeviceFlow returns normalized device start payload", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          device_code: "device-code",
          user_code: "ABCD-EFGH",
          verification_uri: "https://api.workos.com/user_management/authorize",
          verification_uri_complete:
            "https://api.workos.com/user_management/authorize?user_code=ABCD-EFGH",
          expires_in: 600,
          interval: 5,
        }),
        { status: 200 }
      )
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const result = await startWorkOsDeviceFlow();

    expect(result).toEqual({
      deviceCode: "device-code",
      userCode: "ABCD-EFGH",
      interval: 5,
      expiresIn: 600,
      verificationUrl:
        "https://api.workos.com/user_management/authorize?user_code=ABCD-EFGH",
    });
  });

  it("pollWorkOsDeviceFlow maps pending and slow_down payloads", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ error: "authorization_pending", interval: 5 }),
          { status: 400 }
        )
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "slow_down", interval: 11 }), {
          status: 400,
        })
      );
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await expect(
      pollWorkOsDeviceFlow({ deviceCode: "device-code" })
    ).resolves.toEqual({
      status: "authorization_pending",
      interval: 5,
    });
    await expect(
      pollWorkOsDeviceFlow({ deviceCode: "device-code" })
    ).resolves.toEqual({
      status: "slow_down",
      interval: 11,
    });
  });

  it("pollWorkOsDeviceFlow maps terminal error payloads", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "expired_token" }), {
          status: 400,
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "access_denied" }), {
          status: 400,
        })
      );
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await expect(
      pollWorkOsDeviceFlow({ deviceCode: "device-code" })
    ).resolves.toEqual({ status: "expired_token" });
    await expect(
      pollWorkOsDeviceFlow({ deviceCode: "device-code" })
    ).resolves.toEqual({ status: "invalid_grant" });
  });

  it("pollWorkOsDeviceFlow maps successful token payload", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          access_token: "access-token-123",
          refresh_token: "refresh-token-123",
          expires_in: 3600,
        }),
        { status: 200 }
      )
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const before = Date.now();
    const result = await pollWorkOsDeviceFlow({ deviceCode: "device-code" });
    const after = Date.now();

    expect(result.status).toBe("success");
    if (result.status !== "success") {
      return;
    }

    expect(result.accessToken).toBe("access-token-123");
    expect(result.refreshToken).toBe("refresh-token-123");
    expect(result.accessTokenExpiresAt).toBeDefined();
    expect(result.accessTokenExpiresAt).toBeGreaterThanOrEqual(
      before + 3_599_000
    );
    expect(result.accessTokenExpiresAt).toBeLessThanOrEqual(after + 3_601_000);
  });

  it("refreshWorkOsAccessToken maps successful refresh payload", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          access_token: "next-access-token",
          refresh_token: "next-refresh-token",
          expires_in: 1800,
        }),
        { status: 200 }
      )
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const before = Date.now();
    const result = await refreshWorkOsAccessToken({
      refreshToken: "stored-refresh-token",
    });
    const after = Date.now();

    expect(result.status).toBe("success");
    if (result.status !== "success") {
      return;
    }

    expect(result.accessToken).toBe("next-access-token");
    expect(result.refreshToken).toBe("next-refresh-token");
    expect(result.accessTokenExpiresAt).toBeDefined();
    expect(result.accessTokenExpiresAt).toBeGreaterThanOrEqual(
      before + 1_799_000
    );
    expect(result.accessTokenExpiresAt).toBeLessThanOrEqual(after + 1_801_000);
  });

  it("refreshWorkOsAccessToken maps invalid_grant payloads", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: "invalid_grant" }), {
        status: 400,
      })
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await expect(
      refreshWorkOsAccessToken({ refreshToken: "stale-refresh-token" })
    ).resolves.toEqual({ status: "invalid_grant" });
  });
});
