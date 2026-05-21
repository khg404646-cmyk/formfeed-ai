export type ParsedCaptureImage = {
  mediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp";
  data: string;
};

export function parseCaptureImageBase64(raw: string): ParsedCaptureImage | null {
  const trimmed = raw.trim();
  const dataUrl = /^data:([^;]+);base64,(.+)$/i.exec(trimmed);
  if (dataUrl) {
    const mime = dataUrl[1].toLowerCase();
    const data = dataUrl[2].replace(/\s/g, "");
    if (
      mime === "image/png" ||
      mime === "image/jpeg" ||
      mime === "image/jpg" ||
      mime === "image/gif" ||
      mime === "image/webp"
    ) {
      const mediaType =
        mime === "image/jpg" ? "image/jpeg" : (mime as ParsedCaptureImage["mediaType"]);
      return { mediaType, data };
    }
    return null;
  }
  const data = trimmed.replace(/\s/g, "");
  if (!data) return null;
  return { mediaType: "image/png", data };
}

export function extractJsonObject(text: string): unknown {
  const trimmed = text.trim();
  const fenced = /^```(?:json)?\s*([\s\S]*?)```$/m.exec(trimmed);
  const candidate = fenced ? fenced[1].trim() : trimmed;
  return JSON.parse(candidate);
}
