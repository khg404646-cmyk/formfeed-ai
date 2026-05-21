/** MediaPipe Pose 33-point indices used in biomechanics rules */
export const PoseIdx = {
  NOSE: 0,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
} as const;

export type NormalizedLandmark = {
  x: number;
  y: number;
  z: number;
  visibility: number;
};

export type PoseDetectionResult = {
  landmarks: NormalizedLandmark[];
};

const MIN_VISIBILITY = 0.35;

export function getLandmark(
  landmarks: NormalizedLandmark[],
  index: number,
): NormalizedLandmark | null {
  const lm = landmarks[index];
  if (!lm || lm.visibility < MIN_VISIBILITY) return null;
  return lm;
}

export function midpoint(
  a: NormalizedLandmark,
  b: NormalizedLandmark,
): { x: number; y: number } {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

export function angleDeg(
  a: { x: number; y: number },
  b: { x: number; y: number },
  c: { x: number; y: number },
): number {
  const ab = { x: a.x - b.x, y: a.y - b.y };
  const cb = { x: c.x - b.x, y: c.y - b.y };
  const dot = ab.x * cb.x + ab.y * cb.y;
  const mag =
    Math.sqrt(ab.x * ab.x + ab.y * ab.y) * Math.sqrt(cb.x * cb.x + cb.y * cb.y);
  if (mag === 0) return 0;
  const cos = Math.max(-1, Math.min(1, dot / mag));
  return (Math.acos(cos) * 180) / Math.PI;
}

export function toLandmarkSummary(
  landmarks: NormalizedLandmark[],
): { joint: string; x: number; y: number; visibility: number }[] {
  const keys: { joint: string; idx: number }[] = [
    { joint: "left_shoulder", idx: PoseIdx.LEFT_SHOULDER },
    { joint: "right_shoulder", idx: PoseIdx.RIGHT_SHOULDER },
    { joint: "left_hip", idx: PoseIdx.LEFT_HIP },
    { joint: "right_hip", idx: PoseIdx.RIGHT_HIP },
    { joint: "left_knee", idx: PoseIdx.LEFT_KNEE },
    { joint: "right_knee", idx: PoseIdx.RIGHT_KNEE },
    { joint: "left_ankle", idx: PoseIdx.LEFT_ANKLE },
    { joint: "right_ankle", idx: PoseIdx.RIGHT_ANKLE },
  ];
  return keys
    .map(({ joint, idx }) => {
      const lm = landmarks[idx];
      if (!lm) return null;
      return { joint, x: lm.x, y: lm.y, visibility: lm.visibility };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);
}
