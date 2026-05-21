import type { CameraView } from "../../types/movement";
import type { MovementInference } from "../../types/movement";
import { getLandmark, midpoint, PoseIdx, type NormalizedLandmark } from "../pose/landmarks";

export type ViewConfidence = "high" | "medium" | "low";

export type ResolvedCameraView = {
  camera_view: CameraView;
  view_confidence: ViewConfidence;
  pose_estimate: CameraView;
  vision_estimate: CameraView;
};

/** Pose-only heuristic: narrow shoulder span in x → side profile. */
export function estimateCameraViewFromPose(
  landmarks: NormalizedLandmark[],
): { view: CameraView; confidence: ViewConfidence } {
  const lShoulder = getLandmark(landmarks, PoseIdx.LEFT_SHOULDER);
  const rShoulder = getLandmark(landmarks, PoseIdx.RIGHT_SHOULDER);
  const lHip = getLandmark(landmarks, PoseIdx.LEFT_HIP);
  const rHip = getLandmark(landmarks, PoseIdx.RIGHT_HIP);

  if (!lShoulder || !rShoulder || !lHip || !rHip) {
    return { view: "unknown", confidence: "low" };
  }

  const shoulderWidth = Math.abs(lShoulder.x - rShoulder.x);
  const hipWidth = Math.abs(lHip.x - rHip.x);
  const torsoHeight = Math.abs(
    (lShoulder.y + rShoulder.y) / 2 - (lHip.y + rHip.y) / 2,
  );

  if (torsoHeight < 0.05) {
    return { view: "unknown", confidence: "low" };
  }

  const spanRatio = shoulderWidth / torsoHeight;
  const hipRatio = hipWidth / torsoHeight;

  if (spanRatio < 0.28 && hipRatio < 0.35) {
    return { view: "side", confidence: "high" };
  }

  if (spanRatio > 0.45 && hipRatio > 0.4) {
    return { view: "front", confidence: "high" };
  }

  if (spanRatio >= 0.28 && spanRatio <= 0.5) {
    return { view: "diagonal", confidence: "medium" };
  }

  return { view: "unknown", confidence: "low" };
}

export function resolveCameraView(
  inference: MovementInference,
  landmarks: NormalizedLandmark[] | null,
): ResolvedCameraView {
  const visionEstimate = inference.camera_view;
  const poseResult = landmarks
    ? estimateCameraViewFromPose(landmarks)
    : { view: "unknown" as CameraView, confidence: "low" as ViewConfidence };

  if (visionEstimate === "unknown" && poseResult.view !== "unknown") {
    return {
      camera_view: poseResult.view,
      view_confidence: poseResult.confidence,
      pose_estimate: poseResult.view,
      vision_estimate: visionEstimate,
    };
  }

  if (visionEstimate !== "unknown" && poseResult.view === "unknown") {
    return {
      camera_view: visionEstimate,
      view_confidence: inference.confidence === "high" ? "high" : "medium",
      pose_estimate: poseResult.view,
      vision_estimate: visionEstimate,
    };
  }

  if (visionEstimate === poseResult.view && visionEstimate !== "unknown") {
    return {
      camera_view: visionEstimate,
      view_confidence: "high",
      pose_estimate: poseResult.view,
      vision_estimate: visionEstimate,
    };
  }

  if (visionEstimate !== "unknown" && poseResult.view !== "unknown" && visionEstimate !== poseResult.view) {
    return {
      camera_view: "diagonal",
      view_confidence: "low",
      pose_estimate: poseResult.view,
      vision_estimate: visionEstimate,
    };
  }

  return {
    camera_view: visionEstimate !== "unknown" ? visionEstimate : poseResult.view,
    view_confidence: "low",
    pose_estimate: poseResult.view,
    vision_estimate: visionEstimate,
  };
}

/** Which leg is closer to camera / lead leg in lunge (lower knee = usually front). */
export function getLeadLeg(
  landmarks: NormalizedLandmark[],
): "left" | "right" | null {
  const lKnee = getLandmark(landmarks, PoseIdx.LEFT_KNEE);
  const rKnee = getLandmark(landmarks, PoseIdx.RIGHT_KNEE);
  if (!lKnee || !rKnee) return lKnee ? "left" : rKnee ? "right" : null;
  if (Math.abs(lKnee.y - rKnee.y) < 0.04) return null;
  return lKnee.y > rKnee.y ? "left" : "right";
}

export function getLegChain(
  landmarks: NormalizedLandmark[],
  side: "left" | "right",
): {
  hip: NormalizedLandmark;
  knee: NormalizedLandmark;
  ankle: NormalizedLandmark;
} | null {
  const hipIdx = side === "left" ? PoseIdx.LEFT_HIP : PoseIdx.RIGHT_HIP;
  const kneeIdx = side === "left" ? PoseIdx.LEFT_KNEE : PoseIdx.RIGHT_KNEE;
  const ankleIdx = side === "left" ? PoseIdx.LEFT_ANKLE : PoseIdx.RIGHT_ANKLE;
  const hip = getLandmark(landmarks, hipIdx);
  const knee = getLandmark(landmarks, kneeIdx);
  const ankle = getLandmark(landmarks, ankleIdx);
  if (!hip || !knee || !ankle) return null;
  return { hip, knee, ankle };
}

export function shoulderMidpoint(landmarks: NormalizedLandmark[]) {
  const l = getLandmark(landmarks, PoseIdx.LEFT_SHOULDER);
  const r = getLandmark(landmarks, PoseIdx.RIGHT_SHOULDER);
  if (l && r) return midpoint(l, r);
  return l ?? r ?? null;
}

export function hipMidpoint(landmarks: NormalizedLandmark[]) {
  const l = getLandmark(landmarks, PoseIdx.LEFT_HIP);
  const r = getLandmark(landmarks, PoseIdx.RIGHT_HIP);
  if (l && r) return midpoint(l, r);
  return l ?? r ?? null;
}
