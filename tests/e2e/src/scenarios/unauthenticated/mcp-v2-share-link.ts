/*
Scenario: MCP V2 share link rendering

Intent: Verify that V2 format Excalidraw share links can be parsed and rendered
to PNG without "OperationError" or other decryption/decompression failures.
This validates AC3 from issue #74: "MCP tools work with V2 links"

Steps:
- Read V2 share link from fixture file
- Parse the share link using @sketchi/shared parseExcalidrawShareLink
- Verify elements are extracted without errors
- Render elements to PNG using Playwright + Excalidraw exportToBlob
- Verify PNG is generated successfully

Success:
- No "OperationError" or decryption failures during parsing
- Elements array is non-empty
- PNG renders successfully with non-zero bytes
*/

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "playwright";
import { parseExcalidrawShareLink } from "../../../../../packages/shared/src/index";

const FIXTURE_PATH = join(
  import.meta.dir,
  "../../../../../packages/backend/convex/test-fixtures/v2-share-link.txt"
);
const OUTPUT_DIR = join(import.meta.dir, "../../../../output");
const OUTPUT_PNG = join(OUTPUT_DIR, "mcp-v2-share-link.png");

const RENDER_TIMEOUT_MS = 30_000;

const EXPORT_HARNESS_HTML = `
<!DOCTYPE html>
<html>
<head>
  <script type="importmap">
  { "imports": { "@excalidraw/excalidraw": "https://esm.sh/@excalidraw/excalidraw@0.18.0" } }
  </script>
</head>
<body>
  <div id="status">Loading...</div>
  <script type="module">
    import { exportToBlob } from "https://esm.sh/@excalidraw/excalidraw@0.18.0";
    
    window.exportPng = async function(elements, options = {}) {
      const { scale = 2, padding = 20, background = true, backgroundColor = "#ffffff" } = options;
      
      const blob = await exportToBlob({
        elements,
        appState: { exportScale: scale, exportBackground: background, viewBackgroundColor: backgroundColor },
        files: null,
        exportPadding: padding,
        mimeType: "image/png",
      });
      
      const buffer = await blob.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
      return btoa(binary);
    };
    
    window.exportReady = true;
    document.getElementById('status').textContent = 'Ready';
  </script>
</body>
</html>
`;

async function renderElementsToPng(
  elements: Record<string, unknown>[]
): Promise<Buffer> {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto("about:blank");
    await page.evaluate((html) => {
      document.open();
      document.write(html);
      document.close();
    }, EXPORT_HARNESS_HTML);

    await page.waitForFunction("window.exportReady === true", {
      timeout: RENDER_TIMEOUT_MS,
    });

    const base64Png = (await page.evaluate(
      async ({ elements }) => {
        // biome-ignore lint/suspicious/noExplicitAny: injected by harness
        return await (window as any).exportPng(elements, {
          scale: 2,
          padding: 20,
          background: true,
          backgroundColor: "#ffffff",
        });
      },
      { elements }
    )) as string;

    return Buffer.from(base64Png, "base64");
  } finally {
    await context.close();
    await browser.close();
  }
}

async function main() {
  console.log("MCP V2 Share Link Test");
  console.log("=".repeat(50));

  const errors: string[] = [];
  let status: "passed" | "failed" = "passed";

  try {
    // Step 1: Read V2 share link from fixture
    console.log("\n[1/4] Reading V2 share link from fixture...");
    const fixtureContent = await readFile(FIXTURE_PATH, "utf-8");
    const v2ShareUrl = fixtureContent.trim();

    if (!v2ShareUrl.includes("#json=")) {
      throw new Error("Invalid fixture: expected Excalidraw share URL format");
    }
    console.log(`  Share URL: ${v2ShareUrl.slice(0, 80)}...`);

    // Step 2: Parse the V2 share link
    console.log("\n[2/4] Parsing V2 share link...");
    let parsed: Awaited<ReturnType<typeof parseExcalidrawShareLink>>;
    try {
      parsed = await parseExcalidrawShareLink(v2ShareUrl);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (
        message.includes("OperationError") ||
        message.includes("Decryption failed")
      ) {
        throw new Error(`V2 parsing failed with crypto error: ${message}`);
      }
      throw error;
    }

    // Step 3: Verify parsed elements
    console.log("\n[3/4] Verifying parsed elements...");
    if (!(parsed.elements && Array.isArray(parsed.elements))) {
      throw new Error("Parsed result missing elements array");
    }
    if (parsed.elements.length === 0) {
      throw new Error("Parsed elements array is empty");
    }
    console.log(`  Elements count: ${parsed.elements.length}`);
    console.log(`  Has appState: ${parsed.appState != null}`);

    // Step 4: Render to PNG
    console.log("\n[4/4] Rendering elements to PNG...");
    const png = await renderElementsToPng(
      parsed.elements as Record<string, unknown>[]
    );

    if (png.length === 0) {
      throw new Error("PNG render produced empty buffer");
    }

    // Ensure output directory exists
    await mkdir(OUTPUT_DIR, { recursive: true });
    await writeFile(OUTPUT_PNG, png);
    console.log(`  PNG size: ${png.length} bytes`);
    console.log(`  PNG path: ${OUTPUT_PNG}`);

    console.log(`\n${"=".repeat(50)}`);
    console.log("TEST PASSED: V2 share link parsed and rendered successfully");
  } catch (error) {
    status = "failed";
    const message = error instanceof Error ? error.message : String(error);
    errors.push(message);
    console.error(`\n${"=".repeat(50)}`);
    console.error(`TEST FAILED: ${message}`);
    process.exitCode = 1;
  }

  // Summary
  console.log("\n--- Summary ---");
  console.log(`Status: ${status}`);
  if (errors.length > 0) {
    console.log(`Errors: ${errors.join(", ")}`);
  }
}

await main();
