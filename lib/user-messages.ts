import type { ExerciseType } from "../types/formfeed";
import { MAX_VIDEO_DURATION_SEC, MAX_VIDEO_FILE_MB } from "./video-limits";

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

/** 길이·용량 초과 시 공통 안내 */
export const videoUploadLimitHint = `용량이 너무 커요. ${MAX_VIDEO_DURATION_SEC}초 이하, ${MAX_VIDEO_FILE_MB}MB 미만으로 업로드해 주세요.`;

/** 사용자-facing 한국어 안내 문구 */
export const USER_MESSAGES = {
  uploadFailed: "업로드에 실패했어요. 네트워크 확인 후 다시 시도해 주세요.",
  fileSizeExceeded: "용량이 너무 커요. 300MB 미만 파일만 올릴 수 있어요.",
  sessionCreateFailed: "세션을 만들지 못했어요. 잠시 후 다시 시도해 주세요.",
  sessionCreateDbSetup:
    "DB 테이블이 없어요. Supabase SQL Editor에서 supabase/schema.sql을 실행해 주세요.",
  exerciseRequired: "운동 종목을 선택해 주세요.",
  fileRequired: "영상 파일을 선택해 주세요.",
  processingUpload: "영상 업로드 중…",
  processingSession: "세션 준비 중…",

  editPermissionMissing:
    "편집 권한이 없어요. 처음 연 브라우저나 편집 링크로 다시 열어 주세요.",
  editTokenLostHint: "편집 링크가 없어요. 받은 링크 전체를 복사해 다시 열어 주세요.",
  editPermissionAction: "편집 권한이 없어 이 작업을 할 수 없어요.",
  markerSaveFailed: "저장에 실패했어요. 내용 확인 후 다시 시도해 주세요.",
  aiDraftSaveAllInProgress: "AI 초안 저장 중…",
  aiDraftSaveAllFailed: "일부 초안을 저장하지 못했어요. 다시 시도해 주세요.",
  aiDraftSaveAllSuccess: "AI 초안을 모두 저장했어요.",
  markerUpdateFailed: "수정에 실패했어요. 잠시 후 다시 시도해 주세요.",
  markerDeleteFailed: "삭제에 실패했어요. 잠시 후 다시 시도해 주세요.",
  sessionLoadFailed: "편집 화면을 불러오지 못했어요. 링크를 확인해 주세요.",
  editorLoading: "불러오는 중…",

  shareLinkInvalid: "공유 링크가 올바르지 않아요.",
  shareNotFound: "피드백을 찾을 수 없어요. 링크를 확인해 주세요.",
  shareLoadFailed: "불러오지 못했어요. 잠시 후 다시 시도해 주세요.",
  shareLoading: "불러오는 중…",

  videoLoadFailed: "영상을 불러오지 못했어요.",
  frameCaptureFailed: "프레임 캡처에 실패했어요.",
  frameCaptureNotReady: "영상 준비 후 다시 시도해 주세요.",

  aiDraftFailed: "AI 초안 생성에 실패했어요. 직접 작성하거나 다시 시도해 주세요.",
  aiModelNotFound:
    "AI 모델을 찾을 수 없어요. .env.local의 ANTHROPIC_MODEL을 확인해 주세요.",
  aiApiKeyMissing: "AI API 키가 없어요. .env.local에 ANTHROPIC_API_KEY를 넣어 주세요.",
  aiImageTooLarge: "이미지가 너무 커요. 짧은 구간에서 다시 시도해 주세요.",
  aiGenerating: "AI 초안 작성 중…",
  aiAnalyzingPose: "자세 분석 중…",
  aiInferringMovement: "동작 인식 중…",

  geminiApiKeyMissing: "Gemini API 키가 없어요.",
  geminiVideoFetchFailed: "영상을 가져오지 못했어요.",
  geminiVideoTooLarge: videoUploadLimitHint,
  geminiVideoTooLargeForBeta: videoUploadLimitHint,
  geminiFileProcessingFailed:
    "영상 분석 준비에 실패했어요. 잠시 후 「AI 분석 다시 시도」를 눌러 주세요.",
  geminiEmptyAnalysis:
    "분석 결과가 없어요. 영상 확인 후 「AI 분석 다시 시도」를 눌러 주세요.",
  geminiNetworkInterrupted:
    "연결이 끊겼어요. Wi-Fi에서 「AI 분석 다시 시도」를 눌러 주세요.",
  geminiModelNotFound:
    "Gemini 모델을 찾을 수 없어요. GEMINI_MODEL을 gemini-2.5-flash로 설정해 주세요.",
  geminiAnalysisFailed: "분석에 실패했어요. 잠시 후 다시 시도해 주세요.",
  geminiQuotaExceeded: "AI 사용 한도에 도달했어요. 잠시 후 다시 시도해 주세요.",
  geminiTimeout: "분석 시간이 초과됐어요. 영상을 짧게 줄이거나 잠시 후 다시 시도해 주세요.",
  geminiAnalyzingVideo: "영상 분석 중…",
  geminiAnalyzingVideoTitle: "AI가 영상을 분석하고 있어요…",
  geminiAnalyzingVideoDetail: "보통 1~2분 걸려요. 파일이 크면 조금 더 걸릴 수 있어요.",
  geminiAnalyzingVideoHint: "새로고침하지 말고 이 화면을 유지해 주세요.",
  videoTooLong: `영상이 길어요. ${MAX_VIDEO_DURATION_SEC}초 이하로 잘라서 다시 올려 주세요.`,
  videoLimitExpansionNote: "길이·용량 제한은 추후 늘릴 예정이에요.",
  videoUploadRecommended: `${MAX_VIDEO_DURATION_SEC}초 이하 · ${MAX_VIDEO_FILE_MB}MB 미만 권장`,
  videoDurationProbeFailed: "영상 정보를 읽지 못했어요. mp4로 다시 선택해 주세요.",
  videoPlayTapHint: "검은 화면이면 영상을 한 번 터치해 보세요.",
  geminiRetryAnalysis: "AI 분석 다시 시도",
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
    lower.includes("504") ||
    lower.includes("timeouterror")
  ) {
    return USER_MESSAGES.geminiTimeout;
  }
  if (
    lower.includes("bulk analysis limit") ||
    lower.includes("exceeds bulk") ||
    lower.includes("maximum size") ||
    lower.includes("too large")
  ) {
    return USER_MESSAGES.geminiVideoTooLargeForBeta;
  }
  if (
    lower.includes("empty response") ||
    lower.includes("schema validation") ||
    lower.includes("invalid json")
  ) {
    return USER_MESSAGES.geminiEmptyAnalysis;
  }
  if (lower.includes("file processing")) {
    return USER_MESSAGES.geminiFileProcessingFailed;
  }
  if (lower.includes("30초") || lower.includes("30 sec")) {
    return USER_MESSAGES.videoTooLong;
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
