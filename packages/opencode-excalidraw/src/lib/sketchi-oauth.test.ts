import { describe, expect, test } from "bun:test";

import {
  accessTokenExpired,
  clearPersistedOAuthAuth,
  isOAuthAuth,
  refreshSketchiAccessToken,
} from "./sketchi-oauth";

describe("sketchi oauth helpers", () => {
  test("recognizes oauth auth payloads", () => {
    expect(
      isOAuthAuth({
        type: "oauth",
        access: "access-token",
        refresh: "refresh-token",
        expires: Date.now() + 60_000,
      })
    ).toBe(true);
    expect(isOAuthAuth({ type: "api", key: "secret" })).toBe(false);
  });

  test("treats missing or stale access tokens as expired", () => {
    expect(
      accessTokenExpired({
        type: "oauth",
        refresh: "refresh-token",
      })
    ).toBe(true);

    expect(
      accessTokenExpired({
        type: "oauth",
        access: "access-token",
        refresh: "refresh-token",
        expires: Date.now() - 1,
      })
    ).toBe(true);
  });

  test("refreshSketchiAccessToken persists rotated auth", async () => {
    const originalFetch = globalThis.fetch;
    const setCalls: unknown[] = [];

    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          status: "success",
          accessToken: "new-access-token",
          refreshToken: "new-refresh-token",
          accessTokenExpiresAt: Date.now() + 3_600_000,
        }),
        { status: 200 }
      )) as typeof fetch;

    try {
      const result = await refreshSketchiAccessToken({
        apiBase: "https://www.sketchi.app",
        auth: {
          type: "oauth",
          access: "old-access-token",
          refresh: "old-refresh-token",
          expires: Date.now() - 1,
        },
        client: {
          auth: {
            set: (input) => {
              setCalls.push(input);
              return Promise.resolve();
            },
          },
        },
        traceId: "trace-refresh",
      });

      expect(result).toEqual({
        type: "oauth",
        access: "new-access-token",
        refresh: "new-refresh-token",
        expires: result?.expires,
      });
      expect(setCalls).toHaveLength(1);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("refreshSketchiAccessToken clears invalid_grant auth", async () => {
    const originalFetch = globalThis.fetch;
    const setCalls: unknown[] = [];

    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          status: "invalid_grant",
        }),
        { status: 200 }
      )) as typeof fetch;

    try {
      const result = await refreshSketchiAccessToken({
        apiBase: "https://www.sketchi.app",
        auth: {
          type: "oauth",
          access: "old-access-token",
          refresh: "old-refresh-token",
          expires: Date.now() - 1,
        },
        client: {
          auth: {
            set: (input) => {
              setCalls.push(input);
              return Promise.resolve();
            },
          },
        },
        traceId: "trace-invalid",
      });

      expect(result).toBeUndefined();
      expect(setCalls).toHaveLength(1);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("clearPersistedOAuthAuth writes an empty oauth record", async () => {
    const setCalls: unknown[] = [];

    await clearPersistedOAuthAuth({
      auth: {
        set: (input) => {
          setCalls.push(input);
          return Promise.resolve();
        },
      },
    });

    expect(setCalls).toEqual([
      {
        path: { id: "sketchi" },
        body: {
          type: "oauth",
          access: "",
          refresh: "",
          expires: 0,
        },
      },
    ]);
  });
});
