import { mapGeminiVideoError, USER_MESSAGES } from "./user-messages";
import type { GeminiBulkFeedbackResponse } from "../types/formfeed";

/** 클라이언트 fetch 상한 — 서버 bulk 타임아웃(240s) + 여유 */
export const CLIENT_AI_ANALYSIS_TIMEOUT_MS = 270_000;

const RETRYABLE_STATUS = new Set([429, 502, 503, 504]);

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function mapClientFetchError(err: unknown): string {
  if (err instanceof Error) {
    if (err.name === "AbortError") {
      return USER_MESSAGES.geminiTimeout;
    }
    if (err.message === "Failed to fetch" || err.message.includes("NetworkError")) {
      return USER_MESSAGES.geminiNetworkInterrupted;
    }
    if (
      err.message &&
      !err.message.startsWith("TIMEOUT:") &&
      !err.message.includes("Gemini returned")
    ) {
      return err.message;
    }
    return mapGeminiVideoError(err.message);
  }
  return USER_MESSAGES.geminiAnalysisFailed;
}

function createAttemptSignal(deadlineMs: number): AbortSignal {
  const controller = new AbortController();
  const remaining = deadlineMs - Date.now();
  if (remaining <= 0) {
    controller.abort();
    return controller.signal;
  }
  setTimeout(() => controller.abort(), remaining);
  return controller.signal;
}

async function postGenerateFeedbackOnce(
  payload: {
    video_url: string;
    exercise_type: string;
    video_duration_ms?: number;
  },
  signal: AbortSignal,
): Promise<GeminiBulkFeedbackResponse> {
  const res = await fetch("/api/ai/generate-feedback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal,
  });

  const body = (await res.json().catch(() => ({}))) as {
    error?: string;
    analysis?: GeminiBulkFeedbackResponse["analysis"];
  };

  if (!res.ok) {
    const apiError = body.error ?? USER_MESSAGES.geminiAnalysisFailed;
    if (RETRYABLE_STATUS.has(res.status)) {
      throw Object.assign(new Error(apiError), { retryable: true, status: res.status });
    }
    throw new Error(apiError);
  }

  if (!body.analysis || body.analysis.length === 0) {
    throw new Error(USER_MESSAGES.geminiEmptyAnalysis);
  }

  return { analysis: body.analysis };
}

/**
 * 영상 전체 AI 분석 — 전체 데드라인·일시 오류(429/502/503/504) 1회 재시도.
 */
export async function requestGenerateFeedback(
  payload: {
    video_url: string;
    exercise_type: string;
    video_duration_ms?: number;
  },
): Promise<GeminiBulkFeedbackResponse> {
  const deadlineMs = Date.now() + CLIENT_AI_ANALYSIS_TIMEOUT_MS;

  try {
    try {
      return await postGenerateFeedbackOnce(
        payload,
        createAttemptSignal(deadlineMs),
      );
    } catch (firstErr) {
      const retryable =
        firstErr &&
        typeof firstErr === "object" &&
        "retryable" in firstErr &&
        (firstErr as { retryable?: boolean }).retryable;
      if (!retryable || Date.now() >= deadlineMs) {
        throw firstErr;
      }
      await sleep(5000);
      return await postGenerateFeedbackOnce(
        payload,
        createAttemptSignal(deadlineMs),
      );
    }
  } catch (err) {
    throw new Error(mapClientFetchError(err));
  }
}
