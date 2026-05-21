/** Google AI Studio에서 사용 가능한 비디오 멀티모달 모델 (1.5-flash는 404). */
export const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";

/** Inline upload limit; larger files use File API. */
export const GEMINI_INLINE_VIDEO_MAX_BYTES = 18 * 1024 * 1024;

export const GEMINI_VIDEO_FETCH_MAX_BYTES = 100 * 1024 * 1024;

export function getGeminiModel(): string {
  return process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;
}

export function getGeminiApiKey(): string | undefined {
  return process.env.GEMINI_API_KEY?.trim();
}
