"use client";
import { useAuth } from "@workos-inc/authkit-nextjs/components";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { ModeToggle } from "./mode-toggle";

export default function Header() {
  const { user, loading } = useAuth();

  let authControls: ReactNode = null;
  if (user) {
    authControls = (
      <Link
        className="rounded-full border-2 border-transparent px-4 py-1.5 font-medium text-muted-foreground text-sm transition-all hover:border-foreground/10 hover:bg-muted/40 hover:text-foreground"
        href="/sign-out"
        prefetch={false}
      >
        Sign out
      </Link>
    );
  } else if (!loading) {
    authControls = (
      <Link
        className="rounded-full border-2 border-transparent px-4 py-1.5 font-medium text-muted-foreground text-sm transition-all hover:border-foreground/10 hover:bg-muted/40 hover:text-foreground"
        href="/sign-in"
      >
        Sign in
      </Link>
    );
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b-2 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center justify-between px-4 sm:px-6">
        <Link
          aria-label="Home"
          className="group flex items-center gap-2.5 rounded-lg p-1 transition-colors hover:opacity-80"
          href="/"
        >
          <Image
            alt="Sketchi"
            className="h-7 w-7 object-contain transition-transform group-hover:-rotate-6"
            height={28}
            src="/icons/logo.svg"
            width={28}
          />
          <span className="hidden font-[family-name:var(--font-caveat)] font-bold text-2xl text-foreground/90 tracking-tight sm:inline-block">
            sketchi
          </span>
        </Link>
        <div className="flex items-center gap-2 sm:gap-4">
          {authControls}
          <Link
            className="rounded-full border-2 border-transparent px-4 py-1.5 font-medium text-muted-foreground text-sm transition-all hover:border-foreground/10 hover:bg-muted/40 hover:text-foreground"
            href="/api/docs"
            rel="noreferrer"
            target="_blank"
          >
            API Docs
          </Link>
          <ModeToggle />
        </div>
      </div>
    </header>
  );
}
