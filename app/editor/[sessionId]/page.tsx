"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import AiAnalysisLoadingPanel from "../../../components/AiAnalysisLoadingPanel";
import FeedbackModal, {
  type FeedbackModalSaveData,
} from "../../../components/FeedbackModal";
import MarkerList from "../../../components/MarkerList";
import ShareLinkBox from "../../../components/ShareLinkBox";
import TrainerProfileEditor from "../../../components/TrainerProfileEditor";
import VideoPlayer from "../../../components/VideoPlayer";
import { captureVideoFrame } from "../../../lib/capture-video-frame";
import {
  MARKER_ARROW_DIRECTION,
  MARKER_ARROW_POSITION,
} from "../../../lib/marker-defaults";
import { formatTimestamp } from "../../../lib/demo-data";
import { getExerciseLabel } from "../../../lib/exercise-labels";
import {
  resolveTrainerProfile,
  saveTrainerProfileLocal,
} from "../../../lib/trainer-profile";
import {
  ErrorPanel,
  InlineError,
  InlineWarning,
  LoadingPanel,
} from "../../../components/StatusPanels";
import { requestGenerateFeedback } from "../../../lib/ai-generate-feedback-client";
import { USER_MESSAGES } from "../../../lib/user-messages";
import { MAX_VIDEO_DURATION_MS } from "../../../lib/video-limits";
import type {
  EditorSessionResponse,
  ExerciseType,
  FeedbackMarker,
  FeedbackSession,
  GeminiAnalysisItem,
  MarkersListResponse,
  RecentLinkItem,
} from "../../../types/formfeed";
import { toFeedbackSession } from "../../../types/formfeed";

const RECENT_LINKS_KEY = "formfeed_recent_links";

/** AI가 생성한 초안 마커 — DB에 저장되기 전 로컬 상태. */
type AiDraftMarker = GeminiAnalysisItem & { draft_id: string };

function makeDraftId(): string {
  return `draft_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function readRecentLinks(): RecentLinkItem[] {
  try {
    const raw = window.localStorage.getItem(RECENT_LINKS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RecentLinkItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function upsertRecentLink(item: {
  sessionId: string;
  shareToken: string;
  editToken: string;
  exerciseType: ExerciseType;
  trainerDisplayName?: string;
  trainerCenterName?: string;
}) {
  const items = readRecentLinks();
  const existing = items.find((x) => x.sessionId === item.sessionId);
  const nextItem: RecentLinkItem = {
    sessionId: item.sessionId,
    shareToken: item.shareToken,
    editToken: item.editToken,
    exerciseType: item.exerciseType,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
    trainerDisplayName: item.trainerDisplayName ?? existing?.trainerDisplayName,
    trainerCenterName: item.trainerCenterName ?? existing?.trainerCenterName,
  };
  const nextItems = [
    nextItem,
    ...items.filter((x) => x.sessionId !== item.sessionId),
  ].slice(0, 20);
  window.localStorage.setItem(RECENT_LINKS_KEY, JSON.stringify(nextItems));
}

export default function EditorSessionPage() {
  const params = useParams<{ sessionId: string }>();
  const searchParams = useSearchParams();

  const sessionId = typeof params.sessionId === "string" ? params.sessionId : "";
  const queryEditToken = searchParams.get("edit_token");

  const [session, setSession] = useState<FeedbackSession | null>(null);
  const [markers, setMarkers] = useState<FeedbackMarker[]>([]);
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingMarker, setEditingMarker] = useState<FeedbackMarker | null>(null);
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
  const [markerTimestampMs, setMarkerTimestampMs] = useState(0);
  const [captureImageBase64, setCaptureImageBase64] = useState<string | undefined>(
    undefined,
  );
  const [captureError, setCaptureError] = useState<string | null>(null);

  // AI draft state
  const [aiDraftMarkers, setAiDraftMarkers] = useState<AiDraftMarker[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiLoadingStartedAt, setAiLoadingStartedAt] = useState<number | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [showAiBanner, setShowAiBanner] = useState(false);
  const [savingAllDrafts, setSavingAllDrafts] = useState(false);
  const aiAnalysisTriggeredRef = useRef(false);
  const aiAnalysisWantedRef = useRef(false);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);

  const [trainerDisplayName, setTrainerDisplayName] = useState("");
  const [trainerCenterName, setTrainerCenterName] = useState("");
  const [trainerSaving, setTrainerSaving] = useState(false);
  const [trainerSaveError, setTrainerSaveError] = useState<string | null>(null);

  const editToken = useMemo(() => {
    if (!sessionId) return null;
    if (queryEditToken) return queryEditToken;
    return readRecentLinks().find((item) => item.sessionId === sessionId)?.editToken ?? null;
  }, [queryEditToken, sessionId]);

  const loadMarkers = async (targetSessionId: string) => {
    const markersRes = await fetch(
      `/api/markers?session_id=${encodeURIComponent(targetSessionId)}`,
    );
    if (!markersRes.ok) {
      throw new Error(USER_MESSAGES.sessionLoadFailed);
    }
    const markersBody = (await markersRes.json()) as MarkersListResponse;
    setMarkers(markersBody.markers ?? []);
  };

  /** /api/ai/generate-feedback 호출 → GeminiAnalysisItem[] → aiDraftMarkers 상태에 매핑 */
  const generateAiFeedback = useCallback(
    async (
      videoUrl: string,
      exerciseType: string,
      videoDurationMs?: number,
    ) => {
      setAiLoading(true);
      setAiLoadingStartedAt(Date.now());
      setAiError(null);
      try {
        const data = await requestGenerateFeedback({
          video_url: videoUrl,
          exercise_type: exerciseType,
          ...(videoDurationMs && videoDurationMs > 0
            ? { video_duration_ms: videoDurationMs }
            : {}),
        });
        setAiDraftMarkers(
          data.analysis.map((item) => ({ ...item, draft_id: makeDraftId() })),
        );
        setShowAiBanner(true);
      } catch (err) {
        setAiError(
          err instanceof Error ? err.message : "AI 분석 중 오류가 발생했습니다.",
        );
        aiAnalysisTriggeredRef.current = false;
        aiAnalysisWantedRef.current = true;
      } finally {
        setAiLoading(false);
        setAiLoadingStartedAt(null);
      }
    },
    [],
  );

  const tryStartPendingAiAnalysis = useCallback(
    (video: HTMLVideoElement | null, activeSession: FeedbackSession | null) => {
      if (!aiAnalysisWantedRef.current || aiAnalysisTriggeredRef.current || !activeSession) {
        return;
      }
      if (!video) return;
      const dur = video.duration;
      if (!dur || !Number.isFinite(dur) || dur <= 0) return;

      const durationMs = Math.round(dur * 1000);
      if (durationMs > MAX_VIDEO_DURATION_MS) {
        setAiError(USER_MESSAGES.videoTooLong);
        aiAnalysisWantedRef.current = false;
        return;
      }

      aiAnalysisTriggeredRef.current = true;
      aiAnalysisWantedRef.current = false;
      void generateAiFeedback(
        activeSession.video_url,
        activeSession.exercise_type,
        durationMs,
      );
    },
    [generateAiFeedback],
  );

  const handleRetryAiAnalysis = useCallback(() => {
    if (!session) return;
    setAiError(null);
    aiAnalysisTriggeredRef.current = false;
    aiAnalysisWantedRef.current = true;
    tryStartPendingAiAnalysis(videoElementRef.current, session);
  }, [session, tryStartPendingAiAnalysis]);

  const handleVideoReady = useCallback(
    (el: HTMLVideoElement) => {
      videoElementRef.current = el;
      setVideoElement(el);
      tryStartPendingAiAnalysis(el, session);
    },
    [session, tryStartPendingAiAnalysis],
  );

  useEffect(() => {
    if (!sessionId || !queryEditToken) return;

    const existing = readRecentLinks().find((item) => item.sessionId === sessionId);
    upsertRecentLink({
      sessionId,
      shareToken: existing?.shareToken ?? "",
      editToken: queryEditToken,
      exerciseType: existing?.exerciseType ?? "other",
    });
  }, [queryEditToken, sessionId]);

  useEffect(() => {
    if (!sessionId) return;

    const run = async () => {
      setLoading(true);
      setError(null);

      try {
        const sessionUrl = editToken
          ? `/api/sessions/${sessionId}?edit_token=${encodeURIComponent(editToken)}`
          : `/api/sessions/${sessionId}`;

        const [sessionRes, markersRes] = await Promise.all([
          fetch(sessionUrl),
          fetch(`/api/markers?session_id=${encodeURIComponent(sessionId)}`),
        ]);

        if (sessionRes.status === 404) {
          throw new Error(USER_MESSAGES.videoLoadFailed);
        }
        if (!sessionRes.ok) {
          throw new Error(USER_MESSAGES.sessionLoadFailed);
        }
        if (!markersRes.ok) {
          throw new Error(USER_MESSAGES.sessionLoadFailed);
        }

        const sessionBody = (await sessionRes.json()) as EditorSessionResponse;
        const markersBody = (await markersRes.json()) as MarkersListResponse;

        const loadedSession = toFeedbackSession(sessionBody.session);
        setSession(loadedSession);
        setMarkers(markersBody.markers ?? []);

        const profile = resolveTrainerProfile(sessionId, loadedSession);
        setTrainerDisplayName(profile.displayName);
        setTrainerCenterName(profile.centerName);
        if (profile.displayName || profile.centerName) {
          saveTrainerProfileLocal(sessionId, profile);
        }

        if (queryEditToken && sessionBody.session) {
          upsertRecentLink({
            sessionId: sessionBody.session.id,
            shareToken: sessionBody.session.share_token,
            editToken: queryEditToken,
            exerciseType: sessionBody.session.exercise_type,
            trainerDisplayName: profile.displayName,
            trainerCenterName: profile.centerName,
          });
        }

        // 영상 길이 확보 후 분석(타임스탬프 분산용 duration 전달)
        if (
          editToken &&
          markersBody.markers.length === 0 &&
          sessionBody.session.video_url
        ) {
          aiAnalysisTriggeredRef.current = false;
          aiAnalysisWantedRef.current = true;
          tryStartPendingAiAnalysis(
            videoElementRef.current,
            sessionBody.session,
          );
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : USER_MESSAGES.sessionLoadFailed,
        );
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, [editToken, queryEditToken, sessionId, tryStartPendingAiAnalysis]);

  const canEdit = useMemo(() => Boolean(editToken), [editToken]);

  const updateTrainerDisplayName = (value: string) => {
    setTrainerDisplayName(value);
    saveTrainerProfileLocal(sessionId, {
      displayName: value,
      centerName: trainerCenterName,
    });
  };

  const updateTrainerCenterName = (value: string) => {
    setTrainerCenterName(value);
    saveTrainerProfileLocal(sessionId, {
      displayName: trainerDisplayName,
      centerName: value,
    });
  };

  const handleShareLinkCopySuccess = () => {
    if (!session?.share_token) return;
    upsertRecentLink({
      sessionId,
      shareToken: session.share_token,
      editToken: editToken ?? "",
      exerciseType: session.exercise_type,
      trainerDisplayName,
      trainerCenterName,
    });
  };

  const handleSaveTrainerProfile = async () => {
    if (!canEdit || !editToken || !sessionId) {
      setTrainerSaveError(USER_MESSAGES.editPermissionAction);
      return;
    }

    const name = trainerDisplayName.trim();
    const center = trainerCenterName.trim();
    if (!name && !center) {
      setTrainerSaveError("트레이너 이름 또는 센터명을 입력해 주세요.");
      return;
    }

    setTrainerSaving(true);
    setTrainerSaveError(null);

    try {
      const res = await fetch(`/api/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          edit_token: editToken,
          trainer_display_name: name,
          trainer_center_name: center,
        }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "프로필 저장에 실패했습니다.");
      }

      const body = (await res.json()) as { session?: FeedbackSession };
      if (body.session) {
        setSession(body.session);
      } else {
        setSession((prev) =>
          prev
            ? {
                ...prev,
                trainer_display_name: name,
                trainer_center_name: center,
              }
            : prev,
        );
      }

      saveTrainerProfileLocal(sessionId, { displayName: name, centerName: center });

      if (session?.share_token) {
        upsertRecentLink({
          sessionId,
          shareToken: session.share_token,
          editToken,
          exerciseType: session.exercise_type,
          trainerDisplayName: name,
          trainerCenterName: center,
        });
      }
    } catch (err) {
      setTrainerSaveError(
        err instanceof Error ? err.message : "프로필 저장에 실패했습니다.",
      );
    } finally {
      setTrainerSaving(false);
    }
  };

  const handleOpenCreateModal = () => {
    if (!canEdit) return;
    setActionError(null);
    setModalMode("create");
    setEditingMarker(null);
    setEditingDraftId(null);
    setCaptureImageBase64(undefined);
    setCaptureError(null);
    setMarkerTimestampMs(currentTimeMs);

    if (videoElement) {
      try {
        const dataUrl = captureVideoFrame(videoElement);
        setCaptureImageBase64(dataUrl);
      } catch {
        setCaptureError(USER_MESSAGES.frameCaptureFailed);
      }
    }

    setModalOpen(true);
  };

  const handleOpenEditModal = (marker: FeedbackMarker) => {
    if (!canEdit) return;
    setActionError(null);
    setModalMode("edit");
    setEditingMarker(marker);
    setEditingDraftId(null);
    setMarkerTimestampMs(marker.timestamp_ms);
    setCaptureImageBase64(undefined);
    setCaptureError(null);
    setModalOpen(true);
  };

  /** AI 초안 마커를 편집 모달로 열기 — FeedbackMarker 형태로 합성해서 pre-fill */
  const handleEditDraftMarker = (draft: AiDraftMarker) => {
    if (!canEdit) return;
    setActionError(null);
    setModalMode("edit");
    setEditingDraftId(draft.draft_id);
    setMarkerTimestampMs(draft.timestamp_ms);
    setEditingMarker({
      id: draft.draft_id,
      session_id: sessionId,
      capture_url: null,
      confidence: null,
      caution: null,
      created_at: new Date().toISOString(),
      timestamp_ms: draft.timestamp_ms,
      selected_area: draft.selected_area,
      arrow_position: draft.arrow_position,
      arrow_direction: draft.arrow_direction,
      popup_text: draft.popup_text,
      detail_text: draft.detail_text,
      cue_text: draft.cue_text,
    });
    setCaptureImageBase64(undefined);
    setCaptureError(null);
    setModalOpen(true);
  };

  /** AI 초안 마커를 로컬 상태에서 제거 (DB 호출 없음) */
  const handleDeleteDraftMarker = (draftId: string) => {
    if (!confirm("이 AI 초안 피드백을 삭제할까요?")) return;
    setAiDraftMarkers((prev) => prev.filter((d) => d.draft_id !== draftId));
  };

  const handleSaveAllDraftMarkers = async () => {
    if (!canEdit || !editToken || aiDraftMarkers.length === 0) return;

    const count = aiDraftMarkers.length;
    if (
      !confirm(
        `AI 초안 ${count}개를 검토 없이 모두 저장할까요?\n저장 후에는 '추가된 피드백' 목록에서 관리할 수 있습니다.`,
      )
    ) {
      return;
    }

    setSavingAllDrafts(true);
    setActionError(null);

    const drafts = [...aiDraftMarkers];
    const savedIds = new Set<string>();
    let failCount = 0;

    try {
      for (const draft of drafts) {
        const res = await fetch("/api/markers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            session_id: sessionId,
            edit_token: editToken,
            timestamp_ms: draft.timestamp_ms,
            capture_url: null,
            selected_area: draft.selected_area,
            arrow_position: draft.arrow_position,
            arrow_direction: draft.arrow_direction,
            popup_text: draft.popup_text,
            detail_text: draft.detail_text,
            cue_text: draft.cue_text,
            confidence: null,
            caution: null,
            ai_raw_response: { source: "gemini_bulk" },
          }),
        });

        if (res.ok) {
          savedIds.add(draft.draft_id);
        } else {
          failCount += 1;
        }
      }

      setAiDraftMarkers((prev) => prev.filter((d) => !savedIds.has(d.draft_id)));
      await loadMarkers(sessionId);

      if (failCount > 0) {
        setActionError(
          `${failCount}개 저장에 실패했습니다. ${USER_MESSAGES.aiDraftSaveAllFailed}`,
        );
      } else if (savedIds.size > 0) {
        setShowAiBanner(false);
      }
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : USER_MESSAGES.aiDraftSaveAllFailed,
      );
    } finally {
      setSavingAllDrafts(false);
    }
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setModalMode("create");
    setEditingMarker(null);
    setEditingDraftId(null);
    setCaptureImageBase64(undefined);
    setCaptureError(null);
  };

  const handleDeleteMarker = async (markerId: string) => {
    if (!canEdit || !editToken) {
      setActionError(USER_MESSAGES.editPermissionAction);
      return;
    }

    if (!confirm("이 피드백을 삭제할까요?")) return;

    try {
      setActionError(null);
      const res = await fetch(`/api/markers/${markerId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          edit_token: editToken,
        }),
      });

      if (!res.ok) {
        throw new Error(USER_MESSAGES.markerDeleteFailed);
      }

      await loadMarkers(sessionId);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : USER_MESSAGES.markerDeleteFailed,
      );
    }
  };

  const handleSaveMarker = async (data: FeedbackModalSaveData) => {
    if (!canEdit || !editToken) {
      setActionError(USER_MESSAGES.editPermissionAction);
      return;
    }

    try {
      setActionError(null);

      if (modalMode === "edit" && editingMarker && !editingDraftId) {
        // 기존 저장 마커 수정 → PATCH
        const res = await fetch(`/api/markers/${editingMarker.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            session_id: sessionId,
            edit_token: editToken,
            selected_area: data.selected_area,
            arrow_position: MARKER_ARROW_POSITION,
            arrow_direction: MARKER_ARROW_DIRECTION,
            popup_text: data.popup_text,
            detail_text: data.detail_text,
            cue_text: data.cue_text,
          }),
        });

        if (!res.ok) {
          throw new Error(USER_MESSAGES.markerUpdateFailed);
        }
      } else {
        // 신규 생성 또는 AI 초안 확정 → POST
        const res = await fetch("/api/markers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            session_id: sessionId,
            edit_token: editToken,
            timestamp_ms: markerTimestampMs,
            capture_url: null,
            selected_area: data.selected_area,
            arrow_position: MARKER_ARROW_POSITION,
            arrow_direction: MARKER_ARROW_DIRECTION,
            popup_text: data.popup_text,
            detail_text: data.detail_text,
            cue_text: data.cue_text,
            confidence: data.confidence,
            caution: data.caution,
            ai_raw_response: data.ai_raw_response,
          }),
        });

        if (!res.ok) {
          throw new Error(USER_MESSAGES.markerSaveFailed);
        }

        // AI 초안이 DB에 저장되었으므로 초안 목록에서 제거
        if (editingDraftId) {
          setAiDraftMarkers((prev) =>
            prev.filter((d) => d.draft_id !== editingDraftId),
          );
        }
      }

      await loadMarkers(sessionId);
      handleCloseModal();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : USER_MESSAGES.markerSaveFailed,
      );
    }
  };

  // 저장 마커 + AI 초안을 합쳐 비디오 오버레이에 표시
  const allMarkersForOverlay = useMemo<FeedbackMarker[]>(() => {
    const draftsAsMarkers: FeedbackMarker[] = aiDraftMarkers.map((d) => ({
      id: d.draft_id,
      session_id: sessionId,
      capture_url: null,
      confidence: null,
      caution: null,
      created_at: new Date().toISOString(),
      timestamp_ms: d.timestamp_ms,
      selected_area: d.selected_area,
      arrow_position: d.arrow_position,
      arrow_direction: d.arrow_direction,
      popup_text: d.popup_text,
      detail_text: d.detail_text,
      cue_text: d.cue_text,
    }));
    return [...markers, ...draftsAsMarkers];
  }, [markers, aiDraftMarkers, sessionId]);

  if (loading) {
    return <LoadingPanel message={USER_MESSAGES.editorLoading} />;
  }

  if (error || !session) {
    return (
      <ErrorPanel
        title="편집 화면을 열 수 없습니다"
        message={error ?? USER_MESSAGES.sessionLoadFailed}
      />
    );
  }

  return (
    <main className="min-h-screen bg-[#f5f6fa] px-4 py-6 text-[#111827]">
      <div className="mx-auto w-full max-w-[430px] space-y-4">
        <header>
          <h1 className="text-2xl font-bold tracking-tight">
            {getExerciseLabel(session.exercise_type)} 피드백 편집
          </h1>
          {canEdit ? (
            <p className="mt-2 text-sm font-semibold text-[#166534]">편집 가능</p>
          ) : (
            <div className="mt-3 space-y-2">
              <InlineError>{USER_MESSAGES.editPermissionMissing}</InlineError>
              {!queryEditToken ? (
                <InlineWarning>{USER_MESSAGES.editTokenLostHint}</InlineWarning>
              ) : null}
            </div>
          )}
        </header>

        {/* AI 피드백 생성 완료 안내 배너 */}
        {showAiBanner && aiDraftMarkers.length > 0 ? (
          <div className="relative overflow-hidden rounded-2xl border border-[#a5b4fc] bg-gradient-to-br from-[#eef2ff] to-[#f5f3ff] px-4 py-3.5 shadow-sm">
            <div className="absolute left-0 top-0 h-full w-1 bg-[#6366f1]" />
            <button
              type="button"
              aria-label="배너 닫기"
              onClick={() => setShowAiBanner(false)}
              className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full text-[#818cf8] transition-colors hover:bg-[#e0e7ff]"
            >
              ✕
            </button>
            <p className="pl-1 pr-7 text-xs font-bold leading-relaxed text-[#4338ca]">
              ✦ AI가 논문 기반 알고리즘으로 피드백 초안을 실시간 생성했습니다.
            </p>
            <p className="mt-0.5 pl-1 text-xs leading-relaxed text-[#6366f1]">
              검토 후 회원에게 공유하세요.
            </p>
          </div>
        ) : null}

        <VideoPlayer
          videoUrl={session.video_url}
          mode="edit"
          markers={allMarkersForOverlay}
          showOverlay
          autoPauseOnMarkers={allMarkersForOverlay.length > 0}
          onTimeUpdate={setCurrentTimeMs}
          onReady={handleVideoReady}
        />

        <section className="card border border-[#e5e7eb] bg-white p-4">
          <p className="text-sm font-semibold text-[#374151]">
            현재 시점 {formatTimestamp(currentTimeMs)}
          </p>
          <p className="mt-1 text-xs text-[#6b7280]">
            비디오 참조 준비 상태: {videoElement ? "준비됨" : "대기 중"}
          </p>
        </section>

        <button
          type="button"
          onClick={handleOpenCreateModal}
          disabled={!canEdit}
          className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-600 shadow-none hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          이 지점에 피드백
        </button>
        {actionError && !modalOpen ? <InlineError>{actionError}</InlineError> : null}

        {aiLoading ? (
          <AiAnalysisLoadingPanel startedAt={aiLoadingStartedAt} />
        ) : null}

        {aiError && !aiLoading ? (
          <div className="space-y-2">
            <InlineError>{aiError}</InlineError>
            {aiError === USER_MESSAGES.videoTooLong ||
            aiError === USER_MESSAGES.geminiVideoTooLargeForBeta ? (
              <p className="text-[10px] leading-relaxed text-slate-400">
                {USER_MESSAGES.videoLimitExpansionNote}
              </p>
            ) : null}
            {canEdit ? (
              <button
                type="button"
                onClick={handleRetryAiAnalysis}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800"
              >
                {USER_MESSAGES.geminiRetryAnalysis}
              </button>
            ) : null}
          </div>
        ) : null}

        {/* AI 초안 마커 목록 */}
        {aiDraftMarkers.length > 0 ? (
          <section className="rounded-2xl border border-[#c7d2fe] bg-[#eef2ff] p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-[#6366f1] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                  AI 초안
                </span>
                <p className="text-sm font-semibold text-[#3730a3]">
                  초안 {aiDraftMarkers.length}개 — 검토 필요
                </p>
              </div>
              {canEdit ? (
                <button
                  type="button"
                  onClick={() => void handleSaveAllDraftMarkers()}
                  disabled={savingAllDrafts || aiLoading}
                  className="min-h-10 shrink-0 rounded-xl bg-[#4338ca] px-4 py-2 text-xs font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {savingAllDrafts ? USER_MESSAGES.aiDraftSaveAllInProgress : "모두 저장"}
                </button>
              ) : null}
            </div>
            <p className="mb-3 text-xs leading-relaxed text-[#6366f1]">
              한 번에 저장하거나, 항목별로 수정·삭제할 수 있습니다.
            </p>
            <ul className="space-y-2.5">
              {aiDraftMarkers.map((draft) => (
                <li
                  key={draft.draft_id}
                  className="rounded-xl border border-[#c7d2fe] bg-white p-3"
                >
                  <p className="text-xs font-semibold text-[#6366f1]">
                    {formatTimestamp(draft.timestamp_ms)} · {draft.selected_area}
                  </p>
                  <p className="mt-1 text-sm font-semibold leading-relaxed text-[#111827]">
                    {draft.popup_text}
                  </p>
                  {canEdit ? (
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleEditDraftMarker(draft)}
                        className="min-h-10 rounded-lg border border-[#a5b4fc] bg-[#eef2ff] px-3 py-2 text-xs font-semibold text-[#4338ca]"
                      >
                        수정 후 저장
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteDraftMarker(draft.draft_id)}
                        className="min-h-10 rounded-lg border border-[#fecaca] bg-[#fef2f2] px-3 py-2 text-xs font-semibold text-[#b91c1c]"
                      >
                        삭제
                      </button>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <MarkerList
          markers={markers}
          canEdit={canEdit}
          onEdit={handleOpenEditModal}
          onDelete={handleDeleteMarker}
        />

        {canEdit ? (
          <TrainerProfileEditor
            displayName={trainerDisplayName}
            centerName={trainerCenterName}
            onDisplayNameChange={updateTrainerDisplayName}
            onCenterNameChange={updateTrainerCenterName}
            onSave={handleSaveTrainerProfile}
            saving={trainerSaving}
            saveError={trainerSaveError}
          />
        ) : null}

        {session.share_token ? (
          <ShareLinkBox
            shareToken={session.share_token}
            markerCount={markers.length}
            onCopySuccess={handleShareLinkCopySuccess}
          />
        ) : null}
      </div>

      <FeedbackModal
        open={modalOpen}
        mode={modalMode}
        timestampLabel={formatTimestamp(markerTimestampMs)}
        exerciseType={session.exercise_type}
        captureImageBase64={captureImageBase64}
        captureError={captureError}
        saveError={actionError}
        initialData={modalMode === "edit" ? editingMarker ?? undefined : undefined}
        onClose={handleCloseModal}
        onSave={handleSaveMarker}
      />
    </main>
  );
}
