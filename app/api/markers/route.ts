import { NextResponse } from "next/server";
import { supabaseServer } from "../../../lib/supabase-server";

type CreateMarkerRequest = {
  session_id?: unknown;
  edit_token?: unknown;
  timestamp_ms?: unknown;
  capture_url?: unknown;
  selected_area?: unknown;
  arrow_position?: unknown;
  arrow_direction?: unknown;
  popup_text?: unknown;
  detail_text?: unknown;
  cue_text?: unknown;
  confidence?: unknown;
  caution?: unknown;
  ai_raw_response?: unknown;
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isNullableString(value: unknown): value is string | null {
  return typeof value === "string" || value === null;
}

function isNullableObject(value: unknown): value is Record<string, unknown> | null {
  return (typeof value === "object" && value !== undefined) || value === null;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateMarkerRequest;

    if (!isNonEmptyString(body.session_id) || !isNonEmptyString(body.edit_token)) {
      return NextResponse.json(
        { error: "session_id and edit_token are required." },
        { status: 400 },
      );
    }

    if (
      typeof body.timestamp_ms !== "number" ||
      !isNonEmptyString(body.selected_area) ||
      !isNonEmptyString(body.arrow_position) ||
      !isNonEmptyString(body.arrow_direction) ||
      !isNonEmptyString(body.popup_text) ||
      !isNonEmptyString(body.detail_text) ||
      !isNonEmptyString(body.cue_text) ||
      !isNullableString(body.capture_url) ||
      !isNullableString(body.confidence) ||
      !isNullableString(body.caution) ||
      !isNullableObject(body.ai_raw_response)
    ) {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    const { data: session, error: sessionError } = await supabaseServer
      .from("feedback_sessions")
      .select("id, edit_token")
      .eq("id", body.session_id)
      .maybeSingle();

    if (sessionError) {
      return NextResponse.json(
        { error: sessionError.message ?? "Failed to fetch session." },
        { status: 500 },
      );
    }

    if (!session) {
      return NextResponse.json({ error: "Session not found." }, { status: 404 });
    }

    if (session.edit_token !== body.edit_token) {
      return NextResponse.json({ error: "Invalid edit token." }, { status: 403 });
    }

    const { data: marker, error: insertError } = await supabaseServer
      .from("feedback_markers")
      .insert({
        session_id: body.session_id,
        timestamp_ms: body.timestamp_ms,
        capture_url: body.capture_url,
        selected_area: body.selected_area.trim(),
        arrow_position: body.arrow_position.trim(),
        arrow_direction: body.arrow_direction.trim(),
        popup_text: body.popup_text.trim(),
        detail_text: body.detail_text.trim(),
        cue_text: body.cue_text.trim(),
        confidence: body.confidence,
        caution: body.caution,
        ai_raw_response: body.ai_raw_response,
      })
      .select("*")
      .single();

    if (insertError || !marker) {
      return NextResponse.json(
        { error: insertError?.message ?? "Failed to create marker." },
        { status: 500 },
      );
    }

    return NextResponse.json({ marker });
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("session_id");

  if (!isNonEmptyString(sessionId)) {
    return NextResponse.json({ error: "session_id is required." }, { status: 400 });
  }

  const { data: markers, error } = await supabaseServer
    .from("feedback_markers")
    .select("*")
    .eq("session_id", sessionId)
    .order("timestamp_ms", { ascending: true });

  if (error) {
    return NextResponse.json(
      { error: error.message ?? "Failed to fetch markers." },
      { status: 500 },
    );
  }

  // GET must be available to share page without edit_token.
  return NextResponse.json({ markers: markers ?? [] });
}
