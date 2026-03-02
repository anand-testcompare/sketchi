const RECENTS_KEY = "sketchi.diagramRecents.v1";
const MAX_RECENTS = 30;

export interface DiagramRecent {
  sessionId: string;
  visitedAt: number;
}

function isDiagramRecent(value: unknown): value is DiagramRecent {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as DiagramRecent).sessionId === "string" &&
    typeof (value as DiagramRecent).visitedAt === "number"
  );
}

export function readDiagramRecents(limit = MAX_RECENTS): DiagramRecent[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = localStorage.getItem(RECENTS_KEY);
    if (!raw) {
      return [];
    }

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter(isDiagramRecent)
      .sort((left, right) => right.visitedAt - left.visitedAt)
      .slice(0, Math.max(1, limit));
  } catch {
    return [];
  }
}

export function writeDiagramRecents(recents: DiagramRecent[]): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.setItem(
      RECENTS_KEY,
      JSON.stringify(recents.slice(0, MAX_RECENTS))
    );
  } catch {
    // ignore localStorage failures
  }
}

export function addDiagramRecent(
  sessionId: string,
  visitedAt = Date.now()
): void {
  const next = [
    { sessionId, visitedAt },
    ...readDiagramRecents().filter((recent) => recent.sessionId !== sessionId),
  ].slice(0, MAX_RECENTS);

  writeDiagramRecents(next);
}

export function removeDiagramRecent(sessionId: string): DiagramRecent[] {
  const next = readDiagramRecents().filter(
    (recent) => recent.sessionId !== sessionId
  );
  writeDiagramRecents(next);
  return next;
}

export function clearDiagramRecents(): void {
  writeDiagramRecents([]);
}
