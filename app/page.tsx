"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import RecentLinks, { notifyRecentLinksUpdated } from "../components/RecentLinks";
import { useVideoUpload } from "../hooks/useVideoUpload";
import { exerciseTypeLabels } from "../lib/exercise-labels";
import { InlineError } from "../components/StatusPanels";
import { getVideoDurationSec } from "../lib/get-video-duration";
import { MAX_VIDEO_DURATION_SEC } from "../lib/video-limits";
import { mapSessionCreateError, USER_MESSAGES } from "../lib/user-messages";
import type {
  ApiErrorBody,
  CreateSessionResponse,
  ExerciseType,
  RecentLinkItem,
} from "../types/formfeed";

const RECENT_LINKS_KEY = "formfeed_recent_links";
const MAX_FILE_SIZE_BYTES = 300 * 1024 * 1024;

function isExerciseType(value: string): value is ExerciseType {
  return value in exerciseTypeLabels;
}

export default function HomePage() {
  const router = useRouter();
  const { uploadVideo, progress, isUploading, error: uploadError } = useVideoUpload();

  const [exerciseType, setExerciseType] = useState<ExerciseType>("auto");
  const [file, setFile] = useState<File | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const isFileTooLarge = file ? file.size > MAX_FILE_SIZE_BYTES : false;

  const isDisabled = useMemo(() => {
    return (
      !exerciseType || !file || isFileTooLarge || isUploading || isCreating
    );
  }, [exerciseType, file, isFileTooLarge, isUploading, isCreating]);

  const handleSelectFile = (nextFile: File | null) => {
    setFormError(null);
    setFile(nextFile);

    if (!nextFile) return;
    if (nextFile.size > MAX_FILE_SIZE_BYTES) {
      setFormError(USER_MESSAGES.fileSizeExceeded);
    }
  };

  const saveRecentLink = (item: RecentLinkItem) => {
    try {
      const raw = window.localStorage.getItem(RECENT_LINKS_KEY);
      const parsed = raw ? (JSON.parse(raw) as RecentLinkItem[]) : [];
      const filtered = parsed.filter((x) => x.sessionId !== item.sessionId);
      const next = [item, ...filtered].slice(0, 20);
      window.localStorage.setItem(RECENT_LINKS_KEY, JSON.stringify(next));
      notifyRecentLinksUpdated();
    } catch {
      // localStorage write failure should not block editor navigation
    }
  };

  const handleStart = async () => {
    if (!exerciseType || !isExerciseType(exerciseType)) {
      setFormError(USER_MESSAGES.exerciseRequired);
      return;
    }
    if (!file) {
      setFormError(USER_MESSAGES.fileRequired);
      return;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setFormError(USER_MESSAGES.fileSizeExceeded);
      return;
    }

    setFormError(null);
    setIsCreating(true);

    try {
      let durationSec: number;
      try {
        durationSec = await getVideoDurationSec(file);
      } catch {
        setFormError(USER_MESSAGES.videoDurationProbeFailed);
        return;
      }
      if (durationSec > MAX_VIDEO_DURATION_SEC) {
        setFormError(USER_MESSAGES.videoTooLong);
        return;
      }

      const { videoUrl } = await uploadVideo(file);

      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          video_url: videoUrl,
          video_file_name: file.name,
          exercise_type: exerciseType,
        }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as ApiErrorBody;
        throw new Error(mapSessionCreateError(body.error));
      }

      const data = (await res.json()) as CreateSessionResponse;
      if (!data.session_id || !data.share_token || !data.edit_token) {
        throw new Error(USER_MESSAGES.sessionCreateFailed);
      }

      saveRecentLink({
        sessionId: data.session_id,
        shareToken: data.share_token,
        editToken: data.edit_token,
        exerciseType,
        createdAt: new Date().toISOString(),
      });

      router.push(
        `/editor/${data.session_id}?edit_token=${encodeURIComponent(data.edit_token)}`,
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : USER_MESSAGES.uploadFailed;
      setFormError(message);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f5f6fa] px-4 py-6 text-[#111827]">
      <div className="mx-auto w-full max-w-[430px] space-y-4">
        <header className="space-y-2">
          <p className="text-sm font-semibold text-[#374151]">폼피드 AI</p>
          <h1 className="text-2xl font-bold leading-tight">
            회원 운동영상 피드백을 만들어보세요.
          </h1>
          <p className="text-sm leading-relaxed text-[#6b7280]">
            운동영상을 올리고, 피드백 지점을 선택하면 AI가 회원용 설명문 초안을
            작성합니다. 베타 기간에는 30초 이하 mp4 영상을 권장합니다.
          </p>
        </header>

        <section className="card border border-[#e5e7eb] bg-white p-4">
          <label className="mb-2 block text-sm font-semibold text-[#374151]">
            운동 종목 선택
          </label>
          <select
            value={exerciseType}
            onChange={(e) => {
              if (isExerciseType(e.target.value)) {
                setExerciseType(e.target.value);
              }
            }}
            className="w-full rounded-xl border border-[#e5e7eb] bg-white px-3 py-3 text-sm outline-none focus:border-[#9ca3af]"
          >
            {Object.entries(exerciseTypeLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </section>

        <section className="card border border-[#e5e7eb] bg-white p-4">
          <label className="mb-2 block text-sm font-semibold text-[#374151]">
            영상 업로드
          </label>
          <div className="rounded-xl border border-dashed border-[#d1d5db] bg-[#f9fafb] p-3">
            <p className="text-xs leading-relaxed text-[#6b7280]">
              권장: 10~30초, 전신이 나오게 촬영
              <br />
              mp4, mov, webm
              <br />
              최대 300MB
            </p>
            <input
              type="file"
              accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm"
              onChange={(e) => handleSelectFile(e.target.files?.[0] ?? null)}
              className="mt-3 block w-full text-sm"
            />
            {file ? (
              <p className="mt-2 text-xs font-semibold text-[#374151]">{file.name}</p>
            ) : null}
          </div>
        </section>

        <section className="card border border-[#e5e7eb] bg-white p-4">
          <div className="mb-2 flex items-center justify-between text-xs font-semibold text-[#6b7280]">
            <span>업로드 진행률</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-[#e5e7eb]">
            <div
              className="h-full bg-[#111827] transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </section>

        {uploadError ? <InlineError>{uploadError}</InlineError> : null}
        {formError && formError !== uploadError ? (
          <InlineError>{formError}</InlineError>
        ) : null}

        {(isUploading || isCreating) && !formError && !uploadError ? (
          <p className="text-sm font-semibold text-[#374151]">
            {isUploading ? USER_MESSAGES.processingUpload : USER_MESSAGES.processingSession}
          </p>
        ) : null}

        <button
          type="button"
          onClick={handleStart}
          disabled={isDisabled}
          className="w-full rounded-2xl bg-[#111827] px-4 py-4 text-base font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isUploading
            ? USER_MESSAGES.processingUpload
            : isCreating
              ? USER_MESSAGES.processingSession
              : "피드백 만들기 시작"}
        </button>

        <RecentLinks />
      </div>
    </main>
  );
}
