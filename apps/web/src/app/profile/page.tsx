import { withAuth } from "@workos-inc/authkit-nextjs";
import Link from "next/link";
import { redirect } from "next/navigation";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getUserDisplayName, getUserInitials } from "@/lib/auth-user";

interface ProfileUser {
  email?: string | null;
  firstName?: string | null;
  id?: string | null;
  lastName?: string | null;
}

export default async function ProfilePage() {
  const { user } = await withAuth();

  if (!user) {
    redirect("/sign-in?returnPathname=%2Fprofile");
  }

  const identity = user as ProfileUser;
  const displayName = getUserDisplayName(identity);
  const initials = getUserInitials(identity);

  return (
    <div className="container mx-auto max-w-3xl px-4 py-10 sm:py-14">
      <Card className="rounded-2xl border-2">
        <CardHeader className="gap-3">
          <div className="flex items-center gap-3">
            <span className="font-(family-name:--font-caveat) inline-flex size-12 items-center justify-center rounded-full bg-primary text-2xl text-primary-foreground">
              {initials}
            </span>
            <div className="space-y-0.5">
              <CardTitle className="text-lg">{displayName}</CardTitle>
              <CardDescription>
                {identity.email ?? "No email available"}
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="space-y-1">
            <p className="font-medium text-foreground text-xs">User ID</p>
            <p className="rounded-md border border-border bg-muted/40 px-3 py-2 font-mono text-xs">
              {identity.id ?? "Unknown"}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              className="inline-flex h-9 items-center rounded-md border-2 px-4 font-medium text-sm transition-colors hover:bg-muted"
              href="/library-generator"
            >
              Icon Libraries
            </Link>
            <Link
              className="inline-flex h-9 items-center rounded-md border-2 px-4 font-medium text-sm transition-colors hover:bg-muted"
              href="/diagrams"
            >
              Diagram Studio
            </Link>
            <Link
              className="inline-flex h-9 items-center rounded-md border-2 border-destructive/40 px-4 font-medium text-destructive text-sm transition-colors hover:bg-destructive/10"
              href="/sign-out"
              prefetch={false}
            >
              Sign out
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
