"use client";

import { env } from "@sketchi/env/web";
import {
  useAccessToken as useWorkosAccessToken,
  useAuth as useWorkosAuth,
} from "@workos-inc/authkit-nextjs/components";
import { ConvexProviderWithAuth, ConvexReactClient } from "convex/react";
import { useCallback, useEffect, useMemo } from "react";

import { ThemeProvider } from "./theme-provider";
import { Toaster } from "./ui/sonner";

const convex = new ConvexReactClient(env.NEXT_PUBLIC_CONVEX_URL);

function useConvexAuthFromWorkOS() {
  const { user, loading: authLoading } = useWorkosAuth();
  const {
    error: tokenHookError,
    refresh,
    getAccessToken,
  } = useWorkosAccessToken();

  const fetchAccessToken = useCallback(
    async ({ forceRefreshToken }: { forceRefreshToken: boolean }) => {
      if (!user) {
        return null;
      }

      try {
        const token = forceRefreshToken
          ? await refresh()
          : await getAccessToken();
        return token ?? null;
      } catch (error) {
        console.error("[auth] WorkOS access token fetch failed", error);
        return null;
      }
    },
    [getAccessToken, refresh, user]
  );

  return useMemo(
    () => ({
      tokenError: tokenHookError?.message ?? null,
      isLoading: authLoading,
      isAuthenticated: Boolean(user) && tokenHookError === null,
      fetchAccessToken,
    }),
    [authLoading, fetchAccessToken, tokenHookError, user]
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
