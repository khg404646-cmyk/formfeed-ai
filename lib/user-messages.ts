import type { ExerciseType } from "../types/formfeed";

const EXERCISE_TYPES: ExerciseType[] = [
  "auto",
  "squat",
  "deadlift",
  "bench_press",
  "lunge",
  "shoulder_press",
  "other",
];

export function isExerciseType(value: string): value is ExerciseType {
  return (EXERCISE_TYPES as readonly string[]).includes(value);
}

/** 사용자-facing 한국어 안내 문구 */
export const USER_MESSAGES = {
  uploadFailed:
    "영상 업로드에 실패했습니다. 네트워크를 확인한 뒤 다시 시도해 주세요.",
  fileSizeExceeded:
    "파일 용량은 300MB를 넘을 수 없습니다. 더 짧거나 용량이 작은 영상으로 다시 시도해 주세요.",
  sessionCreateFailed:
    "피드백 세션을 만들지 못했습니다. 잠시 후 다시 시도해 주세요.",
  sessionCreateDbSetup:
    "데이터베이스 테이블이 없습니다. Supabase 대시보드 → SQL Editor에서 프로젝트 폴더의 supabase/schema.sql 전체를 실행한 뒤 다시 시도해 주세요.",
  exerciseRequired: "운동 종목을 선택하거나 자동 감지를 선택해 주세요.",
  fileRequired: "영상 파일을 선택해 주세요.",
  processingUpload: "영상을 업로드하는 중...",
  processingSession: "피드백 세션을 만드는 중...",

  editPermissionMissing:
    "편집 권한을 찾을 수 없습니다. 처음 만든 브라우저에서 다시 열거나 편집 링크로 접속해 주세요.",
  editTokenLostHint:
    "편집 링크(edit_token)가 없습니다. 처음 받은 편집 링크 전체를 복사해 다시 열어 주세요.",
  editPermissionAction: "편집 권한이 없어 이 작업을 할 수 없습니다.",
  markerSaveFailed:
    "마커 저장에 실패했습니다. 입력 내용을 확인한 뒤 다시 시도해 주세요.",
  aiDraftSaveAllInProgress: "AI 초안을 모두 저장하는 중...",
  aiDraftSaveAllFailed:
    "일부 초안을 저장하지 못했습니다. 실패한 항목을 확인한 뒤 다시 시도해 주세요.",
  aiDraftSaveAllSuccess: "AI 초안을 모두 저장했습니다.",
  markerUpdateFailed:
    "마커 수정에 실패했습니다. 잠시 후 다시 시도해 주세요.",
  markerDeleteFailed:
    "마커 삭제에 실패했습니다. 잠시 후 다시 시도해 주세요.",
  sessionLoadFailed:
    "편집 화면을 불러오지 못했습니다. 링크를 확인한 뒤 다시 시도해 주세요.",
  editorLoading: "편집 화면을 불러오는 중...",

  shareLinkInvalid:
    "공유 링크가 올바르지 않습니다. 트레이너에게 받은 링크를 다시 확인해 주세요.",
  shareNotFound:
    "피드백을 찾을 수 없습니다. 링크가 만료되었거나 잘못되었을 수 있습니다.",
  shareLoadFailed:
    "피드백을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
  shareLoading: "피드백을 불러오는 중...",

  videoLoadFailed:
    "영상을 불러오지 못했습니다. 링크가 잘못되었거나 영상이 삭제되었을 수 있습니다.",
  frameCaptureFailed:
    "프레임 캡처에 실패했습니다. R2 CORS 설정을 확인해 주세요.",
  frameCaptureNotReady:
    "영상이 준비되기 전에는 프레임을 캡처할 수 없습니다. 잠시 후 다시 시도해 주세요.",

  aiDraftFailed:
    "AI 초안 생성에 실패했습니다. 직접 작성하거나 다시 시도해 주세요.",
  aiModelNotFound:
    "AI 모델을 찾을 수 없습니다. .env.local의 ANTHROPIC_MODEL을 claude-sonnet-4-6 등 최신 Vision 모델로 바꿔 주세요.",
  aiApiKeyMissing:
    "AI API 키가 설정되지 않았습니다. .env.local에 ANTHROPIC_API_KEY를 추가해 주세요.",
  aiImageTooLarge:
    "캡처 이미지가 너무 큽니다. 영상을 다시 선택하거나 짧은 구간에서 다시 시도해 주세요.",
  aiGenerating: "AI 초안 작성 중...",
  aiAnalyzingPose: "자세 분석 중...",
  aiInferringMovement: "동작·장비 인식 중...",

  geminiApiKeyMissing: "Gemini API Key가 누락되었습니다",
  geminiVideoFetchFailed:
    "영상을 불러오지 못했습니다. R2 URL이 공개되어 있는지 확인해 주세요.",
  geminiVideoTooLarge: "분석 가능한 영상 크기(100MB)를 초과했습니다.",
  geminiModelNotFound:
    "Gemini 모델을 찾을 수 없습니다. .env.local의 GEMINI_MODEL을 gemini-2.5-flash로 설정해 주세요.",
  geminiAnalysisFailed:
    "영상 전체 분석에 실패했습니다. 잠시 후 다시 시도해 주세요.",
  geminiQuotaExceeded:
    "Gemini API 사용 한도에 도달했습니다. Google AI Studio에서 할당량을 확인하거나 잠시 후 다시 시도해 주세요.",
  geminiTimeout:
    "영상 분석 시간이 초과되었습니다. Vercel Functions 시간 제한(Fluid Compute)을 켜거나 더 짧은 영상으로 다시 시도해 주세요.",
  geminiAnalyzingVideo: "영상 전체를 분석하는 중...",
} as const;

/** Maps Anthropic/API errors to user-facing AI draft messages. */
export function mapAiDraftError(apiError?: string, status?: number): string {
  if (!apiError) return USER_MESSAGES.aiDraftFailed;
  const lower = apiError.toLowerCase();
  if (status === 404 || lower.includes("not_found") || lower.includes("model:")) {
    return USER_MESSAGES.aiModelNotFound;
  }
  if (lower.includes("could not process image")) {
    return USER_MESSAGES.aiImageTooLarge;
  }
  if (lower.includes("api key") || lower.includes("authentication")) {
    return USER_MESSAGES.aiApiKeyMissing;
  }
  return USER_MESSAGES.aiDraftFailed;
}

/** Maps Supabase/API errors to user-facing session-create messages. */
export function mapSessionCreateError(apiError?: string): string {
  if (!apiError) return USER_MESSAGES.sessionCreateFailed;
  const lower = apiError.toLowerCase();
  if (
    lower.includes("does not exist") ||
    lower.includes("relation") ||
    lower.includes("feedback_sessions") ||
    lower.includes("schema cache")
  ) {
    return USER_MESSAGES.sessionCreateDbSetup;
  }
  return USER_MESSAGES.sessionCreateFailed;
}

export function mapGeminiVideoError(message?: string): string {
  if (!message) return USER_MESSAGES.geminiAnalysisFailed;
  const lower = message.toLowerCase();
  if (lower.includes("gemini_api_key") || lower.includes("api key")) {
    return USER_MESSAGES.geminiApiKeyMissing;
  }
  if (
    lower.includes("quota") ||
    lower.includes("rate limit") ||
    lower.includes("resource exhausted") ||
    lower.includes("429") ||
    lower.includes("too many requests")
  ) {
    return USER_MESSAGES.geminiQuotaExceeded;
  }
  if (
    lower.includes("timeout") ||
    lower.includes("timed out") ||
    lower.includes("deadline") ||
    lower.includes("function_invocation") ||
    lower.includes("aborted") ||
    lower.includes("504")
  ) {
    return USER_MESSAGES.geminiTimeout;
  }
  if (lower.includes("maximum size") || lower.includes("too large")) {
    return USER_MESSAGES.geminiVideoTooLarge;
  }
  if (
    lower.includes("fetch failed") ||
    lower.includes("video fetch") ||
    lower.includes("http 403") ||
    lower.includes("http 404")
  ) {
    return USER_MESSAGES.geminiVideoFetchFailed;
  }
  if (
    lower.includes("not found") &&
    (lower.includes("models/") || lower.includes("model"))
  ) {
    return USER_MESSAGES.geminiModelNotFound;
  }
  return USER_MESSAGES.geminiAnalysisFailed;
}
