"use client";

import { api } from "@sketchi/backend/convex/_generated/api";
import { useAccessToken, useAuth } from "@workos-inc/authkit-nextjs/components";
import { useMutation } from "convex/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const USER_CODE_LENGTH = 8;
const USER_CODE_PATTERN = /^[A-Z0-9]{4}-[A-Z0-9]{4}$/;

function normalizeUserCode(value: string): string {
  const normalized = value.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (normalized.length <= 4) {
    return normalized;
  }

  const prefix = normalized.slice(0, 4);
  const suffix = normalized.slice(4, USER_CODE_LENGTH);
  return `${prefix}-${suffix}`;
}

function parseTokenExpiry(token: string): number | undefined {
  const [, payload] = token.split(".", 3);
  if (!payload) {
    return undefined;
  }

  try {
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = `${base64}${"=".repeat((4 - (base64.length % 4)) % 4)}`;
    const parsed = JSON.parse(atob(padded)) as { exp?: number };
    return typeof parsed.exp === "number" ? parsed.exp * 1000 : undefined;
  } catch {
    return undefined;
  }
}

export default function OpenCodeDevicePage() {
  const [userCode, setUserCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [approved, setApproved] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setUserCode(normalizeUserCode(params.get("userCode") ?? ""));
  }, []);

  const { user, loading } = useAuth();
  const { getAccessToken, refresh } = useAccessToken();
  const approveDeviceCode = useMutation(api.deviceAuth.approve);

  let approveLabel = "Authorize device";
  if (approved) {
    approveLabel = "Authorized";
  } else if (submitting) {
    approveLabel = "Authorizing...";
  }

  const normalizedUserCode = normalizeUserCode(userCode);
  const returnPathname = `/opencode/device${
    normalizedUserCode
      ? `?userCode=${encodeURIComponent(normalizedUserCode)}`
      : ""
  }`;
  const signInHref = `/sign-in?returnPathname=${encodeURIComponent(returnPathname)}`;

  const handleApprove = async () => {
    if (submitting) {
      return;
    }

    if (!USER_CODE_PATTERN.test(normalizedUserCode)) {
      toast.error("Enter a valid 8-character device code.");
      return;
    }

    setSubmitting(true);
    try {
      const accessToken = (await getAccessToken()) ?? (await refresh());
      if (!accessToken) {
        throw new Error("Unable to get access token from WorkOS session");
      }

      const result = await approveDeviceCode({
        userCode: normalizedUserCode,
        accessToken,
        accessTokenExpiresAt: parseTokenExpiry(accessToken),
      });

      if (result.status === "expired") {
        toast.error("That device code has expired. Start again from OpenCode.");
        return;
      }

      if (result.status === "already_used") {
        toast.error("That device code was already used.");
        return;
      }

      setApproved(true);
      toast.success("Device authorized. Return to OpenCode.");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to authorize device code";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="container mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:py-12">
      <Card className="rounded-2xl border-2 shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl">Authorize OpenCode device</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <p className="text-muted-foreground text-sm">Loading session...</p>
          ) : null}

          {loading || user ? null : (
            <div className="space-y-3">
              <p className="text-muted-foreground text-sm">
                Sign in first, then approve this device code.
              </p>
              <Button
                onClick={() => {
                  window.location.href = signInHref;
                }}
                type="button"
              >
                Sign in to continue
              </Button>
            </div>
          )}

          {!loading && user ? (
            <div className="space-y-4">
              <p className="text-muted-foreground text-sm">
                Enter the code shown in OpenCode to complete device sign-in.
              </p>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Input
                  autoCapitalize="characters"
                  autoCorrect="off"
                  className="border-2 font-mono tracking-wider"
                  maxLength={USER_CODE_LENGTH + 1}
                  onChange={(event) =>
                    setUserCode(normalizeUserCode(event.target.value))
                  }
                  placeholder="ABCD-EFGH"
                  spellCheck={false}
                  value={normalizedUserCode}
                />
                <Button
                  disabled={submitting || approved}
                  onClick={handleApprove}
                  type="button"
                >
                  {approveLabel}
                </Button>
              </div>

              {approved ? (
                <p className="text-emerald-700 text-sm dark:text-emerald-400">
                  Approved. You can return to OpenCode.
                </p>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </main>
  );
}
