type FeedbackCardProps = {
  timestampLabel: string;
  area: string;
  popupText: string;
  detailText: string;
  cueText: string;
  /** 공유 페이지: 미션은 하단 목록으로 분리 */
  showCue?: boolean;
};

export default function FeedbackCard({
  timestampLabel,
  area,
  popupText,
  detailText,
  cueText,
  showCue = true,
}: FeedbackCardProps) {
  return (
    <article className="mb-2.5 rounded-2xl border border-[#e5e7eb] bg-white p-[14px] text-[#111827] leading-relaxed">
      <p className="text-xs font-semibold text-[#6b7280]">
        {timestampLabel} · {area}
      </p>

      <h3 className="mt-2 text-base font-semibold">{popupText}</h3>

      <p className="mt-2 text-sm">
        <span className="font-semibold">🔧 수정 포인트</span>
      </p>

      <p className="mt-1 text-sm">{detailText}</p>

      {showCue && cueText.trim() ? (
        <div className="mt-3 rounded-xl bg-[#f3f4f6] px-3 py-2">
          <p className="text-sm text-[#374151]">{cueText}</p>
        </div>
      ) : null}
    </article>
  );
}
