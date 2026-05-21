"use client";

import type { MovementContext, MovementInference } from "../types/movement";
import type { FocusKeypoint } from "./biomechanics/focus-keypoints";
import {
  buildMovementContextFromPose,
  mergeInference,
  type BuildMovementOptions,
} from "./biomechanics/build-movement-context";
import type { PoseDetectionResult } from "./pose/landmarks";
import { detectPoseFromDataUrl } from "./pose/pose-landmarker";

export type AnalyzePhase = "pose" | "infer" | "text";

export type BuildMovementContextOptions = {
  trainerHint?: string;
  trainerFocusKeypoint?: FocusKeypoint | null;
  cachedPose?: PoseDetectionResult | null;
  onPhase?: (phase: AnalyzePhase) => void;
};

export async function fetchMovementInference(
  captureImageBase64: string,
  trainerHint?: string,
): Promise<MovementInference> {
  const res = await fetch("/api/ai/infer-movement", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      capture_image_base64: captureImageBase64,
      trainer_hint_exercise_type: trainerHint ?? "",
    }),
  });

  if (!res.ok) {
    return mergeInference({});
  }

  const data = (await res.json()) as Partial<MovementInference>;
  return mergeInference(data);
}

export async function detectPoseForCapture(
  captureImageBase64: string,
): Promise<PoseDetectionResult | null> {
  try {
    return await detectPoseFromDataUrl(captureImageBase64);
  } catch {
    return null;
  }
}

export async function buildMovementContext(
  captureImageBase64: string,
  options?: BuildMovementContextOptions,
): Promise<MovementContext> {
  const onPhase = options?.onPhase;
  onPhase?.("pose");

  const pose =
    options?.cachedPose !== undefined
      ? options.cachedPose
      : await detectPoseForCapture(captureImageBase64);

  onPhase?.("infer");
  const inference = await fetchMovementInference(
    captureImageBase64,
    options?.trainerHint,
  );

  const buildOpts: BuildMovementOptions = {
    trainerHint: options?.trainerHint,
    trainerFocusKeypoint: options?.trainerFocusKeypoint ?? null,
  };

  return buildMovementContextFromPose(pose, inference, buildOpts);
}
