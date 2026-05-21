import type {
  ArrowDirection,
  ArrowPosition,
  GeminiAnalysisItem,
  GeminiBulkFeedbackResponse,
} from "../../types/formfeed";

const ARROW_POSITIONS: ArrowPosition[] = [
  "top-left",
  "top-center",
  "top-right",
  "middle-left",
  "middle-center",
  "middle-right",
  "bottom-left",
  "bottom-center",
  "bottom-right",
];

const ARROW_DIRECTIONS: ArrowDirection[] = ["up", "down", "left", "right"];

/** Mobile overlay hard limits — server MUST clamp even if the model exceeds them. */
const MAX_ITEMS = 15;
const MAX_POPUP = 10;
const MAX_DETAIL = 50;
const MAX_CUE = 30;

/** Known Gemini Korean homophone slips in physics copy. */
const PHYSICS_TYPO_FIXES: [RegExp, string][] = [
  [/괴적/g, "궤적"],
  [/하위\s*궤적/g, "하향 궤적"],
];

function normalizePhysicsTypos(text: string): string {
  let out = text;
  for (const [pattern, replacement] of PHYSICS_TYPO_FIXES) {
    out = out.replace(pattern, replacement);
  }
  return out;
}

function isArrowPosition(v: unknown): v is ArrowPosition {
  return typeof v === "string" && (ARROW_POSITIONS as readonly string[]).includes(v);
}

function isArrowDirection(v: unknown): v is ArrowDirection {
  return typeof v === "string" && (ARROW_DIRECTIONS as readonly string[]).includes(v);
}

function clampText(value: unknown, max: number, fixTypos = false): string | null {
  if (typeof value !== "string") return null;
  let t = value.trim();
  if (!t) return null;
  if (fixTypos) t = normalizePhysicsTypos(t);
  return t.length > max ? t.slice(0, max) : t;
}

function parseItem(raw: unknown): GeminiAnalysisItem | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;

  const ts =
    typeof o.timestamp_ms === "number" && Number.isFinite(o.timestamp_ms)
      ? Math.max(0, Math.round(o.timestamp_ms))
      : null;
  if (ts === null) return null;

  const selected_area = clampText(o.selected_area, 40);
  const popup_text = clampText(o.popup_text, MAX_POPUP, true);
  const detail_text = clampText(o.detail_text, MAX_DETAIL, true);
  const cue_text = clampText(o.cue_text, MAX_CUE, true);

  if (!selected_area || !popup_text || !detail_text || !cue_text) return null;
  if (!isArrowPosition(o.arrow_position) || !isArrowDirection(o.arrow_direction)) {
    return null;
  }

  return {
    timestamp_ms: ts,
    selected_area,
    arrow_position: o.arrow_position,
    arrow_direction: o.arrow_direction,
    popup_text,
    detail_text,
    cue_text,
  };
}

export function validateGeminiBulkResponse(raw: unknown): GeminiBulkFeedbackResponse | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (!Array.isArray(o.analysis)) return null;

  const items: GeminiAnalysisItem[] = [];
  const seenAreas = new Set<string>();
  for (const entry of o.analysis) {
    const item = parseItem(entry);
    if (!item) continue;
    const areaKey = item.selected_area.replace(/\s+/g, "").toLowerCase();
    if (seenAreas.has(areaKey)) continue;
    seenAreas.add(areaKey);
    items.push(item);
  }

  if (items.length === 0) return null;

  const sorted = [...items]
    .sort((a, b) => a.timestamp_ms - b.timestamp_ms)
    .slice(0, MAX_ITEMS);

  return { analysis: sorted };
}
