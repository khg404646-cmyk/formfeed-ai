import {
  GoogleGenerativeAI,
  SchemaType,
  type Part,
  type ResponseSchema,
} from "@google/generative-ai";
import { GoogleAIFileManager } from "@google/generative-ai/server";
import type { ExerciseType } from "../../types/formfeed";
import type { GeminiBulkFeedbackResponse } from "../../types/formfeed";
import {
  buildGeminiBulkUserPrompt,
  GEMINI_BULK_SYSTEM_INSTRUCTION,
} from "./bulk-analysis-prompt";
import { fetchVideoForGemini } from "./fetch-video-for-gemini";
import {
  GEMINI_INLINE_VIDEO_MAX_BYTES,
  getGeminiApiKey,
  getGeminiModel,
} from "./gemini-config";
import { spreadAnalysisTimestamps } from "./spread-analysis-timestamps";
import { validateGeminiBulkResponse } from "./validate-bulk-response";

const RESPONSE_SCHEMA: ResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    analysis: {
      type: SchemaType.ARRAY,
      description:
        "4-7 distinct coaching moments; each must use a different selected_area; timestamps in ms; Korean text fields",
      items: {
        type: SchemaType.OBJECT,
        properties: {
          timestamp_ms: {
            type: SchemaType.NUMBER,
            description:
              "Integer milliseconds from video start when the visible fault/peaks; must be evidence-based",
          },
          selected_area: {
            type: SchemaType.STRING,
            description:
              "Korean body region label; MUST differ across items (e.g. 고관절, 무릎, 발목, 척추, 상체, 발) — no duplicates",
          },
          arrow_position: {
            type: SchemaType.STRING,
            format: "enum",
            description: "Overlay anchor on 9:16 frame",
            enum: [
              "top-left",
              "top-center",
              "top-right",
              "middle-left",
              "middle-center",
              "middle-right",
              "bottom-left",
              "bottom-center",
              "bottom-right",
            ],
          },
          arrow_direction: {
            type: SchemaType.STRING,
            format: "enum",
            description: "Arrow points toward correction emphasis",
            enum: ["up", "down", "left", "right"],
          },
          popup_text: {
            type: SchemaType.STRING,
            description: "Korean keyword headline, max 10 characters",
          },
          detail_text: {
            type: SchemaType.STRING,
            description:
              "Korean causal explanation, max 50 characters, max 2 lines",
          },
          cue_text: {
            type: SchemaType.STRING,
            description: "Korean one-line imperative cue, max 30 characters",
          },
        },
        required: [
          "timestamp_ms",
          "selected_area",
          "arrow_position",
          "arrow_direction",
          "popup_text",
          "detail_text",
          "cue_text",
        ],
      },
    },
  },
  required: ["analysis"],
};

async function buildVideoPart(
  apiKey: string,
  buffer: Buffer,
  mimeType: string,
): Promise<Part> {
  if (buffer.length <= GEMINI_INLINE_VIDEO_MAX_BYTES) {
    return {
      inlineData: {
        mimeType,
        data: buffer.toString("base64"),
      },
    };
  }

  const fileManager = new GoogleAIFileManager(apiKey);
  const tmpName = `formfeed-${Date.now()}.mp4`;
  const upload = await fileManager.uploadFile(buffer, {
    mimeType,
    displayName: tmpName,
  });

  let file = upload.file;
  const deadline = Date.now() + 120_000;
  while (file.state === "PROCESSING" && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 2000));
    file = await fileManager.getFile(file.name);
  }

  if (file.state !== "ACTIVE") {
    throw new Error(`Gemini file processing failed: ${file.state}`);
  }

  return {
    fileData: {
      mimeType: file.mimeType,
      fileUri: file.uri,
    },
  };
}

export async function analyzeWorkoutVideoBulk(
  videoUrl: string,
  exerciseType: ExerciseType,
  videoDurationMs?: number,
): Promise<GeminiBulkFeedbackResponse> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const { buffer, mimeType } = await fetchVideoForGemini(videoUrl);
  const videoPart = await buildVideoPart(apiKey, buffer, mimeType);

  const userPrompt = buildGeminiBulkUserPrompt(exerciseType);

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: getGeminiModel(),
    systemInstruction: GEMINI_BULK_SYSTEM_INSTRUCTION,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
      temperature: 0.2,
      maxOutputTokens: 8192,
    },
  });

  const result = await model.generateContent([videoPart, { text: userPrompt }]);
  const text = result.response.text();
  if (!text?.trim()) {
    throw new Error("Empty response from Gemini");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Gemini returned invalid JSON");
  }

  const validated = validateGeminiBulkResponse(parsed);
  if (!validated) {
    throw new Error("Gemini response failed schema validation");
  }

  return {
    analysis: spreadAnalysisTimestamps(validated.analysis, videoDurationMs),
  };
}
