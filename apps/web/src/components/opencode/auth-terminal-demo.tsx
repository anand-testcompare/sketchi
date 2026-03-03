"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const AUTH_COMMAND = "opencode auth login";
const SEARCH_QUERY = "sk";

const ALL_PROVIDERS = [
  "evroc",
  "iFlow",
  "submodel",
  "v0",
  "xAI",
  "sketchi (plugin)",
  "Other",
];

type AuthDemoPhase =
  | "typing-command"
  | "ready-command"
  | "opening-picker"
  | "typing-search"
  | "selected-provider";

const PHASE_ORDER: Record<AuthDemoPhase, number> = {
  "typing-command": 0,
  "ready-command": 1,
  "opening-picker": 2,
  "typing-search": 3,
  "selected-provider": 4,
};

function usePrefersReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setPrefersReducedMotion(mediaQuery.matches);
    updatePreference();

    mediaQuery.addEventListener("change", updatePreference);
    return () => mediaQuery.removeEventListener("change", updatePreference);
  }, []);

  return prefersReducedMotion;
}

function useAuthTerminalDemo(startDelayMs = 0) {
  const [phase, setPhase] = useState<AuthDemoPhase>("typing-command");
  const [typedCommand, setTypedCommand] = useState("");
  const [typedSearch, setTypedSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const stopSignal = Symbol("auth-demo-stop");

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

      for (let index = 1; index <= text.length; index += 1) {
        if (cancelled) {
          return false;
        }
        setValue(text.slice(0, index));
        const waited = await wait(delayMs);
        if (!waited) {
          return false;
        }
      }
      return true;
    };

    const runSequence = async () => {
      setPhase("typing-command");
      setTypedCommand("");
      setTypedSearch("");

      if (startDelayMs > 0) {
        await ensure(wait(startDelayMs));
      }

      await ensure(typeText(AUTH_COMMAND, setTypedCommand, 68, 500));
      setPhase("ready-command");
      await ensure(wait(900));

      setPhase("opening-picker");
      await ensure(wait(1100));

      setPhase("typing-search");
      await ensure(typeText(SEARCH_QUERY, setTypedSearch, 260, 420));
      await ensure(wait(650));

      setPhase("selected-provider");
    };

    runSequence().catch((error) => {
      if (error !== stopSignal) {
        console.error("OpenCode auth animation failed", error);
      }
    });

    return () => {
      cancelled = true;
      for (const timer of timers) {
        clearTimeout(timer);
      }
    };
  }, [startDelayMs]);

  const atLeast = (target: AuthDemoPhase) =>
    PHASE_ORDER[phase] >= PHASE_ORDER[target];

  return { atLeast, phase, typedCommand, typedSearch };
}

interface OpencodeAuthTerminalDemoProps {
  startDelayMs?: number;
}

export function OpencodeAuthTerminalDemo({
  startDelayMs = 0,
}: OpencodeAuthTerminalDemoProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const { atLeast, phase, typedCommand, typedSearch } =
    useAuthTerminalDemo(startDelayMs);

  const showPicker = atLeast("opening-picker");
  const showTypingCursor =
    phase === "typing-command" && typedCommand.length < AUTH_COMMAND.length;
  const showSearchCursor =
    phase === "typing-search" && typedSearch.length < SEARCH_QUERY.length;
  const isFiltered = typedSearch === SEARCH_QUERY;
  const visibleProviders = isFiltered ? ["sketchi (plugin)"] : ALL_PROVIDERS;
  const shouldHighlightSketchi = atLeast("selected-provider");

  return (
    <section
      aria-label="Animated auth terminal"
      className="overflow-hidden rounded-2xl border-2 border-zinc-200/50 bg-[#1e1e1e] shadow-sm transition-colors dark:border-white/10 dark:bg-[#0d0d0d]"
    >
      <div className="flex items-center justify-between border-white/10 border-b bg-white/5 px-4 py-2.5">
        <div className="flex items-center gap-1.5">
          <div className="size-3 rounded-full bg-[#ff5f56]" />
          <div className="size-3 rounded-full bg-[#ffbd2e]" />
          <div className="size-3 rounded-full bg-[#27c93f]" />
          <span className="ml-2 font-medium text-white/50 text-xs">
            auth terminal
          </span>
        </div>
        <span className="rounded border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 font-medium text-[11px] text-emerald-300">
          Step 2
        </span>
      </div>

      {prefersReducedMotion ? (
        <div className="p-4">
          <div className="relative aspect-[16/9] overflow-hidden rounded-lg border border-white/10">
            <Image
              alt="OpenCode auth provider selection with sketchi plugin selected"
              className="object-cover"
              fill
              src="/screenshots/opencode-auth-login-sketchi.png"
            />
          </div>
        </div>
      ) : (
        <div className="p-5">
          <code className="block whitespace-pre-wrap font-mono text-sm text-zinc-300 leading-7">
            <span className="mr-3 text-[#27c93f]">$</span>
            <span>{typedCommand}</span>
            {showTypingCursor && (
              <span className="ml-1.5 inline-block h-4 w-2 animate-pulse bg-zinc-300 align-[-0.12em]" />
            )}
          </code>

          {showPicker ? (
            <div className="mt-4 rounded-lg border border-white/10 bg-black/20 p-3 font-mono text-sm">
              <p className="text-zinc-400">+ Add credential</p>
              <p className="mt-2 text-cyan-300">{"> Select provider"}</p>
              <p className="mt-2 text-zinc-300">
                Search: <span className="text-zinc-100">{typedSearch}</span>
                {showSearchCursor ? (
                  <span className="ml-0.5 inline-block h-4 w-2 animate-pulse bg-zinc-300 align-[-0.12em]" />
                ) : null}
                {isFiltered ? (
                  <span className="ml-1 text-zinc-500">(1 match)</span>
                ) : null}
              </p>
              <p className="text-zinc-500">...</p>

              <ul className="mt-1 space-y-0.5">
                {visibleProviders.map((provider) => {
                  const isSketchi = provider === "sketchi (plugin)";
                  const isSelected = isSketchi && shouldHighlightSketchi;

                  return (
                    <li
                      className={
                        isSelected ? "text-emerald-300" : "text-zinc-400"
                      }
                      key={provider}
                    >
                      {isSelected ? "*" : "o"} {provider}
                    </li>
                  );
                })}
              </ul>

              <p className="mt-2 text-xs text-zinc-500">
                up/down to select • Enter: confirm • Type: to search
              </p>
              <p className="text-zinc-500">+</p>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
