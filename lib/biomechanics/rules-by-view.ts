import type { CameraView, LoadConcern } from "../../types/movement";
import {
  getLeadLeg,
  getLegChain,
  hipMidpoint,
  shoulderMidpoint,
} from "./camera-view";
import { angleDeg, getLandmark, PoseIdx, type NormalizedLandmark } from "../pose/landmarks";

const JOINT_TO_AREA: Record<string, string> = {
  knee: "무릎",
  hip: "골반",
  spine: "허리",
  shoulder: "상체",
  ankle: "발",
  symmetry: "기타",
};

function concern(
  primary_stress_joint: string,
  likely_compensation: string,
  severity: LoadConcern["severity"],
  evidence: string[],
): LoadConcern {
  const key = primary_stress_joint.split("_")[0] ?? "symmetry";
  return {
    area: JOINT_TO_AREA[key] ?? "기타",
    primary_stress_joint,
    likely_compensation,
    severity,
    evidence,
  };
}

type RawAnalysis = {
  concerns: LoadConcern[];
  suppressed: string[];
};

function detectFrontValgus(landmarks: NormalizedLandmark[]): LoadConcern[] {
  const issues: LoadConcern[] = [];
  const lKnee = getLandmark(landmarks, PoseIdx.LEFT_KNEE);
  const rKnee = getLandmark(landmarks, PoseIdx.RIGHT_KNEE);
  const lAnkle = getLandmark(landmarks, PoseIdx.LEFT_ANKLE);
  const rAnkle = getLandmark(landmarks, PoseIdx.RIGHT_ANKLE);

  if (lKnee && lAnkle && lAnkle.x - lKnee.x < -0.03) {
    issues.push(
      concern("knee_valgus", "hip_abductors", "medium", [
        "camera_view=front",
        `left_knee_x=${lKnee.x.toFixed(2)} left_ankle_x=${lAnkle.x.toFixed(2)}`,
        "정면에서 무릎이 발끝 안쪽(x)으로 모임",
      ]),
    );
  }
  if (rKnee && rAnkle && rKnee.x - rAnkle.x < -0.03) {
    issues.push(
      concern("knee_valgus", "hip_abductors", "medium", [
        "camera_view=front",
        `right_knee_x=${rKnee.x.toFixed(2)} right_ankle_x=${rAnkle.x.toFixed(2)}`,
      ]),
    );
  }
  return issues;
}

function detectSideKneeForward(
  landmarks: NormalizedLandmark[],
  side: "left" | "right",
): LoadConcern | null {
  const chain = getLegChain(landmarks, side);
  if (!chain) return null;

  const kneeAngle = angleDeg(chain.hip, chain.knee, chain.ankle);
  const kneeAheadOfAnkle = chain.knee.x > chain.ankle.x + 0.05;

  if (kneeAngle < 75 || (kneeAheadOfAnkle && kneeAngle < 90)) {
    return concern(
      "knee_forward",
      "target_glutes_quads",
      "medium",
      [
        "camera_view=side",
        `leg=${side}`,
        `knee_angle=${kneeAngle.toFixed(0)}`,
        "측면에서 무릎이 발목보다 앞·각도가 작음",
      ],
    );
  }
  return null;
}

function detectSideTorsoLean(landmarks: NormalizedLandmark[]): LoadConcern | null {
  const shoulder = shoulderMidpoint(landmarks);
  const hip = hipMidpoint(landmarks);
  if (!shoulder || !hip) return null;

  const torsoAngle = angleDeg(shoulder, hip, { x: hip.x, y: hip.y + 0.1 });
  if (torsoAngle < 140) {
    return concern(
      "torso_lean",
      "core_stability",
      "low",
      [`camera_view=side`, `torso_angle=${torsoAngle.toFixed(0)}`],
    );
  }
  return null;
}

function detectSymmetry(landmarks: NormalizedLandmark[]): LoadConcern | null {
  const lKnee = getLandmark(landmarks, PoseIdx.LEFT_KNEE);
  const rKnee = getLandmark(landmarks, PoseIdx.RIGHT_KNEE);
  if (!lKnee || !rKnee) return null;
  if (Math.abs(lKnee.y - rKnee.y) > 0.1) {
    return concern(
      "symmetry_imbalance",
      "bilateral_balance",
      "low",
      [`knee_height_diff=${Math.abs(lKnee.y - rKnee.y).toFixed(2)}`],
    );
  }
  return null;
}

function analyzeSideView(landmarks: NormalizedLandmark[]): RawAnalysis {
  const concerns: LoadConcern[] = [];
  const suppressed: string[] = ["knee_valgus"];

  const lead = getLeadLeg(landmarks);
  const sides: ("left" | "right")[] = lead ? [lead] : ["left", "right"];

  for (const side of sides) {
    const kf = detectSideKneeForward(landmarks, side);
    if (kf) concerns.push(kf);
  }

  const torso = detectSideTorsoLean(landmarks);
  if (torso) concerns.push(torso);

  const sym = detectSymmetry(landmarks);
  if (sym) concerns.push(sym);

  return { concerns, suppressed };
}

function analyzeFrontView(landmarks: NormalizedLandmark[]): RawAnalysis {
  const concerns = detectFrontValgus(landmarks);
  const sym = detectSymmetry(landmarks);
  if (sym) concerns.push(sym);
  return { concerns, suppressed: [] };
}

function analyzeDiagonalOrUnknown(landmarks: NormalizedLandmark[]): RawAnalysis {
  const raw = [...detectFrontValgus(landmarks)];
  const suppressed: string[] = [];

  const filtered: LoadConcern[] = [];
  for (const c of raw) {
    if (c.primary_stress_joint === "knee_valgus") {
      suppressed.push("knee_valgus");
      continue;
    }
    filtered.push({ ...c, severity: "low", evidence: [...c.evidence, "camera_view=uncertain"] });
  }

  if (filtered.length === 0) {
    const sym = detectSymmetry(landmarks);
    if (sym) {
      filtered.push({
        ...sym,
        severity: "low",
        evidence: [...sym.evidence, "camera_view=uncertain"],
      });
    }
  }

  return {
    concerns: filtered.slice(0, 1),
    suppressed,
  };
}

export function analyzeKinematicsForView(
  landmarks: NormalizedLandmark[],
  cameraView: CameraView,
): RawAnalysis {
  if (cameraView === "side") {
    return analyzeSideView(landmarks);
  }
  if (cameraView === "front") {
    return analyzeFrontView(landmarks);
  }
  return analyzeDiagonalOrUnknown(landmarks);
}

export function pickPrimaryConcern(concerns: LoadConcern[]): LoadConcern | null {
  if (concerns.length === 0) return null;
  const order: LoadConcern["severity"][] = ["high", "medium", "low"];
  return [...concerns].sort(
    (a, b) => order.indexOf(a.severity) - order.indexOf(b.severity),
  )[0];
}

export function areaFromConcern(concern: LoadConcern | null): string {
  return concern?.area ?? "기타";
}
