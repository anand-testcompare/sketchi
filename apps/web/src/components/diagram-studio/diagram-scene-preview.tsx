"use client";

import { Image as ImageIcon } from "lucide-react";
import { useMemo } from "react";

interface ScenePreview {
  appState: Record<string, unknown>;
  elements: Record<string, unknown>[];
}

interface DiagramScenePreviewProps {
  scene: ScenePreview | null;
}

interface Transform {
  offsetX: number;
  offsetY: number;
  scale: number;
}

const CANVAS_HEIGHT = 180;
const CANVAS_WIDTH = 320;
const MAX_RENDERED_ELEMENTS = 120;
const PADDING = 12;

function asNumber(value: unknown): number | null {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return null;
  }
  return value;
}

function asString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function getElementBounds(element: Record<string, unknown>) {
  const x = asNumber(element.x);
  const y = asNumber(element.y);
  if (x === null || y === null) {
    return null;
  }

  const points = Array.isArray(element.points)
    ? (element.points as unknown[])
    : null;
  if (points && points.length > 1) {
    let minX = x;
    let minY = y;
    let maxX = x;
    let maxY = y;

    for (const point of points) {
      if (!Array.isArray(point) || point.length < 2) {
        continue;
      }

      const pointX = asNumber(point[0]);
      const pointY = asNumber(point[1]);
      if (pointX === null || pointY === null) {
        continue;
      }

      minX = Math.min(minX, x + pointX);
      minY = Math.min(minY, y + pointY);
      maxX = Math.max(maxX, x + pointX);
      maxY = Math.max(maxY, y + pointY);
    }

    return { maxX, maxY, minX, minY };
  }

  const width = asNumber(element.width) ?? 0;
  const height = asNumber(element.height) ?? 0;
  return {
    maxX: Math.max(x, x + width),
    maxY: Math.max(y, y + height),
    minX: Math.min(x, x + width),
    minY: Math.min(y, y + height),
  };
}

function createTransform(
  elements: Record<string, unknown>[]
): Transform | null {
  const bounds = elements
    .map((element) => getElementBounds(element))
    .filter((bound): bound is NonNullable<typeof bound> => bound !== null);

  if (bounds.length === 0) {
    return null;
  }

  const minX = Math.min(...bounds.map((bound) => bound.minX));
  const minY = Math.min(...bounds.map((bound) => bound.minY));
  const maxX = Math.max(...bounds.map((bound) => bound.maxX));
  const maxY = Math.max(...bounds.map((bound) => bound.maxY));

  const worldWidth = Math.max(1, maxX - minX);
  const worldHeight = Math.max(1, maxY - minY);
  const scale = Math.min(
    (CANVAS_WIDTH - PADDING * 2) / worldWidth,
    (CANVAS_HEIGHT - PADDING * 2) / worldHeight
  );

  const contentWidth = worldWidth * scale;
  const contentHeight = worldHeight * scale;
  return {
    offsetX: (CANVAS_WIDTH - contentWidth) / 2 - minX * scale,
    offsetY: (CANVAS_HEIGHT - contentHeight) / 2 - minY * scale,
    scale,
  };
}

function getElementKey(
  element: Record<string, unknown>,
  index: number
): string {
  const elementId = asString(element.id);
  if (elementId) {
    return elementId;
  }
  return `element-${index}-${asString(element.type) ?? "shape"}`;
}

function renderPolyline(input: {
  element: Record<string, unknown>;
  key: string;
  opacity: number;
  strokeColor: string;
  strokeWidth: number;
  toX: (value: number) => number;
  toY: (value: number) => number;
}) {
  const x = asNumber(input.element.x);
  const y = asNumber(input.element.y);
  if (x === null || y === null) {
    return null;
  }

  const points = Array.isArray(input.element.points)
    ? (input.element.points as unknown[])
    : [];
  const mappedPoints = points
    .map((point) => {
      if (!Array.isArray(point) || point.length < 2) {
        return null;
      }

      const pointX = asNumber(point[0]);
      const pointY = asNumber(point[1]);
      if (pointX === null || pointY === null) {
        return null;
      }

      return `${input.toX(x + pointX)},${input.toY(y + pointY)}`;
    })
    .filter((point): point is string => point !== null);

  if (mappedPoints.length < 2) {
    return null;
  }

  return (
    <polyline
      fill="none"
      key={input.key}
      opacity={input.opacity}
      points={mappedPoints.join(" ")}
      stroke={input.strokeColor}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={input.strokeWidth}
    />
  );
}

function renderRectangle(input: {
  element: Record<string, unknown>;
  fill: string;
  key: string;
  opacity: number;
  strokeColor: string;
  strokeWidth: number;
  transform: Transform;
}) {
  const x = asNumber(input.element.x);
  const y = asNumber(input.element.y);
  if (x === null || y === null) {
    return null;
  }

  const width = Math.max(1, asNumber(input.element.width) ?? 1);
  const height = Math.max(1, asNumber(input.element.height) ?? 1);

  const scaledX = x * input.transform.scale + input.transform.offsetX;
  const scaledY = y * input.transform.scale + input.transform.offsetY;
  const scaledWidth = width * input.transform.scale;
  const scaledHeight = height * input.transform.scale;

  return (
    <rect
      fill={input.fill}
      height={scaledHeight}
      key={input.key}
      opacity={input.opacity}
      rx={3}
      stroke={input.strokeColor}
      strokeWidth={input.strokeWidth}
      width={scaledWidth}
      x={scaledX}
      y={scaledY}
    />
  );
}

export function DiagramScenePreview({ scene }: DiagramScenePreviewProps) {
  const previewElements = useMemo(
    () =>
      scene?.elements
        ?.filter((element) => element?.isDeleted !== true)
        .slice(0, MAX_RENDERED_ELEMENTS) ?? [],
    [scene]
  );

  const transform = useMemo(
    () => createTransform(previewElements),
    [previewElements]
  );

  const backgroundColor =
    asString(scene?.appState?.viewBackgroundColor) ?? "transparent";

  if (!(scene && previewElements.length > 0 && transform)) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-muted/30">
        <ImageIcon className="size-6 text-muted-foreground/40" />
      </div>
    );
  }

  const toX = (value: number) => value * transform.scale + transform.offsetX;
  const toY = (value: number) => value * transform.scale + transform.offsetY;

  return (
    <svg
      aria-label="Diagram preview"
      className="h-full w-full"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}
    >
      <rect
        fill={backgroundColor}
        height={CANVAS_HEIGHT}
        width={CANVAS_WIDTH}
        x={0}
        y={0}
      />

      {previewElements.map((element, index) => {
        const type = asString(element.type) ?? "rectangle";
        const strokeColor = asString(element.strokeColor) ?? "#757575";
        const fillColor = asString(element.backgroundColor) ?? "transparent";
        const opacity = Math.max(
          0.1,
          Math.min(1, (asNumber(element.opacity) ?? 100) / 100)
        );
        const strokeWidth = Math.max(
          0.5,
          (asNumber(element.strokeWidth) ?? 1) * Math.max(0.8, transform.scale)
        );
        const key = getElementKey(element, index);

        if (type === "line" || type === "arrow" || type === "draw") {
          return renderPolyline({
            element,
            key,
            opacity,
            strokeColor,
            strokeWidth,
            toX,
            toY,
          });
        }

        return renderRectangle({
          element,
          fill: fillColor,
          key,
          opacity,
          strokeColor,
          strokeWidth,
          transform,
        });
      })}
    </svg>
  );
}
