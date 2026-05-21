import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextResponse } from "next/server";

const MAX_FILE_SIZE_BYTES = 300 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set(["mp4", "mov", "webm"]);

type UploadVideoRequest = {
  fileName?: unknown;
  contentType?: unknown;
  fileSize?: unknown;
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function sanitizeFileName(fileName: string): string {
  const base = fileName.trim().toLowerCase();
  return base.replace(/[^a-z0-9._-]/g, "-").replace(/-+/g, "-");
}

function getExtension(fileName: string): string {
  const parts = fileName.split(".");
  if (parts.length < 2) return "";
  return parts[parts.length - 1].toLowerCase();
}

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name} environment variable.`);
  return value;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as UploadVideoRequest;

    if (!isNonEmptyString(body.fileName)) {
      return NextResponse.json({ error: "fileName is required." }, { status: 400 });
    }
    if (!isNonEmptyString(body.contentType)) {
      return NextResponse.json(
        { error: "contentType is required." },
        { status: 400 },
      );
    }
    if (!body.contentType.startsWith("video/")) {
      return NextResponse.json(
        { error: "contentType must start with video/." },
        { status: 400 },
      );
    }
    if (typeof body.fileSize !== "number" || !Number.isFinite(body.fileSize)) {
      return NextResponse.json({ error: "fileSize is required." }, { status: 400 });
    }
    if (body.fileSize <= 0 || body.fileSize > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: "fileSize must be 300MB or less." },
        { status: 400 },
      );
    }

    const sanitizedName = sanitizeFileName(body.fileName);
    const extension = getExtension(sanitizedName);
    if (!ALLOWED_EXTENSIONS.has(extension)) {
      return NextResponse.json(
        { error: "Only mp4, mov, webm files are allowed." },
        { status: 400 },
      );
    }

    const bucket = getRequiredEnv("R2_BUCKET_NAME");
    const endpoint = getRequiredEnv("R2_ENDPOINT");
    const publicUrl = getRequiredEnv("R2_PUBLIC_URL").replace(/\/$/, "");
    const accessKeyId = getRequiredEnv("R2_ACCESS_KEY_ID");
    const secretAccessKey = getRequiredEnv("R2_SECRET_ACCESS_KEY");

    const s3Client = new S3Client({
      region: "auto",
      endpoint,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    const key = `videos/${crypto.randomUUID()}-${sanitizedName}`;
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: body.contentType,
    });

    const uploadUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 60 * 10,
    });
    const videoUrl = `${publicUrl}/${key}`;

    return NextResponse.json({ uploadUrl, videoUrl, key });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to prepare upload URL.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
