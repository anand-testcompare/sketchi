import { describe, expect, test } from "vitest";
import {
  applyDiagramDiff,
  type ExcalidrawElementLike,
  validateElements,
} from "./diagram-modification";

function buildElements(): ExcalidrawElementLike[] {
  return [
    {
      id: "api",
      type: "rectangle",
      x: 0,
      y: 0,
      boundElements: [{ id: "arrow-1", type: "arrow" }],
    },
    {
      id: "db",
      type: "rectangle",
      x: 240,
      y: 0,
      boundElements: [{ id: "arrow-1", type: "arrow" }],
    },
    {
      id: "worker",
      type: "rectangle",
      x: 480,
      y: 0,
      boundElements: null,
    },
    {
      id: "arrow-1",
      type: "arrow",
      x: 120,
      y: 40,
      points: [
        [0, 0],
        [120, 0],
      ],
      startBinding: { elementId: "api", focus: 0, gap: 6 },
      endBinding: { elementId: "db", focus: 0, gap: 6 },
    },
  ];
}

describe("diagram-modification binding validation", () => {
  test("flags shapes that still list arrows which are no longer bound back", () => {
    const elements = buildElements().map((element) =>
      element.id === "arrow-1"
        ? { ...element, startBinding: undefined, endBinding: undefined }
        : element
    );

    const issues = validateElements(elements);

    expect(
      issues.some((issue) => issue.code === "inconsistent-bound-elements")
    ).toBe(true);
  });

  test("rejects diffs that rebind arrows without updating reciprocal boundElements", () => {
    const result = applyDiagramDiff(buildElements(), {
      modify: [
        {
          id: "arrow-1",
          changes: {
            endBinding: { elementId: "worker", focus: 0, gap: 6 },
          },
        },
      ],
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected inconsistent diff to fail");
    }

    expect(
      result.issues.some(
        (issue) =>
          issue.code === "inconsistent-arrow-binding" ||
          issue.code === "inconsistent-bound-elements"
      )
    ).toBe(true);
  });
});

describe("applyDiagramDiff change tracking", () => {
  test("does not report modifiedIds for empty changes", () => {
    const elements = [
      { id: "a", type: "rectangle", backgroundColor: "#ffffff" },
    ] as unknown as Parameters<typeof applyDiagramDiff>[0];

    const result = applyDiagramDiff(elements, {
      modify: [{ id: "a", changes: {} }],
    });

    expect(result.ok).toBe(true);
    expect(result.ok && result.changes.modifiedIds).toEqual([]);
  });

  test("does not report modifiedIds when patch values are identical", () => {
    const elements = [
      { id: "a", type: "rectangle", backgroundColor: "#ffffff" },
    ] as unknown as Parameters<typeof applyDiagramDiff>[0];

    const result = applyDiagramDiff(elements, {
      modify: [{ id: "a", changes: { backgroundColor: "#ffffff" } }],
    });

    expect(result.ok).toBe(true);
    expect(result.ok && result.changes.modifiedIds).toEqual([]);
  });

  test("reports modifiedIds when a value actually changes", () => {
    const elements = [
      { id: "a", type: "rectangle", backgroundColor: "#ffffff" },
    ] as unknown as Parameters<typeof applyDiagramDiff>[0];

    const result = applyDiagramDiff(elements, {
      modify: [{ id: "a", changes: { backgroundColor: "#000000" } }],
    });

    expect(result.ok).toBe(true);
    expect(result.ok && result.changes.modifiedIds).toEqual(["a"]);
    expect(result.ok && result.elements[0]?.backgroundColor).toBe("#000000");
  });
});
