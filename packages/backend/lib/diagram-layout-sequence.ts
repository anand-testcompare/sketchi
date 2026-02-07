import type {
  IntermediateEdge,
  IntermediateFormat,
  IntermediateNode,
} from "./diagram-intermediate";
import type { LayoutedDiagram, LayoutOverrides } from "./diagram-layout-types";
import type { ArrowElement, Diagram, ShapeElement } from "./diagram-structure";

const LIFELINE_SUFFIX = "__lifeline";
const DEFAULT_HEADER_WIDTH = 180;
const DEFAULT_HEADER_HEIGHT = 80;
const MIN_LIFELINE_HEIGHT = 220;

function toLifelineId(participantId: string): string {
  return `${participantId}${LIFELINE_SUFFIX}`;
}

function toParticipantId(id: string): string {
  return id.endsWith(LIFELINE_SUFFIX)
    ? id.slice(0, -LIFELINE_SUFFIX.length)
    : id;
}

function resolveNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function resolveNodeWidth(node: IntermediateNode): number | undefined {
  return resolveNumber(node.metadata?.width);
}

function resolveNodeHeight(node: IntermediateNode): number | undefined {
  return resolveNumber(node.metadata?.height);
}

function resolveNodeColor(node: IntermediateNode): string | undefined {
  const color = node.metadata?.color ?? node.metadata?.backgroundColor;
  return typeof color === "string" ? color : undefined;
}

function stableStringCompare(a: string, b: string): number {
  if (a === b) {
    return 0;
  }
  return a < b ? -1 : 1;
}

function resolveParticipantOrder(options: {
  nodes: IntermediateNode[];
  edges: IntermediateEdge[];
}): string[] {
  const nodeIds = new Set(options.nodes.map((node) => node.id));
  const seen = new Set<string>();
  const ordered: string[] = [];

  for (const edge of options.edges) {
    for (const id of [edge.fromId, edge.toId]) {
      if (!nodeIds.has(id)) {
        continue;
      }
      if (seen.has(id)) {
        continue;
      }
      seen.add(id);
      ordered.push(id);
    }
  }

  const remaining = options.nodes
    .map((node) => node.id)
    .filter((id) => !seen.has(id))
    .sort(stableStringCompare);

  return [...ordered, ...remaining];
}

export function convertIntermediateToSequenceDiagram(
  intermediate: IntermediateFormat
): Diagram {
  const participantIds = resolveParticipantOrder({
    nodes: intermediate.nodes,
    edges: intermediate.edges,
  });
  const nodeById = new Map(intermediate.nodes.map((node) => [node.id, node]));

  const shapes: ShapeElement[] = [];
  for (const participantId of participantIds) {
    const node = nodeById.get(participantId);
    if (!node) {
      continue;
    }

    shapes.push({
      type: "rectangle",
      id: node.id,
      label: { text: node.label },
      backgroundColor: resolveNodeColor(node),
      width: resolveNodeWidth(node),
      height: resolveNodeHeight(node),
    });

    shapes.push({
      type: "rectangle",
      id: toLifelineId(node.id),
      backgroundColor: "transparent",
      width: 12,
      height: 240,
    });
  }

  const arrows: ArrowElement[] = intermediate.edges.map((edge, index) => ({
    id: edge.id ?? `seq_msg_${index}_${edge.fromId}_${edge.toId}`,
    fromId: toLifelineId(edge.fromId),
    toId: toLifelineId(edge.toId),
    label: edge.label ? { text: edge.label } : undefined,
  }));

  return { shapes, arrows };
}

function clamp(value: number, min: number, max: number): number {
  if (value < min) {
    return min;
  }
  if (value > max) {
    return max;
  }
  return value;
}

function buildShapeMap(shapes: ShapeElement[]): Map<string, ShapeElement> {
  return new Map(shapes.map((shape) => [shape.id, shape]));
}

function resolveParticipantIds(diagram: Diagram): string[] {
  const participantsFromShapes = new Set<string>(
    diagram.shapes.map((shape) => toParticipantId(shape.id))
  );

  const ordered: string[] = [];
  const seen = new Set<string>();
  for (const arrow of diagram.arrows) {
    const from = toParticipantId(arrow.fromId);
    const to = toParticipantId(arrow.toId);
    for (const participant of [from, to]) {
      if (!participantsFromShapes.has(participant)) {
        continue;
      }
      if (seen.has(participant)) {
        continue;
      }
      seen.add(participant);
      ordered.push(participant);
    }
  }

  const remaining = [...participantsFromShapes]
    .filter((id) => !seen.has(id))
    .sort(stableStringCompare);

  return [...ordered, ...remaining];
}

function computeMaxHeaderSize(options: {
  participantIds: string[];
  shapesById: Map<string, ShapeElement>;
}): { maxHeaderWidth: number; maxHeaderHeight: number } {
  let maxHeaderWidth = 0;
  let maxHeaderHeight = 0;

  for (const participantId of options.participantIds) {
    const header = options.shapesById.get(participantId);
    if (!header) {
      continue;
    }
    maxHeaderWidth = Math.max(maxHeaderWidth, header.width ?? 0);
    maxHeaderHeight = Math.max(maxHeaderHeight, header.height ?? 0);
  }

  return {
    maxHeaderWidth: maxHeaderWidth || DEFAULT_HEADER_WIDTH,
    maxHeaderHeight: maxHeaderHeight || DEFAULT_HEADER_HEIGHT,
  };
}

function computeLifelineHeight(options: {
  messageCount: number;
  firstMessageY: number;
  messageGap: number;
  lifelineY: number;
  bottomMargin: number;
}): number {
  if (options.messageCount <= 0) {
    return Math.max(MIN_LIFELINE_HEIGHT, 240);
  }

  const lastMessageY =
    options.firstMessageY + (options.messageCount - 1) * options.messageGap;
  return Math.max(
    MIN_LIFELINE_HEIGHT,
    lastMessageY - options.lifelineY + options.bottomMargin
  );
}

function layoutParticipantShapes(options: {
  participantIds: string[];
  shapesById: Map<string, ShapeElement>;
  maxHeaderWidth: number;
  topMargin: number;
  leftMargin: number;
  lifelineY: number;
  lifelineWidth: number;
  lifelineHeight: number;
  columnStep: number;
}): {
  shapes: LayoutedDiagram["shapes"];
  centerXByParticipant: Map<string, number>;
} {
  const shapes: LayoutedDiagram["shapes"] = [];
  const centerXByParticipant = new Map<string, number>();

  for (const [index, participantId] of options.participantIds.entries()) {
    const centerX =
      options.leftMargin +
      index * options.columnStep +
      options.maxHeaderWidth / 2;

    const header = options.shapesById.get(participantId);
    if (header) {
      const width = header.width ?? DEFAULT_HEADER_WIDTH;
      const height = header.height ?? DEFAULT_HEADER_HEIGHT;
      shapes.push({
        ...header,
        x: centerX - width / 2,
        y: options.topMargin,
        width,
        height,
      });
    }

    const lifelineId = toLifelineId(participantId);
    const lifeline = options.shapesById.get(lifelineId);
    if (lifeline) {
      shapes.push({
        ...lifeline,
        x: centerX - options.lifelineWidth / 2,
        y: options.lifelineY,
        width: options.lifelineWidth,
        height: options.lifelineHeight,
      });
    }

    if (header || lifeline) {
      centerXByParticipant.set(participantId, centerX);
    }
  }

  return { shapes, centerXByParticipant };
}

function layoutMessageArrows(options: {
  arrows: ArrowElement[];
  shapesById: Map<string, ShapeElement>;
  centerXByParticipant: Map<string, number>;
  firstMessageY: number;
  messageGap: number;
  fallbackCenterX: number;
}): LayoutedDiagram["arrows"] {
  const resolveAnchorId = (id: string): string => {
    const participant = toParticipantId(id);
    const lifelineId = toLifelineId(participant);
    return options.shapesById.has(lifelineId) ? lifelineId : id;
  };

  const resolveCenterX = (shapeId: string): number => {
    const participantId = toParticipantId(shapeId);
    return (
      options.centerXByParticipant.get(participantId) ?? options.fallbackCenterX
    );
  };

  return options.arrows.map((arrow, index) => {
    const y = options.firstMessageY + index * options.messageGap;
    const fromId = resolveAnchorId(arrow.fromId);
    const toId = resolveAnchorId(arrow.toId);
    const startX = resolveCenterX(fromId);
    const endX = resolveCenterX(toId);
    const width = endX - startX;

    return {
      ...arrow,
      fromId,
      toId,
      x: startX,
      y,
      width,
      height: 0,
      points: [
        [0, 0],
        [width, 0],
      ],
      elbowed: false,
    };
  });
}

function appendUnpositionedShapes(options: {
  allShapes: ShapeElement[];
  alreadyPositioned: LayoutedDiagram["shapes"];
}): LayoutedDiagram["shapes"] {
  const positionedIds = new Set(
    options.alreadyPositioned.map((shape) => shape.id)
  );
  const output = [...options.alreadyPositioned];

  for (const shape of options.allShapes) {
    if (positionedIds.has(shape.id)) {
      continue;
    }
    output.push({
      ...shape,
      x: 0,
      y: 0,
      width: shape.width ?? DEFAULT_HEADER_WIDTH,
      height: shape.height ?? DEFAULT_HEADER_HEIGHT,
    });
  }

  return output;
}

export function applySequenceLayout(
  diagram: Diagram,
  overrides?: LayoutOverrides
): LayoutedDiagram {
  const topMargin = 40;
  const leftMargin = 60;
  const bottomMargin = 80;
  const headerToLifelineGap = 20;
  const messageTopGap = 40;
  const lifelineWidth = 12;

  // Sequence diagrams need generous spacing for arrow labels and chronology clarity.
  // Template-provided defaults tend to be too tight, so we clamp to a higher minimum.
  const participantGap = clamp(overrides?.nodesep ?? 200, 160, 500);
  const messageGap = clamp(overrides?.ranksep ?? 110, 110, 400);

  const shapesById = buildShapeMap(diagram.shapes);
  const participantIds = resolveParticipantIds(diagram);
  const { maxHeaderWidth, maxHeaderHeight } = computeMaxHeaderSize({
    participantIds,
    shapesById,
  });

  const columnStep = maxHeaderWidth + participantGap;
  const lifelineY = topMargin + maxHeaderHeight + headerToLifelineGap;
  const firstMessageY = lifelineY + messageTopGap;
  const lifelineHeight = computeLifelineHeight({
    messageCount: diagram.arrows.length,
    firstMessageY,
    messageGap,
    lifelineY,
    bottomMargin,
  });

  const { shapes: positionedParticipantShapes, centerXByParticipant } =
    layoutParticipantShapes({
      participantIds,
      shapesById,
      maxHeaderWidth,
      topMargin,
      leftMargin,
      lifelineY,
      lifelineWidth,
      lifelineHeight,
      columnStep,
    });

  const arrows = layoutMessageArrows({
    arrows: diagram.arrows,
    shapesById,
    centerXByParticipant,
    firstMessageY,
    messageGap,
    fallbackCenterX: leftMargin,
  });

  const shapes = appendUnpositionedShapes({
    allShapes: diagram.shapes,
    alreadyPositioned: positionedParticipantShapes,
  });

  return { shapes, arrows };
}
