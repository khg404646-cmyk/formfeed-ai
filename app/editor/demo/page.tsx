import Link from "next/link";
import OverlayPreview from "../../../components/OverlayPreview";
import { demoMarkers, formatTimestamp } from "../../../lib/demo-data";

export default function EditorDemoPage() {
  const currentMarker = demoMarkers[0];

  return (
    <main className="min-h-screen bg-[#f5f6fa] px-4 py-5 text-[#111827]">
      <div className="mx-auto w-full max-w-[430px]">
        <header className="mb-4">
          <button className="text-sm font-semibold text-[#374151]">뒤로가기</button>
          <h1 className="mt-2 text-2xl font-bold tracking-tight">
            스쿼트 피드백 편집
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-[#6b7280]">
            문제 지점에서 영상을 멈추고 피드백을 추가하세요.
          </p>
        </header>

        <section className="mb-4">
          <div className="relative overflow-hidden rounded-[18px] shadow-xl ring-1 ring-black/10">
            <div className="relative aspect-[9/16] w-full max-w-full overflow-hidden bg-[#1f2937]">
              <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-black/20" />
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-base font-semibold text-white/85">영상 미리보기</p>
              </div>

              <OverlayPreview
                timestampLabel={formatTimestamp(currentMarker.timestamp_ms)}
                selectedArea={currentMarker.selected_area}
                popupText={currentMarker.popup_text}
                detailText={currentMarker.detail_text}
                cueText={currentMarker.cue_text}
              />

              <div className="absolute bottom-3 left-3">
                <span className="inline-flex rounded-full bg-black/75 px-3 py-1 text-xs font-semibold text-white">
                  현재 시점 00:03.2
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className="mb-5">
          <button
            type="button"
            className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-600 shadow-none hover:bg-slate-50"
          >
            이 지점에 피드백
          </button>
        </section>

        <section className="mb-6 rounded-2xl border border-[#e5e7eb] bg-white p-4">
          <h2 className="text-sm font-semibold text-[#374151]">추가된 피드백</h2>
          <div className="mt-3 space-y-3">
            {demoMarkers.map((marker) => (
              <article key={marker.id} className="rounded-xl border border-[#e5e7eb] p-3">
                <p className="text-xs font-semibold text-[#6b7280]">
                  {formatTimestamp(marker.timestamp_ms)} · {marker.selected_area}
                </p>
                <p className="mt-1 text-sm font-semibold text-[#111827]">
                  {marker.popup_text}
                </p>
                <div className="mt-3 flex gap-2">
                  <button className="rounded-lg border border-[#d1d5db] px-3 py-2 text-xs font-semibold text-[#374151]">
                    수정
                  </button>
                  <button className="rounded-lg border border-[#fecaca] bg-[#fef2f2] px-3 py-2 text-xs font-semibold text-[#b91c1c]">
                    삭제
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <footer className="pb-6">
          <button className="w-full rounded-2xl bg-[#111827] px-4 py-4 text-base font-semibold text-white shadow-sm">
            공유 링크 만들기
          </button>
          <Link
            href="/share/demo"
            className="mt-3 block text-center text-sm font-semibold text-[#374151] underline underline-offset-4"
          >
            결과 미리보기
          </Link>
        </footer>
      </div>
    </main>
  );
}
