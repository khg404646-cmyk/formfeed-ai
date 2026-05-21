import type { AiConfidence } from "../../types/formfeed";

export type NormalizedFeedbackPayload = {
  popup_text: string;
  detail_text: string;
  cue_text: string;
  confidence: AiConfidence;
  caution: string;
};

function normalizeConfidence(value: unknown): AiConfidence {
  if (value === "high" || value === "medium" || value === "low") {
    return value;
  }
  if (typeof value === "number" && !Number.isNaN(value)) {
    if (value >= 0.75) return "high";
    if (value >= 0.45) return "medium";
    return "low";
  }
  if (typeof value === "string") {
    const lower = value.toLowerCase();
    if (lower.includes("high") || lower.includes("높")) return "high";
    if (lower.includes("low") || lower.includes("낮")) return "low";
  }
  return "medium";
}

function pickString(obj: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const v = obj[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

/** Lenient parse: model sometimes returns numeric confidence or alternate keys. */
export function normalizeFeedbackPayload(obj: unknown): NormalizedFeedbackPayload | null {
  if (!obj || typeof obj !== "object") return null;
  const o = obj as Record<string, unknown>;

  const popup_text = pickString(o, ["popup_text", "popupText", "popup"]);
  const detail_text = pickString(o, ["detail_text", "detailText", "detail"]);
  const cue_text = pickString(o, ["cue_text", "cueText", "cue"]);
  const caution =
    pickString(o, ["caution", "warning", "note"]) ||
    "단일 프레임 기준이므로 트레이너가 전체 동작을 확인해 주세요.";

  if (!popup_text && !detail_text && !cue_text) return null;

  return {
    popup_text: popup_text || detail_text.slice(0, 40),
    detail_text: detail_text || popup_text,
    cue_text: cue_text || "다음 세트에서도 같은 템포로 이어가 보세요.",
    confidence: normalizeConfidence(o.confidence),
    caution,
  };
}
