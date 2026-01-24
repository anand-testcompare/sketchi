import { type Browser, chromium } from "playwright";
import { applyLayout, type LayoutedDiagram } from "./layout";
import type { Diagram } from "./schemas";

const EXCALIDRAW_POST_URL = "https://json.excalidraw.com/api/v2/post/";
const IV_BYTE_LENGTH = 12;
const AES_GCM_KEY_LENGTH = 128;
const RENDER_TIMEOUT_MS = 30_000;

let browser: Browser | null = null;

function generateSeed(): number {
  return Math.floor(Math.random() * 2_000_000_000);
}

async function getBrowser(): Promise<Browser> {
  if (!browser) {
    browser = await chromium.launch({ headless: true });
  }
  return browser;
}

export async function closeBrowser(): Promise<void> {
  if (browser) {
    await browser.close();
    browser = null;
  }
}

function convertLayoutedToExcalidraw(
  layouted: LayoutedDiagram
): Record<string, unknown>[] {
  const elements: Record<string, unknown>[] = [];
  let idx = 0;

  for (const shape of layouted.shapes) {
    const base = {
      id: shape.id,
      type: shape.type,
      x: shape.x,
      y: shape.y,
      width: shape.width,
      height: shape.height,
      angle: 0,
      strokeColor: "#1971c2",
      backgroundColor: shape.backgroundColor ?? "#a5d8ff",
      fillStyle: "solid",
      strokeWidth: 2,
      strokeStyle: "solid",
      roughness: 1,
      opacity: 100,
      groupIds: [],
      frameId: null,
      index: `a${idx++}`,
      roundness: { type: 3 },
      seed: generateSeed(),
      version: 1,
      versionNonce: generateSeed(),
      isDeleted: false,
      boundElements: null as { id: string; type: string }[] | null,
      updated: Date.now(),
      link: null,
      locked: false,
    };

    if (shape.label?.text) {
      base.boundElements = [{ id: `${shape.id}_text`, type: "text" }];
      elements.push(base);

      elements.push({
        id: `${shape.id}_text`,
        type: "text",
        x: shape.x + 10,
        y: shape.y + shape.height / 2 - 10,
        width: shape.width - 20,
        height: 20,
        angle: 0,
        strokeColor: "#1e1e1e",
        backgroundColor: "transparent",
        fillStyle: "solid",
        strokeWidth: 2,
        strokeStyle: "solid",
        roughness: 1,
        opacity: 100,
        groupIds: [],
        frameId: null,
        index: `a${idx++}`,
        roundness: null,
        seed: generateSeed(),
        version: 1,
        versionNonce: generateSeed(),
        isDeleted: false,
        boundElements: null,
        updated: Date.now(),
        link: null,
        locked: false,
        text: shape.label.text,
        fontSize: 16,
        fontFamily: 5,
        textAlign: "center",
        verticalAlign: "middle",
        containerId: shape.id,
        originalText: shape.label.text,
        autoResize: true,
        lineHeight: 1.25,
      });
    } else {
      elements.push(base);
    }
  }

  for (const arrow of layouted.arrows) {
    const textId = `${arrow.id}_label`;
    const hasLabel = arrow.label?.text;

    const arrowElement: Record<string, unknown> = {
      id: arrow.id,
      type: "arrow",
      x: arrow.x,
      y: arrow.y,
      width: arrow.width,
      height: arrow.height,
      angle: 0,
      strokeColor: "#1971c2",
      backgroundColor: "transparent",
      fillStyle: "solid",
      strokeWidth: 2,
      strokeStyle: "solid",
      roughness: 1,
      opacity: 100,
      groupIds: [],
      frameId: null,
      index: `a${idx++}`,
      roundness: arrow.elbowed ? null : { type: 2 },
      seed: generateSeed(),
      version: 1,
      versionNonce: generateSeed(),
      isDeleted: false,
      boundElements: hasLabel ? [{ type: "text", id: textId }] : null,
      updated: Date.now(),
      link: null,
      locked: false,
      points: arrow.points,
      elbowed: arrow.elbowed,
      startBinding: {
        elementId: arrow.fromId,
        focus: 0,
        gap: 5,
        fixedPoint: null,
      },
      endBinding: {
        elementId: arrow.toId,
        focus: 0,
        gap: 5,
        fixedPoint: null,
      },
      startArrowhead: null,
      endArrowhead: "arrow",
    };

    if (arrow.elbowed) {
      arrowElement.fixedSegments = [];
      arrowElement.startIsSpecial = false;
      arrowElement.endIsSpecial = false;
    }

    elements.push(arrowElement);

    if (hasLabel) {
      const midX = arrow.x + arrow.width / 2;
      const midY = arrow.y + arrow.height / 2;

      elements.push({
        id: textId,
        type: "text",
        x: midX - 30,
        y: midY - 10,
        width: 60,
        height: 20,
        angle: 0,
        strokeColor: "#1e1e1e",
        backgroundColor: "transparent",
        fillStyle: "solid",
        strokeWidth: 2,
        strokeStyle: "solid",
        roughness: 1,
        opacity: 100,
        groupIds: [],
        frameId: null,
        index: `a${idx++}`,
        roundness: null,
        seed: generateSeed(),
        version: 1,
        versionNonce: generateSeed(),
        isDeleted: false,
        boundElements: null,
        updated: Date.now(),
        link: null,
        locked: false,
        text: arrow.label?.text ?? "",
        fontSize: 14,
        fontFamily: 5,
        textAlign: "center",
        verticalAlign: "middle",
        containerId: arrow.id,
        originalText: arrow.label?.text ?? "",
        autoResize: true,
        lineHeight: 1.25,
      });
    }
  }

  return elements;
}

async function uploadToExcalidraw(
  elements: Record<string, unknown>[]
): Promise<string> {
  const payload = JSON.stringify({
    type: "excalidraw",
    version: 2,
    source: "sketchi",
    elements,
    appState: { viewBackgroundColor: "#ffffff" },
    files: {},
  });
  const encodedPayload = new TextEncoder().encode(payload);

  const key = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: AES_GCM_KEY_LENGTH },
    true,
    ["encrypt", "decrypt"]
  );

  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTE_LENGTH));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encodedPayload
  );

  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);

  const response = await fetch(EXCALIDRAW_POST_URL, {
    method: "POST",
    body: combined,
  });

  if (!response.ok) {
    throw new Error(
      `Upload failed: ${response.status} ${await response.text()}`
    );
  }

  const { id } = (await response.json()) as { id: string };
  const jwk = await crypto.subtle.exportKey("jwk", key);
  if (!jwk.k) {
    throw new Error("Failed to export encryption key");
  }

  return `https://excalidraw.com/#json=${id},${jwk.k}`;
}

export interface RenderResult {
  png: Buffer;
  durationMs: number;
  shareUrl: string;
}

export interface RenderOptions {
  chartType?: string;
  scale?: number;
  background?: boolean;
}

export async function renderDiagramToPng(
  diagram: Diagram,
  options: RenderOptions = {}
): Promise<RenderResult> {
  const { chartType = "flowchart" } = options;
  const start = Date.now();

  const layouted = applyLayout(diagram, chartType);
  const elements = convertLayoutedToExcalidraw(layouted);
  const shareUrl = await uploadToExcalidraw(elements);

  const browser = await getBrowser();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto(shareUrl, { timeout: RENDER_TIMEOUT_MS });
    await page.waitForLoadState("networkidle", { timeout: RENDER_TIMEOUT_MS });

    const canvas = page.locator("canvas").first();
    await canvas.waitFor({ state: "visible", timeout: RENDER_TIMEOUT_MS });

    await page.waitForFunction(
      () => {
        const body = document.body.innerText;
        return !(body.includes("Loading scene") || body.includes("Loading"));
      },
      { timeout: RENDER_TIMEOUT_MS }
    );

    await page.waitForTimeout(1500);

    // Excalidraw shortcuts: Shift+1 = zoom to fit, Cmd+- = zoom out for margin
    await page.keyboard.press("Shift+Digit1");
    await page.waitForTimeout(500);
    await page.keyboard.press("Meta+-");
    await page.waitForTimeout(300);

    const png = await canvas.screenshot({ type: "png" });

    return {
      png,
      durationMs: Date.now() - start,
      shareUrl,
    };
  } finally {
    await context.close();
  }
}

export async function renderExcalidrawUrlToPng(
  shareUrl: string
): Promise<RenderResult> {
  const start = Date.now();

  const browser = await getBrowser();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto(shareUrl, { timeout: RENDER_TIMEOUT_MS });
    await page.waitForLoadState("networkidle", { timeout: RENDER_TIMEOUT_MS });

    await page.waitForTimeout(2000);

    const canvas = page.locator("canvas").first();
    await canvas.waitFor({ state: "visible", timeout: RENDER_TIMEOUT_MS });

    const png = await canvas.screenshot({ type: "png" });

    return {
      png,
      durationMs: Date.now() - start,
      shareUrl,
    };
  } finally {
    await context.close();
  }
}
