export type ExerciseType =
  | "auto"
  | "squat"
  | "deadlift"
  | "bench_press"
  | "lunge"
  | "shoulder_press"
  | "other";

export type ArrowPosition =
  | "top-left"
  | "top-center"
  | "top-right"
  | "middle-left"
  | "middle-center"
  | "middle-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

export type ArrowDirection = "up" | "down" | "left" | "right";

export type VideoPlayerMode = "edit" | "share";

export type AiConfidence = "high" | "medium" | "low";

export type FeedbackSession = {
  id: string;
  video_url: string;
  video_file_name: string | null;
  exercise_type: ExerciseType;
  trainer_display_name: string | null;
  trainer_center_name: string | null;
  share_token: string;
  created_at: string;
  expires_at: string | null;
};

export type FeedbackSessionWithEditToken = FeedbackSession & {
  edit_token: string;
};

/** Marker text/overlay fields shared by DB markers and Gemini bulk analysis. */
export type FeedbackMarkerContent = {
  timestamp_ms: number;
  selected_area: string;
  arrow_position: ArrowPosition;
  arrow_direction: ArrowDirection;
  popup_text: string;
  detail_text: string;
  cue_text: string;
};

export type FeedbackMarker = FeedbackMarkerContent & {
  id: string;
  session_id: string;
  capture_url: string | null;
  confidence: string | null;
  caution: string | null;
  created_at: string;
};

/**
 * Gemini 1.5 Flash bulk video analysis item (one moment in the video).
 * Persisted as {@link FeedbackMarker} after session create / bulk insert.
 */
export type GeminiAnalysisItem = FeedbackMarkerContent;

/** Full structured response from Gemini whole-video analysis. */
export interface GeminiBulkFeedbackResponse {
  analysis: GeminiAnalysisItem[];
}

/** Marker create payload (API POST) derived from Gemini or manual editor input. */
export type FeedbackMarkerCreateInput = FeedbackMarkerContent & {
  capture_url?: string | null;
  confidence?: string | null;
  caution?: string | null;
  ai_raw_response?: Record<string, unknown> | null;
};

/** Map a Gemini item to marker create input (session metadata added by API). */
export function geminiAnalysisItemToMarkerInput(
  item: GeminiAnalysisItem,
  extras?: Pick<
    FeedbackMarkerCreateInput,
    "capture_url" | "confidence" | "caution" | "ai_raw_response"
  >,
): FeedbackMarkerCreateInput {
  return {
    timestamp_ms: item.timestamp_ms,
    selected_area: item.selected_area,
    arrow_position: item.arrow_position,
    arrow_direction: item.arrow_direction,
    popup_text: item.popup_text,
    detail_text: item.detail_text,
    cue_text: item.cue_text,
    capture_url: extras?.capture_url ?? null,
    confidence: extras?.confidence ?? null,
    caution: extras?.caution ?? null,
    ai_raw_response: extras?.ai_raw_response ?? null,
  };
}

export type AiFeedbackResponse = {
  popup_text: string;
  detail_text: string;
  cue_text: string;
  confidence: AiConfidence;
  caution: string;
};

// Member-facing share API must never include edit_token.
export type SharePageResponse = {
  session: FeedbackSession;
  markers: FeedbackMarker[];
};

/** Editor API when edit_token query matches (includes edit_token once for link save). */
export type EditorSessionWithEditTokenResponse = {
  session: FeedbackSessionWithEditToken;
};

/** Editor API read-only session fetch (no edit_token in JSON). */
export type EditorSessionReadOnlyResponse = {
  session: FeedbackSession;
};

export type EditorSessionResponse =
  | EditorSessionWithEditTokenResponse
  | EditorSessionReadOnlyResponse;

export type CreateSessionResponse = {
  session_id: string;
  share_token: string;
  edit_token: string;
};

export type MarkersListResponse = {
  markers: FeedbackMarker[];
};

export type ApiErrorBody = {
  error: string;
};

export function isFeedbackSessionWithEditToken(
  session: FeedbackSession | FeedbackSessionWithEditToken,
): session is FeedbackSessionWithEditToken {
  return "edit_token" in session && typeof session.edit_token === "string";
}

/** Strip edit_token before storing session in client state (member-safe shape). */
export function toFeedbackSession(
  session: FeedbackSession | FeedbackSessionWithEditToken,
): FeedbackSession {
  return {
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
}

export type RecentLinkItem = {
  sessionId: string;
  shareToken: string;
  editToken: string;
  exerciseType: ExerciseType;
  createdAt: string;
  trainerDisplayName?: string;
  trainerCenterName?: string;
};
