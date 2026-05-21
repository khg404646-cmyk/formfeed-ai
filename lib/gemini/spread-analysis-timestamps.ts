import type { GeminiAnalysisItem } from "../../types/formfeed";

const MIN_GAP_MS = 3500;

/**
 * 모델이 초반에 타임스탬프를 몰아넣은 경우 영상 전 구간으로 재분배합니다.
 * videoDurationMs가 없으면 마지막 마커·클러스터 패턴으로 길이를 추정합니다.
 */
export function spreadAnalysisTimestamps(
  items: GeminiAnalysisItem[],
  videoDurationMs?: number,
): GeminiAnalysisItem[] {
  if (items.length < 2) return items;

  const sorted = [...items].sort((a, b) => a.timestamp_ms - b.timestamp_ms);
  const first = sorted[0].timestamp_ms;
  const last = sorted[sorted.length - 1].timestamp_ms;
  const span = last - first;
  const n = sorted.length;

  const estimatedDuration =
    videoDurationMs && videoDurationMs > 0
      ? videoDurationMs
      : Math.max(
          last + 2000,
          Math.round(last / 0.35),
          span < MIN_GAP_MS * (n - 1) ? Math.round(last * 2.8) : last + MIN_GAP_MS,
        );

  const clusterThreshold = MIN_GAP_MS * (n - 1);
  const needsEvenRedistribute =
    span < clusterThreshold || (last < estimatedDuration * 0.45 && n >= 3);

  if (needsEvenRedistribute) {
    const pad = Math.floor(estimatedDuration * 0.07);
    const end = estimatedDuration - pad;
    const step = n > 1 ? (end - pad) / (n - 1) : 0;
    return sorted.map((item, i) => ({
      ...item,
      timestamp_ms: Math.min(
        Math.max(0, Math.round(pad + step * i)),
        Math.max(0, estimatedDuration - 300),
      ),
    }));
  }

  const adjusted = [...sorted];
  for (let i = 1; i < adjusted.length; i++) {
    const gap = adjusted[i].timestamp_ms - adjusted[i - 1].timestamp_ms;
    if (gap < MIN_GAP_MS) {
      adjusted[i] = {
        ...adjusted[i],
        timestamp_ms: Math.min(
          adjusted[i - 1].timestamp_ms + MIN_GAP_MS,
          estimatedDuration - 300,
        ),
      };
    }
  }
  return adjusted;
}
