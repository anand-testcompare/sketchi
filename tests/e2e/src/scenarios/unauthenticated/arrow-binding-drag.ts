/**
 * TEST SCENARIO: Arrow binding drag verification
 *
 * Goal: Verify that when a shape is dragged in Excalidraw, connected arrows move with it.
 *
 * Pre-conditions:
 * - P0 binding fix deployed (normalizeArrowBindings)
 * - Dev server running OR STAGEHAND_TARGET_URL set
 *
 * Steps:
 * 1. Generate 2-node diagram with arrow via API
 * 2. Load share link in Excalidraw web
 * 3. Extract arrow endpoint coordinates from scene
 * 4. Drag source shape
 * 5. Extract arrow endpoint coordinates again
 * 6. Assert arrow endpoint moved (coordinates changed)
 *
 * Success:
 * - Arrow endpoint coordinates change after shape drag
 * - Arrow remains visually connected to the shape
 */

import { loadConfig } from "../../runner/config";
import {
  captureScreenshot,
  createStagehand,
  getActivePage,
  shutdown,
} from "../../runner/stagehand";
import { writeScenarioSummary } from "../../runner/summary";
import {
  ensureDesktopViewport,
  finalizeScenario,
  resetBrowserState,
} from "../../runner/utils";
import { sleep, waitForCondition } from "../../runner/wait";

interface ArrowEndpoint {
  x: number;
  y: number;
}

interface ShapeBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface DiagramResponse {
  shareUrl?: string;
  error?: string;
}

async function generateTestDiagram(baseUrl: string): Promise<string> {
  const prompt =
    "Two boxes labeled A and B connected by an arrow from A to B. Simple flowchart.";
  const apiUrl = `${baseUrl}/api/diagram/generate`;

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });

  if (!response.ok) {
    throw new Error(`Failed to generate diagram: ${response.statusText}`);
  }

  const data = (await response.json()) as DiagramResponse;
  if (!data.shareUrl) {
    throw new Error("No share URL returned from diagram generation");
  }

  return data.shareUrl;
}

async function waitForExcalidrawReady(page: {
  evaluate: <T>(fn: () => T) => Promise<T>;
}): Promise<boolean> {
  return await waitForCondition(
    async () => {
      return await page.evaluate(() => {
        const api = (window as { excalidrawAPI?: unknown }).excalidrawAPI;
        if (!api || typeof api !== "object") {
          return false;
        }
        const apiObj = api as { getSceneElements?: () => unknown[] };
        if (typeof apiObj.getSceneElements !== "function") {
          return false;
        }
        const elements = apiObj.getSceneElements();
        return Array.isArray(elements) && elements.length > 0;
      });
    },
    { timeoutMs: 15_000, label: "excalidraw ready" }
  );
}

async function getArrowEndpoint(page: {
  evaluate: <T>(fn: () => T) => Promise<T>;
}): Promise<ArrowEndpoint | null> {
  return await page.evaluate(() => {
    const api = (window as { excalidrawAPI?: unknown }).excalidrawAPI;
    if (!api || typeof api !== "object") {
      return null;
    }

    const apiObj = api as { getSceneElements?: () => unknown[] };
    if (typeof apiObj.getSceneElements !== "function") {
      return null;
    }

    interface ArrowElement {
      type: string;
      x: number;
      y: number;
      points?: [number, number][];
    }

    const elements = apiObj.getSceneElements() as ArrowElement[];
    const arrow = elements.find((e) => e.type === "arrow");
    if (!arrow?.points || arrow.points.length === 0) {
      return null;
    }

    const lastPoint = arrow.points.at(-1);
    if (!lastPoint) {
      return null;
    }

    return {
      x: arrow.x + lastPoint[0],
      y: arrow.y + lastPoint[1],
    };
  });
}

async function getFirstRectangleBounds(page: {
  evaluate: <T>(fn: () => T) => Promise<T>;
}): Promise<ShapeBounds | null> {
  return await page.evaluate(() => {
    const api = (window as { excalidrawAPI?: unknown }).excalidrawAPI;
    if (!api || typeof api !== "object") {
      return null;
    }

    const apiObj = api as { getSceneElements?: () => unknown[] };
    if (typeof apiObj.getSceneElements !== "function") {
      return null;
    }

    interface ShapeElement {
      type: string;
      x: number;
      y: number;
      width: number;
      height: number;
    }

    const elements = apiObj.getSceneElements() as ShapeElement[];
    const rect = elements.find(
      (e) => e.type === "rectangle" || e.type === "ellipse"
    );
    if (!rect) {
      return null;
    }

    return {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
    };
  });
}

async function dragShape(
  // biome-ignore lint/suspicious/noExplicitAny: Playwright Page type varies
  page: any,
  shapeBounds: ShapeBounds,
  offsetX: number,
  offsetY: number
): Promise<void> {
  const centerX = shapeBounds.x + shapeBounds.width / 2;
  const centerY = shapeBounds.y + shapeBounds.height / 2;

  await page.mouse.move(centerX, centerY);
  await page.mouse.down();
  await sleep(100);
  await page.mouse.move(centerX + offsetX, centerY + offsetY, { steps: 10 });
  await page.mouse.up();
}

async function main() {
  const cfg = loadConfig();
  const stagehand = await createStagehand(cfg);
  const warnings: string[] = [];
  const visualIssues: string[] = [];
  const startedAt = new Date().toISOString();
  let status: "passed" | "failed" = "passed";
  let errorMessage = "";

  try {
    const page = await getActivePage(stagehand);
    // biome-ignore lint/suspicious/noExplicitAny: Playwright Page types
    await resetBrowserState(page as any, cfg.baseUrl, cfg.vercelBypassSecret);
    // biome-ignore lint/suspicious/noExplicitAny: Playwright Page types
    await ensureDesktopViewport(page as any);

    console.log("Generating test diagram...");
    const shareUrl = await generateTestDiagram(cfg.baseUrl);
    console.log(`Generated diagram: ${shareUrl}`);

    console.log("Loading diagram in Excalidraw...");
    await page.goto(shareUrl, { waitUntil: "domcontentloaded" });
    await sleep(2000);

    const excalidrawReady = await waitForExcalidrawReady(
      page as Parameters<typeof waitForExcalidrawReady>[0]
    );
    if (!excalidrawReady) {
      throw new Error("Excalidraw did not initialize with scene elements");
    }

    console.log("Extracting initial arrow coordinates...");
    const initialEndpoint = await getArrowEndpoint(
      page as Parameters<typeof getArrowEndpoint>[0]
    );
    if (!initialEndpoint) {
      throw new Error("Could not find arrow element in scene");
    }
    console.log(
      `Initial arrow endpoint: (${initialEndpoint.x}, ${initialEndpoint.y})`
    );

    const shapeBounds = await getFirstRectangleBounds(
      page as Parameters<typeof getFirstRectangleBounds>[0]
    );
    if (!shapeBounds) {
      throw new Error("Could not find rectangle/shape to drag");
    }

    // biome-ignore lint/suspicious/noExplicitAny: Playwright Page types
    await captureScreenshot(page as any, cfg, "arrow-binding-pre-drag", {
      prompt: "Diagram with arrow connecting two shapes before drag",
    });

    console.log("Dragging shape...");
    const dragOffsetX = 100;
    const dragOffsetY = 50;

    await dragShape(page, shapeBounds, dragOffsetX, dragOffsetY);
    await sleep(1000);

    console.log("Extracting post-drag arrow coordinates...");
    const finalEndpoint = await getArrowEndpoint(
      page as Parameters<typeof getArrowEndpoint>[0]
    );
    if (!finalEndpoint) {
      throw new Error("Could not find arrow element after drag");
    }
    console.log(
      `Final arrow endpoint: (${finalEndpoint.x}, ${finalEndpoint.y})`
    );

    // biome-ignore lint/suspicious/noExplicitAny: Playwright Page types
    await captureScreenshot(page as any, cfg, "arrow-binding-post-drag", {
      prompt: "Diagram with arrow after shape was dragged",
    });

    const deltaX = Math.abs(finalEndpoint.x - initialEndpoint.x);
    const deltaY = Math.abs(finalEndpoint.y - initialEndpoint.y);
    const totalMovement = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    console.log(
      `Arrow endpoint movement: deltaX=${deltaX.toFixed(2)}, deltaY=${deltaY.toFixed(2)}, total=${totalMovement.toFixed(2)}`
    );

    const movementThreshold = 20;
    if (totalMovement < movementThreshold) {
      throw new Error(
        `Arrow binding failed: endpoint moved only ${totalMovement.toFixed(2)}px (expected >${movementThreshold}px)`
      );
    }

    console.log(
      `Arrow binding verified: endpoint moved ${totalMovement.toFixed(2)}px`
    );

    if (cfg.env === "BROWSERBASE") {
      const sessionId = stagehand.browserbaseSessionID;
      if (sessionId) {
        console.log(
          `Browserbase session: search for ${sessionId} to view replay`
        );
      }
    }
  } catch (error) {
    status = "failed";
    errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Test failed: ${errorMessage}`);
    throw error;
  } finally {
    await writeScenarioSummary({
      outputDir: cfg.screenshotsDir,
      summary: {
        scenario: "arrow-binding-drag",
        status,
        warnings,
        visualIssues,
        error: errorMessage || undefined,
        baseUrl: cfg.baseUrl,
        env: cfg.env,
        startedAt,
        finishedAt: new Date().toISOString(),
      },
    });
    await shutdown(stagehand);
    finalizeScenario(status);
  }
}

await main();
