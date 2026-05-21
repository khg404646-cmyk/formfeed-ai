import type { Metadata } from "next";
import { getExerciseLabel } from "../../../lib/exercise-labels";
import {
  OG_DESCRIPTION,
  OG_IMAGE_ALT,
  OG_IMAGE_PATH,
  OG_TITLE,
} from "../../../lib/site-metadata";
import { getSiteUrl } from "../../../lib/site-url";
import type { SharePageResponse } from "../../../types/formfeed";
import SharePageClient from "./SharePageClient";

type PageProps = {
  params: Promise<{ token: string }>;
};

function buildShareMetadata(title: string): Metadata {
  return {
    title,
    description: OG_DESCRIPTION,
    openGraph: {
      title: OG_TITLE,
      description: OG_DESCRIPTION,
      type: "website",
      locale: "ko_KR",
      siteName: "FormFeed AI",
      images: [
        {
          url: OG_IMAGE_PATH,
          width: 1200,
          height: 630,
          alt: OG_IMAGE_ALT,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: OG_TITLE,
      description: OG_DESCRIPTION,
      images: [OG_IMAGE_PATH],
    },
  };
}

async function fetchExerciseTypeByShareToken(
  token: string,
): Promise<string | null> {
  try {
    const baseUrl = getSiteUrl();
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
    return buildShareMetadata(OG_TITLE);
  }

  const exerciseType = await fetchExerciseTypeByShareToken(token);
  if (!exerciseType) {
    return buildShareMetadata(OG_TITLE);
  }

  const title = `${getExerciseLabel(exerciseType)} 맞춤 운동 피드백일지 | FormFeed AI`;
  return buildShareMetadata(title);
}

export default async function SharePage({ params }: PageProps) {
  const { token } = await params;
  return <SharePageClient token={token} />;
}
