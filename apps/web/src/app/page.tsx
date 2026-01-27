"use client";
import { api } from "@sketchi/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

const TITLE_TEXT = `
 ██████╗ ███████╗████████╗████████╗███████╗██████╗
 ██╔══██╗██╔════╝╚══██╔══╝╚══██╔══╝██╔════╝██╔══██╗
 ██████╔╝█████╗     ██║      ██║   █████╗  ██████╔╝
 ██╔══██╗██╔══╝     ██║      ██║   ██╔══╝  ██╔══██╗
 ██████╔╝███████╗   ██║      ██║   ███████╗██║  ██║
 ╚═════╝ ╚══════╝   ╚═╝      ╚═╝   ╚══════╝╚═╝  ╚═╝

 ████████╗    ███████╗████████╗ █████╗  ██████╗██╗  ██╗
 ╚══██╔══╝    ██╔════╝╚══██╔══╝██╔══██╗██╔════╝██║ ██╔╝
    ██║       ███████╗   ██║   ███████║██║     █████╔╝
    ██║       ╚════██║   ██║   ██╔══██║██║     ██╔═██╗
    ██║       ███████║   ██║   ██║  ██║╚██████╗██║  ██╗
    ╚═╝       ╚══════╝   ╚═╝   ╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝
 `;

export default function Home() {
  const healthCheck = useQuery(api.healthCheck.get);
  let statusColor = "bg-orange-400";
  let statusText = "Checking...";

  if (healthCheck === "OK") {
    statusColor = "bg-green-500";
    statusText = "Connected";
  } else if (healthCheck !== undefined) {
    statusColor = "bg-red-500";
    statusText = "Error";
  }

  return (
    <div className="container mx-auto max-w-3xl px-4 py-2">
      <pre className="overflow-x-auto font-mono text-sm">{TITLE_TEXT}</pre>
      <div className="grid gap-6">
        <section className="rounded-lg border p-4">
          <h2 className="mb-2 font-medium">API Status</h2>
          <div className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${statusColor}`} />
            <span className="text-muted-foreground text-sm">{statusText}</span>
          </div>
        </section>
        <section className="rounded-lg border p-4">
          <h2 className="mb-2 font-medium">Icon Library Generator</h2>
          <p className="mb-4 text-muted-foreground text-sm">
            Create icon libraries, upload SVGs, and export .excalidrawlib files.
          </p>
          <Link href="/library-generator">
            <Button size="sm">Open generator</Button>
          </Link>
        </section>
      </div>
    </div>
  );
}
