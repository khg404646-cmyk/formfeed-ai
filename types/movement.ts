import type { AiConfidence, ArrowDirection, ArrowPosition } from "./formfeed";

export type MotionFamily =
  | "squat_pattern"
  | "hinge_pattern"
  | "push_pattern"
  | "pull_pattern"
  | "lunge_pattern"
  | "rotation_pattern"
  | "unknown";

export type EquipmentModality =
  | "free_weight"
  | "machine"
  | "bodyweight"
  | "unknown";

export type CameraView = "side" | "front" | "diagonal" | "unknown";

export type LoadSeverity = "low" | "medium" | "high";

export type LoadConcern = {
  area: string;
  primary_stress_joint: string;
  likely_compensation: string;
  severity: LoadSeverity;
  evidence: string[];
};

export type LandmarkSummary = {
  joint: string;
  x: number;
  y: number;
  visibility: number;
};

export type OverlayPlacement = {
  arrow_position: ArrowPosition;
  arrow_direction: ArrowDirection;
  focus_joint: string;
};

export type MovementInference = {
  inferred_movement_label: string;
  motion_family: MotionFamily;
  equipment_modality: EquipmentModality;
  camera_view: CameraView;
  target_muscle_groups: string[];
  confidence: AiConfidence;
};

export type ViewConfidence = "high" | "medium" | "low";

export type MovementContext = {
  pose_detected: boolean;
  landmarks_summary: LandmarkSummary[];
  motion_family: MotionFamily;
  equipment_modality: EquipmentModality;
  inferred_movement_label: string;
  camera_view: CameraView;
  view_confidence: ViewConfidence;
  load_concerns: LoadConcern[];
  suppressed_concerns: string[];
  target_muscle_groups: string[];
  overlay: OverlayPlacement;
  selected_area: string;
  trainer_hint_exercise_type?: string;
  trainer_focus_keypoint?: string;
  inference_confidence: AiConfidence;
};

export type AiGenerateFeedbackResponse = {
  popup_text: string;
  detail_text: string;
  cue_text: string;
  confidence: AiConfidence;
  caution: string;
  selected_area: string;
  arrow_position: ArrowPosition;
  arrow_direction: ArrowDirection;
};
