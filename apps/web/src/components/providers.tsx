"use client";

import { env } from "@sketchi/env/web";
import {
  useAccessToken as useWorkosAccessToken,
  useAuth as useWorkosAuth,
} from "@workos-inc/authkit-nextjs/components";
import { ConvexProviderWithAuth, ConvexReactClient } from "convex/react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { ThemeProvider } from "./theme-provider";
import { Toaster } from "./ui/sonner";

const convex = new ConvexReactClient(env.NEXT_PUBLIC_CONVEX_URL);

function useConvexAuthFromWorkOS() {
  const { user, loading: authLoading } = useWorkosAuth();
  const {
    accessToken,
    loading: tokenLoading,
    error: tokenHookError,
    refresh,
    getAccessToken,
  } = useWorkosAccessToken();
  const [tokenError, setTokenError] = useState<string | null>(null);

  const fetchAccessToken = useCallback(
    async ({ forceRefreshToken }: { forceRefreshToken: boolean }) => {
      if (!user) {
        setTokenError(null);
        return null;
      }

      try {
        const token = forceRefreshToken
          ? await refresh()
          : await getAccessToken();
        if (!token) {
          setTokenError((prev) => prev ?? "WorkOS returned no access token");
          return null;
        }
        setTokenError(null);
        return token;
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to fetch WorkOS access token";
        setTokenError((prev) => prev ?? message);
        console.error("[auth] WorkOS access token fetch failed", error);
        return null;
      }
    },
    [getAccessToken, refresh, user]
  );

  return useMemo(
    () => ({
      tokenError: tokenError ?? tokenHookError?.message ?? null,
      isLoading:
        authLoading ||
        (Boolean(user) &&
          !accessToken &&
          tokenLoading &&
          tokenError === null &&
          tokenHookError === null),
      isAuthenticated:
        Boolean(user) && tokenError === null && tokenHookError === null,
      fetchAccessToken,
    }),
    [
      accessToken,
      authLoading,
      fetchAccessToken,
      tokenError,
      tokenHookError,
      tokenLoading,
      user,
    ]
  );
}

export default function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    document.documentElement.dataset.hydrated = "true";
    (
      window as Window & { __SKETCHI_CONVEX_URL?: string }
    ).__SKETCHI_CONVEX_URL = env.NEXT_PUBLIC_CONVEX_URL;
  }, []);

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      disableTransitionOnChange
      enableSystem
    >
      <ConvexProviderWithAuth client={convex} useAuth={useConvexAuthFromWorkOS}>
        {children}
      </ConvexProviderWithAuth>
      <Toaster richColors />
    </ThemeProvider>
  );
}
