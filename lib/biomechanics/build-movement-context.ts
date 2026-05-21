import type { AiConfidence } from "../../types/formfeed";
import type { MovementContext, MovementInference } from "../../types/movement";
import type { FocusKeypoint } from "./focus-keypoints";
import { areaFromFocusKeypoint, isFocusKeypoint } from "./focus-keypoints";
import { analyzeFocusKeypoint, pickConcernForFocus } from "./analyze-focus-joint";
import { resolveCameraView } from "./camera-view";
import { classifyMotionFamilyFromLandmarks } from "./classify-motion-family";
import { MARKER_ARROW_DIRECTION, MARKER_ARROW_POSITION } from "../marker-defaults";
import { analyzeKinematicsForView, pickPrimaryConcern } from "./rules-by-view";
import { toLandmarkSummary, type PoseDetectionResult } from "../pose/landmarks";

const DEFAULT_INFERENCE: MovementInference = {
  inferred_movement_label: "운동 동작",
  motion_family: "unknown",
  equipment_modality: "unknown",
  camera_view: "unknown",
  target_muscle_groups: [],
  confidence: "low",
};

export type BuildMovementOptions = {
  trainerHint?: string;
  trainerFocusKeypoint?: FocusKeypoint | null;
};

export function buildMovementContextFromPose(
  pose: PoseDetectionResult | null,
  inference: MovementInference,
  options?: BuildMovementOptions,
): MovementContext {
  const trainerHint = options?.trainerHint;
  const focus =
    options?.trainerFocusKeypoint && isFocusKeypoint(options.trainerFocusKeypoint)
      ? options.trainerFocusKeypoint
      : null;

  const resolved = resolveCameraView(inference, pose?.landmarks ?? null);
  const cameraView = resolved.camera_view;

  if (!pose) {
    return {
      pose_detected: false,
      landmarks_summary: [],
      motion_family: inference.motion_family,
      equipment_modality: inference.equipment_modality,
      inferred_movement_label: inference.inferred_movement_label,
      camera_view: cameraView,
      view_confidence: resolved.view_confidence,
      load_concerns: [],
      suppressed_concerns: cameraView === "side" ? ["knee_valgus"] : [],
      target_muscle_groups: inference.target_muscle_groups,
      overlay: {
        arrow_position: MARKER_ARROW_POSITION,
        arrow_direction: MARKER_ARROW_DIRECTION,
        focus_joint: "torso",
      },
      selected_area: "기타",
      trainer_hint_exercise_type: trainerHint,
      trainer_focus_keypoint: focus ?? undefined,
      inference_confidence: inference.confidence,
    };
  }

  const poseMotion = classifyMotionFamilyFromLandmarks(pose.landmarks);
  const motionFamily =
    inference.motion_family !== "unknown" ? inference.motion_family : poseMotion;

  let loadConcerns: MovementContext["load_concerns"];
  let suppressed: string[];

  if (focus) {
    const focused = analyzeFocusKeypoint(
      pose.landmarks,
      cameraView,
      motionFamily,
      focus,
    );
    loadConcerns = focused.load_concerns;
    suppressed = focused.suppressed_concerns;
  } else {
    const raw = analyzeKinematicsForView(pose.landmarks, cameraView);
    loadConcerns = raw.concerns;
    suppressed = raw.suppressed;
  }

  const primary = focus
    ? pickConcernForFocus(loadConcerns, focus)
    : pickPrimaryConcern(loadConcerns);

  return {
    pose_detected: true,
    landmarks_summary: toLandmarkSummary(pose.landmarks),
    motion_family: motionFamily,
    equipment_modality: inference.equipment_modality,
    inferred_movement_label: inference.inferred_movement_label,
    camera_view: cameraView,
    view_confidence: resolved.view_confidence,
    load_concerns: loadConcerns,
    suppressed_concerns: suppressed,
    target_muscle_groups:
      inference.target_muscle_groups.length > 0
        ? inference.target_muscle_groups
        : motionFamily === "squat_pattern" || motionFamily === "lunge_pattern"
          ? ["둔근", "대퇴사두"]
          : [],
    overlay: {
      arrow_position: MARKER_ARROW_POSITION,
      arrow_direction: MARKER_ARROW_DIRECTION,
      focus_joint: primary?.primary_stress_joint ?? focus ?? "torso",
    },
    selected_area: primary?.area ?? (focus ? areaFromFocusKeypoint(focus) : "기타"),
    trainer_hint_exercise_type: trainerHint,
    trainer_focus_keypoint: focus ?? undefined,
    inference_confidence: inference.confidence,
  };
}

export function mergeInference(
  partial: Partial<MovementInference>,
): MovementInference {
  return {
    ...DEFAULT_INFERENCE,
    ...partial,
    target_muscle_groups: partial.target_muscle_groups ?? DEFAULT_INFERENCE.target_muscle_groups,
    confidence: (partial.confidence as AiConfidence) ?? "low",
  };
}
