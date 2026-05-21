import type {
  FeedbackMarker,
  FeedbackSession,
  FeedbackSessionWithEditToken,
} from "../types/formfeed";

export function formatTimestamp(ms: number): string {
  const totalSeconds = Math.max(0, ms) / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const tenths = Math.floor((totalSeconds - Math.floor(totalSeconds)) * 10);

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
    2,
    "0",
  )}.${tenths}`;
}

const demoCreatedAt = new Date("2026-05-20T00:00:00.000Z").toISOString();

export const demoSession: FeedbackSession = {
  id: "demo-session",
  video_url: "",
  video_file_name: "squat-demo.mp4",
  exercise_type: "squat",
  trainer_display_name: null,
  trainer_center_name: null,
  share_token: "demo-token",
  created_at: demoCreatedAt,
  expires_at: null,
};

export const demoEditSession: FeedbackSessionWithEditToken = {
  ...demoSession,
  edit_token: "demo-edit-token",
};

export const demoMarkers: FeedbackMarker[] = [
  {
    id: "demo-marker-1",
    session_id: "demo-session",
    timestamp_ms: 3200,
    capture_url: null,
    selected_area: "무릎",
    arrow_position: "middle-right",
    arrow_direction: "left",
    popup_text: "무릎이 안쪽으로 들어와요",
    detail_text:
      "내려가는 구간에서 오른쪽 무릎이 발끝보다 안쪽으로 모이는 모습이 보여요.",
    cue_text:
      "발바닥 전체로 바닥을 누르고, 무릎이 발끝 방향을 따라가게 해보세요.",
    confidence: "medium",
    caution: "단일 장면 기준이므로 전체 반복 동작과 함께 확인하세요.",
    created_at: demoCreatedAt,
  },
  {
    id: "demo-marker-2",
    session_id: "demo-session",
    timestamp_ms: 7800,
    capture_url: null,
    selected_area: "상체",
    arrow_position: "top-center",
    arrow_direction: "down",
    popup_text: "상체가 먼저 들려요",
    detail_text: "올라오는 구간에서 상체가 먼저 들리는 모습이 있어요.",
    cue_text: "올라올 때 엉덩이와 가슴이 같이 올라온다고 생각해보세요.",
    confidence: "medium",
    caution: "트레이너가 전체 움직임을 보고 최종 확인하세요.",
    created_at: demoCreatedAt,
  },
];
