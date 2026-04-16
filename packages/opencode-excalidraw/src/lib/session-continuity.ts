export type SessionCandidateSource = "none" | "cached" | "explicit";

export interface ResolvedSessionCandidate {
  sessionId?: string;
  source: SessionCandidateSource;
}

export function resolveSessionCandidate(input: {
  explicitSessionId?: string;
  getCachedSessionId: () => string | undefined;
}): ResolvedSessionCandidate {
  if (input.explicitSessionId) {
    return {
      sessionId: input.explicitSessionId,
      source: "explicit",
    };
  }

  const cachedSessionId = input.getCachedSessionId();
  if (cachedSessionId) {
    return {
      sessionId: cachedSessionId,
      source: "cached",
    };
  }

  return {
    source: "none",
  };
}

export function isRecoverableSessionContinuationError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return error.message.toLowerCase().includes("session not found");
}

export async function withRecoveredCachedSession<T>(input: {
  sessionCandidate: ResolvedSessionCandidate;
  call: (sessionId?: string) => Promise<T>;
  clearCachedSession: () => void;
  explicitSessionErrorMessage: string;
}): Promise<T> {
  try {
    return await input.call(input.sessionCandidate.sessionId);
  } catch (error) {
    if (!isRecoverableSessionContinuationError(error)) {
      throw error;
    }

    if (input.sessionCandidate.source === "cached") {
      input.clearCachedSession();
      return await input.call(undefined);
    }

    if (input.sessionCandidate.source === "explicit") {
      throw new Error(input.explicitSessionErrorMessage, { cause: error });
    }

    throw error;
  }
}
