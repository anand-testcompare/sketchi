"use client";
import { Wand2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      <div className="mx-auto mb-12 flex justify-center">
        <Image
          alt="Sketchi"
          height={160}
          priority
          src="/icons/logo-wide.svg"
          width={480}
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Link
          className="group rounded-lg border p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-md"
          href="/library-generator"
        >
          <h2 className="mb-2 font-medium text-sm">Icon Library Generator</h2>
          <p className="mb-4 text-muted-foreground text-xs">
            Create icon libraries and export .excalidrawlib files.
          </p>
          <span className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 font-[family-name:var(--font-caveat)] text-lg text-primary-foreground shadow-sm transition-colors group-hover:bg-primary/90">
            <Wand2 className="size-5" />
            Open
          </span>
        </Link>

        <section className="flex items-center justify-center rounded-lg border border-dashed p-4">
          <span className="text-muted-foreground text-xs">Coming soon</span>
        </section>

        <section className="flex items-center justify-center rounded-lg border border-dashed p-4">
          <span className="text-muted-foreground text-xs">Coming soon</span>
        </section>
      </div>
    </div>
  );
}
