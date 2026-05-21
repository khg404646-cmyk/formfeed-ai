import type { Metadata } from "next";
import { getExerciseLabel } from "../../../lib/exercise-labels";
import type { SharePageResponse } from "../../../types/formfeed";
import SharePageClient from "./SharePageClient";

type PageProps = {
  params: Promise<{ token: string }>;
};

const DEFAULT_TITLE = "운동영상 자세 피드백이 도착했습니다 | 폼피드 AI";
const DEFAULT_DESCRIPTION =
  "트레이너가 보낸 운동 피드백 영상을 확인하세요.";

function buildShareMetadata(title: string): Metadata {
  return {
    title,
    description: DEFAULT_DESCRIPTION,
    openGraph: {
      title,
      description: DEFAULT_DESCRIPTION,
      type: "website",
      images: ["/api/og"],
    },
  };
}

async function fetchExerciseTypeByShareToken(
  token: string,
): Promise<string | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/share/${encodeURIComponent(token)}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as SharePageResponse;
    return data.session.exercise_type;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { token } = await params;

  if (!token) {
    return buildShareMetadata(DEFAULT_TITLE);
  }

  const exerciseType = await fetchExerciseTypeByShareToken(token);
  if (!exerciseType) {
    return buildShareMetadata(DEFAULT_TITLE);
  }

  const title = `${getExerciseLabel(exerciseType)} 자세 피드백이 도착했습니다 | 폼피드 AI`;
  return buildShareMetadata(title);
}

export default async function SharePage({ params }: PageProps) {
  const { token } = await params;
  return <SharePageClient token={token} />;
}
