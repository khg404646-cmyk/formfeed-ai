"use client";

import { useState } from "react";
import type { FeedbackMarker } from "../types/formfeed";
import { InlineError } from "./StatusPanels";
import AreaSelector from "./AreaSelector";
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

const POPUP_MAX = 10;
const DETAIL_MAX = 50;
const CUE_MAX = 30;

function buildFormState(initialData?: FeedbackMarker): FeedbackModalSaveData {
  if (!initialData) {
    return {
      selected_area: "기타",
      popup_text: "",
      detail_text: "",
      cue_text: "",
      confidence: null,
      caution: null,
      ai_raw_response: null,
    };
  }
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

type FeedbackModalFormProps = Omit<FeedbackModalProps, "open">;

function FeedbackModalForm({
  mode,
  timestampLabel,
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
  const [formError, setFormError] = useState<string | null>(null);

  const areaLabel = selectedArea.trim() || "기타";
  const canPreview = popupText.trim().length > 0;

  const fieldClass =
    "w-full rounded-xl border border-slate-200 px-3 py-2 text-sm leading-snug text-slate-900 outline-none focus:border-slate-400";

  const handleSave = () => {
    const area = areaLabel;
    const popup = popupText.trim();
    const detail = detailText.trim();
    const cue = cueText.trim();

    if (!popup) {
      setFormError("핵심 현상(팝업 제목)을 입력해 주세요.");
      return;
    }
    if (!detail) {
      setFormError("원인 설명을 입력해 주세요.");
      return;
    }
    if (!cue) {
      setFormError("다음 연습 큐를 입력해 주세요.");
      return;
    }

    setFormError(null);
    onSave({
      selected_area: area,
      popup_text: popup,
      detail_text: detail,
      cue_text: cue,
      confidence: initialData?.confidence ?? null,
      caution: initialData?.caution ?? null,
      ai_raw_response: null,
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
            <h2 className="text-lg font-bold text-slate-900">
              {mode === "create" ? "피드백 추가" : "피드백 수정"}
            </h2>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              현재 시점 {timestampLabel}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 p-2 text-sm font-semibold text-slate-600"
            aria-label="닫기"
          >
            ✕
          </button>
        </header>

        <p className="mb-4 rounded-xl bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-600">
          회원 영상 팝업·하단 미션 카드와 같은 형식으로 직접 작성합니다.
        </p>

        <div className="mb-4">
          <p className="mb-2 text-xs font-semibold text-slate-500">미리보기</p>
          <div className="relative aspect-[9/16] max-h-40 w-full overflow-hidden rounded-xl bg-black">
            {captureImageBase64 ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={captureImageBase64}
                alt=""
                className="h-full w-full object-contain opacity-35"
              />
            ) : null}
            {canPreview ? (
              <div className="absolute inset-x-2 top-2">
                <OverlayPreview
                  timestampLabel={timestampLabel}
                  selectedArea={areaLabel}
                  popupText={popupText.trim()}
                  detailText={detailText.trim() || undefined}
                  guardControls
                />
              </div>
            ) : (
              <p className="absolute inset-0 flex items-center justify-center px-4 text-center text-xs text-white/70">
                핵심 현상을 입력하면 팝업 미리보기가 표시됩니다.
              </p>
            )}
          </div>
          {captureError ? (
            <p className="mt-1.5 text-[11px] text-slate-500">{captureError}</p>
          ) : null}
        </div>

        <div className="space-y-4">
          <div>
            <p className="mb-2 text-sm font-semibold text-slate-800">피드백 부위</p>
            <AreaSelector value={areaLabel} onChange={setSelectedArea} />
          </div>

          <label className="block">
            <span className="mb-1 block text-sm font-bold text-slate-900">
              핵심 현상
              <span className="ml-1 text-xs font-medium text-slate-500">
                (팝업 제목 · 권장 {POPUP_MAX}자)
              </span>
            </span>
            <input
              type="text"
              value={popupText}
              onChange={(e) => setPopupText(e.target.value)}
              maxLength={POPUP_MAX}
              placeholder='예: 골반 말림'
              className={fieldClass}
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-slate-700">
              원인 설명
              <span className="ml-1 text-xs font-medium text-slate-500">
                (팝업 본문 · 권장 {DETAIL_MAX}자)
              </span>
            </span>
            <textarea
              value={detailText}
              onChange={(e) => setDetailText(e.target.value)}
              maxLength={DETAIL_MAX}
              rows={3}
              placeholder="왜 이런 움직임이 나오는지 짧게 설명"
              className={fieldClass}
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-slate-700">
              다음 연습 큐
              <span className="ml-1 text-xs font-medium text-slate-500">
                (공유 페이지 미션 · 권장 {CUE_MAX}자)
              </span>
            </span>
            <textarea
              value={cueText}
              onChange={(e) => setCueText(e.target.value)}
              maxLength={CUE_MAX}
              rows={2}
              placeholder="다음 세트에서 바로 적용할 한 줄 지시"
              className={fieldClass}
            />
          </label>
        </div>

        {formError ? (
          <div className="mt-4">
            <InlineError>{formError}</InlineError>
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
          className="mt-5 w-full rounded-2xl bg-slate-900 px-4 py-4 text-base font-semibold text-white"
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
