/*
Scenario: OpenCode (CLI device OAuth) <-> Web continuity

Intent: Execute the real CLI-style device OAuth flow, run thread-backed diagram
        generation via API, then resume and continue the same session in web,
        and finally continue again via API to prove bidirectional continuity.

Smoke coverage:
- Browser handoff to WorkOS device verification URL.
- Signed-in web navigation to existing session URL.

Assertion coverage:
- Device flow mints a bearer token via /api/auth/device/* (no mocked auth).
- /api/diagrams/thread-run creates durable session/thread and returns persisted run.
- Web loads the same session with thread/tool history.
- Web prompt persists and API can continue same session/thread afterward.
- OCC conflict path on /api/diagrams/session-seed is explicit and recoverable.
- Trace IDs are echoed by API headers.
*/

import { ensureSignedInForDiagrams } from "../../runner/auth";
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
  resolveUrl,
} from "../../runner/utils";
import { sleep, waitForCondition } from "../../runner/wait";

type PageLike = Awaited<ReturnType<typeof getActivePage>>;

const DEVICE_FLOW_TIMEOUT_MS = 160_000;
const THREAD_RUN_TIMEOUT_MS = 180_000;
const SESSION_VERSION_REGEX = /\d+/;

interface DeviceStartResponse {
  deviceCode: string;
  expiresIn: number;
  interval: number;
  userCode: string;
  verificationUrl: string;
}

type DeviceTokenResponse =
  | {
      status: "authorization_pending";
      interval: number;
    }
  | {
      status: "slow_down";
      interval: number;
    }
  | {
      status: "success";
      accessToken: string;
      accessTokenExpiresAt?: number;
    }
  | {
      status: "expired_token" | "invalid_grant";
    };

interface ThreadRunResponse {
  appState?: Record<string, unknown>;
  assistantMessage: string | null;
  elapsedMs: number;
  elements?: unknown[];
  latestSceneVersion: number | null;
  promptMessageId: string;
  reasoningSummary: string | null;
  runError: string | null;
  runStatus:
    | "sending"
    | "running"
    | "applying"
    | "persisted"
    | "stopped"
    | "error";
  sessionId: string;
  shareLink?: {
    url: string;
    shareId: string;
    encryptionKey: string;
  };
  status: "persisted" | "error" | "stopped" | "timeout";
  threadId: string | null;
  traceId: string;
}

interface SessionSeedResponse {
  latestSceneVersion: number;
  savedAt?: number;
  sessionId: string;
  status: "success" | "conflict";
  threadId: string | null;
  traceId: string;
}

function toTraceId(suffix: string): string {
  return `00000000-0000-4000-8000-${suffix.padStart(12, "0")}`;
}

function resolveAuthCredentials(): { email: string; password: string } {
  const email =
    process.env.SKETCHI_E2E_EMAIL?.trim() ??
    process.env.E2E_WORKOS_EMAIL?.trim();
  const password =
    process.env.SKETCHI_E2E_PASSWORD?.trim() ??
    process.env.E2E_WORKOS_PASSWORD?.trim();

  if (!(email && password)) {
    throw new Error(
      "Missing SKETCHI_E2E_EMAIL/SKETCHI_E2E_PASSWORD for continuity E2E."
    );
  }

  return { email, password };
}

function createApiHeaders(input: {
  accessToken?: string;
  bypassSecret?: string;
  traceId: string;
}): Record<string, string> {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    "x-trace-id": input.traceId,
  };
  if (input.bypassSecret) {
    headers["x-vercel-protection-bypass"] = input.bypassSecret;
  }
  if (input.accessToken) {
    headers.authorization = `Bearer ${input.accessToken}`;
  }
  return headers;
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text) {
    throw new Error("Expected JSON response body but got empty payload.");
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Invalid JSON response: ${text.slice(0, 240)}`);
  }
}

function assertTraceHeader(
  response: Response,
  expectedTraceId: string,
  route: string
) {
  const traceId = response.headers.get("x-trace-id");
  if (traceId !== expectedTraceId) {
    throw new Error(
      `${route} returned x-trace-id "${traceId ?? "missing"}" (expected "${expectedTraceId}").`
    );
  }
}

async function clickIfVisible(
  page: PageLike,
  selector: string
): Promise<boolean> {
  try {
    const target = page.locator(selector).first();
    if (await target.isVisible({ timeout: 1500 })) {
      await target.click();
      return true;
    }
  } catch {
    return false;
  }
  return false;
}

async function clickFirstVisible(
  page: PageLike,
  selectors: string[]
): Promise<boolean> {
  for (const selector of selectors) {
    if (await clickIfVisible(page, selector)) {
      return true;
    }
  }
  return false;
}

async function clickApprovalAction(page: PageLike): Promise<boolean> {
  const clickedByLabel = await clickFirstVisible(page, [
    'button:has-text("Allow")',
    'button:has-text("Authorize")',
    'button:has-text("Approve")',
    'button:has-text("Continue")',
    'button:has-text("Confirm")',
    'button:has-text("Bevestig")',
    'button:has-text("Accept")',
  ]);
  if (clickedByLabel) {
    return true;
  }

  try {
    const submitButtons = page.locator('button[type="submit"]');
    const count = await submitButtons.count();
    if (count >= 2) {
      await submitButtons.nth(count - 1).click();
      return true;
    }
  } catch {
    return false;
  }
  return false;
}

async function submitDeviceApproval(page: PageLike): Promise<void> {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const currentUrl = page.url();
    if (currentUrl.includes("/device/denied")) {
      throw new Error("WorkOS device authorization was denied.");
    }

    const approved = await page.evaluate(() => {
      const text = (document.body?.innerText ?? "").toLowerCase();
      return (
        text.includes("you can close") ||
        text.includes("device authorized") ||
        text.includes("successfully approved") ||
        text.includes("toestel geaktiveer")
      );
    });
    if (approved || currentUrl.includes("/device/approved")) {
      return;
    }

    await clickApprovalAction(page);
    await sleep(900);
  }
}

type DeviceAuthorizationState =
  | "approved"
  | "approval"
  | "form"
  | "gate"
  | "unknown";

function getDeviceAuthorizationState(
  page: PageLike
): Promise<DeviceAuthorizationState> {
  return page.evaluate(() => {
    const bodyText = (document.body?.innerText ?? "").toLowerCase();
    const approved =
      bodyText.includes("you can close") ||
      bodyText.includes("device authorized") ||
      bodyText.includes("successfully approved") ||
      bodyText.includes("toestel geaktiveer") ||
      window.location.pathname.includes("/device/approved") ||
      window.location.pathname.includes("/device/success");
    if (approved) {
      return "approved";
    }

    const hasForm = Boolean(
      document.querySelector('input[type="email"], input[type="password"]')
    );
    if (hasForm) {
      return "form";
    }

    const hasApprovalButton = Array.from(
      document.querySelectorAll("button, a, input[type='submit']")
    ).some((node) => {
      const text = (node.textContent ?? "").toLowerCase();
      return (
        text.includes("allow") ||
        text.includes("authorize") ||
        text.includes("approve") ||
        text.includes("continue") ||
        text.includes("confirm") ||
        text.includes("bevestig") ||
        text.includes("accept")
      );
    });

    const hasDeviceCodeField = Boolean(
      document.querySelector(
        'input[name*="code" i], input[id*="code" i], input[autocomplete="one-time-code"]'
      )
    );

    if (
      hasApprovalButton ||
      hasDeviceCodeField ||
      bodyText.includes("authorize opencode device") ||
      bodyText.includes("approve this device code")
    ) {
      return "approval";
    }

    const signInGateVisible =
      bodyText.includes("sign in first") ||
      bodyText.includes("sign in to continue") ||
      bodyText.includes("continue to sign in");
    if (signInGateVisible) {
      return "gate";
    }

    return "unknown";
  });
}

async function submitDeviceCredentials(params: {
  email: string;
  page: PageLike;
  password: string;
}): Promise<void> {
  const { page } = params;
  const hasEmailField = await page.evaluate(() =>
    Boolean(document.querySelector('input[type="email"]'))
  );
  if (hasEmailField) {
    await page.locator('input[type="email"]').first().fill(params.email);
    if (page.keyboard) {
      await page.keyboard.press("Enter");
    } else {
      await clickIfVisible(page, 'button[type="submit"]');
    }
  }

  const passwordVisible = await waitForCondition(
    () =>
      page.evaluate(() =>
        Boolean(document.querySelector('input[type="password"]'))
      ),
    { timeoutMs: 12_000, label: "device-flow-password-field-enter" }
  );
  if (!passwordVisible) {
    await clickFirstVisible(page, [
      'button:has-text("Continue")',
      'button[type="submit"]',
    ]);
  }

  const passwordVisibleAfterSubmit = await waitForCondition(
    () =>
      page.evaluate(() =>
        Boolean(document.querySelector('input[type="password"]'))
      ),
    { timeoutMs: 18_000, label: "device-flow-password-field-submit" }
  );
  if (!passwordVisibleAfterSubmit) {
    throw new Error("WorkOS password field did not appear.");
  }

  await page.locator('input[type="password"]').first().fill(params.password);
  if (page.keyboard) {
    await page.keyboard.press("Enter");
  } else {
    await clickIfVisible(page, 'button[type="submit"]');
  }
}

async function clickDeviceSignInGate(page: PageLike): Promise<void> {
  await clickFirstVisible(page, [
    'button:has-text("Sign in to continue")',
    'a:has-text("Sign in to continue")',
    'a:has-text("Continue to sign in")',
  ]);
  await sleep(800);
}

async function tryApproveDevice(
  page: PageLike,
  userCode: string
): Promise<boolean> {
  await fillDeviceUserCodeIfPresent(page, userCode);
  await submitDeviceApproval(page);
  await sleep(1000);
  return (await getDeviceAuthorizationState(page)) === "approved";
}

async function fillDeviceUserCodeIfPresent(
  page: PageLike,
  userCode: string
): Promise<boolean> {
  const codeFieldFound = await page.evaluate(() => {
    return Boolean(
      document.querySelector(
        'input[name*="code" i], input[id*="code" i], input[autocomplete="one-time-code"]'
      )
    );
  });
  if (!codeFieldFound) {
    return false;
  }

  const filled = await page.evaluate((value) => {
    const candidates = Array.from(
      document.querySelectorAll<HTMLInputElement>(
        'input[name*="code" i], input[id*="code" i], input[autocomplete="one-time-code"]'
      )
    );
    for (const input of candidates) {
      if (input.disabled) {
        continue;
      }
      input.focus();
      input.value = value;
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    }
    return false;
  }, userCode);

  if (!filled) {
    return false;
  }

  if (page.keyboard) {
    await page.keyboard.press("Enter");
  } else {
    await clickFirstVisible(page, [
      'button:has-text("Continue")',
      'button:has-text("Allow")',
      'button:has-text("Authorize")',
    ]);
  }

  return true;
}

async function completeDeviceAuthorization(params: {
  page: PageLike;
  userCode: string;
  verificationUrl: string;
  email: string;
  password: string;
}) {
  const { page } = params;

  await page.goto(params.verificationUrl, { waitUntil: "domcontentloaded" });
  await sleep(1000);

  let attemptedCredentialSubmit = false;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const state = await getDeviceAuthorizationState(page);

    switch (state) {
      case "approved":
        return;
      case "gate":
        await clickDeviceSignInGate(page);
        continue;
      case "form":
        await submitDeviceCredentials({
          page,
          email: params.email,
          password: params.password,
        });
        attemptedCredentialSubmit = true;
        await sleep(1200);
        continue;
      case "approval":
        if (await tryApproveDevice(page, params.userCode)) {
          return;
        }
        break;
      default:
        break;
    }

    await sleep(attemptedCredentialSubmit ? 1100 : 700);
  }

  throw new Error(
    `Device authorization did not reach approved state (url=${page.url()}).`
  );
}

async function startDeviceFlow(params: {
  baseUrl: string;
  bypassSecret?: string;
  traceId: string;
}): Promise<DeviceStartResponse> {
  const response = await fetch(
    resolveUrl(params.baseUrl, "/api/auth/device/start"),
    {
      method: "POST",
      headers: createApiHeaders({
        traceId: params.traceId,
        bypassSecret: params.bypassSecret,
      }),
      body: "{}",
    }
  );
  assertTraceHeader(response, params.traceId, "/api/auth/device/start");
  const payload = await parseJsonResponse<
    DeviceStartResponse | { error: string }
  >(response);
  if (!response.ok) {
    throw new Error(
      `Device flow start failed (${response.status}): ${JSON.stringify(payload)}`
    );
  }

  if (
    !(
      typeof payload.deviceCode === "string" &&
      typeof payload.userCode === "string" &&
      typeof payload.verificationUrl === "string" &&
      typeof payload.interval === "number" &&
      typeof payload.expiresIn === "number"
    )
  ) {
    throw new Error(
      `Unexpected device flow start payload: ${JSON.stringify(payload)}`
    );
  }

  return payload;
}

async function pollDeviceFlowToken(params: {
  baseUrl: string;
  bypassSecret?: string;
  deviceCode: string;
  intervalSeconds: number;
  expiresInSeconds: number;
  traceId: string;
}): Promise<string> {
  const startedAt = Date.now();
  const timeoutMs = Math.max(
    DEVICE_FLOW_TIMEOUT_MS,
    Math.max(1, params.expiresInSeconds) * 1000
  );
  let intervalMs = Math.max(1000, Math.max(1, params.intervalSeconds) * 1000);

  while (Date.now() - startedAt < timeoutMs) {
    await sleep(intervalMs + 750);

    const response = await fetch(
      resolveUrl(params.baseUrl, "/api/auth/device/token"),
      {
        method: "POST",
        headers: createApiHeaders({
          traceId: params.traceId,
          bypassSecret: params.bypassSecret,
        }),
        body: JSON.stringify({
          deviceCode: params.deviceCode,
        }),
      }
    );
    assertTraceHeader(response, params.traceId, "/api/auth/device/token");
    const payload = await parseJsonResponse<
      DeviceTokenResponse | { error: string }
    >(response);

    if (!(response.ok && "status" in payload)) {
      throw new Error(
        `Device flow token poll failed (${response.status}): ${JSON.stringify(payload)}`
      );
    }

    if (payload.status === "success") {
      return payload.accessToken;
    }

    if (payload.status === "authorization_pending") {
      intervalMs = Math.max(intervalMs, Math.max(1, payload.interval) * 1000);
      continue;
    }

    if (payload.status === "slow_down") {
      intervalMs = Math.max(
        intervalMs + 5000,
        Math.max(1, payload.interval) * 1000
      );
      continue;
    }

    throw new Error(`Device flow ended with status "${payload.status}".`);
  }

  throw new Error("Device flow polling timed out.");
}

async function runThreadPrompt(params: {
  accessToken: string;
  baseUrl: string;
  bypassSecret?: string;
  prompt: string;
  promptMessageId: string;
  sessionId?: string;
  traceId: string;
}): Promise<ThreadRunResponse> {
  const response = await fetch(
    resolveUrl(params.baseUrl, "/api/diagrams/thread-run"),
    {
      method: "POST",
      headers: createApiHeaders({
        accessToken: params.accessToken,
        bypassSecret: params.bypassSecret,
        traceId: params.traceId,
      }),
      body: JSON.stringify({
        prompt: params.prompt,
        sessionId: params.sessionId,
        promptMessageId: params.promptMessageId,
        timeoutMs: THREAD_RUN_TIMEOUT_MS,
        pollIntervalMs: 700,
        traceId: params.traceId,
      }),
    }
  );
  assertTraceHeader(response, params.traceId, "/api/diagrams/thread-run");

  const payload = await parseJsonResponse<
    ThreadRunResponse | { error: string }
  >(response);
  if (!response.ok) {
    throw new Error(
      `thread-run failed (${response.status}): ${JSON.stringify(payload)}`
    );
  }

  if (!("status" in payload)) {
    throw new Error(
      `Unexpected thread-run payload: ${JSON.stringify(payload)}`
    );
  }

  if (payload.traceId !== params.traceId) {
    throw new Error(
      `thread-run trace mismatch: payload=${payload.traceId} expected=${params.traceId}`
    );
  }

  return payload;
}

async function seedSession(params: {
  accessToken: string;
  appState: Record<string, unknown>;
  baseUrl: string;
  bypassSecret?: string;
  elements: unknown[];
  expectedVersion: number;
  sessionId: string;
  traceId: string;
}): Promise<SessionSeedResponse> {
  const response = await fetch(
    resolveUrl(params.baseUrl, "/api/diagrams/session-seed"),
    {
      method: "POST",
      headers: createApiHeaders({
        accessToken: params.accessToken,
        bypassSecret: params.bypassSecret,
        traceId: params.traceId,
      }),
      body: JSON.stringify({
        sessionId: params.sessionId,
        elements: params.elements,
        appState: params.appState,
        expectedVersion: params.expectedVersion,
        traceId: params.traceId,
      }),
    }
  );
  assertTraceHeader(response, params.traceId, "/api/diagrams/session-seed");
  const payload = await parseJsonResponse<
    SessionSeedResponse | { error: string }
  >(response);
  if (!(response.ok && "status" in payload)) {
    throw new Error(
      `session-seed failed (${response.status}): ${JSON.stringify(payload)}`
    );
  }

  if (payload.traceId !== params.traceId) {
    throw new Error(
      `session-seed trace mismatch: payload=${payload.traceId} expected=${params.traceId}`
    );
  }

  return payload;
}

async function waitForCanvas(page: PageLike): Promise<void> {
  const loaded = await waitForCondition(
    () =>
      page.evaluate(() => {
        return Boolean(
          document.querySelector('[data-testid="diagram-canvas"]') ||
            document.querySelector(".excalidraw")
        );
      }),
    { timeoutMs: 45_000, label: "diagram-canvas" }
  );
  if (!loaded) {
    throw new Error(`Diagram canvas did not load. URL=${page.url()}`);
  }
}

async function waitForRunStatus(
  page: PageLike,
  statusSubstring: string,
  timeoutMs = 90_000
): Promise<void> {
  const reached = await waitForCondition(
    () =>
      page.evaluate((expected) => {
        const text =
          document.querySelector('[data-testid="diagram-status-row"]')
            ?.textContent ?? "";
        return text.includes(expected);
      }, statusSubstring),
    { timeoutMs, label: `run-status:${statusSubstring}` }
  );
  if (!reached) {
    throw new Error(`Run status did not reach "${statusSubstring}".`);
  }
}

async function getSessionVersion(page: PageLike): Promise<number> {
  const raw = await page.evaluate(() => {
    return (
      document.querySelector('[data-testid="diagram-session-version"]')
        ?.textContent ?? ""
    );
  });
  const match = raw.match(SESSION_VERSION_REGEX);
  if (!match) {
    throw new Error(`Unable to parse diagram session version from "${raw}".`);
  }
  return Number.parseInt(match[0], 10);
}

async function assertThreadHistoryLoaded(page: PageLike): Promise<void> {
  const historyLoaded = await waitForCondition(
    () =>
      page.evaluate(() => {
        const userMessages = document.querySelectorAll(
          '[data-testid="diagram-chat-message-user"]'
        ).length;
        const assistantMessages = document.querySelectorAll(
          '[data-testid="diagram-chat-message-assistant"]'
        ).length;
        const toolMessages = Array.from(
          document.querySelectorAll('[data-testid="diagram-tool-message"]')
        );
        const hasCompletedTool = toolMessages.some(
          (node) => node.getAttribute("data-tool-status") === "completed"
        );
        return userMessages > 0 && assistantMessages > 0 && hasCompletedTool;
      }),
    { timeoutMs: 45_000, label: "thread-history-loaded" }
  );

  if (!historyLoaded) {
    throw new Error(
      "Session loaded without expected thread history (user/assistant/tool messages)."
    );
  }
}

async function sendWebPrompt(page: PageLike, prompt: string): Promise<void> {
  await page.locator('[data-testid="diagram-chat-input"]').fill(prompt);
  await page.locator('[data-testid="diagram-chat-send"]').click();
}

function assertPersistedRun(run: ThreadRunResponse, description: string): void {
  if (run.status !== "persisted" || run.runStatus !== "persisted") {
    throw new Error(
      `Expected persisted ${description}; got status=${run.status} runStatus=${run.runStatus} error=${run.runError ?? "none"}`
    );
  }
}

async function runDeviceFlowAndGetToken(params: {
  baseUrl: string;
  bypassSecret?: string;
  credentials: { email: string; password: string };
  page: PageLike;
  reviewPage: {
    evaluate: ((pageFunction: () => unknown) => Promise<unknown>) | undefined;
    screenshot: (options?: {
      fullPage?: boolean;
    }) => Promise<Buffer<ArrayBufferLike>>;
  };
  cfg: ReturnType<typeof loadConfig>;
}): Promise<string> {
  console.log("[smoke] Starting real device OAuth flow...");
  const deviceStartTraceId = toTraceId("701");
  const started = await startDeviceFlow({
    baseUrl: params.baseUrl,
    bypassSecret: params.bypassSecret,
    traceId: deviceStartTraceId,
  });

  await completeDeviceAuthorization({
    page: params.page,
    verificationUrl: started.verificationUrl,
    userCode: started.userCode,
    email: params.credentials.email,
    password: params.credentials.password,
  });
  await captureScreenshot(
    params.reviewPage,
    params.cfg,
    "opencode-web-device-approval",
    {
      prompt:
        "Confirm device authorization reached hosted auth approval and was submitted.",
    }
  );

  console.log("[assert] Polling device token endpoint until success...");
  return pollDeviceFlowToken({
    baseUrl: params.baseUrl,
    bypassSecret: params.bypassSecret,
    deviceCode: started.deviceCode,
    intervalSeconds: started.interval,
    expiresInSeconds: started.expiresIn,
    traceId: toTraceId("702"),
  });
}

async function runCliCreateAndIdempotency(params: {
  accessToken: string;
  baseUrl: string;
  bypassSecret?: string;
}): Promise<ThreadRunResponse> {
  console.log(
    "[assert] CLI-style thread-run creates durable session/thread..."
  );
  const promptMessageId = `prompt_e2e_cli_${Date.now()}`;
  const cliRun = await runThreadPrompt({
    accessToken: params.accessToken,
    baseUrl: params.baseUrl,
    bypassSecret: params.bypassSecret,
    prompt:
      "Create a simple onboarding flowchart with steps: Sign up -> Verify email -> Complete profile.",
    promptMessageId,
    traceId: toTraceId("703"),
  });
  assertPersistedRun(cliRun, "CLI thread-run");
  if (!(cliRun.sessionId && cliRun.threadId && cliRun.shareLink?.url)) {
    throw new Error(
      "CLI thread-run response missing session/thread/share data."
    );
  }

  console.log(
    "[assert] Idempotent promptMessageId does not create duplicate run..."
  );
  const duplicateRun = await runThreadPrompt({
    accessToken: params.accessToken,
    baseUrl: params.baseUrl,
    bypassSecret: params.bypassSecret,
    prompt: "This payload should dedupe by promptMessageId.",
    promptMessageId,
    sessionId: cliRun.sessionId,
    traceId: toTraceId("704"),
  });
  if (duplicateRun.promptMessageId !== promptMessageId) {
    throw new Error("Duplicate run did not preserve original promptMessageId.");
  }
  if (duplicateRun.sessionId !== cliRun.sessionId) {
    throw new Error("Duplicate run returned a different sessionId.");
  }

  return cliRun;
}

async function runWebContinuation(params: {
  cfg: ReturnType<typeof loadConfig>;
  cliRun: ThreadRunResponse;
  page: PageLike;
  reviewPage: {
    evaluate: ((pageFunction: () => unknown) => Promise<unknown>) | undefined;
    screenshot: (options?: {
      fullPage?: boolean;
    }) => Promise<Buffer<ArrayBufferLike>>;
  };
}): Promise<number> {
  console.log(
    "[smoke] Opening same session in web and verifying continuity..."
  );
  await params.page.goto(
    resolveUrl(params.cfg.baseUrl, `/diagrams/${params.cliRun.sessionId}`),
    {
      waitUntil: "domcontentloaded",
    }
  );
  await waitForCanvas(params.page);
  await assertThreadHistoryLoaded(params.page);
  const versionAfterCli = await getSessionVersion(params.page);
  if (!(versionAfterCli > 0)) {
    throw new Error(
      `Expected version > 0 after CLI run, got ${versionAfterCli}.`
    );
  }
  await captureScreenshot(
    params.reviewPage,
    params.cfg,
    "opencode-web-after-cli",
    {
      prompt:
        "Confirm web session opened the same CLI-created diagram with existing chat/tool history.",
    }
  );

  console.log(
    "[assert] Continuing from web then API on same session/thread..."
  );
  await sendWebPrompt(
    params.page,
    "Add a decision branch after Verify email: Approved or Retry."
  );
  await waitForRunStatus(params.page, "Running", 60_000);
  await waitForRunStatus(params.page, "Persisted", 120_000);

  const versionAfterWebPrompt = await getSessionVersion(params.page);
  if (versionAfterWebPrompt < versionAfterCli) {
    throw new Error(
      `Version regressed after web prompt: ${versionAfterWebPrompt} < ${versionAfterCli}.`
    );
  }

  return versionAfterWebPrompt;
}

async function runApiResumeAndOccRecovery(params: {
  accessToken: string;
  baseUrl: string;
  bypassSecret?: string;
  cfg: ReturnType<typeof loadConfig>;
  cliRun: ThreadRunResponse;
  page: PageLike;
  reviewPage: {
    evaluate: ((pageFunction: () => unknown) => Promise<unknown>) | undefined;
    screenshot: (options?: {
      fullPage?: boolean;
    }) => Promise<Buffer<ArrayBufferLike>>;
  };
  versionAfterWebPrompt: number;
}): Promise<void> {
  const apiResume = await runThreadPrompt({
    accessToken: params.accessToken,
    baseUrl: params.baseUrl,
    bypassSecret: params.bypassSecret,
    prompt: "Add a final node named Done and connect the outgoing branch.",
    promptMessageId: `prompt_e2e_cli_resume_${Date.now()}`,
    sessionId: params.cliRun.sessionId,
    traceId: toTraceId("705"),
  });

  assertPersistedRun(apiResume, "API resume run");
  if (apiResume.sessionId !== params.cliRun.sessionId) {
    throw new Error("API resume returned a different sessionId.");
  }
  if (apiResume.threadId !== params.cliRun.threadId) {
    throw new Error("API resume returned a different threadId.");
  }
  if (
    !(
      typeof apiResume.latestSceneVersion === "number" &&
      apiResume.latestSceneVersion >= params.versionAfterWebPrompt
    )
  ) {
    throw new Error(
      `Expected API resume to maintain or advance version (latest=${apiResume.latestSceneVersion}, web=${params.versionAfterWebPrompt}).`
    );
  }
  if (
    !(apiResume.elements && apiResume.appState && apiResume.latestSceneVersion)
  ) {
    throw new Error(
      "API resume response missing elements/appState/version for OCC checks."
    );
  }

  console.log("[assert] OCC conflict path is explicit and recoverable...");
  const conflictResult = await seedSession({
    accessToken: params.accessToken,
    appState: apiResume.appState,
    baseUrl: params.baseUrl,
    bypassSecret: params.bypassSecret,
    elements: apiResume.elements,
    expectedVersion: Math.max(0, apiResume.latestSceneVersion - 1),
    sessionId: apiResume.sessionId,
    traceId: toTraceId("706"),
  });
  if (conflictResult.status !== "conflict") {
    throw new Error(
      `Expected session-seed conflict with stale version, got ${conflictResult.status}.`
    );
  }
  if (conflictResult.latestSceneVersion !== apiResume.latestSceneVersion) {
    throw new Error(
      `Conflict response latest version mismatch: ${conflictResult.latestSceneVersion} vs ${apiResume.latestSceneVersion}.`
    );
  }

  const recoverResult = await seedSession({
    accessToken: params.accessToken,
    appState: apiResume.appState,
    baseUrl: params.baseUrl,
    bypassSecret: params.bypassSecret,
    elements: apiResume.elements,
    expectedVersion: conflictResult.latestSceneVersion,
    sessionId: apiResume.sessionId,
    traceId: toTraceId("707"),
  });
  if (recoverResult.status !== "success") {
    throw new Error(
      `Expected session-seed recovery success, got ${recoverResult.status}.`
    );
  }
  if (
    recoverResult.latestSceneVersion !==
    conflictResult.latestSceneVersion + 1
  ) {
    throw new Error(
      `Expected recovery to increment version by 1, got ${recoverResult.latestSceneVersion}.`
    );
  }

  await params.page.goto(
    resolveUrl(params.cfg.baseUrl, `/diagrams/${params.cliRun.sessionId}`),
    {
      waitUntil: "domcontentloaded",
    }
  );
  await waitForCanvas(params.page);
  const finalVersion = await getSessionVersion(params.page);
  if (finalVersion < recoverResult.latestSceneVersion) {
    throw new Error(
      `Web reload did not reflect recovered version. final=${finalVersion} expected>=${recoverResult.latestSceneVersion}`
    );
  }

  await captureScreenshot(
    params.reviewPage,
    params.cfg,
    "opencode-web-final-continuity",
    {
      prompt:
        "Confirm final session still shows stable chat/tool continuity after API resume and OCC recovery.",
    }
  );
}

async function main() {
  const cfg = loadConfig();
  const stagehand = await createStagehand(cfg);
  const warnings: string[] = [];
  const startedAt = new Date().toISOString();
  let status: "passed" | "failed" = "passed";
  let errorMessage = "";

  try {
    const credentials = resolveAuthCredentials();
    const page = await getActivePage(stagehand);
    const reviewPage = {
      screenshot: page.screenshot.bind(page),
      evaluate: page.evaluate?.bind(page),
    };

    await resetBrowserState(page, cfg.baseUrl, cfg.vercelBypassSecret);
    await ensureDesktopViewport(page);
    await ensureSignedInForDiagrams(page, cfg.baseUrl);

    const accessToken = await runDeviceFlowAndGetToken({
      baseUrl: cfg.baseUrl,
      bypassSecret: cfg.vercelBypassSecret,
      credentials,
      page,
      reviewPage,
      cfg,
    });

    const cliRun = await runCliCreateAndIdempotency({
      accessToken,
      baseUrl: cfg.baseUrl,
      bypassSecret: cfg.vercelBypassSecret,
    });

    const versionAfterWebPrompt = await runWebContinuation({
      cfg,
      cliRun,
      page,
      reviewPage,
    });

    await runApiResumeAndOccRecovery({
      accessToken,
      baseUrl: cfg.baseUrl,
      bypassSecret: cfg.vercelBypassSecret,
      cfg,
      cliRun,
      page,
      reviewPage,
      versionAfterWebPrompt,
    });
  } catch (error) {
    status = "failed";
    errorMessage = error instanceof Error ? error.message : String(error);
    throw error;
  } finally {
    await writeScenarioSummary({
      outputDir: cfg.screenshotsDir,
      summary: {
        scenario: "opencode-web-continuity",
        status,
        warnings,
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
