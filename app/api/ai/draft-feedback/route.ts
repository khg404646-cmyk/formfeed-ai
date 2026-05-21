/**
 * 단일 프레임 + MovementContext 기반 피드백 초안 (Anthropic).
 * 전체 영상 분석은 /api/ai/generate-feedback (Gemini) 를 사용합니다.
 */

import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { getAnthropicModel } from "../../../../lib/ai/anthropic-config";
import {
  extractJsonObject,
  parseCaptureImageBase64,
} from "../../../../lib/ai/parse-capture-image";
import { buildFeedbackSystemPrompt } from "../../../../lib/ai/build-feedback-system-prompt";
import { normalizeFeedbackPayload } from "../../../../lib/ai/normalize-feedback-payload";
import { mapAiDraftError } from "../../../../lib/user-messages";
import { MARKER_ARROW_DIRECTION, MARKER_ARROW_POSITION } from "../../../../lib/marker-defaults";
import type { MovementContext } from "../../../../types/movement";

const TONES = ["beginner-friendly", "short", "soft", "professional"] as const;
type Tone = (typeof TONES)[number];

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isTone(value: unknown): value is Tone {
  return typeof value === "string" && (TONES as readonly string[]).includes(value);
}

function isMovementContext(value: unknown): value is MovementContext {
  if (!value || typeof value !== "object") return false;
  const o = value as MovementContext;
  return (
    typeof o.pose_detected === "boolean" &&
    Array.isArray(o.load_concerns) &&
    (!("suppressed_concerns" in o) || Array.isArray(o.suppressed_concerns)) &&
    typeof o.inferred_movement_label === "string" &&
    typeof o.selected_area === "string" &&
    typeof o.camera_view === "string"
  );
}

function getAnthropicErrorMessage(err: unknown): { message: string; status?: number } {
  if (err instanceof Anthropic.APIError) {
    const nested =
      err.error && typeof err.error === "object" && "message" in err.error
        ? String((err.error as { message?: unknown }).message)
        : err.message;
    return { message: nested, status: err.status };
  }
  if (err instanceof Error) {
    return { message: err.message };
  }
  return { message: "Unknown AI error" };
}

export async function POST(request: Request) {
  let body: {
    movement_context?: unknown;
    capture_image_base64?: unknown;
    tone?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "요청 본문이 올바르지 않습니다." }, { status: 400 });
  }

  if (!isMovementContext(body.movement_context)) {
    return NextResponse.json(
      { error: "movement_context가 올바르지 않습니다." },
      { status: 400 },
    );
  }

  if (!isTone(body.tone)) {
    return NextResponse.json({ error: "tone 값이 올바르지 않습니다." }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: mapAiDraftError("missing api key") }, { status: 500 });
  }

  const rawCtx = body.movement_context;
  const ctx: MovementContext = {
    ...rawCtx,
    suppressed_concerns: rawCtx.suppressed_concerns ?? [],
    view_confidence: rawCtx.view_confidence ?? "low",
  };

  const toneGuide: Record<Tone, string> = {
    "beginner-friendly": "초보자에게 최대한 쉽고 짧게.",
    short: "popup은 25자 내외, detail·cue도 한 줄씩.",
    soft: "부드럽고 격려하는 톤.",
    professional: "코칭 현장 말투, 과장 없이.",
  };

  const userText = [
    `톤: ${toneGuide[body.tone]}`,
    "",
    "아래 movement_context JSON만 사용해 피드백 초안을 작성해라.",
    JSON.stringify(ctx, null, 2),
  ].join("\n");

  const content: Anthropic.MessageCreateParams["messages"][0]["content"] = [
    { type: "text", text: userText },
  ];

  if (!ctx.pose_detected && isNonEmptyString(body.capture_image_base64)) {
    const image = parseCaptureImageBase64(body.capture_image_base64);
    if (image) {
      content.unshift({
        type: "image",
        source: {
          type: "base64",
          media_type: image.mediaType,
          data: image.data,
        },
      });
    }
  }

  try {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: getAnthropicModel(),
      max_tokens: 600,
      system: buildFeedbackSystemPrompt(ctx),
      messages: [{ role: "user", content }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    const rawText =
      textBlock && textBlock.type === "text" ? textBlock.text.trim() : "";

    if (!rawText) {
      return NextResponse.json({ error: mapAiDraftError("empty response") }, { status: 500 });
    }

    let parsed: unknown;
    try {
      parsed = extractJsonObject(rawText);
    } catch {
      return NextResponse.json({ error: mapAiDraftError("invalid json") }, { status: 500 });
    }

    const normalized = normalizeFeedbackPayload(parsed);
    if (!normalized) {
      return NextResponse.json(
        { error: mapAiDraftError("invalid payload shape") },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ...normalized,
      selected_area: ctx.selected_area,
      arrow_position: MARKER_ARROW_POSITION,
      arrow_direction: MARKER_ARROW_DIRECTION,
    });
  } catch (err) {
    const { message, status } = getAnthropicErrorMessage(err);
    console.error("[draft-feedback]", status, message);
    return NextResponse.json({ error: mapAiDraftError(message, status) }, { status: 500 });
  }
}
