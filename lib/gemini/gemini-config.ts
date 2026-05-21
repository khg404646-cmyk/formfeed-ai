/** Google AI Studio에서 사용 가능한 비디오 멀티모달 모델 (1.5-flash는 404). */
export const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";

/** Inline upload limit; larger files use File API (느리고 타임아웃 위험 ↑). */
export const GEMINI_INLINE_VIDEO_MAX_BYTES = 18 * 1024 * 1024;

/** 베타: 이 크기 초과 시 File API 대기 없이 거절 (30초 영상 권장). */
export const GEMINI_BULK_ANALYSIS_MAX_BYTES = 22 * 1024 * 1024;

export const GEMINI_VIDEO_FETCH_MAX_BYTES = 100 * 1024 * 1024;

/** R2 다운로드 상한 (베타 분석용) */
export const GEMINI_VIDEO_FETCH_TIMEOUT_MS = 60_000;

/** Gemini File API PROCESSING 폴링 상한 */
export const GEMINI_FILE_PROCESSING_TIMEOUT_MS = 90_000;

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
