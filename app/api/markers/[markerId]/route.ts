import { NextResponse } from "next/server";
import { supabaseServer } from "../../../../lib/supabase-server";

type RouteContext = {
  params: Promise<{ markerId: string }>;
};

type EditAuthBody = {
  session_id?: unknown;
  edit_token?: unknown;
};

type PatchMarkerBody = EditAuthBody & {
  selected_area?: unknown;
  arrow_position?: unknown;
  arrow_direction?: unknown;
  popup_text?: unknown;
  detail_text?: unknown;
  cue_text?: unknown;
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

// share_token must never be used for edit/delete permission (it is exposed on member URLs).
async function verifyMarkerEditAccess(
  markerId: string,
  sessionId: string,
  editToken: string,
): Promise<
  | { ok: true }
  | { ok: false; status: number; error: string }
> {
  const { data: marker, error: markerError } = await supabaseServer
    .from("feedback_markers")
    .select("id, session_id")
    .eq("id", markerId)
    .maybeSingle();

  if (markerError) {
    return {
      ok: false,
      status: 500,
      error: markerError.message ?? "Failed to fetch marker.",
    };
  }

  if (!marker) {
    return { ok: false, status: 404, error: "Marker not found." };
  }

  if (marker.session_id !== sessionId) {
    return { ok: false, status: 403, error: "Session does not match marker." };
  }

  const { data: session, error: sessionError } = await supabaseServer
    .from("feedback_sessions")
    .select("id, edit_token")
    .eq("id", sessionId)
    .maybeSingle();

  if (sessionError) {
    return {
      ok: false,
      status: 500,
      error: sessionError.message ?? "Failed to fetch session.",
    };
  }

  if (!session) {
    return { ok: false, status: 404, error: "Session not found." };
  }

  if (session.edit_token !== editToken) {
    return { ok: false, status: 403, error: "Invalid edit token." };
  }

  return { ok: true };
}

export async function PATCH(request: Request, context: RouteContext) {
  const { markerId } = await context.params;

  if (!markerId) {
    return NextResponse.json({ error: "markerId is required." }, { status: 400 });
  }

  try {
    const body = (await request.json()) as PatchMarkerBody;

    if (!isNonEmptyString(body.session_id) || !isNonEmptyString(body.edit_token)) {
      return NextResponse.json(
        { error: "session_id and edit_token are required." },
        { status: 400 },
      );
    }

    if (
      !isNonEmptyString(body.selected_area) ||
      !isNonEmptyString(body.arrow_position) ||
      !isNonEmptyString(body.arrow_direction) ||
      !isNonEmptyString(body.popup_text) ||
      !isNonEmptyString(body.detail_text) ||
      !isNonEmptyString(body.cue_text)
    ) {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    const auth = await verifyMarkerEditAccess(
      markerId,
      body.session_id,
      body.edit_token,
    );
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { data: marker, error: updateError } = await supabaseServer
      .from("feedback_markers")
      .update({
        selected_area: body.selected_area.trim(),
        arrow_position: body.arrow_position.trim(),
        arrow_direction: body.arrow_direction.trim(),
        popup_text: body.popup_text.trim(),
        detail_text: body.detail_text.trim(),
        cue_text: body.cue_text.trim(),
      })
      .eq("id", markerId)
      .select("*")
      .single();

    if (updateError || !marker) {
      return NextResponse.json(
        { error: updateError?.message ?? "Failed to update marker." },
        { status: 500 },
      );
    }

    return NextResponse.json({ marker });
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const { markerId } = await context.params;

  if (!markerId) {
    return NextResponse.json({ error: "markerId is required." }, { status: 400 });
  }

  try {
    const body = (await request.json()) as EditAuthBody;

    if (!isNonEmptyString(body.session_id) || !isNonEmptyString(body.edit_token)) {
      return NextResponse.json(
        { error: "session_id and edit_token are required." },
        { status: 400 },
      );
    }

    const auth = await verifyMarkerEditAccess(
      markerId,
      body.session_id,
      body.edit_token,
    );
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { error: deleteError } = await supabaseServer
      .from("feedback_markers")
      .delete()
      .eq("id", markerId);

    if (deleteError) {
      return NextResponse.json(
        { error: deleteError.message ?? "Failed to delete marker." },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
}
