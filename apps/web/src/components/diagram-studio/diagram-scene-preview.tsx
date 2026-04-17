"use client";

import { Image as ImageIcon, Loader2 } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";

interface ScenePreview {
  appState: Record<string, unknown>;
  elements: Record<string, unknown>[];
  files?: Record<string, unknown>;
}

interface DiagramScenePreviewProps {
  scene: ScenePreview | null;
}

const CANVAS_HEIGHT = 180;
const CANVAS_WIDTH = 320;

export function DiagramScenePreview({ scene }: DiagramScenePreviewProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState(false);

  useEffect(() => {
    if (!(scene && scene.elements.length > 0)) {
      setPreviewUrl(null);
      setIsRendering(false);
      return;
    }

    let isCancelled = false;
    let objectUrl: string | null = null;

    const renderPreview = async () => {
      setIsRendering(true);
      try {
        const { exportToSvg } = await import("@excalidraw/excalidraw");
        const svg = await exportToSvg({
          elements: scene.elements as Parameters<
            typeof exportToSvg
          >[0]["elements"],
          appState: {
            ...scene.appState,
            exportBackground: true,
          } as Parameters<typeof exportToSvg>[0]["appState"],
          files: (scene.files ?? {}) as Parameters<
            typeof exportToSvg
          >[0]["files"],
          exportPadding: 16,
        });

        objectUrl = URL.createObjectURL(
          new Blob([svg.outerHTML], { type: "image/svg+xml" })
        );

        if (!isCancelled) {
          setPreviewUrl(objectUrl);
        }
      } catch {
        if (!isCancelled) {
          setPreviewUrl(null);
        }
      } finally {
        if (!isCancelled) {
          setIsRendering(false);
        }
      }
    };

    renderPreview().catch(() => undefined);

    return () => {
      isCancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [scene]);

  if (!(scene && scene.elements.length > 0)) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-muted/30">
        <ImageIcon className="size-6 text-muted-foreground/40" />
      </div>
    );
  }

  if (!previewUrl) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-muted/30">
        {isRendering ? (
          <Loader2 className="size-6 animate-spin text-muted-foreground/40" />
        ) : (
          <ImageIcon className="size-6 text-muted-foreground/40" />
        )}
      </div>
    );
  }

  return (
    <Image
      alt=""
      className="h-full w-full object-contain"
      height={CANVAS_HEIGHT}
      loading="lazy"
      src={previewUrl}
      unoptimized
      width={CANVAS_WIDTH}
    />
  );
}
