import { authkit, handleAuthkitHeaders } from "@workos-inc/authkit-nextjs";
import type { NextRequest } from "next/server";

const AUTH_ROUTES = new Set(["/callback", "/sign-in", "/sign-up", "/sign-out"]);

function isProtectedPath(pathname: string): boolean {
  return (
    pathname.startsWith("/diagrams") ||
    pathname.startsWith("/profile") ||
    pathname.startsWith("/settings")
  );
}

export async function proxy(request: NextRequest) {
  const previewOrigin =
    process.env.VERCEL_ENV === "preview" && process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : null;
  const redirectUri = `${previewOrigin ?? request.nextUrl.origin}/callback`;

  const { session, headers } = await authkit(request, {
    redirectUri,
    eagerAuth: true,
  });

  const pathname = request.nextUrl.pathname;
  const search = request.nextUrl.search;

  if (AUTH_ROUTES.has(pathname)) {
    return handleAuthkitHeaders(request, headers);
  }

  if (isProtectedPath(pathname) && !session.user) {
    const returnPathname = `${pathname}${search}`;
    const redirectTo = `/sign-in?returnPathname=${encodeURIComponent(returnPathname)}`;

    return handleAuthkitHeaders(request, headers, { redirect: redirectTo });
  }

  return handleAuthkitHeaders(request, headers);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
