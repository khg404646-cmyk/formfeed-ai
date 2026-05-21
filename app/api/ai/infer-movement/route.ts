import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { getAnthropicModel } from "../../../../lib/ai/anthropic-config";
import {
  extractJsonObject,
  parseCaptureImageBase64,
} from "../../../../lib/ai/parse-capture-image";
import { mapAiDraftError } from "../../../../lib/user-messages";
import type {
  CameraView,
  EquipmentModality,
  MotionFamily,
  MovementInference,
} from "../../../../types/movement";

const MOTION_FAMILIES: MotionFamily[] = [
  "squat_pattern",
  "hinge_pattern",
  "push_pattern",
  "pull_pattern",
  "lunge_pattern",
  "rotation_pattern",
  "unknown",
];

const EQUIPMENT: EquipmentModality[] = [
  "free_weight",
  "machine",
  "bodyweight",
  "unknown",
];

const CAMERA_VIEWS: CameraView[] = ["side", "front", "diagonal", "unknown"];

const SYSTEM_PROMPT = [
  "너는 운동 영상 한 프레임을 분석하는 보조 AI다.",
  "응답은 JSON 한 개만 출력한다.",
  "키: inferred_movement_label(한국어 자연어), motion_family, equipment_modality, camera_view, target_muscle_groups(한국어 문자열 배열), confidence(high|medium|low)",
  "motion_family는 squat_pattern|hinge_pattern|push_pattern|pull_pattern|lunge_pattern|rotation_pattern|unknown 중 하나.",
  "equipment_modality는 free_weight|machine|bodyweight|unknown.",
  "camera_view: side=몸 옆 실루엣(런지/스쿼트 측면), front=정면, diagonal=사선.",
  "프로필(옆모습) 런지·스쿼트는 반드시 camera_view=side.",
  "바벨/덤벨+자유 궤적=free_weight, 케이블/스택/가이드레일/시트=machine.",
].join("\n");

function isMovementInference(obj: unknown): obj is MovementInference {
  if (!obj || typeof obj !== "object") return false;
  const o = obj as Record<string, unknown>;
  return (
    typeof o.inferred_movement_label === "string" &&
    MOTION_FAMILIES.includes(o.motion_family as MotionFamily) &&
    EQUIPMENT.includes(o.equipment_modality as EquipmentModality) &&
    CAMERA_VIEWS.includes(o.camera_view as CameraView) &&
    Array.isArray(o.target_muscle_groups) &&
    o.target_muscle_groups.every((g) => typeof g === "string") &&
    (o.confidence === "high" || o.confidence === "medium" || o.confidence === "low")
  );
}

export async function POST(request: Request) {
  let body: { capture_image_base64?: unknown; trainer_hint_exercise_type?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "요청 본문이 올바르지 않습니다." }, { status: 400 });
  }

  if (typeof body.capture_image_base64 !== "string" || !body.capture_image_base64.trim()) {
    return NextResponse.json(
      { error: "capture_image_base64가 필요합니다." },
      { status: 400 },
    );
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: mapAiDraftError("missing api key") }, { status: 500 });
  }

  const image = parseCaptureImageBase64(body.capture_image_base64);
  if (!image) {
    return NextResponse.json(
      { error: "capture_image_base64 형식이 올바르지 않습니다." },
      { status: 400 },
    );
  }

  const hint =
    typeof body.trainer_hint_exercise_type === "string"
      ? body.trainer_hint_exercise_type.trim()
      : "";

  const userText = [
    hint ? `트레이너 참고 라벨(강제 아님): ${hint}` : "트레이너 참고 라벨 없음(영상만으로 추론).",
    "첨부 이미지 한 프레임에서 수행 중인 운동 동작·장비·시점을 추론해라.",
  ].join("\n");

  try {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: getAnthropicModel(),
      max_tokens: 512,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: image.mediaType,
                data: image.data,
              },
            },
            { type: "text", text: userText },
          ],
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    const rawText =
      textBlock && textBlock.type === "text" ? textBlock.text.trim() : "";

    if (!rawText) {
      return NextResponse.json({ error: mapAiDraftError("empty response") }, { status: 500 });
    }

    const parsed = extractJsonObject(rawText);
    if (!isMovementInference(parsed)) {
      return NextResponse.json(
        { error: mapAiDraftError("invalid payload shape") },
        { status: 500 },
      );
    }

    return NextResponse.json(parsed);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown AI error";
    console.error("[infer-movement]", message);
    return NextResponse.json({ error: mapAiDraftError(message) }, { status: 500 });
  }
}
