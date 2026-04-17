"use client";

import { Excalidraw } from "@excalidraw/excalidraw";
import type {
  BinaryFiles,
  ExcalidrawImperativeAPI,
  ExcalidrawInitialDataState,
} from "@excalidraw/excalidraw/types";
import "@excalidraw/excalidraw/index.css";
import { useTheme } from "next-themes";

interface ExcalidrawWrapperProps {
  initialScene?: {
    elements: readonly Record<string, unknown>[];
    appState: Record<string, unknown>;
    files?: Record<string, unknown>;
  } | null;
  onChange?: (
    elements: readonly Record<string, unknown>[],
    appState: Record<string, unknown>,
    files: BinaryFiles
  ) => void;
  onReady?: (api: ExcalidrawImperativeAPI) => void;
  suppressOnChangeRef?: React.RefObject<boolean>;
}

export default function ExcalidrawWrapper({
  initialScene,
  onReady,
  onChange,
  suppressOnChangeRef,
}: ExcalidrawWrapperProps) {
  const { resolvedTheme } = useTheme();

  const initialData: ExcalidrawInitialDataState | undefined = initialScene
    ? {
        elements:
          initialScene.elements as ExcalidrawInitialDataState["elements"],
        appState:
          initialScene.appState as ExcalidrawInitialDataState["appState"],
        files: initialScene.files as ExcalidrawInitialDataState["files"],
      }
    : undefined;

  return (
    <div className="h-full w-full" data-testid="diagram-canvas">
      <Excalidraw
        excalidrawAPI={(api) => {
          if (typeof window !== "undefined") {
            (window as unknown as Record<string, unknown>).__excalidrawAPI =
              api;
          }
          onReady?.(api);
        }}
        initialData={initialData}
        onChange={(elements, appState, files) => {
          if (suppressOnChangeRef?.current) {
            return;
          }
          onChange?.(
            elements as unknown as readonly Record<string, unknown>[],
            appState as unknown as Record<string, unknown>,
            files
          );
        }}
        theme={resolvedTheme === "dark" ? "dark" : "light"}
      />
    </div>
  );
}
