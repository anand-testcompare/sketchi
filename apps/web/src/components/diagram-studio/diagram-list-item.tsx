"use client";

import { CalendarClock, Check, Clock, Pencil, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { DiagramScenePreview } from "@/components/diagram-studio/diagram-scene-preview";
import { Button } from "@/components/ui/button";

export type DiagramListSource = "local" | "opencode" | "sketchi";

export interface DiagramListCard {
  context: string | null;
  createdAt: number | null;
  diagramType: string | null;
  hasRenderableContent: boolean | null;
  hasScene: boolean;
  latestSceneVersion: number | null;
  localOnly: boolean;
  previewScene: {
    appState: Record<string, unknown>;
    elements: Record<string, unknown>[];
    files?: Record<string, unknown>;
  } | null;
  sessionId: string;
  source: DiagramListSource;
  title: string;
  updatedAt: number | null;
  visitedAt: number | null;
}

interface DiagramListItemProps {
  editingTitle: string;
  isEditing: boolean;
  isSavingTitle: boolean;
  item: DiagramListCard;
  onCancelRename: () => void;
  onEditingTitleChange: (value: string) => void;
  onOpen: (sessionId: string) => void;
  onRemoveLocalRecent: (sessionId: string) => void;
  onSaveRename: (sessionId: string) => Promise<void>;
  onStartRename: (item: DiagramListCard) => void;
}

const DIAGRAM_TYPE_SPLIT_PATTERN = /[-_\s]+/;

function relativeTime(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) {
    return "just now";
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);
  if (days < 30) {
    return `${days}d ago`;
  }

  return `${Math.floor(days / 30)}mo ago`;
}

function formatTimestamp(timestamp: number | null): string | null {
  if (!timestamp) {
    return null;
  }

  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(timestamp));
}

function formatDiagramType(value: string | null): string | null {
  if (!value) {
    return null;
  }

  return value
    .split(DIAGRAM_TYPE_SPLIT_PATTERN)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function getSourceLabel(source: DiagramListSource): string {
  if (source === "opencode") {
    return "OpenCode";
  }
  if (source === "local") {
    return "Local";
  }
  return "Sketchi";
}

function getUpdatedLabel(item: DiagramListCard): string | null {
  if (item.updatedAt) {
    return relativeTime(item.updatedAt);
  }
  if (item.visitedAt) {
    return relativeTime(item.visitedAt);
  }
  return null;
}

function getContextLabel(item: DiagramListCard): string {
  if (item.context) {
    return item.context;
  }
  if (item.localOnly) {
    return "Local recent from this browser";
  }
  return "No prompt context yet";
}

function SourceBadge({ source }: { source: DiagramListSource }) {
  if (source === "opencode") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-muted/30 px-2 py-0.5 text-[11px] text-muted-foreground">
        <Image
          alt="OpenCode"
          className="block dark:hidden"
          height={12}
          src="/icons/opencode-logo-light-svg.svg"
          width={12}
        />
        <Image
          alt="OpenCode"
          className="hidden dark:block"
          height={12}
          src="/icons/opencode-logo-dark-svg.svg"
          width={12}
        />
        OpenCode
      </span>
    );
  }

  if (source === "local") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-muted/30 px-2 py-0.5 text-[11px] text-muted-foreground">
        <Clock className="size-3" />
        Local
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-muted/30 px-2 py-0.5 text-[11px] text-muted-foreground">
      <Image alt="Sketchi" height={12} src="/icons/logo.svg" width={12} />
      Sketchi
    </span>
  );
}

function DiagramTitleEditor({
  isSavingTitle,
  onCancel,
  onChange,
  onSave,
  value,
}: {
  isSavingTitle: boolean;
  onCancel: () => void;
  onChange: (value: string) => void;
  onSave: () => Promise<void>;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        autoFocus
        className="h-8 min-w-0 rounded-md border border-border bg-background px-2 text-sm"
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            onSave().catch(() => undefined);
          }
          if (event.key === "Escape") {
            event.preventDefault();
            onCancel();
          }
        }}
        value={value}
      />
      <Button
        aria-label="Save diagram title"
        disabled={isSavingTitle}
        onClick={(event) => {
          event.preventDefault();
          onSave().catch(() => undefined);
        }}
        size="icon-xs"
        type="button"
        variant="ghost"
      >
        <Check className="size-3.5" />
      </Button>
      <Button
        aria-label="Cancel renaming diagram"
        disabled={isSavingTitle}
        onClick={(event) => {
          event.preventDefault();
          onCancel();
        }}
        size="icon-xs"
        type="button"
        variant="ghost"
      >
        <X className="size-3.5" />
      </Button>
    </div>
  );
}

function DiagramCardContent({
  contextLabel,
  createdLabel,
  item,
  originLabel,
  title,
  typeLabel,
  updatedLabel,
}: {
  contextLabel: string;
  createdLabel: string | null;
  item: DiagramListCard;
  originLabel: string;
  title: React.ReactNode;
  typeLabel: string | null;
  updatedLabel: string | null;
}) {
  return (
    <div className="flex flex-col gap-3 p-3 sm:flex-row sm:items-stretch sm:gap-4 sm:p-4">
      <div className="order-2 min-w-0 flex-1 sm:order-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1.5">
            {title}

            <div className="flex flex-wrap items-center gap-2">
              <SourceBadge source={item.source} />
              {typeLabel ? (
                <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                  {typeLabel}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <p className="mt-2 line-clamp-1 text-muted-foreground text-sm">
          {contextLabel}
        </p>

        <div className="mt-2 flex flex-wrap items-center gap-3 text-muted-foreground text-xs">
          {updatedLabel ? (
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3" />
              Updated {updatedLabel}
            </span>
          ) : null}
          {createdLabel ? (
            <span className="inline-flex items-center gap-1">
              <CalendarClock className="size-3" />
              Created {createdLabel}
            </span>
          ) : null}
          {item.latestSceneVersion === null ? null : (
            <span>v{item.latestSceneVersion}</span>
          )}
          <span>{originLabel}</span>
        </div>

        <div className="mt-2 flex items-center gap-2">
          <span className="inline-flex items-center rounded-md border border-border px-2 py-1 font-medium text-xs transition-colors group-hover:bg-muted">
            Open Diagram
          </span>
        </div>
      </div>

      <div className="order-1 h-28 overflow-hidden rounded-xl border bg-muted/20 sm:order-2 sm:h-auto sm:w-56">
        <DiagramScenePreview scene={item.hasScene ? item.previewScene : null} />
      </div>
    </div>
  );
}

export function DiagramListItem({
  editingTitle,
  isEditing,
  isSavingTitle,
  item,
  onCancelRename,
  onEditingTitleChange,
  onOpen,
  onRemoveLocalRecent,
  onSaveRename,
  onStartRename,
}: DiagramListItemProps) {
  const canRename = !(item.localOnly || isEditing);
  const contextLabel = getContextLabel(item);
  const createdLabel = formatTimestamp(item.createdAt);
  const originLabel = getSourceLabel(item.source);
  const typeLabel = formatDiagramType(item.diagramType);
  const updatedLabel = getUpdatedLabel(item);

  return (
    <li
      className="group relative rounded-2xl border-2 bg-card shadow-sm transition-colors hover:bg-muted/20"
      data-testid="diagram-recents-item"
      key={item.sessionId}
    >
      {canRename ? (
        <Button
          aria-label={`Rename ${item.title}`}
          className="absolute top-3 right-3 z-10 text-muted-foreground opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
          onClick={(event) => {
            event.preventDefault();
            onStartRename(item);
          }}
          size="icon-xs"
          type="button"
          variant="ghost"
        >
          <Pencil className="size-3" />
        </Button>
      ) : null}

      {item.localOnly ? (
        <Button
          aria-label={`Remove local recent ${item.title}`}
          className="absolute top-3 right-3 z-10 text-muted-foreground"
          onClick={(event) => {
            event.preventDefault();
            onRemoveLocalRecent(item.sessionId);
          }}
          size="icon-xs"
          type="button"
          variant="ghost"
        >
          <X className="size-3" />
        </Button>
      ) : null}

      {isEditing ? (
        <DiagramCardContent
          contextLabel={contextLabel}
          createdLabel={createdLabel}
          item={item}
          originLabel={originLabel}
          title={
            <DiagramTitleEditor
              isSavingTitle={isSavingTitle}
              onCancel={onCancelRename}
              onChange={onEditingTitleChange}
              onSave={() => onSaveRename(item.sessionId)}
              value={editingTitle}
            />
          }
          typeLabel={typeLabel}
          updatedLabel={updatedLabel}
        />
      ) : (
        <Link
          aria-label={`Open diagram ${item.title}`}
          className="block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          data-testid="diagram-recents-open-link"
          href={`/diagrams/${item.sessionId}` as never}
          onClick={() => onOpen(item.sessionId)}
        >
          <DiagramCardContent
            contextLabel={contextLabel}
            createdLabel={createdLabel}
            item={item}
            originLabel={originLabel}
            title={
              <h3 className="truncate font-semibold text-base leading-tight">
                {item.title}
              </h3>
            }
            typeLabel={typeLabel}
            updatedLabel={updatedLabel}
          />
        </Link>
      )}
    </li>
  );
}
