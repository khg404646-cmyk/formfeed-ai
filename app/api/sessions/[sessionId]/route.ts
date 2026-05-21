import { NextResponse } from "next/server";
import { supabaseServer } from "../../../../lib/supabase-server";
import type {
  EditorSessionReadOnlyResponse,
  EditorSessionWithEditTokenResponse,
  FeedbackSession,
  FeedbackSessionWithEditToken,
} from "../../../../types/formfeed";

const SESSION_SELECT =
  "id, video_url, video_file_name, exercise_type, trainer_display_name, trainer_center_name, share_token, created_at, expires_at, edit_token";

type RouteContext = {
  params: Promise<{ sessionId: string }>;
};

function mapSessionRow(data: {
  id: string;
  video_url: string;
  video_file_name: string | null;
  exercise_type: string;
  trainer_display_name?: string | null;
  trainer_center_name?: string | null;
  share_token: string;
  created_at: string;
  expires_at: string | null;
}): FeedbackSession {
  return {
    id: data.id,
    video_url: data.video_url,
    video_file_name: data.video_file_name,
    exercise_type: data.exercise_type as FeedbackSession["exercise_type"],
    trainer_display_name: data.trainer_display_name ?? null,
    trainer_center_name: data.trainer_center_name ?? null,
    share_token: data.share_token,
    created_at: data.created_at,
    expires_at: data.expires_at,
  };
}

export async function GET(request: Request, context: RouteContext) {
  const { sessionId } = await context.params;

  if (!sessionId) {
    return NextResponse.json({ error: "sessionId is required." }, { status: 400 });
  }

  const { data, error } = await supabaseServer
    .from("feedback_sessions")
    .select(SESSION_SELECT)
    .eq("id", sessionId)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: error.message ?? "Failed to fetch session." },
      { status: 500 },
    );
  }

  if (!data) {
    return NextResponse.json({ error: "Session not found." }, { status: 404 });
  }

  const url = new URL(request.url);
  const editTokenFromQuery = url.searchParams.get("edit_token");
  const hasEditPermission =
    editTokenFromQuery !== null && editTokenFromQuery === data.edit_token;

  const baseSession = mapSessionRow(data);

  if (hasEditPermission) {
    const session: FeedbackSessionWithEditToken = {
      ...baseSession,
      edit_token: data.edit_token,
    };
    const payload: EditorSessionWithEditTokenResponse = { session };
    return NextResponse.json(payload);
  }

  const payload: EditorSessionReadOnlyResponse = { session: baseSession };
  return NextResponse.json(payload);
}

type PatchSessionBody = {
  edit_token?: unknown;
  trainer_display_name?: unknown;
  trainer_center_name?: unknown;
};

export async function PATCH(request: Request, context: RouteContext) {
  const { sessionId } = await context.params;

  if (!sessionId) {
    return NextResponse.json({ error: "sessionId is required." }, { status: 400 });
  }

  let body: PatchSessionBody;
  try {
    body = (await request.json()) as PatchSessionBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (typeof body.edit_token !== "string" || !body.edit_token.trim()) {
    return NextResponse.json({ error: "edit_token is required." }, { status: 400 });
  }

  const displayName =
    typeof body.trainer_display_name === "string"
      ? body.trainer_display_name.trim()
      : "";
  const centerName =
    typeof body.trainer_center_name === "string"
      ? body.trainer_center_name.trim()
      : "";

  if (!displayName && !centerName) {
    return NextResponse.json(
      { error: "trainer_display_name or trainer_center_name is required." },
      { status: 400 },
    );
  }

  const { data: existing, error: fetchError } = await supabaseServer
    .from("feedback_sessions")
    .select("id, edit_token")
    .eq("id", sessionId)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json(
      { error: fetchError.message ?? "Failed to fetch session." },
      { status: 500 },
    );
  }

  if (!existing) {
    return NextResponse.json({ error: "Session not found." }, { status: 404 });
  }

  if (existing.edit_token !== body.edit_token.trim()) {
    return NextResponse.json({ error: "Invalid edit token." }, { status: 403 });
  }

  const { data: updated, error: updateError } = await supabaseServer
    .from("feedback_sessions")
    .update({
      trainer_display_name: displayName || null,
      trainer_center_name: centerName || null,
    })
    .eq("id", sessionId)
    .select(SESSION_SELECT)
    .single();

  if (updateError || !updated) {
    return NextResponse.json(
      { error: updateError?.message ?? "Failed to update trainer profile." },
      { status: 500 },
    );
  }

  return NextResponse.json({ session: mapSessionRow(updated) });
}
