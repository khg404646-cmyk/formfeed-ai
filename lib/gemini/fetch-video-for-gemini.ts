import {
  GEMINI_VIDEO_FETCH_MAX_BYTES,
  GEMINI_VIDEO_FETCH_TIMEOUT_MS,
} from "./gemini-config";

export type FetchedVideo = {
  buffer: Buffer;
  mimeType: string;
};

function mimeFromUrl(url: string): string {
  const lower = url.split("?")[0].toLowerCase();
  if (lower.endsWith(".webm")) return "video/webm";
  if (lower.endsWith(".mov")) return "video/quicktime";
  if (lower.endsWith(".mkv")) return "video/x-matroska";
  return "video/mp4";
}

function mimeFromContentType(header: string | null): string | null {
  if (!header) return null;
  const base = header.split(";")[0].trim().toLowerCase();
  if (base.startsWith("video/")) return base;
  return null;
}

export async function fetchVideoForGemini(videoUrl: string): Promise<FetchedVideo> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GEMINI_VIDEO_FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(videoUrl, {
      signal: controller.signal,
      headers: { Accept: "video/*" },
    });

    if (!res.ok) {
      throw new Error(`Video fetch failed: HTTP ${res.status}`);
    }

    const contentLength = res.headers.get("content-length");
    if (contentLength) {
      const size = Number(contentLength);
      if (!Number.isNaN(size) && size > GEMINI_VIDEO_FETCH_MAX_BYTES) {
        throw new Error("Video file exceeds maximum size for analysis");
      }
    }

    const arrayBuffer = await res.arrayBuffer();
    if (arrayBuffer.byteLength > GEMINI_VIDEO_FETCH_MAX_BYTES) {
      throw new Error("Video file exceeds maximum size for analysis");
    }

    if (arrayBuffer.byteLength === 0) {
      throw new Error("Video file is empty");
    }

    const mimeType =
      mimeFromContentType(res.headers.get("content-type")) ?? mimeFromUrl(videoUrl);

    return {
      buffer: Buffer.from(arrayBuffer),
      mimeType,
    };
  } finally {
    clearTimeout(timeout);
  }
}
