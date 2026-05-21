"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import FeedbackCard from "../../../components/FeedbackCard";
import SharePracticeMissions from "../../../components/SharePracticeMissions";
import VideoPlayer from "../../../components/VideoPlayer";
import { formatTimestamp } from "../../../lib/demo-data";
import { getExerciseLabel } from "../../../lib/exercise-labels";
import { ErrorPanel, LoadingPanel } from "../../../components/StatusPanels";
import { USER_MESSAGES } from "../../../lib/user-messages";
import type { FeedbackMarker, FeedbackSession, SharePageResponse } from "../../../types/formfeed";

type SharePageClientProps = {
  token: string;
};

export default function SharePageClient({ token }: SharePageClientProps) {
  const hasToken = Boolean(token);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [session, setSession] = useState<FeedbackSession | null>(null);
  const [markers, setMarkers] = useState<FeedbackMarker[]>([]);
  const [loading, setLoading] = useState(hasToken);
  const [error, setError] = useState<string | null>(
    hasToken ? null : USER_MESSAGES.shareLinkInvalid,
  );

  useEffect(() => {
    if (!hasToken) return;

    const run = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/share/${encodeURIComponent(token)}`);

        if (res.status === 404) {
          setError(USER_MESSAGES.shareNotFound);
          setSession(null);
          setMarkers([]);
          return;
        }

        if (!res.ok) {
          throw new Error(USER_MESSAGES.shareLoadFailed);
        }

        const data = (await res.json()) as SharePageResponse;
        setSession(data.session);
        setMarkers(data.markers ?? []);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : USER_MESSAGES.shareLoadFailed,
        );
        setSession(null);
        setMarkers([]);
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, [hasToken, token]);

  const firstMarkerMs = useMemo(() => {
    if (markers.length === 0) return null;
    return markers[0].timestamp_ms;
  }, [markers]);

  const handleJumpToFeedback = () => {
    const video = videoRef.current;
    if (!video || firstMarkerMs === null) return;
    video.currentTime = firstMarkerMs / 1000;
    void video.play().catch(() => {});
  };

  const handleReplay = () => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = 0;
    void video.play().catch(() => {});
  };

  if (loading) {
    return <LoadingPanel message={USER_MESSAGES.shareLoading} />;
  }

  if (error || !session) {
    return (
      <ErrorPanel
        title="피드백을 열 수 없습니다"
        message={error ?? USER_MESSAGES.shareNotFound}
      />
    );
  }

  return (
    <main className="min-h-screen bg-[#f5f6fa] px-4 py-5 text-[#111827]">
      <div className="mx-auto w-full max-w-[430px]">
        <header className="mb-4">
          <p className="text-sm font-semibold text-[#374151]">폼피드 AI</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight">
            {getExerciseLabel(session.exercise_type)} 자세 피드백
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-[#6b7280]">
            트레이너가 보낸 운동 피드백 영상입니다.
          </p>
        </header>

        <section className="mb-4">
          <VideoPlayer
            videoUrl={session.video_url}
            mode="share"
            markers={markers}
            showOverlay
            autoPauseOnMarkers={markers.length > 0}
            onReady={(el) => {
              videoRef.current = el;
            }}
          />
        </section>

        <section className="mb-5 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={handleJumpToFeedback}
            disabled={markers.length === 0}
            className="rounded-2xl bg-[#111827] px-4 py-4 text-base font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
          >
            피드백 지점 보기
          </button>
          <button
            type="button"
            onClick={handleReplay}
            className="rounded-2xl border border-[#e5e7eb] bg-white px-4 py-4 text-base font-semibold text-[#111827] shadow-sm"
          >
            영상 다시보기
          </button>
        </section>

        <section className="pb-6">
          <h2 className="mb-3 text-sm font-bold text-[#374151]">피드백 상세</h2>
          {markers.length === 0 ? (
            <p className="text-sm text-[#6b7280]">등록된 피드백이 없습니다.</p>
          ) : (
            markers.map((marker) => (
              <FeedbackCard
                key={marker.id}
                timestampLabel={formatTimestamp(marker.timestamp_ms)}
                area={marker.selected_area}
                popupText={marker.popup_text}
                detailText={marker.detail_text}
                cueText={marker.cue_text}
                showCue={false}
              />
            ))
          )}

          <SharePracticeMissions markers={markers} />

          <p className="mt-4 text-center text-[10px] tracking-wide text-slate-500">
            Powered by FormFeed AI Biomechanics Engine
          </p>

          <p className="mt-3 text-xs leading-relaxed text-[#6b7280]">
            이 피드백은 운동 수행 화면을 기준으로 작성된 코칭 참고 자료입니다.
            통증이 있거나 불편감이 지속되면 전문가 상담이 필요합니다.
          </p>
        </section>
      </div>
    </main>
  );
}
