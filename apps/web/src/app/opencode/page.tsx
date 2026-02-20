"use client";

import { Github } from "lucide-react";
import type { SVGProps } from "react";
import { useEffect, useState } from "react";

const npmUrl = "https://www.npmjs.com/package/@sketchi-app/opencode-excalidraw";
const githubUrl =
  "https://github.com/anand-testcompare/sketchi/tree/main/packages/opencode-excalidraw";
const pluginLine = '    "@sketchi-app/opencode-excalidraw"';
const installCommand = "npm i @sketchi-app/opencode-excalidraw";

function NpmIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      aria-hidden="true"
      fill="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path d="M2 6.5v11h20v-11H2Zm16.5 2H20v7h-1.5v-7ZM4 8.5h4v7H6.5v-5H5.5v5H4v-7Zm5 0h4v7h-1.5v-5h-1v5H9v-7Zm5 0h3.5v2h-2v5H14v-7Z" />
    </svg>
  );
}

export default function OpenCodeDocsPage() {
  const [typedPlugin, setTypedPlugin] = useState("");
  const [typedInstall, setTypedInstall] = useState("");

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    if (typedPlugin.length < pluginLine.length) {
      timeoutId = setTimeout(() => {
        setTypedPlugin(pluginLine.slice(0, typedPlugin.length + 1));
      }, 28);
      return () => clearTimeout(timeoutId);
    }

    if (typedInstall.length < installCommand.length) {
      timeoutId = setTimeout(
        () => {
          setTypedInstall(installCommand.slice(0, typedInstall.length + 1));
        },
        typedInstall.length === 0 ? 550 : 24
      );
      return () => clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      setTypedPlugin("");
      setTypedInstall("");
    }, 1700);
    return () => clearTimeout(timeoutId);
  }, [typedPlugin, typedInstall]);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-12">
      <section className="rounded-2xl border bg-card p-5 sm:p-7">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div className="space-y-2">
            <h1 className="font-semibold text-2xl tracking-tight">
              OpenCode plugin docs
            </h1>
            <p className="max-w-xl text-muted-foreground text-sm">
              Add one plugin line in <code>opencode.jsonc</code>, then install.
            </p>
          </div>
          <span className="rounded-full bg-secondary px-3 py-1 font-medium text-secondary-foreground text-xs">
            v0.0.2
          </span>
        </div>

        <div className="mb-5 flex items-center gap-2">
          <a
            aria-label="Open npm package"
            className="inline-flex size-9 items-center justify-center rounded-lg border bg-background text-foreground/80 transition-colors hover:text-foreground"
            href={npmUrl}
            rel="noopener noreferrer"
            target="_blank"
          >
            <NpmIcon className="size-5" />
          </a>
          <a
            aria-label="Open GitHub repository"
            className="inline-flex size-9 items-center justify-center rounded-lg border bg-background text-foreground/80 transition-colors hover:text-foreground"
            href={githubUrl}
            rel="noopener noreferrer"
            target="_blank"
          >
            <Github className="size-5" />
          </a>
        </div>

        <div className="space-y-3">
          <div className="rounded-xl border bg-muted/30 p-4">
            <p className="mb-2 font-medium text-muted-foreground text-xs uppercase">
              opencode.jsonc
            </p>
            <code className="block whitespace-pre font-mono text-sm leading-6">
              {`{\n  "plugins": [\n`}
              <span className="text-primary">{typedPlugin}</span>
              {typedPlugin.length < pluginLine.length && (
                <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-foreground align-[-0.12em]" />
              )}
              {"\n  ]\n}"}
            </code>
          </div>

          <div className="rounded-xl border bg-muted/30 p-4">
            <p className="mb-2 font-medium text-muted-foreground text-xs uppercase">
              terminal
            </p>
            <code className="flex min-h-6 items-center font-mono text-sm">
              <span className="mr-2 text-primary">$</span>
              <span>{typedInstall}</span>
              {typedPlugin.length === pluginLine.length &&
                typedInstall.length < installCommand.length && (
                  <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-foreground" />
                )}
            </code>
          </div>
        </div>
      </section>
    </main>
  );
}
