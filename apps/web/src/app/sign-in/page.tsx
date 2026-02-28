import {
  getSignInUrl,
  getSignUpUrl,
  withAuth,
} from "@workos-inc/authkit-nextjs";
import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface SignInPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

function getSafeReturnPathname(raw: string | undefined): string | undefined {
  if (!raw) {
    return undefined;
  }
  if (!raw.startsWith("/")) {
    return undefined;
  }
  if (raw.startsWith("//")) {
    return undefined;
  }
  return raw;
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const { user } = await withAuth();
  const resolvedSearchParams = (await searchParams) ?? {};
  const rawReturnPathname = Array.isArray(resolvedSearchParams.returnPathname)
    ? resolvedSearchParams.returnPathname[0]
    : resolvedSearchParams.returnPathname;
  const returnPathname = getSafeReturnPathname(rawReturnPathname);

  const state = returnPathname
    ? Buffer.from(JSON.stringify({ returnPathname }), "utf8").toString("base64")
    : undefined;

  if (user) {
    const destination = returnPathname ?? "/";
    return (
      <div className="container mx-auto w-full max-w-3xl px-4 py-10 sm:py-14">
        <Card className="rounded-2xl border-2">
          <CardHeader>
            <CardTitle className="text-lg">You are signed in</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground text-sm">
              Continue where you left off.
            </p>
            <Link
              className="inline-flex h-9 items-center rounded-md border-2 px-4 font-medium text-sm transition-colors hover:bg-muted"
              href={destination as "/"}
            >
              Continue
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const [signInUrl, signUpUrl] = await Promise.all([
    getSignInUrl({ state }),
    getSignUpUrl({ state }),
  ]);

  return (
    <div className="container mx-auto w-full max-w-3xl px-4 py-10 sm:py-14">
      <Card className="rounded-2xl border-2">
        <CardHeader>
          <CardTitle className="text-lg">Sign in to Sketchi</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-muted-foreground text-sm">
            Sign in to create private libraries, upload icons, and manage
            diagram sessions.
          </p>
          <div className="flex flex-wrap gap-3">
            <a
              className="inline-flex h-9 items-center rounded-md border-2 bg-primary px-4 font-medium text-primary-foreground text-sm transition-colors hover:bg-primary/90"
              href={signInUrl}
            >
              Continue to sign in
            </a>
            <a
              className="inline-flex h-9 items-center rounded-md border-2 border-dashed px-4 font-medium text-sm transition-colors hover:bg-muted"
              href={signUpUrl}
            >
              Create account
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
