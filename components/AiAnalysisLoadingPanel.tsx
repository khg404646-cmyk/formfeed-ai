import { USER_MESSAGES } from "../lib/user-messages";

export default function AiAnalysisLoadingPanel() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-5 shadow-sm">
      <div className="flex items-start gap-3">
        <svg
          className="mt-0.5 h-6 w-6 shrink-0 animate-spin text-slate-800"
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
          <p className="text-sm font-bold leading-snug text-slate-900">
            {USER_MESSAGES.geminiAnalyzingVideoTitle}
          </p>
          <p className="text-xs leading-relaxed text-slate-600">
            {USER_MESSAGES.geminiAnalyzingVideoDetail}
          </p>
          <p className="text-[11px] leading-relaxed text-slate-500">
            {USER_MESSAGES.geminiAnalyzingVideoHint}
          </p>
        </div>
      </div>
    </div>
  );
}
