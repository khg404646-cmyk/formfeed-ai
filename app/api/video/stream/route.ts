import { NextResponse } from "next/server";

export const runtime = "nodejs";

const PASSTHROUGH_HEADERS = [
  "content-type",
  "content-length",
  "content-range",
  "accept-ranges",
  "etag",
  "last-modified",
] as const;

function getR2PublicOrigin(): string | null {
  const base = process.env.R2_PUBLIC_URL?.trim().replace(/\/$/, "");
  if (!base) return null;
  try {
    return new URL(base).origin;
  } catch {
    return null;
  }
}

function assertAllowedVideoUrl(raw: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(raw.trim());
  } catch {
    throw new Error("Invalid video URL");
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error("Invalid video protocol");
  }

  const allowedOrigin = getR2PublicOrigin();
  if (!allowedOrigin || parsed.origin !== allowedOrigin) {
    throw new Error("Video host not allowed");
  }

  if (!parsed.pathname.startsWith("/videos/")) {
    throw new Error("Video path not allowed");
  }

  return parsed;
}

export async function GET(request: Request) {
  const urlParam = new URL(request.url).searchParams.get("url");
  if (!urlParam) {
    return NextResponse.json({ error: "url is required" }, { status: 400 });
  }

  let target: URL;
  try {
    target = assertAllowedVideoUrl(urlParam);
  } catch {
    return NextResponse.json({ error: "Invalid video URL" }, { status: 400 });
  }

  const range = request.headers.get("range");
  const upstreamHeaders: HeadersInit = { Accept: "video/*" };
  if (range) upstreamHeaders.Range = range;

  let upstream: Response;
  try {
    upstream = await fetch(target.toString(), {
      headers: upstreamHeaders,
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch video" }, { status: 502 });
  }

  if (!upstream.ok && upstream.status !== 206) {
    return NextResponse.json(
      { error: `Upstream returned ${upstream.status}` },
      { status: upstream.status === 404 ? 404 : 502 },
    );
  }

  const headers = new Headers();
  for (const name of PASSTHROUGH_HEADERS) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }
  if (!headers.has("accept-ranges")) {
    headers.set("Accept-Ranges", "bytes");
  }
  headers.set("Cache-Control", "public, max-age=86400, immutable");

  return new Response(upstream.body, {
    status: upstream.status,
    headers,
  });
}
