"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const npmUrl = "https://www.npmjs.com/package/@sketchi-app/opencode-excalidraw";
const githubUrl =
  "https://github.com/anand-testcompare/sketchi/tree/main/packages/opencode-excalidraw";
const pluginLine = '    "@sketchi-app/opencode-excalidraw@latest"';
const installCommand = "opencode";

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
              Add one plugin line in <code>opencode.jsonc</code>, then run
              OpenCode.
            </p>
          </div>
          <span className="rounded-full bg-secondary px-3 py-1 font-medium text-secondary-foreground text-xs">
            v0.0.2
          </span>
        </div>

        <div className="mb-5 flex flex-wrap items-center gap-4">
          <a
            aria-label="Open npm package"
            className="group flex items-center gap-2 rounded-xl border-2 border-transparent bg-muted/20 px-4 py-2 transition-all hover:-rotate-2 hover:border-foreground/10 hover:bg-muted/40"
            href={npmUrl}
            rel="noopener noreferrer"
            target="_blank"
          >
            <div className="relative h-8 w-16">
              <Image
                alt="NPM"
                className="object-contain opacity-80 transition-opacity group-hover:opacity-100"
                fill
                src="/icons/npm-text-svg.svg"
              />
            </div>
          </a>
          <a
            aria-label="Open GitHub repository"
            className="group flex items-center gap-2 rounded-xl border-2 border-transparent bg-muted/20 px-4 py-2 transition-all hover:rotate-2 hover:border-foreground/10 hover:bg-muted/40"
            href={githubUrl}
            rel="noopener noreferrer"
            target="_blank"
          >
            <div className="relative h-8 w-8">
              <Image
                alt="GitHub"
                className="object-contain opacity-80 transition-opacity group-hover:opacity-100 dark:hidden"
                fill
                src="/icons/github-svg.svg"
              />
              <Image
                alt="GitHub Dark"
                className="hidden object-contain opacity-80 transition-opacity group-hover:opacity-100 dark:block"
                fill
                src="/icons/github-dark-svg.svg"
              />
            </div>
            <span className="font-[family-name:var(--font-caveat)] text-foreground/80 text-lg group-hover:text-foreground">
              GitHub
            </span>
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
