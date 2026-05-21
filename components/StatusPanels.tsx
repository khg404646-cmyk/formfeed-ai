import type { ReactNode } from "react";

type StatusPanelProps = {
  message: string;
  title?: string;
};

export function LoadingPanel({ message }: StatusPanelProps) {
  return (
    <main className="min-h-screen bg-[#f5f6fa] px-4 py-6">
      <div className="mx-auto w-full max-w-[430px] rounded-2xl border border-[#e5e7eb] bg-white p-4">
        <p className="text-sm font-semibold text-[#374151]">{message}</p>
      </div>
    </main>
  );
}

export function ErrorPanel({ message, title = "문제가 발생했습니다" }: StatusPanelProps) {
  return (
    <main className="min-h-screen bg-[#f5f6fa] px-4 py-6">
      <div className="mx-auto w-full max-w-[430px] rounded-2xl border border-[#fecaca] bg-white p-4">
        <p className="text-sm font-bold text-[#991b1b]">{title}</p>
        <p className="mt-2 text-sm leading-relaxed text-[#b91c1c]">{message}</p>
      </div>
    </main>
  );
}

export function InlineError({ children }: { children: ReactNode }) {
  return (
    <div
      className="rounded-xl border border-[#fecaca] bg-[#fef2f2] px-3 py-3"
      role="alert"
    >
      <p className="text-sm leading-relaxed font-semibold text-[#b91c1c]">{children}</p>
    </div>
  );
}

export function InlineWarning({ children }: { children: ReactNode }) {
  return (
    <div
      className="rounded-xl border border-[#fde68a] bg-[#fffbeb] px-3 py-3"
      role="status"
    >
      <p className="text-sm leading-relaxed font-semibold text-[#92400e]">{children}</p>
    </div>
  );
}
