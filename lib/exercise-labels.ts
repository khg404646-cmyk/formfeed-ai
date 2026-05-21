import type { ExerciseType } from "../types/formfeed";

export const exerciseTypeLabels: Record<ExerciseType, string> = {
  auto: "자동 감지 (권장)",
  squat: "스쿼트",
  deadlift: "데드리프트",
  bench_press: "벤치프레스",
  lunge: "런지",
  shoulder_press: "숄더프레스",
  other: "기타",
} as const;

function isExerciseType(value: string): value is ExerciseType {
  return value in exerciseTypeLabels;
}

export function getExerciseLabel(exerciseType: string): string {
  if (isExerciseType(exerciseType)) {
    if (exerciseType === "auto") return "운동";
    return exerciseTypeLabels[exerciseType];
  }
  return "운동";
}

/** Session hint for AI (empty when auto-detect). */
export function getTrainerHintExerciseType(exerciseType: string): string {
  if (exerciseType === "auto" || exerciseType === "other") return "";
  if (isExerciseType(exerciseType)) return exerciseTypeLabels[exerciseType];
  return exerciseType;
}
