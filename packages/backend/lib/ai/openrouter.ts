import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import type { LanguageModel } from "ai";
import {
  appComponent,
  appIdentifier,
  appName,
  appTitle,
  appUrl,
  envLabel,
} from "../app-url";

export const DEFAULT_OPENROUTER_MODEL = "google/gemini-3-flash-preview";

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
  compatibility: "strict",
  headers: {
    "HTTP-Referer": appUrl,
    "X-Title": appTitle,
  },
});

interface OpenRouterModelOptions {
  modelId: string;
  profileId?: string;
  traceId?: string;
  userId?: string;
}

function buildMetadata({
  traceId,
  profileId,
}: {
  traceId?: string;
  profileId?: string;
}): Record<string, string> {
  const metadata: Record<string, string> = {
    env: envLabel,
    appName,
    appComponent,
    appIdentifier,
    appTitle,
    appUrl,
  };

  if (traceId) {
    metadata.traceId = traceId;
  }

  if (profileId) {
    metadata.profileId = profileId;
  }

  return metadata;
}

export function createOpenRouterChatModel({
  modelId,
  traceId,
  profileId,
  userId,
}: OpenRouterModelOptions): LanguageModel {
  const metadata = buildMetadata({ traceId, profileId });
  const extraBody: Record<string, unknown> = {
    metadata,
  };

  if (traceId) {
    extraBody.session_id = traceId;
  }

  return openrouter.chat(modelId, {
    user: userId,
    extraBody,
  });
}
