import type { CameraView, LoadConcern, MotionFamily } from "../../types/movement";
import type { FocusKeypoint } from "./focus-keypoints";
import { areaFromFocusKeypoint } from "./focus-keypoints";
import { getLegChain } from "./camera-view";
import {
  analyzeKinematicsForView,
  pickPrimaryConcern,
} from "./rules-by-view";
import { angleDeg, getLandmark, PoseIdx, type NormalizedLandmark } from "../pose/landmarks";
import type { LoadConcern as LC } from "../../types/movement";

function concern(
  primary_stress_joint: string,
  likely_compensation: string,
  severity: LC["severity"],
  evidence: string[],
  area: string,
): LoadConcern {
  return {
    area,
    primary_stress_joint,
    likely_compensation,
    severity,
    evidence,
  };
}

function filterForFocus(concerns: LoadConcern[], focus: FocusKeypoint): LoadConcern[] {
  const side = focus.startsWith("left") ? "left" : "right";
  const joint = focus.split("_").slice(1).join("_");

  return concerns.filter((c) => {
    const p = c.primary_stress_joint;
    if (joint === "knee") return p.includes("knee");
    if (joint === "hip") return p.includes("hip") || p.includes("torso");
    if (joint === "ankle") return p.includes("ankle") || p.includes("knee_forward");
    if (joint === "shoulder") return p.includes("torso") || p.includes("spine");
    return true;
  }).map((c) => ({
    ...c,
    evidence: [...c.evidence, `trainer_focus=${focus}`, `leg=${side}`],
  }));
}

function analyzeFocusedKneeSide(
  landmarks: NormalizedLandmark[],
  cameraView: CameraView,
  side: "left" | "right",
  area: string,
): LoadConcern[] {
  const issues: LoadConcern[] = [];
  const chain = getLegChain(landmarks, side);
  if (!chain) return issues;

  if (cameraView === "side") {
    const kneeAngle = angleDeg(chain.hip, chain.knee, chain.ankle);
    if (kneeAngle < 80) {
      issues.push(
        concern(
          "knee_forward",
          "target_glutes_quads",
          "medium",
          [`camera_view=side`, `knee_angle=${kneeAngle.toFixed(0)}`, `focus_leg=${side}`],
          area,
        ),
      );
    }
    return issues;
  }

  if (cameraView === "front") {
    const knee = chain.knee;
    const ankle = chain.ankle;
    if (ankle.x - knee.x < -0.03) {
      issues.push(
        concern(
          "knee_valgus",
          "hip_abductors",
          "medium",
          ["camera_view=front", `focus_leg=${side}`],
          area,
        ),
      );
    }
  }

  return issues;
}

function analyzeFocusedHip(
  landmarks: NormalizedLandmark[],
  side: "left" | "right",
  area: string,
): LoadConcern[] {
  const hip = getLandmark(
    landmarks,
    side === "left" ? PoseIdx.LEFT_HIP : PoseIdx.RIGHT_HIP,
  );
  const knee = getLandmark(
    landmarks,
    side === "left" ? PoseIdx.LEFT_KNEE : PoseIdx.RIGHT_KNEE,
  );
  if (!hip || !knee) return [];

  const hipAngle = angleDeg(
    getLandmark(landmarks, side === "left" ? PoseIdx.LEFT_SHOULDER : PoseIdx.RIGHT_SHOULDER) ?? hip,
    hip,
    knee,
  );

  if (hipAngle < 120) {
    return [
      concern(
        "hip_hinge",
        "posterior_chain",
        "low",
        [`hip_angle=${hipAngle.toFixed(0)}`, `trainer_focus=${side}_hip`],
        area,
      ),
    ];
  }
  return [];
}

/** Run view-gated rules then narrow to trainer-selected keypoint. */
export function analyzeFocusKeypoint(
  landmarks: NormalizedLandmark[],
  cameraView: CameraView,
  motionFamily: MotionFamily,
  focus: FocusKeypoint,
): { load_concerns: LoadConcern[]; suppressed_concerns: string[] } {
  const area = areaFromFocusKeypoint(focus);
  const side = focus.startsWith("left") ? "left" : "right";

  let concerns: LoadConcern[] = [];
  const suppressed: string[] = [];

  if (focus.includes("knee")) {
    concerns = analyzeFocusedKneeSide(landmarks, cameraView, side, area);
    if (cameraView === "side") suppressed.push("knee_valgus");
  } else if (focus.includes("hip")) {
    concerns = analyzeFocusedHip(landmarks, side, area);
  } else if (focus.includes("ankle")) {
    concerns = analyzeFocusedKneeSide(landmarks, cameraView, side, area);
  } else if (focus.includes("shoulder")) {
    const full = analyzeKinematicsForView(landmarks, cameraView);
    concerns = filterForFocus(full.concerns, focus);
    suppressed.push(...full.suppressed);
  }

  if (concerns.length === 0) {
    const full = analyzeKinematicsForView(landmarks, cameraView);
    concerns = filterForFocus(full.concerns, focus);
    suppressed.push(...full.suppressed);
  }

  return {
    load_concerns: concerns.slice(0, 2),
    suppressed_concerns: [...new Set(suppressed)],
  };
}

export function pickConcernForFocus(
  concerns: LoadConcern[],
  focus: FocusKeypoint,
): LoadConcern | null {
  const picked = pickPrimaryConcern(concerns);
  if (picked) return picked;
  return {
    area: areaFromFocusKeypoint(focus),
    primary_stress_joint: focus,
    likely_compensation: "general_form",
    severity: "low",
    evidence: [`trainer_focus=${focus}`, "자동 검출 이슈 없음 — 일반 코칭 포인트"],
  };
}
