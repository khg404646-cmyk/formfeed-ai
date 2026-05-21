import { MAX_VIDEO_FILE_BYTES } from "../video-limits";

/** Google AI Studio에서 사용 가능한 비디오 멀티모달 모델 (1.5-flash는 404). */
export const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";

/** Inline upload limit; larger files use File API (느리고 타임아웃 위험 ↑). */
export const GEMINI_INLINE_VIDEO_MAX_BYTES = 18 * 1024 * 1024;

/** video-limits와 동일 — 서버 분석 상한 */
export const GEMINI_BULK_ANALYSIS_MAX_BYTES = MAX_VIDEO_FILE_BYTES;

/** R2 다운로드 상한 — video-limits와 동일 */
export const GEMINI_VIDEO_FETCH_MAX_BYTES = MAX_VIDEO_FILE_BYTES;

/** R2 다운로드 상한 */
export const GEMINI_VIDEO_FETCH_TIMEOUT_MS = 120_000;

/** Gemini File API PROCESSING 폴링 상한 */
export const GEMINI_FILE_PROCESSING_TIMEOUT_MS = 150_000;

/** generateContent 호출 상한 */
export const GEMINI_GENERATE_TIMEOUT_MS = 150_000;

/** 전체 bulk 분석 상한 (Vercel maxDuration 300s 여유) */
export const GEMINI_BULK_TOTAL_TIMEOUT_MS = 240_000;

export function getGeminiModel(): string {
  return process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;
}

export function getGeminiApiKey(): string | undefined {
  return process.env.GEMINI_API_KEY?.trim();
}
