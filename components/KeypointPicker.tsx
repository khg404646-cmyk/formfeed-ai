"use client";

import type { LandmarkSummary } from "../types/movement";
import type { FocusKeypoint } from "../lib/biomechanics/focus-keypoints";
import {
  FOCUS_KEYPOINT_LABELS,
  filterLandmarksForPicker,
  isFocusKeypoint,
} from "../lib/biomechanics/focus-keypoints";

type KeypointPickerProps = {
  imageSrc: string;
  landmarks: LandmarkSummary[];
  selected: FocusKeypoint | null;
  onSelect: (keypoint: FocusKeypoint | null) => void;
  cameraView?: string;
};

const MIN_TAP_PX = 28;

export default function KeypointPicker({
  imageSrc,
  landmarks,
  selected,
  onSelect,
  cameraView,
}: KeypointPickerProps) {
  const points = filterLandmarksForPicker(landmarks);

  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (points.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    let best: { joint: FocusKeypoint; dist: number } | null = null;

    for (const pt of points) {
      if (!isFocusKeypoint(pt.joint)) continue;
      const px = pt.x * rect.width;
      const py = pt.y * rect.height;
      const dist = Math.hypot(clickX - px, clickY - py);
      if (dist <= MIN_TAP_PX && (!best || dist < best.dist)) {
        best = { joint: pt.joint, dist };
      }
    }

    if (best) {
      onSelect(selected === best.joint ? null : best.joint);
    }
  };

  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-[#374151]">키포인트 선택</p>
      <p className="text-xs leading-relaxed text-[#6b7280]">
        관절 점을 탭하면 그 부위 중심으로 초안을 작성합니다. 탭 없이 생성하면 자동
        분석합니다.
      </p>
      {cameraView === "side" ? (
        <p className="text-xs leading-relaxed text-amber-800">
          측면 영상에서는 무릎 안쪽 모임(valgus)을 판단하지 않습니다.
        </p>
      ) : null}

      <div
        className="relative aspect-[9/16] max-h-48 w-full cursor-crosshair overflow-hidden rounded-lg bg-black"
        onClick={handleImageClick}
        onKeyDown={() => {}}
        role="presentation"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageSrc}
          alt="키포인트 선택"
          className="h-full w-full object-contain pointer-events-none"
        />
        {points.map((pt) => {
          if (!isFocusKeypoint(pt.joint)) return null;
          const joint = pt.joint;
          const active = selected === joint;
          return (
            <button
              key={joint}
              type="button"
              aria-label={FOCUS_KEYPOINT_LABELS[joint]}
              className={`absolute z-10 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 shadow-md ${
                active
                  ? "border-white bg-[#111827] ring-2 ring-amber-400"
                  : "border-white bg-sky-500/90 hover:bg-sky-400"
              }`}
              style={{
                left: `${pt.x * 100}%`,
                top: `${pt.y * 100}%`,
              }}
              onClick={(ev) => {
                ev.stopPropagation();
                onSelect(selected === joint ? null : joint);
              }}
            />
          );
        })}
      </div>

      {selected ? (
        <p className="text-xs font-semibold text-[#166534]">
          선택: {FOCUS_KEYPOINT_LABELS[selected]}
        </p>
      ) : (
        <p className="text-xs text-[#6b7280]">선택된 키포인트 없음 (자동 분석)</p>
      )}
    </div>
  );
}
