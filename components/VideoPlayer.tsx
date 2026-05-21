"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatTimestamp } from "../lib/demo-data";
import {
  CONTROLS_SAFE_INSET_TOP,
  CONTROLS_SAFE_INSET_X,
  getOverlaySafeBottom,
} from "../lib/overlay-placement";
import { USER_MESSAGES } from "../lib/user-messages";
import type { FeedbackMarker, VideoPlayerMode } from "../types/formfeed";
import OverlayPreview, { type OverlayPopupPhase } from "./OverlayPreview";

type VideoPlayerProps = {
  videoUrl: string;
  mode: VideoPlayerMode;
  markers?: FeedbackMarker[];
  showOverlay?: boolean;
  /** share 모드 기본 true — 마커 시점에 2초 일시정지 후 재생 */
  autoPauseOnMarkers?: boolean;
  onTimeUpdate?: (currentTimeMs: number) => void;
  onReady?: (videoElement: HTMLVideoElement) => void;
  className?: string;
};

const POPUP_VISIBLE_MS = 2500;
const MARKER_READ_MS = 2000;
/** Popup fade in/out — matches OverlayPreview `duration-200` */
const FADE_MS = 200;
const TRIGGER_TOLERANCE_MS = 200;
const PROGRESS_HIT_HEIGHT_PX = 24;

function isPopupActivePhase(phase: OverlayPopupPhase): boolean {
  return phase === "entering" || phase === "visible" || phase === "leaving";
}

export default function VideoPlayer({
  videoUrl,
  mode,
  markers = [],
  showOverlay = true,
  autoPauseOnMarkers,
  onTimeUpdate,
  onReady,
  className,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const progressTrackRef = useRef<HTMLDivElement | null>(null);
  const prevTimeMsRef = useRef(0);
  const triggeredTimestampsRef = useRef<Set<number>>(new Set());
  const pauseHoldRef = useRef(false);
  const pauseTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const isScrubbingRef = useRef(false);

  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackError, setPlaybackError] = useState(false);
  const [forcedMarker, setForcedMarker] = useState<FeedbackMarker | null>(null);
  const [popupPhase, setPopupPhase] = useState<OverlayPopupPhase>("hidden");

  const autoPauseEnabled =
    (autoPauseOnMarkers ?? mode === "share") && markers.length > 0 && showOverlay;

  const sortedMarkers = useMemo(
    () => [...markers].sort((a, b) => a.timestamp_ms - b.timestamp_ms),
    [markers],
  );

  const progressPercent = durationMs > 0 ? (currentTimeMs / durationMs) * 100 : 0;

  const clearPauseTimers = useCallback(() => {
    for (const id of pauseTimersRef.current) clearTimeout(id);
    pauseTimersRef.current = [];
  }, []);

  const schedulePauseTimer = useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(fn, ms);
    pauseTimersRef.current.push(id);
    return id;
  }, []);

  const resetPauseState = useCallback(() => {
    clearPauseTimers();
    pauseHoldRef.current = false;
    setForcedMarker(null);
    setPopupPhase("hidden");
  }, [clearPauseTimers]);

  const seekToRatio = useCallback((ratio: number) => {
    const video = videoRef.current;
    if (!video || !Number.isFinite(video.duration) || video.duration <= 0) return;
    const clamped = Math.min(1, Math.max(0, ratio));
    video.currentTime = clamped * video.duration;
    const nextMs = Math.floor(video.currentTime * 1000);
    setCurrentTimeMs(nextMs);
    onTimeUpdate?.(nextMs);
    prevTimeMsRef.current = nextMs;
  }, [onTimeUpdate]);

  const seekFromPointer = useCallback(
    (clientX: number) => {
      const track = progressTrackRef.current;
      if (!track) return;
      const rect = track.getBoundingClientRect();
      if (rect.width <= 0) return;
      seekToRatio((clientX - rect.left) / rect.width);
    },
    [seekToRatio],
  );

  const togglePlayback = useCallback(() => {
    const video = videoRef.current;
    if (!video || playbackError) return;
    if (video.paused) {
      void video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [playbackError]);

  useEffect(() => {
    return () => resetPauseState();
  }, [resetPauseState]);

  useEffect(() => {
    triggeredTimestampsRef.current = new Set();
    prevTimeMsRef.current = 0;
    clearPauseTimers();
    pauseHoldRef.current = false;
    queueMicrotask(() => {
      setDurationMs(0);
      setIsPlaying(false);
      setForcedMarker(null);
      setPopupPhase("hidden");
    });
  }, [videoUrl, clearPauseTimers]);

  useEffect(() => {
    const stopScrub = () => {
      isScrubbingRef.current = false;
    };
    window.addEventListener("pointerup", stopScrub);
    window.addEventListener("pointercancel", stopScrub);
    return () => {
      window.removeEventListener("pointerup", stopScrub);
      window.removeEventListener("pointercancel", stopScrub);
    };
  }, []);

  const timeWindowMarker = useMemo(() => {
    if (autoPauseEnabled || !showOverlay || markers.length === 0) return null;
    return (
      markers.find(
        (m) =>
          currentTimeMs >= m.timestamp_ms &&
          currentTimeMs <= m.timestamp_ms + POPUP_VISIBLE_MS,
      ) ?? null
    );
  }, [autoPauseEnabled, currentTimeMs, markers, showOverlay]);

  const displayMarker = autoPauseEnabled ? forcedMarker : timeWindowMarker;

  const overlayPhase: OverlayPopupPhase = autoPauseEnabled
    ? popupPhase
    : displayMarker
      ? "visible"
      : "hidden";

  const showPopup = Boolean(
    showOverlay && !playbackError && displayMarker && overlayPhase !== "hidden",
  );
  const guardControls = showPopup || isPopupActivePhase(overlayPhase);

  const triggerMarkerPause = useCallback(
    (marker: FeedbackMarker, video: HTMLVideoElement) => {
      if (pauseHoldRef.current) return;

      triggeredTimestampsRef.current.add(marker.timestamp_ms);
      pauseHoldRef.current = true;
      clearPauseTimers();
      video.pause();
      setForcedMarker(marker);
      setPopupPhase("entering");

      requestAnimationFrame(() => {
        requestAnimationFrame(() => setPopupPhase("visible"));
      });

      schedulePauseTimer(() => {
        setPopupPhase("leaving");
      }, FADE_MS + MARKER_READ_MS);

      schedulePauseTimer(() => {
        resetPauseState();
        void video.play().catch(() => {});
      }, FADE_MS + MARKER_READ_MS + FADE_MS);
    },
    [clearPauseTimers, resetPauseState, schedulePauseTimer],
  );

  const handleTimeAdvance = useCallback(
    (nextMs: number, video: HTMLVideoElement) => {
      setCurrentTimeMs(nextMs);
      onTimeUpdate?.(nextMs);

      if (!autoPauseEnabled || pauseHoldRef.current) {
        prevTimeMsRef.current = nextMs;
        return;
      }

      for (const marker of sortedMarkers) {
        const ts = marker.timestamp_ms;
        if (triggeredTimestampsRef.current.has(ts)) continue;

        const crossed = prevTimeMsRef.current < ts && nextMs >= ts;
        const inWindow = nextMs >= ts && nextMs <= ts + TRIGGER_TOLERANCE_MS;
        if (crossed || inWindow) {
          triggerMarkerPause(marker, video);
          break;
        }
      }

      prevTimeMsRef.current = nextMs;
    },
    [autoPauseEnabled, onTimeUpdate, sortedMarkers, triggerMarkerPause],
  );

  const handleSeeked = useCallback(
    (video: HTMLVideoElement) => {
      const t = Math.floor(video.currentTime * 1000);
      triggeredTimestampsRef.current = new Set(
        [...triggeredTimestampsRef.current].filter((ts) => ts < t - 50),
      );
      if (t < 400) triggeredTimestampsRef.current = new Set();
      prevTimeMsRef.current = t;
      resetPauseState();
    },
    [resetPauseState],
  );

  const handleProgressPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      event.stopPropagation();
      isScrubbingRef.current = true;
      event.currentTarget.setPointerCapture(event.pointerId);
      seekFromPointer(event.clientX);
    },
    [seekFromPointer],
  );

  const handleProgressPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!isScrubbingRef.current) return;
      seekFromPointer(event.clientX);
    },
    [seekFromPointer],
  );

  const containerClass = `relative w-full overflow-hidden rounded-[18px] bg-black shadow-xl ring-1 ring-black/10 ${className ?? ""}`;

  return (
    <div className={containerClass} data-mode={mode}>
      <div className="relative aspect-[9/16] w-full max-w-full overflow-hidden bg-black">
        <video
          key={videoUrl}
          ref={videoRef}
          src={videoUrl}
          playsInline
          preload="metadata"
          crossOrigin="anonymous"
          disablePictureInPicture
          controls={false}
          className="ff-video relative z-0 h-full w-full max-h-full object-contain"
          onLoadedMetadata={(event) => {
            const video = event.currentTarget;
            setPlaybackError(false);
            setCurrentTimeMs(0);
            setDurationMs(
              Number.isFinite(video.duration) ? Math.floor(video.duration * 1000) : 0,
            );
            prevTimeMsRef.current = 0;
            triggeredTimestampsRef.current = new Set();
            resetPauseState();
            onReady?.(video);
          }}
          onDurationChange={(event) => {
            const video = event.currentTarget;
            if (Number.isFinite(video.duration) && video.duration > 0) {
              setDurationMs(Math.floor(video.duration * 1000));
            }
          }}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onTimeUpdate={(event) => {
            const video = event.currentTarget;
            handleTimeAdvance(Math.floor(video.currentTime * 1000), video);
          }}
          onSeeked={(event) => handleSeeked(event.currentTarget)}
          onEnded={(event) => {
            triggeredTimestampsRef.current = new Set();
            resetPauseState();
            setIsPlaying(false);
            prevTimeMsRef.current = Math.floor(event.currentTarget.currentTime * 1000);
          }}
          onError={() => setPlaybackError(true)}
        />

        {!playbackError ? (
          <button
            type="button"
            className="absolute inset-x-0 top-0 z-[15] cursor-pointer border-0 bg-transparent p-0 outline-none"
            style={{ bottom: `${PROGRESS_HIT_HEIGHT_PX}px` }}
            onClick={togglePlayback}
            aria-label={isPlaying ? "일시정지" : "재생"}
          />
        ) : null}

        {!playbackError && !isPlaying && !showPopup ? (
          <div
            className="pointer-events-none absolute inset-0 z-[16] flex items-center justify-center"
            aria-hidden
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/45 text-white">
              <svg viewBox="0 0 24 24" className="ml-0.5 h-6 w-6 fill-current" aria-hidden>
                <path d="M8 5v14l11-7z" />
              </svg>
            </span>
          </div>
        ) : null}

        {playbackError ? (
          <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-black/60 px-4">
            <p className="text-center text-xs font-semibold leading-relaxed text-white">
              {USER_MESSAGES.videoLoadFailed}
            </p>
          </div>
        ) : null}

        {showPopup && displayMarker ? (
          <div
            className="pointer-events-none absolute z-[60]"
            style={{
              top: CONTROLS_SAFE_INSET_TOP,
              left: CONTROLS_SAFE_INSET_X,
              right: CONTROLS_SAFE_INSET_X,
              bottom: getOverlaySafeBottom(guardControls),
            }}
          >
            <OverlayPreview
              timestampLabel={formatTimestamp(displayMarker.timestamp_ms)}
              selectedArea={displayMarker.selected_area}
              popupText={displayMarker.popup_text}
              detailText={displayMarker.detail_text}
              arrowPosition={displayMarker.arrow_position}
              arrowDirection={displayMarker.arrow_direction}
              phase={overlayPhase}
              guardControls={guardControls}
            />
          </div>
        ) : null}

        <div
          className={`pointer-events-none absolute z-[55] max-w-[calc(100%-1rem)] rounded-full bg-black/70 px-2 py-0.5 font-mono text-[10px] font-semibold text-white ${
            guardControls ? "right-2 top-2" : "left-2 top-2"
          }`}
        >
          {formatTimestamp(currentTimeMs)}
        </div>

        {!playbackError ? (
          <div
            className="absolute inset-x-0 bottom-0 z-[70] flex items-end px-2"
            style={{
              height: `${PROGRESS_HIT_HEIGHT_PX}px`,
              paddingBottom: "max(0.25rem, env(safe-area-inset-bottom, 0px))",
            }}
          >
            <div
              ref={progressTrackRef}
              role="slider"
              aria-label="재생 위치"
              aria-valuemin={0}
              aria-valuemax={durationMs}
              aria-valuenow={currentTimeMs}
              className="relative h-3 w-full cursor-pointer touch-none"
              onPointerDown={handleProgressPointerDown}
              onPointerMove={handleProgressPointerMove}
            >
              <div className="absolute bottom-0 left-0 right-0 h-px rounded-full bg-white/30" />
              <div
                className="absolute bottom-0 left-0 h-px rounded-full bg-white"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        ) : null}
      </div>

      <style jsx>{`
        .ff-video::-webkit-media-controls {
          display: none !important;
        }
        .ff-video::-webkit-media-controls-enclosure {
          display: none !important;
        }
        .ff-video::-webkit-media-controls-start-playback-button {
          display: none !important;
        }
      `}</style>
    </div>
  );
}
