"use client";

import {
  FilesetResolver,
  PoseLandmarker,
  type NormalizedLandmark as MpLandmark,
} from "@mediapipe/tasks-vision";
import type { NormalizedLandmark, PoseDetectionResult } from "./landmarks";

const WASM_CDN =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.32/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";

let landmarkerPromise: Promise<PoseLandmarker> | null = null;

function mapLandmarks(landmarks: MpLandmark[]): NormalizedLandmark[] {
  return landmarks.map((lm) => ({
    x: lm.x,
    y: lm.y,
    z: lm.z,
    visibility: lm.visibility ?? 0,
  }));
}

async function getPoseLandmarker(): Promise<PoseLandmarker> {
  if (!landmarkerPromise) {
    landmarkerPromise = (async () => {
      const vision = await FilesetResolver.forVisionTasks(WASM_CDN);
      return PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: MODEL_URL,
          delegate: "GPU",
        },
        runningMode: "IMAGE",
        numPoses: 1,
      });
    })();
  }
  return landmarkerPromise;
}

function loadImageFromDataUrl(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load capture image"));
    img.src = dataUrl;
  });
}

export async function detectPoseFromDataUrl(
  dataUrl: string,
): Promise<PoseDetectionResult | null> {
  const landmarker = await getPoseLandmarker();
  const image = await loadImageFromDataUrl(dataUrl);
  const result = landmarker.detect(image);
  const pose = result.landmarks[0];
  if (!pose || pose.length < 29) return null;
  return { landmarks: mapLandmarks(pose) };
}
