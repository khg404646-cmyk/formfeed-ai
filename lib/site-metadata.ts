import type { Metadata } from "next";

export const OG_TITLE = "FormFeed AI | 스포츠 과학 기반 스마트 운동일지";
export const OG_DESCRIPTION =
  "트레이너가 분석한 나만의 맞춤 피드백과 당일 운동 미션을 모바일 처방전으로 확인하세요.";

export const OG_IMAGE_PATH = "/images/og-thumbnail.png";
export const OG_IMAGE_ALT = "FormFeed AI 스포츠 과학 기반 스마트 운동일지";

export const SHARE_MEMBER_HEADLINE =
  "오늘도 득근! 담당 트레이너가 정밀 분석한 맞춤형 운동 피드백일지입니다.";

export function buildDefaultMetadata(): Metadata {
  return {
    title: OG_TITLE,
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
