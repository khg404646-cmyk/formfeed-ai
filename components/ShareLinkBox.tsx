"use client";

import { useMemo, useState } from "react";

type ShareLinkBoxProps = {
  shareToken: string;
  markerCount: number;
  onCopySuccess?: () => void;
};

function buildAbsoluteUrl(path: string): string {
  return `${window.location.origin}${path}`;
}

export default function ShareLinkBox({
  shareToken,
  markerCount,
  onCopySuccess,
}: ShareLinkBoxProps) {
  const [copyMessage, setCopyMessage] = useState<string | null>(null);

  const shareUrl = useMemo(
    () => buildAbsoluteUrl(`/share/${shareToken}`),
    [shareToken],
  );

  const canCopyShareLink = markerCount > 0;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopyMessage("회원용 링크를 복사했습니다.");
      onCopySuccess?.();
      window.setTimeout(() => setCopyMessage(null), 2500);
    } catch {
      setCopyMessage("링크 복사에 실패했습니다. 다시 시도해 주세요.");
    }
  };

  return (
    <section className="card space-y-4 border border-[#e5e7eb] bg-white p-4">
      <p className="text-sm font-semibold text-[#374151]">공유 링크</p>

      <div className="rounded-2xl bg-[#111827] p-4 text-white">
        <p className="text-xs font-semibold text-white/80">회원에게 보내는 링크</p>
        <p className="mt-1 text-sm font-semibold leading-relaxed">
          운동영상 피드백 결과를 회원이 볼 수 있는 페이지입니다.
        </p>
        {!canCopyShareLink ? (
          <p className="mt-2 text-xs leading-relaxed text-amber-200">
            피드백을 1개 이상 추가해야 회원에게 전달할 수 있습니다.
          </p>
        ) : null}
        <button
          type="button"
          disabled={!canCopyShareLink}
          onClick={() => {
            void handleCopy();
          }}
          className="mt-3 w-full rounded-xl bg-white px-4 py-3 text-sm font-semibold text-[#111827] disabled:cursor-not-allowed disabled:opacity-50"
        >
          회원용 링크 복사
        </button>
      </div>

      {copyMessage ? (
        <p className="text-xs font-semibold text-[#166534]">{copyMessage}</p>
      ) : null}
    </section>
  );
}
