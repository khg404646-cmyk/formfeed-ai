/**
 * R2 공개 URL을 same-origin 스트림 API로 변환 — iOS Safari CORS/Range 재생 이슈 완화.
 */
export function getVideoPlaybackSrc(videoUrl: string): string {
  const trimmed = videoUrl?.trim();
  if (!trimmed) return trimmed;

  try {
    const parsed = new URL(trimmed);
    if (typeof window !== "undefined" && parsed.origin === window.location.origin) {
      return trimmed;
    }
    return `/api/video/stream?url=${encodeURIComponent(trimmed)}`;
  } catch {
    return trimmed;
  }
}
