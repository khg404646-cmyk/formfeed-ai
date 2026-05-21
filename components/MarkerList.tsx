import { formatTimestamp } from "../lib/demo-data";
import type { FeedbackMarker } from "../types/formfeed";

type MarkerListProps = {
  markers: FeedbackMarker[];
  canEdit: boolean;
  onEdit?: (marker: FeedbackMarker) => void;
  onDelete?: (markerId: string) => void;
};

export default function MarkerList({
  markers,
  canEdit,
  onEdit,
  onDelete,
}: MarkerListProps) {
  return (
    <section className="card border border-[#e5e7eb] bg-white p-4">
      <p className="text-sm font-semibold text-[#374151]">추가된 피드백</p>
      {markers.length === 0 ? (
        <p className="mt-2 text-sm text-[#6b7280]">아직 추가된 피드백이 없습니다.</p>
      ) : (
        <ul className="mt-3 space-y-2.5">
          {markers.map((marker) => (
            <li key={marker.id} className="rounded-xl bg-[#f9fafb] p-3">
              <p className="text-xs font-semibold text-[#6b7280]">
                {formatTimestamp(marker.timestamp_ms)} · {marker.selected_area}
              </p>
              <p className="mt-1 text-sm font-semibold leading-relaxed text-[#111827]">
                {marker.popup_text}
              </p>
              {canEdit ? (
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => onEdit?.(marker)}
                    className="min-h-10 rounded-lg border border-[#d1d5db] px-3 py-2 text-xs font-semibold text-[#374151]"
                  >
                    수정
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete?.(marker.id)}
                    className="min-h-10 rounded-lg border border-[#fecaca] bg-[#fef2f2] px-3 py-2 text-xs font-semibold text-[#b91c1c]"
                  >
                    삭제
                  </button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
