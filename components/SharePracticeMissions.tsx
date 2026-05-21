import { formatTimestamp } from "../lib/demo-data";
import type { FeedbackMarker } from "../types/formfeed";

type SharePracticeMissionsProps = {
  markers: FeedbackMarker[];
};

export default function SharePracticeMissions({ markers }: SharePracticeMissionsProps) {
  const items = [...markers].sort((a, b) => a.timestamp_ms - b.timestamp_ms);
  const withCue = items.filter((m) => m.cue_text?.trim());

  if (withCue.length === 0) return null;

  return (
    <div className="mt-4 rounded-xl border border-slate-200/60 bg-slate-50/80 p-4 shadow-sm backdrop-blur-[2px]">
      <h3 className="mb-1 flex items-center gap-2.5 text-sm font-bold tracking-tight text-slate-900">
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-sm text-white shadow-sm"
          aria-hidden
        >
          💡
        </span>
        다음 연습 시 핵심 미션
      </h3>
      <p className="mb-4 pl-9 text-xs leading-relaxed text-slate-600">
        개인 운동 전 아래 목록을 확인하고, 영상의 정지 구간과 함께 연습해 보세요.
      </p>
      <ul className="space-y-2">
        {withCue.map((item) => (
          <li
            key={item.id}
            className="flex items-start gap-3 rounded-lg border border-slate-200/50 bg-white/70 px-3 py-2.5 shadow-sm"
          >
            <span
              className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-[11px] font-bold leading-none text-emerald-600"
              aria-hidden
            >
              ✔
            </span>
            <div className="min-w-0 flex-1">
              <span className="font-mono text-[10px] font-semibold text-slate-500">
                {formatTimestamp(item.timestamp_ms)}
              </span>
              <p className="mt-0.5 text-xs leading-relaxed text-slate-700">
                <span className="font-bold text-slate-900">[{item.selected_area}]</span>{" "}
                <span className="text-slate-800">{item.cue_text}</span>
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
