/**
 * TEST SCENARIO: OAuth device authorization flow
 * - start returns a device code + user code
 * - approve requires authenticated user
 * - poll returns success exactly once after approval
 */

import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";

import { api } from "./_generated/api";
import schema from "./schema";
import { modules } from "./test.setup";

const t = convexTest(schema, modules);
const authed = t.withIdentity({
  subject: "device-auth-user",
  email: "device-auth@example.com",
});
const USER_CODE_PATTERN = /^[A-Z0-9]{4}-[A-Z0-9]{4}$/;

describe("deviceAuth", () => {
  test("start then poll returns authorization_pending", async () => {
    const started = await t.mutation(api.deviceAuth.start, {});

    expect(started.deviceCode.length).toBe(64);
    expect(started.userCode).toMatch(USER_CODE_PATTERN);
    expect(started.interval).toBe(5);

    const pending = await t.mutation(api.deviceAuth.poll, {
      deviceCode: started.deviceCode,
    });

    expect(pending.status).toBe("authorization_pending");
  });

  test("approve then poll returns token once", async () => {
    const started = await t.mutation(api.deviceAuth.start, {});

    const approval = await authed.mutation(api.deviceAuth.approve, {
      userCode: started.userCode,
      accessToken: "mock.workos.token",
      accessTokenExpiresAt: Date.now() + 60_000,
    });
    expect(approval.status).toBe("approved");

    const success = await t.mutation(api.deviceAuth.poll, {
      deviceCode: started.deviceCode,
    });
    expect(success.status).toBe("success");
    if (success.status !== "success") {
      throw new Error("unexpected status");
    }
    expect(success.accessToken).toBe("mock.workos.token");

    const secondPoll = await t.mutation(api.deviceAuth.poll, {
      deviceCode: started.deviceCode,
    });
    expect(secondPoll.status).not.toBe("success");
  });

  test("approve requires authenticated user", async () => {
    const started = await t.mutation(api.deviceAuth.start, {});

    await expect(
      t.mutation(api.deviceAuth.approve, {
        userCode: started.userCode,
        accessToken: "mock.workos.token",
      })
    ).rejects.toThrow("Unauthorized");
  });
});
