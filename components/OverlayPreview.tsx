import type { ArrowDirection, ArrowPosition } from "../types/formfeed";
import {
  getBodyDotClass,
  getGuideArrowRotation,
  getPopupPositionClass,
} from "../lib/overlay-placement";

export type OverlayPopupPhase = "hidden" | "entering" | "visible" | "leaving";

type OverlayPreviewProps = {
  timestampLabel: string;
  selectedArea?: string;
  popupText: string;
  detailText?: string;
  /** @deprecated 하단 리포트 숙제 섹션으로 이동 — 팝업에는 미표시 */
  cueText?: string;
  arrowPosition?: ArrowPosition;
  arrowDirection?: ArrowDirection;
  phase?: OverlayPopupPhase;
  guardControls?: boolean;
};

const PHASE_MOTION: Record<OverlayPopupPhase, string> = {
  hidden: "opacity-0 pointer-events-none transition-opacity duration-200 ease-in",
  entering: "opacity-0 pointer-events-none transition-opacity duration-200 ease-out",
  visible: "opacity-100 pointer-events-none transition-opacity duration-200 ease-out",
  leaving: "opacity-0 pointer-events-none transition-opacity duration-200 ease-in",
};

export default function OverlayPreview({
  timestampLabel,
  selectedArea,
  popupText,
  detailText,
  arrowPosition = "middle-center",
  arrowDirection = "down",
  phase = "visible",
  guardControls = false,
}: OverlayPreviewProps) {
  const popupPos = getPopupPositionClass(arrowPosition, guardControls);
  const dotPos = getBodyDotClass(arrowPosition);
  const arrowRot = getGuideArrowRotation(arrowDirection);
  const motionClass = PHASE_MOTION[phase];

  return (
    <div
      className="pointer-events-none absolute inset-0 z-[60] overflow-hidden"
      aria-hidden="true"
    >
      <div
        className={`absolute z-[61] h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-900 ring-2 ring-white shadow-md ${dotPos}`}
      />

      <div
        className={`absolute z-[61] flex h-7 w-7 items-center justify-center opacity-60 ${dotPos}`}
        style={{ marginTop: "-1rem" }}
      >
        <span
          className={`block h-5 w-0.5 origin-bottom rounded-full bg-slate-400 ${arrowRot}`}
          aria-hidden
        />
      </div>

      <div
        className={`absolute z-[62] w-[min(252px,90%)] ${popupPos} ${motionClass}`}
      >
        <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white/95 p-3 shadow-lg backdrop-blur-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="rounded-full bg-slate-900 px-2 py-0.5 font-mono text-[10px] font-semibold tracking-wide text-white">
              {timestampLabel}
            </span>
            {selectedArea ? (
              <span className="shrink-0 rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-800">
                {selectedArea}
              </span>
            ) : null}
          </div>

          <p className="mt-2.5 line-clamp-2 max-w-full break-words text-[17px] font-extrabold leading-tight tracking-tight text-slate-900">
            {popupText}
          </p>

          {detailText ? (
            <p className="mt-2 line-clamp-2 max-w-full break-words text-xs leading-relaxed text-slate-600">
              {detailText}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
