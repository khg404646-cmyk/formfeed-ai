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
  const prevTimeMsRef = useRef(0);
  const triggeredTimestampsRef = useRef<Set<number>>(new Set());
  const pauseHoldRef = useRef(false);
  const pauseTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [playbackError, setPlaybackError] = useState(false);
  const [forcedMarker, setForcedMarker] = useState<FeedbackMarker | null>(null);
  const [popupPhase, setPopupPhase] = useState<OverlayPopupPhase>("hidden");

  const autoPauseEnabled =
    (autoPauseOnMarkers ?? mode === "share") && markers.length > 0 && showOverlay;

  const sortedMarkers = useMemo(
    () => [...markers].sort((a, b) => a.timestamp_ms - b.timestamp_ms),
    [markers],
  );

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

  useEffect(() => {
    return () => resetPauseState();
  }, [resetPauseState]);

  useEffect(() => {
    triggeredTimestampsRef.current = new Set();
    prevTimeMsRef.current = 0;
    clearPauseTimers();
    pauseHoldRef.current = false;
    queueMicrotask(() => {
      setForcedMarker(null);
      setPopupPhase("hidden");
    });
  }, [videoUrl, clearPauseTimers]);

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
  /** Any visible popup keeps clear of native progress bar / controls */
  const guardControls = showPopup;

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

  const containerClass = `relative w-full overflow-hidden rounded-[18px] bg-black shadow-xl ring-1 ring-black/10 ${className ?? ""}`;

  return (
    <div className={containerClass} data-mode={mode}>
      <div className="relative aspect-[9/16] w-full max-w-full overflow-hidden bg-black">
        <video
          key={videoUrl}
          ref={videoRef}
          src={videoUrl}
          controls
          playsInline
          preload="metadata"
          crossOrigin="anonymous"
          className="relative z-0 h-full w-full max-h-full object-contain"
          onLoadedMetadata={(event) => {
            setPlaybackError(false);
            setCurrentTimeMs(0);
            prevTimeMsRef.current = 0;
            triggeredTimestampsRef.current = new Set();
            resetPauseState();
            onReady?.(event.currentTarget);
          }}
          onTimeUpdate={(event) => {
            const video = event.currentTarget;
            handleTimeAdvance(Math.floor(video.currentTime * 1000), video);
          }}
          onSeeked={(event) => handleSeeked(event.currentTarget)}
          onEnded={(event) => {
            triggeredTimestampsRef.current = new Set();
            resetPauseState();
            prevTimeMsRef.current = Math.floor(event.currentTarget.currentTime * 1000);
          }}
          onError={() => setPlaybackError(true)}
        />

        {playbackError ? (
          <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-black/60 px-4">
            <p className="text-center text-xs font-semibold leading-relaxed text-white">
              {USER_MESSAGES.videoLoadFailed}
            </p>
          </div>
        ) : null}

        {/* Overlay: z above native controls; safe zone clears progress bar (portrait/landscape) */}
        {showPopup && displayMarker ? (
          <div
            className="pointer-events-none absolute z-[60]"
            style={{
              top: CONTROLS_SAFE_INSET_TOP,
              left: CONTROLS_SAFE_INSET_X,
              right: CONTROLS_SAFE_INSET_X,
              bottom: getOverlaySafeBottom(guardControls) ?? 0,
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

        {/* Playback clock — top corner while popup guards bottom controls */}
        <div
          className={`pointer-events-none absolute z-[55] max-w-[calc(100%-1.5rem)] rounded-full bg-black/70 px-3 py-1 text-xs font-semibold text-white ${
            guardControls ? "right-3 top-3" : "bottom-3 left-3"
          }`}
        >
          {formatTimestamp(currentTimeMs)}
        </div>
      </div>
    </div>
  );
}
