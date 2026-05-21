import type { MotionFamily } from "../../types/movement";
import {
  angleDeg,
  getLandmark,
  midpoint,
  PoseIdx,
  type NormalizedLandmark,
} from "../pose/landmarks";

export function classifyMotionFamilyFromLandmarks(
  landmarks: NormalizedLandmark[],
): MotionFamily {
  const lHip = getLandmark(landmarks, PoseIdx.LEFT_HIP);
  const rHip = getLandmark(landmarks, PoseIdx.RIGHT_HIP);
  const lKnee = getLandmark(landmarks, PoseIdx.LEFT_KNEE);
  const rKnee = getLandmark(landmarks, PoseIdx.RIGHT_KNEE);
  const lAnkle = getLandmark(landmarks, PoseIdx.LEFT_ANKLE);
  const rAnkle = getLandmark(landmarks, PoseIdx.RIGHT_ANKLE);
  const lShoulder = getLandmark(landmarks, PoseIdx.LEFT_SHOULDER);
  const rShoulder = getLandmark(landmarks, PoseIdx.RIGHT_SHOULDER);
  const lWrist = getLandmark(landmarks, PoseIdx.LEFT_WRIST);
  const rWrist = getLandmark(landmarks, PoseIdx.RIGHT_WRIST);

  if (!lHip || !rHip || !lKnee || !rKnee) return "unknown";

  const hip = midpoint(lHip, rHip);
  const kneeL = angleDeg(lHip, lKnee, lAnkle ?? lKnee);
  const kneeR = angleDeg(rHip, rKnee, rAnkle ?? rKnee);
  const kneeAngle = (kneeL + kneeR) / 2;

  const hipL = angleDeg(lShoulder ?? lHip, lHip, lKnee);
  const hipR = angleDeg(rShoulder ?? rHip, rHip, rKnee);
  const hipAngle = (hipL + hipR) / 2;

  const legSpread = Math.abs(lAnkle?.x ?? lKnee.x - (rAnkle?.x ?? rKnee.x));
  const kneeHeightDiff = Math.abs(lKnee.y - rKnee.y);

  if (kneeHeightDiff > 0.12 && legSpread > 0.08) {
    return "lunge_pattern";
  }

  if (kneeAngle < 145 && hipAngle < 155) {
    return "squat_pattern";
  }

  if (hipAngle < 130 && kneeAngle > 155) {
    return "hinge_pattern";
  }

  const shoulderY = lShoulder && rShoulder ? (lShoulder.y + rShoulder.y) / 2 : hip.y;
  const wristAvgY =
    lWrist && rWrist
      ? (lWrist.y + rWrist.y) / 2
      : lWrist?.y ?? rWrist?.y;

  if (wristAvgY !== undefined && wristAvgY < shoulderY - 0.05) {
    return "push_pattern";
  }

  const lElbow = getLandmark(landmarks, PoseIdx.LEFT_ELBOW);
  const rElbow = getLandmark(landmarks, PoseIdx.RIGHT_ELBOW);
  if (lWrist && rWrist && lElbow && rElbow) {
    const wristsBelowShoulders = lWrist.y > shoulderY && rWrist.y > shoulderY;
    const elbowsBehindTorso = lElbow.x < hip.x && rElbow.x > hip.x;
    if (wristsBelowShoulders && elbowsBehindTorso) return "pull_pattern";
  }

  return "unknown";
}
