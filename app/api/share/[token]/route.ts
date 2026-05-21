import { NextResponse } from "next/server";
import { supabaseServer } from "../../../../lib/supabase-server";
import type { FeedbackSession, SharePageResponse } from "../../../../types/formfeed";

type RouteContext = {
  params: Promise<{ token: string }>;
};

export async function GET(_: Request, context: RouteContext) {
  const { token } = await context.params;

  if (!token) {
    return NextResponse.json({ error: "token is required." }, { status: 400 });
  }

  const { data: session, error: sessionError } = await supabaseServer
    .from("feedback_sessions")
    .select(
      "id, video_url, video_file_name, exercise_type, trainer_display_name, trainer_center_name, share_token, created_at, expires_at",
    )
    .eq("share_token", token)
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

  const { data: markers, error: markersError } = await supabaseServer
    .from("feedback_markers")
    .select("*")
    .eq("session_id", session.id)
    .order("timestamp_ms", { ascending: true });

  if (markersError) {
    return NextResponse.json(
      { error: markersError.message ?? "Failed to fetch markers." },
      { status: 500 },
    );
  }

  const memberSession: FeedbackSession = {
    id: session.id,
    video_url: session.video_url,
    video_file_name: session.video_file_name,
    exercise_type: session.exercise_type,
    trainer_display_name: session.trainer_display_name ?? null,
    trainer_center_name: session.trainer_center_name ?? null,
    share_token: session.share_token,
    created_at: session.created_at,
    expires_at: session.expires_at,
  };

  const payload: SharePageResponse = {
    session: memberSession,
    markers: markers ?? [],
  };

  return NextResponse.json(payload);
}
