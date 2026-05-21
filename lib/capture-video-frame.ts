import { USER_MESSAGES } from "./user-messages";

const CAPTURE_ERROR_MESSAGE = USER_MESSAGES.frameCaptureFailed;
/** Anthropic Vision 권장 범위 안으로 리사이즈 (요청 실패 방지) */
const MAX_CAPTURE_EDGE = 1280;

function getCaptureDimensions(
  videoWidth: number,
  videoHeight: number,
): { width: number; height: number } {
  const longest = Math.max(videoWidth, videoHeight);
  if (longest <= MAX_CAPTURE_EDGE) {
    return { width: videoWidth, height: videoHeight };
  }
  const scale = MAX_CAPTURE_EDGE / longest;
  return {
    width: Math.max(1, Math.round(videoWidth * scale)),
    height: Math.max(1, Math.round(videoHeight * scale)),
  };
}

/**
 * 현재 재생 시점의 영상 프레임을 JPEG base64 data URL로 캡처합니다.
 * crossOrigin 미설정 또는 R2 CORS 미구성 시 캔버스가 tainted 되어 실패할 수 있습니다.
 */
export function captureVideoFrame(video: HTMLVideoElement): string {
  const { videoWidth, videoHeight } = video;

  if (videoWidth === 0 || videoHeight === 0) {
    throw new Error(CAPTURE_ERROR_MESSAGE);
  }

  const { width, height } = getCaptureDimensions(videoWidth, videoHeight);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error(CAPTURE_ERROR_MESSAGE);
  }

  try {
    ctx.drawImage(video, 0, 0, width, height);
  } catch {
    throw new Error(CAPTURE_ERROR_MESSAGE);
  }

  try {
    return canvas.toDataURL("image/jpeg", 0.85);
  } catch {
    throw new Error(CAPTURE_ERROR_MESSAGE);
  }
}
