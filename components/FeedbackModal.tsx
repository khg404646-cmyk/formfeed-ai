"use client";

import { useEffect, useMemo, useState } from "react";
import type { FeedbackMarker } from "../types/formfeed";
import type { MovementContext } from "../types/movement";
import type { FocusKeypoint } from "../lib/biomechanics/focus-keypoints";
import {
  buildMovementContext,
  detectPoseForCapture,
  type AnalyzePhase,
} from "../lib/analyze-movement-client";
import { getTrainerHintExerciseType } from "../lib/exercise-labels";
import { toLandmarkSummary, type PoseDetectionResult } from "../lib/pose/landmarks";
import { mapAiDraftError, USER_MESSAGES } from "../lib/user-messages";
import AreaSelector from "./AreaSelector";
import KeypointPicker from "./KeypointPicker";
import { InlineError } from "./StatusPanels";
import OverlayPreview from "./OverlayPreview";

type FeedbackModalMode = "create" | "edit";

export type FeedbackModalSaveData = {
  selected_area: string;
  popup_text: string;
  detail_text: string;
  cue_text: string;
  confidence: string | null;
  caution: string | null;
  ai_raw_response: Record<string, unknown> | null;
};

type FeedbackModalProps = {
  open: boolean;
  mode: FeedbackModalMode;
  timestampLabel: string;
  exerciseType: string;
  captureImageBase64?: string;
  captureError?: string | null;
  saveError?: string | null;
  initialData?: FeedbackMarker;
  onClose: () => void;
  onSave: (data: FeedbackModalSaveData) => void;
};

const defaultFormState: FeedbackModalSaveData = {
  selected_area: "",
  popup_text: "",
  detail_text: "",
  cue_text: "",
  confidence: null,
  caution: null,
  ai_raw_response: null,
};

type AiTone = "beginner-friendly" | "short" | "soft" | "professional";

const TONE_ACTIONS: { label: string; tone: AiTone }[] = [
  { label: "다시 생성", tone: "beginner-friendly" },
  { label: "짧게", tone: "short" },
  { label: "부드럽게", tone: "soft" },
  { label: "전문적으로", tone: "professional" },
];

function buildFormState(initialData?: FeedbackMarker): FeedbackModalSaveData {
  if (!initialData) return defaultFormState;
  return {
    selected_area: initialData.selected_area,
    popup_text: initialData.popup_text,
    detail_text: initialData.detail_text,
    cue_text: initialData.cue_text,
    confidence: initialData.confidence,
    caution: initialData.caution,
    ai_raw_response: null,
  };
}

function phaseLabel(phase: AnalyzePhase | "text" | null): string {
  if (phase === "pose") return USER_MESSAGES.aiAnalyzingPose;
  if (phase === "infer") return USER_MESSAGES.aiInferringMovement;
  if (phase === "text") return USER_MESSAGES.aiGenerating;
  return USER_MESSAGES.aiGenerating;
}

type FeedbackModalFormProps = Omit<FeedbackModalProps, "open">;

function FeedbackModalForm({
  mode,
  timestampLabel,
  exerciseType,
  captureImageBase64,
  captureError,
  saveError,
  initialData,
  onClose,
  onSave,
}: FeedbackModalFormProps) {
  const formDefaults = buildFormState(initialData);
  const [selectedArea, setSelectedArea] = useState(formDefaults.selected_area);
  const [popupText, setPopupText] = useState(formDefaults.popup_text);
  const [detailText, setDetailText] = useState(formDefaults.detail_text);
  const [cueText, setCueText] = useState(formDefaults.cue_text);
  const [confidence, setConfidence] = useState<string | null>(formDefaults.confidence);
  const [caution, setCaution] = useState<string | null>(formDefaults.caution);
  const [movementContext, setMovementContext] = useState<MovementContext | null>(null);
  const [analyzePhase, setAnalyzePhase] = useState<AnalyzePhase | "text" | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [cachedPose, setCachedPose] = useState<PoseDetectionResult | null>(null);
  const [poseLoading, setPoseLoading] = useState(false);
  const [focusKeypoint, setFocusKeypoint] = useState<FocusKeypoint | null>(null);

  const trainerHint = getTrainerHintExerciseType(exerciseType);

  useEffect(() => {
    const image = captureImageBase64?.trim() ?? "";
    if (!image) return;

    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setPoseLoading(true);
    });

    void detectPoseForCapture(image).then((pose) => {
      if (!cancelled) {
        setCachedPose(pose);
        setPoseLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [captureImageBase64]);

  const landmarkSummary = useMemo(() => {
    if (!cachedPose) return [];
    return toLandmarkSummary(cachedPose.landmarks);
  }, [cachedPose]);

  const canRequestAiDraft = useMemo(() => {
    const image = captureImageBase64?.trim() ?? "";
    return image.length > 0;
  }, [captureImageBase64]);

  const requestAiDraft = async (tone: AiTone) => {
    if (!canRequestAiDraft || !captureImageBase64) return;

    setIsGenerating(true);
    setAiError(null);

    try {
      const ctx = await buildMovementContext(captureImageBase64, {
        trainerHint: trainerHint || undefined,
        trainerFocusKeypoint: focusKeypoint,
        cachedPose,
        onPhase: (phase) => setAnalyzePhase(phase),
      });
      setMovementContext(ctx);

      setAnalyzePhase("text");
      const res = await fetch("/api/ai/draft-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          movement_context: ctx,
          capture_image_base64: ctx.pose_detected ? undefined : captureImageBase64,
          tone,
        }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setAiError(mapAiDraftError(body.error, res.status));
        return;
      }

      const data = (await res.json()) as {
        popup_text?: unknown;
        detail_text?: unknown;
        cue_text?: unknown;
        confidence?: unknown;
        caution?: unknown;
        selected_area?: unknown;
      };

      if (
        typeof data.popup_text !== "string" ||
        typeof data.detail_text !== "string" ||
        typeof data.cue_text !== "string"
      ) {
        setAiError(USER_MESSAGES.aiDraftFailed);
        return;
      }

      setPopupText(data.popup_text);
      setDetailText(data.detail_text);
      setCueText(data.cue_text);
      if (typeof data.confidence === "string") setConfidence(data.confidence);
      if (typeof data.caution === "string") setCaution(data.caution);
      if (typeof data.selected_area === "string" && data.selected_area.trim()) {
        setSelectedArea(data.selected_area);
      } else if (ctx.selected_area) {
        setSelectedArea(ctx.selected_area);
      }
    } catch {
      setAiError(USER_MESSAGES.aiDraftFailed);
    } finally {
      setIsGenerating(false);
      setAnalyzePhase(null);
    }
  };

  const handleSave = () => {
    const area = selectedArea.trim() || movementContext?.selected_area || "기타";
    onSave({
      selected_area: area,
      popup_text: popupText,
      detail_text: detailText,
      cue_text: cueText,
      confidence,
      caution,
      ai_raw_response: movementContext
        ? (movementContext as unknown as Record<string, unknown>)
        : null,
    });
  };

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="모달 닫기"
        className="absolute inset-0 bg-black/45"
        onClick={onClose}
      />

      <section className="absolute inset-x-0 bottom-0 mx-auto max-h-[92vh] w-full max-w-[430px] overflow-y-auto rounded-t-[22px] bg-white px-4 pb-6 pt-4 shadow-2xl">
        <header className="mb-3 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#111827]">
              {mode === "create" ? "AI 피드백 추가" : "피드백 수정"}
            </h2>
            <p className="mt-1 text-xs font-semibold text-[#6b7280]">
              현재 시점 {timestampLabel}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[#e5e7eb] p-2 text-sm font-semibold text-[#374151]"
            aria-label="닫기"
          >
            ✕
          </button>
        </header>

        <p className="mb-4 rounded-xl bg-[#f3f4f6] px-3 py-2 text-xs leading-relaxed text-[#374151]">
          AI가 이 프레임의 자세를 분석해 초안을 작성합니다. 최종 공유 전 트레이너가 꼭
          확인하세요.
        </p>

        <div className="mb-4 rounded-xl border border-[#e5e7eb] bg-[#f9fafb] p-3">
          {captureImageBase64 ? (
            <>
              {poseLoading ? (
                <p className="mb-2 text-xs text-[#6b7280]">관절 위치 인식 중...</p>
              ) : null}
              <KeypointPicker
                imageSrc={captureImageBase64}
                landmarks={landmarkSummary}
                selected={focusKeypoint}
                onSelect={setFocusKeypoint}
                cameraView={movementContext?.camera_view}
              />
              {popupText.trim() ? (
                <div className="relative mt-3 aspect-[9/16] max-h-32 w-full overflow-hidden rounded-lg bg-black">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={captureImageBase64}
                    alt="오버레이 미리보기"
                    className="h-full w-full object-contain opacity-40"
                  />
                  <OverlayPreview
                    timestampLabel={timestampLabel}
                    selectedArea={selectedArea.trim() || "기타"}
                    popupText={popupText}
                    detailText={detailText.trim() || undefined}
                  />
                </div>
              ) : null}
              {movementContext?.inferred_movement_label ? (
                <p className="mt-2 text-xs text-[#6b7280]">
                  인식: {movementContext.inferred_movement_label}
                  {movementContext.camera_view !== "unknown"
                    ? ` · 시점 ${movementContext.camera_view}`
                    : ""}
                  {movementContext.equipment_modality !== "unknown"
                    ? ` · ${movementContext.equipment_modality}`
                    : ""}
                </p>
              ) : null}
            </>
          ) : captureError ? (
            <InlineError>{captureError}</InlineError>
          ) : (
            <p className="text-xs leading-relaxed text-[#6b7280]">
              프레임 캡처가 없어도 직접 피드백은 작성할 수 있습니다.
            </p>
          )}
        </div>

        <div className="mb-4">
          <button
            type="button"
            onClick={() => {
              void requestAiDraft("beginner-friendly");
            }}
            disabled={!canRequestAiDraft || isGenerating}
            className="w-full rounded-2xl border border-[#d1d5db] bg-[#f3f4f6] px-4 py-3 text-sm font-semibold text-[#111827] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isGenerating
              ? phaseLabel(analyzePhase)
              : "AI 피드백 초안 만들기"}
          </button>
          <p className="mt-3 text-xs leading-relaxed text-[#6b7280]">
            관절 위치·하중을 계산한 뒤 짧은 문장 초안을 작성합니다.
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {TONE_ACTIONS.map(({ label, tone }) => (
              <button
                key={tone}
                type="button"
                onClick={() => {
                  void requestAiDraft(tone);
                }}
                disabled={!canRequestAiDraft || isGenerating}
                className="min-h-10 rounded-xl border border-[#e5e7eb] bg-white px-2 py-2 text-xs font-semibold text-[#374151] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {label}
              </button>
            ))}
          </div>
          {aiError ? (
            <div className="mt-2">
              <InlineError>{aiError}</InlineError>
            </div>
          ) : null}
        </div>

        <div className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-[#374151]">
              팝업 문장
            </span>
            <textarea
              value={popupText}
              onChange={(e) => setPopupText(e.target.value)}
              rows={2}
              className="w-full rounded-xl border border-[#e5e7eb] px-3 py-2 text-sm leading-relaxed text-[#111827] outline-none focus:border-[#9ca3af]"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-[#374151]">
              상세 설명
            </span>
            <textarea
              value={detailText}
              onChange={(e) => setDetailText(e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-[#e5e7eb] px-3 py-2 text-sm leading-relaxed text-[#111827] outline-none focus:border-[#9ca3af]"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-[#374151]">
              다음 세트 큐
            </span>
            <textarea
              value={cueText}
              onChange={(e) => setCueText(e.target.value)}
              rows={2}
              className="w-full rounded-xl border border-[#e5e7eb] px-3 py-2 text-sm leading-relaxed text-[#111827] outline-none focus:border-[#9ca3af]"
            />
          </label>
        </div>

        <button
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          className="mt-4 w-full rounded-xl border border-[#e5e7eb] px-3 py-2 text-xs font-semibold text-[#374151]"
        >
          {showAdvanced ? "부위 선택 숨기기" : "피드백 부위 선택"}
        </button>

        {showAdvanced ? (
          <div className="mt-3 space-y-4">
            <div>
              <p className="mb-2 text-sm font-semibold text-[#374151]">피드백 부위</p>
              <AreaSelector
                value={selectedArea || "기타"}
                onChange={setSelectedArea}
              />
            </div>
          </div>
        ) : null}

        {saveError ? (
          <div className="mt-4">
            <InlineError>{saveError}</InlineError>
          </div>
        ) : null}

        <button
          type="button"
          onClick={handleSave}
          className="mt-5 w-full rounded-2xl bg-[#111827] px-4 py-4 text-base font-semibold text-white"
        >
          저장
        </button>
      </section>
    </div>
  );
}

export default function FeedbackModal({
  open,
  initialData,
  captureImageBase64,
  ...props
}: FeedbackModalProps) {
  if (!open) return null;

  return (
    <FeedbackModalForm
      key={`${initialData?.id ?? "create"}-${captureImageBase64?.slice(0, 40) ?? "no-cap"}`}
      initialData={initialData}
      captureImageBase64={captureImageBase64}
      {...props}
    />
  );
}
