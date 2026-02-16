import { describe, expect, test } from "bun:test";

import { resolveExcalidrawFromShareUrl } from "./resolve-share-url";

function readHeader(
  headers: RequestInit["headers"],
  name: string
): string | null {
  if (!headers) {
    return null;
  }
  if (headers instanceof Headers) {
    return headers.get(name);
  }
  if (Array.isArray(headers)) {
    const found = headers.find(
      ([key]) => key.toLowerCase() === name.toLowerCase()
    );
    return found ? found[1] : null;
  }
  const record = headers as Record<string, string>;
  for (const [key, value] of Object.entries(record)) {
    if (key.toLowerCase() === name.toLowerCase()) {
      return value;
    }
  }
  return null;
}

describe("resolveExcalidrawFromShareUrl", () => {
  test("uses Sketchi /api/diagrams/parse and forwards x-trace-id", async () => {
    const seen: {
      url?: string;
      headers?: RequestInit["headers"];
      method?: string;
    } = {};

    const result = await resolveExcalidrawFromShareUrl({
      shareUrl: "https://excalidraw.com/#json=abc,def",
      apiBase: "https://preview.sketchi.app",
      traceId: "trace-2",
      deps: {
        fetchJson: <T>(url: string, options: RequestInit) => {
          seen.url = url;
          seen.headers = options.headers;
          seen.method = options.method;
          return { elements: [{ id: "b" }], appState: { theme: "light" } } as T;
        },
      },
    });

    expect(seen.method).toBe("GET");
    expect(seen.url).toContain("/api/diagrams/parse?");
    expect(seen.url).toContain("shareUrl=");
    expect(readHeader(seen.headers, "x-trace-id")).toBe("trace-2");
    expect(result.elements).toEqual([{ id: "b" }]);
    expect(result.appState).toEqual({ theme: "light" });
  });
});
