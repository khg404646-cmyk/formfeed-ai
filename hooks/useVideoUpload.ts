"use client";

import { useState } from "react";
import { USER_MESSAGES } from "../lib/user-messages";

const MAX_FILE_SIZE_BYTES = 300 * 1024 * 1024;

type UploadInitResponse = {
  uploadUrl: string;
  videoUrl: string;
  key: string;
};

type UploadResult = {
  videoUrl: string;
  key: string;
};

function xhrUploadFile(
  uploadUrl: string,
  file: File,
  onProgress: (progress: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl);
    xhr.setRequestHeader("Content-Type", file.type);

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      const nextProgress = Math.round((event.loaded / event.total) * 100);
      onProgress(nextProgress);
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(100);
        resolve();
        return;
      }
      reject(new Error(USER_MESSAGES.uploadFailed));
    };

    xhr.onerror = () => {
      reject(new Error(USER_MESSAGES.uploadFailed));
    };

    xhr.send(file);
  });
}

export function useVideoUpload() {
  const [progress, setProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadVideo = async (file: File): Promise<UploadResult> => {
    if (file.size > MAX_FILE_SIZE_BYTES) {
      const message = USER_MESSAGES.fileSizeExceeded;
      setError(message);
      throw new Error(message);
    }

    setError(null);
    setIsUploading(true);
    setProgress(0);

    try {
      const initResponse = await fetch("/api/upload/video", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileName: file.name,
          contentType: file.type,
          fileSize: file.size,
        }),
      });

      if (!initResponse.ok) {
        let message: string = USER_MESSAGES.uploadFailed;
        try {
          const errorBody = (await initResponse.json()) as { error?: string };
          if (errorBody.error) message = errorBody.error;
        } catch {
          // keep default message
        }
        setError(message);
        throw new Error(message);
      }

      const { uploadUrl, videoUrl, key } =
        (await initResponse.json()) as UploadInitResponse;

      if (!uploadUrl || !videoUrl || !key) {
        const message = USER_MESSAGES.uploadFailed;
        setError(message);
        throw new Error(message);
      }

      await xhrUploadFile(uploadUrl, file, setProgress);
      return { videoUrl, key };
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : USER_MESSAGES.uploadFailed;
      setError(message);
      throw new Error(message);
    } finally {
      setIsUploading(false);
    }
  };

  return { uploadVideo, progress, isUploading, error };
}
