"use client";

import { api } from "@sketchi/backend/convex/_generated/api";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { ArrowRight, Clock, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import {
  type DiagramListCard,
  DiagramListItem,
  type DiagramListSource,
} from "@/components/diagram-studio/diagram-list-item";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  addDiagramRecent,
  clearDiagramRecents,
  type DiagramRecent,
  readDiagramRecents,
  removeDiagramRecent,
} from "@/lib/diagram-recents";

type SessionSource = "opencode" | "sketchi";

interface SessionPreview {
  appState: Record<string, unknown>;
  elements: Record<string, unknown>[];
  files?: Record<string, unknown>;
}

interface CloudDiagram {
  createdAt: number;
  diagramType: string | null;
  firstPrompt: string | null;
  hasRenderableContent: boolean;
  hasScene: boolean;
  lastPrompt: string | null;
  latestSceneVersion: number;
  previewScene: SessionPreview | null;
  sessionId: string;
  source: SessionSource;
  title: string;
  updatedAt: number;
}

function asCloudDiagramArray(value: unknown): CloudDiagram[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is CloudDiagram => {
    if (!(item && typeof item === "object")) {
      return false;
    }

    const candidate = item as CloudDiagram;
    return (
      typeof candidate.sessionId === "string" &&
      typeof candidate.title === "string" &&
      (candidate.source === "sketchi" || candidate.source === "opencode") &&
      typeof candidate.createdAt === "number" &&
      typeof candidate.updatedAt === "number" &&
      typeof candidate.latestSceneVersion === "number" &&
      typeof candidate.hasScene === "boolean" &&
      typeof candidate.hasRenderableContent === "boolean"
    );
  });
}

function isEmptyCard(item: DiagramListCard): boolean {
  if (item.localOnly) {
    return false;
  }
  if (!item.hasScene) {
    return true;
  }
  return item.hasRenderableContent === false;
}

function mergeCards(input: {
  cloudDiagrams: CloudDiagram[];
  localRecents: DiagramRecent[];
}): DiagramListCard[] {
  const localBySession = new Map(
    input.localRecents.map((recent) => [recent.sessionId, recent.visitedAt])
  );

  const merged = new Map<string, DiagramListCard>();

  for (const session of input.cloudDiagrams) {
    merged.set(session.sessionId, {
      context: session.lastPrompt ?? session.firstPrompt,
      createdAt: session.createdAt,
      diagramType: session.diagramType,
      hasRenderableContent: session.hasRenderableContent,
      hasScene: session.hasScene,
      latestSceneVersion: session.latestSceneVersion,
      localOnly: false,
      previewScene: session.previewScene,
      sessionId: session.sessionId,
      source: session.source as DiagramListSource,
      title: session.title,
      updatedAt: session.updatedAt,
      visitedAt: localBySession.get(session.sessionId) ?? null,
    });
  }

  for (const local of input.localRecents) {
    if (merged.has(local.sessionId)) {
      continue;
    }

    merged.set(local.sessionId, {
      context: null,
      createdAt: null,
      diagramType: null,
      hasRenderableContent: null,
      hasScene: false,
      latestSceneVersion: null,
      localOnly: true,
      previewScene: null,
      sessionId: local.sessionId,
      source: "local",
      title: "Local recent",
      updatedAt: null,
      visitedAt: local.visitedAt,
    });
  }

  return Array.from(merged.values()).sort((left, right) => {
    const leftSort = Math.max(left.updatedAt ?? 0, left.visitedAt ?? 0);
    const rightSort = Math.max(right.updatedAt ?? 0, right.visitedAt ?? 0);
    return rightSort - leftSort;
  });
}

export default function DiagramsPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: isAuthLoading } = useConvexAuth();
  const createSession = useMutation(api.diagramSessions.create);
  const renameSession = useMutation(api.diagramSessions.rename);

  const sessionsRaw = useQuery(
    api.diagramSessions.listMine,
    isAuthLoading || !isAuthenticated
      ? "skip"
      : {
          limit: 80,
          previewCount: 3,
        }
  );

  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [hideEmpty, setHideEmpty] = useState(true);
  const [isSavingTitle, setIsSavingTitle] = useState(false);
  const [localRecents, setLocalRecents] = useState<DiagramRecent[]>([]);

  useEffect(() => {
    setLocalRecents(readDiagramRecents());
  }, []);

  const cloudDiagrams = useMemo(
    () => asCloudDiagramArray(sessionsRaw ?? []),
    [sessionsRaw]
  );

  const cards = useMemo(
    () => mergeCards({ cloudDiagrams, localRecents }),
    [cloudDiagrams, localRecents]
  );
  const visibleCards = useMemo(
    () => (hideEmpty ? cards.filter((card) => !isEmptyCard(card)) : cards),
    [cards, hideEmpty]
  );
  const hiddenEmptyCount = cards.length - visibleCards.length;
  const onlyEmptyHidden =
    hideEmpty && cards.length > 0 && visibleCards.length < 1;

  const handleCreate = useCallback(async () => {
    if (isCreating) {
      return;
    }

    setIsCreating(true);
    try {
      const { sessionId } = await createSession({ source: "sketchi" });
      addDiagramRecent(sessionId);
      router.push(`/diagrams/${sessionId}` as never);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to create diagram session.";
      toast.error(message);
    } finally {
      setIsCreating(false);
    }
  }, [createSession, isCreating, router]);

  const handleSaveRename = useCallback(
    async (sessionId: string) => {
      const nextTitle = editingTitle.trim();
      if (!nextTitle) {
        toast.error("Title cannot be empty.");
        return;
      }

      setIsSavingTitle(true);
      try {
        await renameSession({ sessionId, title: nextTitle });
        setEditingSessionId(null);
        setEditingTitle("");
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to rename diagram.";
        toast.error(message);
      } finally {
        setIsSavingTitle(false);
      }
    },
    [editingTitle, renameSession]
  );

  const handleStartRename = useCallback((item: DiagramListCard) => {
    if (item.localOnly) {
      return;
    }

    setEditingSessionId(item.sessionId);
    setEditingTitle(item.title);
  }, []);

  const handleCancelRename = useCallback(() => {
    setEditingSessionId(null);
    setEditingTitle("");
  }, []);

  const handleOpen = useCallback((sessionId: string) => {
    addDiagramRecent(sessionId);
  }, []);

  const handleClearLocalRecents = useCallback(() => {
    clearDiagramRecents();
    setLocalRecents([]);
  }, []);

  const handleRemoveLocalRecent = useCallback((sessionId: string) => {
    const next = removeDiagramRecent(sessionId);
    setLocalRecents(next);
  }, []);

  return (
    <div className="container mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-8 sm:py-10">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-semibold text-2xl tracking-tight sm:text-3xl">
            Diagrams
          </h1>
          <p className="text-muted-foreground text-sm">
            Jump back into any diagram.
          </p>
        </div>

        <Button
          className="font-semibold shadow-sm [border-radius:255px_15px_225px_15px/15px_225px_15px_255px]"
          data-testid="diagram-new-session"
          disabled={isCreating}
          onClick={() => {
            handleCreate().catch(() => undefined);
          }}
          size="default"
          type="button"
        >
          {isCreating ? "Creating..." : "New diagram"}
          <ArrowRight className="ml-1.5 size-4" />
        </Button>
      </header>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-semibold text-base">All diagrams</h2>
          <div className="flex items-center gap-2">
            <Label
              className="cursor-pointer gap-1.5 rounded-md px-2 py-1 text-muted-foreground text-xs hover:bg-muted/50"
              htmlFor="diagram-hide-empty-toggle"
            >
              <Checkbox
                checked={hideEmpty}
                id="diagram-hide-empty-toggle"
                onCheckedChange={(checked) => {
                  setHideEmpty(checked === true);
                }}
              />
              Hide empty
            </Label>

            {localRecents.length > 0 ? (
              <Button
                className="font-medium text-muted-foreground"
                data-testid="diagram-recents-clear"
                onClick={handleClearLocalRecents}
                size="xs"
                type="button"
                variant="ghost"
              >
                <Trash2 className="mr-1 size-3" />
                Clear local recents
              </Button>
            ) : null}
          </div>
        </div>

        {visibleCards.length > 0 ? (
          <ul className="grid gap-3" data-testid="diagram-recents-list">
            {visibleCards.map((item) => (
              <DiagramListItem
                editingTitle={editingTitle}
                isEditing={editingSessionId === item.sessionId}
                isSavingTitle={isSavingTitle}
                item={item}
                key={item.sessionId}
                onCancelRename={handleCancelRename}
                onEditingTitleChange={setEditingTitle}
                onOpen={handleOpen}
                onRemoveLocalRecent={handleRemoveLocalRecent}
                onSaveRename={handleSaveRename}
                onStartRename={handleStartRename}
              />
            ))}
          </ul>
        ) : (
          <div
            className="flex flex-col items-center gap-2 rounded-2xl border-2 border-muted-foreground/30 border-dashed bg-muted/10 py-14 text-center"
            data-testid="diagram-recents-list"
          >
            <Clock className="size-6 text-muted-foreground/40" />
            <p className="font-medium text-muted-foreground text-sm">
              {onlyEmptyHidden ? "No non-empty diagrams." : "No diagrams yet."}
            </p>
            {onlyEmptyHidden ? (
              <Button
                className="font-medium"
                onClick={() => setHideEmpty(false)}
                size="xs"
                type="button"
                variant="outline"
              >
                Show {hiddenEmptyCount} empty diagram
                {hiddenEmptyCount === 1 ? "" : "s"}
              </Button>
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
}
