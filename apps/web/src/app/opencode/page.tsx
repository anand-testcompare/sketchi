"use client";

import { Check, Copy } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";

import { OpencodeAuthTerminalDemo } from "@/components/opencode/auth-terminal-demo";
import { opencodePluginVersion } from "@/lib/opencode-version";

const npmUrl = "https://www.npmjs.com/package/@sketchi-app/opencode-excalidraw";
const githubUrl =
  "https://github.com/anand-testcompare/sketchi/tree/main/packages/opencode-excalidraw";
const webCommand = "opencode web";
const cliCommand = "opencode";

interface ModePreview {
  alt: string;
  dark: string;
  light: string;
}

type RunMode = "web" | "cli";

type DemoPhase =
  | "typing-config"
  | "config-ready"
  | "typing-web-command"
  | "ready-web"
  | "sending-web"
  | "loading-web"
  | "result-web";

const webPreview: ModePreview = {
  alt: "Generated Excalidraw Diagram (OpenCode Web)",
  dark: "/screenshots/opencode-preview-dark.png",
  light: "/screenshots/opencode-preview-light.png",
};

const cliPreview: ModePreview = {
  alt: "Generated Excalidraw Diagram (OpenCode CLI)",
  dark: "/screenshots/opencode-terminal-dark.png",
  light: "/screenshots/opencode-terminal-light.png",
};

function useOpencodeDemo(pluginLine: string) {
  const [demoPhase, setDemoPhase] = useState<DemoPhase>("typing-config");
  const [typedPlugin, setTypedPlugin] = useState("");
  const [typedInstall, setTypedInstall] = useState("");

  useEffect(() => {
    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const stopSignal = Symbol("demo-stop");

    const wait = (ms: number) =>
      new Promise<boolean>((resolve) => {
        const timer = setTimeout(() => resolve(!cancelled), ms);
        timers.push(timer);
      });

    const ensure = async (task: Promise<boolean>) => {
      const ok = await task;
      if (!ok) {
        throw stopSignal;
      }
    };

    const typeText = async (
      text: string,
      setValue: (value: string) => void,
      delayMs: number,
      initialDelayMs = 0
    ): Promise<boolean> => {
      if (initialDelayMs > 0) {
        const waited = await wait(initialDelayMs);
        if (!waited) {
          return false;
        }
      }

      for (let i = 1; i <= text.length; i += 1) {
        if (cancelled) {
          return false;
        }
        setValue(text.slice(0, i));
        const waited = await wait(delayMs);
        if (!waited) {
          return false;
        }
      }

      return true;
    };

    const runSequence = async () => {
      setDemoPhase("typing-config");
      setTypedPlugin("");
      setTypedInstall("");

      await ensure(typeText(pluginLine, setTypedPlugin, 52, 420));
      setDemoPhase("config-ready");
      await ensure(wait(5200));

      setDemoPhase("typing-web-command");
      await ensure(typeText(webCommand, setTypedInstall, 112, 800));
      setDemoPhase("ready-web");
      await ensure(wait(2000));
      setDemoPhase("sending-web");
      await ensure(wait(1900));
      setDemoPhase("loading-web");
      await ensure(wait(3400));
      setDemoPhase("result-web");
    };

    runSequence().catch((error) => {
      if (error !== stopSignal) {
        console.error("OpenCode demo animation failed", error);
      }
    });

    return () => {
      cancelled = true;
      for (const timer of timers) {
        clearTimeout(timer);
      }
    };
  }, [pluginLine]);

  return { demoPhase, typedInstall, typedPlugin };
}

interface DemoUiState {
  preview: ModePreview | null;
  previewMode: "cli" | "web" | null;
  showCommandCursor: boolean;
  showLoading: boolean;
  showSending: boolean;
  showWaiting: boolean;
  waitingMessage: string;
}

function deriveDemoUiState(
  demoPhase: DemoPhase,
  runMode: RunMode
): DemoUiState {
  if (runMode === "cli") {
    return {
      preview: cliPreview,
      previewMode: "cli",
      showCommandCursor: false,
      showLoading: false,
      showSending: false,
      showWaiting: false,
      waitingMessage: "Step 3: run opencode in terminal mode.",
    };
  }

  const showCommandCursor = demoPhase === "typing-web-command";
  const showLoading = demoPhase === "loading-web";
  const showSending = demoPhase === "sending-web";

  let waitingMessage = "Step 1 in progress: writing opencode.jsonc...";
  if (demoPhase === "config-ready") {
    waitingMessage =
      "Step 2 in progress: authenticate in the provider picker...";
  } else if (demoPhase === "typing-web-command") {
    waitingMessage = "Step 3 in progress: typing opencode web...";
  } else if (demoPhase === "ready-web") {
    waitingMessage = "Step 3 command ready. Sending next...";
  } else if (showSending) {
    waitingMessage = "Step 3: sending command...";
  }

  let preview: ModePreview | null = null;
  let previewMode: "cli" | "web" | null = null;
  if (demoPhase === "result-web") {
    preview = webPreview;
    previewMode = "web";
  }

  const showWaiting = !(showLoading || preview !== null);

  return {
    preview,
    previewMode,
    showCommandCursor,
    showLoading,
    showSending,
    showWaiting,
    waitingMessage,
  };
}

export default function OpenCodeDocsPage() {
  const [version, setVersion] = useState(opencodePluginVersion);
  const [copied, setCopied] = useState(false);
  const [runMode, setRunMode] = useState<RunMode>("web");

  // Default to "latest" since that dynamically ensures they have the newest plugin version,
  // preventing them from being stuck on an outdated hardcoded tag.
  const pluginLine = `    "@sketchi-app/opencode-excalidraw@${version}"`;

  const fullJsonConfig = `{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    "@sketchi-app/opencode-excalidraw@${version}"
  ]
}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(fullJsonConfig);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    fetch("https://registry.npmjs.org/@sketchi-app/opencode-excalidraw/latest")
      .then((res) => res.json())
      .then((data) => {
        if (data.version) {
          setVersion(data.version);
        }
      })
      .catch((e) => console.error("Failed to fetch version", e));
  }, []);

  const { demoPhase, typedInstall, typedPlugin } = useOpencodeDemo(pluginLine);
  const demoUi = deriveDemoUiState(demoPhase, runMode);

  return (
    <main className="mx-auto w-dvw min-w-0 max-w-6xl overflow-x-hidden px-4 py-8 sm:py-12">
      <section className="relative overflow-hidden rounded-[2rem] border-2 bg-card p-6 sm:p-10">
        <div className="relative z-10 mb-8 flex flex-col items-start justify-between gap-6 sm:flex-row">
          <div className="space-y-3">
            <h1 className="font-semibold text-3xl tracking-tight sm:text-4xl">
              OpenCode plugin docs
            </h1>
            <p className="max-w-3xl text-base text-muted-foreground leading-relaxed">
              Follow the guided sequence below. Each card is numbered so users
              can mirror the exact setup flow without guesswork.
            </p>
          </div>
          <span className="inline-flex shrink-0 items-center justify-center rounded-full border-2 border-primary/20 bg-primary/10 px-4 py-1.5 font-medium text-primary text-sm transition-colors hover:bg-primary/20">
            v{version}
          </span>
        </div>

        <div className="relative z-10 mb-8 flex flex-wrap items-center gap-4">
          <a
            aria-label="Open npm package"
            className="group flex items-center gap-2 rounded-xl border-2 border-transparent bg-muted/30 px-5 py-2.5 transition-all hover:-translate-y-0.5 hover:-rotate-2 hover:border-foreground/15 hover:bg-muted/50"
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
            className="group flex items-center gap-2 rounded-xl border-2 border-transparent bg-muted/30 px-5 py-2.5 transition-all hover:-translate-y-0.5 hover:rotate-2 hover:border-foreground/15 hover:bg-muted/50"
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
            <span className="font-(family-name:--font-caveat) text-foreground/80 text-xl group-hover:text-foreground">
              GitHub
            </span>
          </a>
        </div>

        <div className="relative z-10 grid gap-6 md:grid-cols-[1fr_1.2fr] lg:gap-10">
          <div className="flex flex-col gap-4">
            <section
              aria-label="Animated code block"
              className="overflow-hidden rounded-2xl border-2 border-zinc-200/50 bg-[#1e1e1e] shadow-sm transition-colors dark:border-white/10 dark:bg-[#0d0d0d]"
            >
              <div className="flex items-center justify-between border-white/10 border-b bg-white/5 px-4 py-2.5">
                <div className="flex items-center gap-1.5">
                  <div className="size-3 rounded-full bg-[#ff5f56]" />
                  <div className="size-3 rounded-full bg-[#ffbd2e]" />
                  <div className="size-3 rounded-full bg-[#27c93f]" />
                  <span className="ml-2 font-medium text-white/50 text-xs">
                    opencode.jsonc
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 font-medium text-[11px] text-amber-300">
                    Step 1
                  </span>
                  <button
                    aria-label="Copy config"
                    className="flex items-center gap-1.5 rounded bg-white/10 px-2 py-1 text-white/70 text-xs transition-colors hover:bg-white/20 hover:text-white"
                    onClick={handleCopy}
                    type="button"
                  >
                    {copied ? (
                      <Check className="size-3.5" />
                    ) : (
                      <Copy className="size-3.5" />
                    )}
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
              </div>
              <div className="p-5">
                <code className="block whitespace-pre-wrap break-words font-mono text-sm text-zinc-300 leading-7">
                  <span className="text-[#569cd6]">{"{\n"}</span>
                  <span className="text-[#9cdcfe]">{'  "$schema"'}</span>
                  <span className="text-zinc-300">{": "}</span>
                  <span className="text-[#ce9178]">
                    {'"https://opencode.ai/config.json"'}
                  </span>
                  <span className="text-zinc-300">{",\n"}</span>
                  <span className="text-[#9cdcfe]">{'  "plugin"'}</span>
                  <span className="text-zinc-300">{": [\n"}</span>
                  <span className="text-[#ce9178]">{typedPlugin}</span>
                  {typedPlugin.length < pluginLine.length && (
                    <span className="ml-0.5 inline-block h-4 w-2 animate-pulse bg-zinc-300 align-[-0.12em]" />
                  )}
                  <span className="text-zinc-300">{"\n  ]\n"}</span>
                  <span className="text-[#569cd6]">{"}"}</span>
                </code>
              </div>
            </section>

            <OpencodeAuthTerminalDemo startDelayMs={2600} />
          </div>

          <section className="overflow-hidden rounded-2xl border-2 border-zinc-200/50 bg-[#1e1e1e] shadow-sm transition-colors dark:border-white/10 dark:bg-[#0d0d0d]">
            <div className="flex items-center justify-between border-white/10 border-b bg-white/5 px-4 py-2.5">
              <div className="flex items-center gap-1.5">
                <div className="size-3 rounded-full bg-[#ff5f56]" />
                <div className="size-3 rounded-full bg-[#ffbd2e]" />
                <div className="size-3 rounded-full bg-[#27c93f]" />
                <span className="ml-2 font-medium text-white/50 text-xs">
                  run
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded border border-cyan-400/30 bg-cyan-400/10 px-2 py-0.5 font-medium text-[11px] text-cyan-300">
                  Step 3
                </span>
                <div className="inline-flex overflow-hidden rounded-md border border-white/15 text-[11px]">
                  <button
                    className={`px-2 py-1 transition-colors ${
                      runMode === "web"
                        ? "bg-cyan-400/20 text-cyan-200"
                        : "bg-white/5 text-white/60 hover:bg-white/10"
                    }`}
                    onClick={() => setRunMode("web")}
                    type="button"
                  >
                    opencode web
                  </button>
                  <button
                    className={`border-white/10 border-l px-2 py-1 transition-colors ${
                      runMode === "cli"
                        ? "bg-cyan-400/20 text-cyan-200"
                        : "bg-white/5 text-white/60 hover:bg-white/10"
                    }`}
                    onClick={() => setRunMode("cli")}
                    type="button"
                  >
                    opencode
                  </button>
                </div>
              </div>
            </div>

            <div className="border-white/10 border-b p-4">
              <code className="flex min-h-7 items-center font-mono text-sm text-zinc-300">
                <span className="mr-3 text-[#27c93f]">$</span>
                <span>{runMode === "web" ? typedInstall : cliCommand}</span>
                {runMode === "web" && demoUi.showCommandCursor && (
                  <span className="ml-1.5 inline-block h-4 w-2 animate-pulse bg-zinc-300" />
                )}
                {runMode === "web" && demoUi.showSending && (
                  <span className="ml-2 text-emerald-400 text-xs">[enter]</span>
                )}
              </code>
              <p className="mt-2 text-muted-foreground text-xs">
                Choose one path: <code>{webCommand}</code> for browser preview
                or <code>{cliCommand}</code> for terminal mode.
              </p>
            </div>

            <div className="relative flex aspect-4/3 w-full items-center justify-center overflow-hidden bg-muted/20">
              {demoUi.showWaiting && (
                <div className="flex animate-pulse flex-col items-center gap-3 opacity-50">
                  <div className="rounded border border-muted-foreground/30 px-3 py-2 font-mono text-muted-foreground text-xs">
                    {demoUi.waitingMessage}
                  </div>
                  <span className="font-medium text-muted-foreground text-sm">
                    Waiting for command send
                  </span>
                </div>
              )}

              {demoUi.showLoading && (
                <div className="flex flex-col items-center gap-3 opacity-75">
                  <div className="size-10 animate-spin rounded-full border-4 border-muted-foreground/20 border-t-muted-foreground/60" />
                  <span className="font-medium text-muted-foreground text-sm">
                    Launching preview...
                  </span>
                </div>
              )}

              {demoUi.preview && (
                <div className="absolute inset-0 flex items-center justify-center p-4 transition-all duration-700 ease-out">
                  <div className="relative h-full w-full overflow-hidden rounded-xl border border-border bg-background">
                    <Image
                      alt={demoUi.preview.alt}
                      className={`dark:hidden ${
                        demoUi.previewMode === "web"
                          ? "object-cover object-top-left"
                          : "object-cover object-center"
                      }`}
                      fill
                      src={demoUi.preview.light}
                    />
                    <Image
                      alt={demoUi.preview.alt}
                      className={`hidden dark:block ${
                        demoUi.previewMode === "web"
                          ? "object-cover object-top-left"
                          : "object-cover object-center"
                      }`}
                      fill
                      src={demoUi.preview.dark}
                    />
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
