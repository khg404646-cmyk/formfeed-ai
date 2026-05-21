import { NextResponse } from "next/server";
import { supabaseServer } from "../../../lib/supabase-server";
import { mapSessionCreateError } from "../../../lib/user-messages";

type CreateSessionRequest = {
  video_url?: unknown;
  video_file_name?: unknown;
  exercise_type?: unknown;
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateSessionRequest;

    if (
      !isNonEmptyString(body.video_url) ||
      !isNonEmptyString(body.video_file_name) ||
      !isNonEmptyString(body.exercise_type)
    ) {
      return NextResponse.json(
        { error: "video_url, video_file_name, exercise_type are required." },
        { status: 400 },
      );
    }

    const { data, error } = await supabaseServer
      .from("feedback_sessions")
      .insert({
        video_url: body.video_url.trim(),
        video_file_name: body.video_file_name.trim(),
        exercise_type: body.exercise_type.trim(),
        expires_at: null,
      })
      .select("id, share_token, edit_token")
      .single();

    if (error || !data) {
      const detail = error?.message ?? "Failed to create session.";
      return NextResponse.json(
        { error: mapSessionCreateError(detail) },
        { status: 500 },
      );
    }

    // edit_token is for trainer edit link/localStorage only.
    // Never include edit_token in member-facing share page responses.
    return NextResponse.json({
      session_id: data.id,
      share_token: data.share_token,
      edit_token: data.edit_token,
    });
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
}
