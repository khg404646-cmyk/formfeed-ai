/**
 * Gemini Flash(기본 gemini-2.5-flash): 전체 운동 영상(R2 URL)을 분석해 GeminiBulkFeedbackResponse(JSON)를 반환합니다.
 * System Instruction·프롬프트: lib/gemini/bulk-analysis-prompt.ts
 * 단일 프레임 초안은 /api/ai/draft-feedback (Anthropic) 를 사용합니다.
 */

import { NextResponse } from "next/server";
import { analyzeWorkoutVideoBulk } from "../../../../lib/gemini/bulk-video-analysis";
import { getGeminiApiKey } from "../../../../lib/gemini/gemini-config";
import {
  isExerciseType,
  mapGeminiVideoError,
  USER_MESSAGES,
} from "../../../../lib/user-messages";
import { MAX_VIDEO_DURATION_MS } from "../../../../lib/video-limits";
import type { GeminiBulkFeedbackResponse } from "../../../../types/formfeed";

/** 영상 다운로드 + Gemini 분석 — Vercel Pro 최대 300s (Hobby는 플랜 상한 적용) */
export const maxDuration = 300;

function isValidVideoUrl(value: unknown): value is string {
  if (typeof value !== "string" || !value.trim()) return false;
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  let body: {
    video_url?: unknown;
    exercise_type?: unknown;
    video_duration_ms?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "요청 본문이 올바르지 않습니다." }, { status: 400 });
  }

  if (!isValidVideoUrl(body.video_url)) {
    return NextResponse.json(
      { error: "video_url이 올바르지 않습니다." },
      { status: 400 },
    );
  }

  const exerciseRaw =
    typeof body.exercise_type === "string" ? body.exercise_type.trim() : "";
  if (!exerciseRaw || !isExerciseType(exerciseRaw)) {
    return NextResponse.json(
      { error: "exercise_type이 올바르지 않습니다." },
      { status: 400 },
    );
  }

  const geminiApiKey = getGeminiApiKey();
  if (!geminiApiKey) {
    console.error(
      "[generate-feedback] Gemini API Key가 누락되었습니다 — .env.local에 GEMINI_API_KEY를 설정했는지 확인하세요.",
    );
    return NextResponse.json(
      { error: USER_MESSAGES.geminiApiKeyMissing },
      { status: 500 },
    );
  }

  try {
    const durationRaw = body.video_duration_ms;
    const videoDurationMs =
      typeof durationRaw === "number" && Number.isFinite(durationRaw) && durationRaw > 0
        ? Math.round(durationRaw)
        : undefined;

    if (videoDurationMs && videoDurationMs > MAX_VIDEO_DURATION_MS) {
      return NextResponse.json({ error: USER_MESSAGES.videoTooLong }, { status: 400 });
    }

    const result: GeminiBulkFeedbackResponse = await analyzeWorkoutVideoBulk(
      body.video_url.trim(),
      exerciseRaw,
      videoDurationMs,
    );
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown Gemini error";
    console.error("[generate-feedback]", message);
    return NextResponse.json({ error: mapGeminiVideoError(message) }, { status: 500 });
  }
}
