"use client";

import { useEffect, useState } from "react";
import { USER_MESSAGES } from "../lib/user-messages";

type AiAnalysisLoadingPanelProps = {
  startedAt?: number | null;
};

export default function AiAnalysisLoadingPanel({
  startedAt,
}: AiAnalysisLoadingPanelProps) {
  const [elapsedSec, setElapsedSec] = useState(0);

  useEffect(() => {
    if (!startedAt) {
      setElapsedSec(0);
      return;
    }
    const tick = () => {
      setElapsedSec(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  return (
    <div className="rounded-2xl border border-indigo-100 bg-white px-4 py-5 shadow-sm ring-1 ring-indigo-50">
      <div className="flex items-start gap-3">
        <svg
          className="mt-0.5 h-6 w-6 shrink-0 animate-spin text-indigo-700"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
        <div className="min-w-0 space-y-2">
          <p className="text-sm font-semibold leading-snug text-slate-900">
            {USER_MESSAGES.geminiAnalyzingVideoTitle}
          </p>
          <p className="text-xs leading-relaxed text-slate-600">
            {USER_MESSAGES.geminiAnalyzingVideoDetail}
          </p>
          {startedAt ? (
            <p className="font-mono text-[11px] text-indigo-600">
              경과 {elapsedSec}초 · 보통 60~120초 내 완료
            </p>
          ) : null}
          <p className="text-[11px] leading-relaxed text-slate-500">
            {USER_MESSAGES.geminiAnalyzingVideoHint}
          </p>
        </div>
      </div>
    </div>
  );
}
