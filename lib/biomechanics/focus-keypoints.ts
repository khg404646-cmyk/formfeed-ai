import type { LandmarkSummary } from "../../types/movement";

export const FOCUS_KEYPOINTS = [
  "left_knee",
  "right_knee",
  "left_hip",
  "right_hip",
  "left_ankle",
  "right_ankle",
  "left_shoulder",
  "right_shoulder",
] as const;

export type FocusKeypoint = (typeof FOCUS_KEYPOINTS)[number];

export const FOCUS_KEYPOINT_LABELS: Record<FocusKeypoint, string> = {
  left_knee: "왼쪽 무릎",
  right_knee: "오른쪽 무릎",
  left_hip: "왼쪽 골반",
  right_hip: "오른쪽 골반",
  left_ankle: "왼쪽 발목",
  right_ankle: "오른쪽 발목",
  left_shoulder: "왼쪽 어깨",
  right_shoulder: "오른쪽 어깨",
};

export function isFocusKeypoint(value: string): value is FocusKeypoint {
  return (FOCUS_KEYPOINTS as readonly string[]).includes(value);
}

export function areaFromFocusKeypoint(keypoint: FocusKeypoint): string {
  if (keypoint.includes("knee")) return "무릎";
  if (keypoint.includes("hip")) return "골반";
  if (keypoint.includes("ankle")) return "발";
  if (keypoint.includes("shoulder")) return "상체";
  return "기타";
}

export function filterLandmarksForPicker(
  landmarks: LandmarkSummary[],
): LandmarkSummary[] {
  return landmarks.filter((lm) => isFocusKeypoint(lm.joint) && lm.visibility >= 0.35);
}
