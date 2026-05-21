import FeedbackCard from "../../../components/FeedbackCard";
import OverlayPreview from "../../../components/OverlayPreview";
import { demoMarkers } from "../../../lib/demo-data";
import { formatTimestamp } from "../../../lib/demo-data";

export default function ShareDemoPage() {
  const marker = demoMarkers[0];
  const timestampLabel = formatTimestamp(marker.timestamp_ms);

  return (
    <main className="min-h-screen bg-[#f5f6fa] px-4 py-5 text-[#111827]">
      <div className="mx-auto w-full max-w-[430px]">
        <header className="mb-4">
          <p className="text-sm font-semibold text-[#374151]">
            폼피드 AI · 공유 결과 예시
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight">
            스쿼트 자세 피드백
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-[#6b7280]">
            김혜겸 트레이너가 보낸 운동영상 피드백입니다. 영상 속 표시와 아래
            설명을 함께 확인하세요.
          </p>
        </header>

        <section className="mb-4">
          <div className="relative overflow-hidden rounded-[18px] shadow-xl ring-1 ring-black/10">
            <div className="relative aspect-[9/16] w-full max-w-full overflow-hidden bg-gradient-to-b from-[#111827] via-[#0b1220] to-[#0f172a]">
              {/* silhouette-like simple shapes */}
              <div className="absolute left-1/2 top-[22%] h-[40%] w-[42%] -translate-x-1/2 rounded-full bg-white/10 blur-[0.2px]" />
              <div className="absolute left-1/2 top-[35%] h-[46%] w-[55%] -translate-x-1/2 rounded-[40px] bg-white/5" />
              <div className="absolute left-1/2 top-[58%] h-[28%] w-[60%] -translate-x-1/2 rounded-[36px] bg-white/5" />

              {/* knee highlight circle */}
              <div className="absolute left-[58%] top-[62%] h-10 w-10 rounded-full border-2 border-amber-300/80 bg-amber-300/10 shadow-[0_0_0_6px_rgba(251,191,36,0.08)]" />

              <OverlayPreview
                timestampLabel={timestampLabel}
                selectedArea={marker.selected_area}
                popupText={marker.popup_text}
                detailText={marker.detail_text}
                cueText={marker.cue_text}
              />

              {/* bottom timebar */}
              <div className="absolute bottom-0 left-0 right-0 bg-black/35 px-4 py-3 backdrop-blur">
                <p className="text-sm font-semibold text-white/95">
                  ▶ 00:03 / 00:18
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mb-5 grid grid-cols-2 gap-2">
          <button className="rounded-2xl bg-[#111827] px-4 py-4 text-base font-semibold text-white shadow-sm">
            피드백 지점 보기
          </button>
          <button className="rounded-2xl border border-[#e5e7eb] bg-white px-4 py-4 text-base font-semibold text-[#111827] shadow-sm">
            영상 다시보기
          </button>
        </section>

        <section className="pb-6">
          {demoMarkers.map((m) => (
            <FeedbackCard
              key={m.id}
              timestampLabel={formatTimestamp(m.timestamp_ms)}
              area={m.selected_area}
              popupText={m.popup_text}
              detailText={m.detail_text}
              cueText={m.cue_text}
            />
          ))}

          <p className="mt-4 text-xs leading-relaxed text-[#6b7280]">
            이 피드백은 운동 수행 화면을 기준으로 작성된 코칭 참고 자료입니다.
            통증이 있거나 불편감이 지속되면 전문가 상담이 필요합니다.
          </p>
        </section>
      </div>
    </main>
  );
}
