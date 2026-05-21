const PROBE_TIMEOUT_MS = 12_000;

/**
 * 로컬 파일의 재생 길이(초)를 측정합니다. 업로드 전 30초 제한 검사용.
 */
export function getVideoDurationSec(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.playsInline = true;
    video.muted = true;

    const cleanup = () => {
      clearTimeout(timer);
      video.removeAttribute("src");
      video.load();
      URL.revokeObjectURL(url);
    };

    const timer = setTimeout(() => {
      cleanup();
      reject(new Error("duration-timeout"));
    }, PROBE_TIMEOUT_MS);

    video.onloadedmetadata = () => {
      const dur = video.duration;
      cleanup();
      if (!Number.isFinite(dur) || dur <= 0) {
        reject(new Error("duration-invalid"));
        return;
      }
      resolve(dur);
    };

    video.onerror = () => {
      cleanup();
      reject(new Error("duration-error"));
    };

    video.src = url;
  });
}
