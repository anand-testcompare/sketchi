import { describe, expect, test } from "bun:test";

import {
  isRecoverableSessionContinuationError,
  resolveSessionCandidate,
  withRecoveredCachedSession,
} from "./session-continuity";

describe("session continuity helpers", () => {
  test("prefers explicit session IDs over cached continuity", () => {
    const candidate = resolveSessionCandidate({
      explicitSessionId: "explicit-session",
      getCachedSessionId: () => "cached-session",
    });

    expect(candidate).toEqual({
      sessionId: "explicit-session",
      source: "explicit",
    });
  });

  test("falls back to cached continuity when explicit session is absent", () => {
    const candidate = resolveSessionCandidate({
      getCachedSessionId: () => "cached-session",
    });

    expect(candidate).toEqual({
      sessionId: "cached-session",
      source: "cached",
    });
  });

  test("detects session-not-found transport errors", () => {
    const error = new Error(
      'Request failed (500): {"message":"diagrams.threadRun failed","data":{"errorMessage":"Session not found"}}'
    );

    expect(isRecoverableSessionContinuationError(error)).toBe(true);
  });

  test("retries once without sessionId when cached continuity is stale", async () => {
    const calls: Array<string | undefined> = [];
    let cleared = false;

    const result = await withRecoveredCachedSession({
      sessionCandidate: {
        sessionId: "stale-session",
        source: "cached",
      },
      clearCachedSession: () => {
        cleared = true;
      },
      explicitSessionErrorMessage: "should not be used",
      call: (sessionId) => {
        calls.push(sessionId);
        if (sessionId) {
          return Promise.reject(
            new Error(
              'Request failed (500): {"message":"diagrams.threadRun failed","data":{"errorMessage":"Session not found"}}'
            )
          );
        }
        return Promise.resolve("recovered");
      },
    });

    expect(result).toBe("recovered");
    expect(cleared).toBe(true);
    expect(calls).toEqual(["stale-session", undefined]);
  });

  test("surfaces a clearer error for invalid explicit session IDs", async () => {
    await expect(
      withRecoveredCachedSession({
        sessionCandidate: {
          sessionId: "invented-session",
          source: "explicit",
        },
        clearCachedSession: () => undefined,
        explicitSessionErrorMessage:
          "Provided Sketchi sessionId was not found. Omit sessionId to create a new diagram.",
        call: () =>
          Promise.reject(
            new Error(
              'Request failed (500): {"message":"diagrams.threadRun failed","data":{"errorMessage":"Session not found"}}'
            )
          ),
      })
    ).rejects.toThrow(
      "Provided Sketchi sessionId was not found. Omit sessionId to create a new diagram."
    );
  });
});
