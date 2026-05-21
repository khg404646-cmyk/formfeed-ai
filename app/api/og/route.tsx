import { ImageResponse } from "next/og";

export const runtime = "edge";

// Beta: external Google Fonts URL. Long-term, host font files under /public/fonts
// (e.g. NotoSansKR-Regular.woff) and load via fetch(origin + '/fonts/...') for stability.
const NOTO_SANS_KR_WOFF_URL =
  "https://fonts.gstatic.com/s/notosanskr/v36/PbyxFmXiEBPT4ITbgNA5Cgm20xz64px_1hVWr0wuPNGmlQNMEfD4.0.woff";

type OgText = {
  title: string;
  subtitle: string;
  caption: string;
};

const KO_TEXT: OgText = {
  title: "폼피드 AI",
  subtitle: "운동영상 자세 피드백이 도착했습니다",
  caption: "AI 초안 + 트레이너 확인 피드백",
};

const EN_TEXT: OgText = {
  title: "FormFeed AI",
  subtitle: "Workout Video Feedback",
  caption: "AI Draft + Trainer Review",
};

async function loadNotoSansKr(): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch(NOTO_SANS_KR_WOFF_URL);
    if (!res.ok) return null;
    return await res.arrayBuffer();
  } catch {
    return null;
  }
}

function OgImage({ text, fontFamily }: { text: OgText; fontFamily: string }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "flex-start",
        width: "100%",
        height: "100%",
        backgroundColor: "#111827",
        color: "#ffffff",
        padding: "80px",
        fontFamily,
      }}
    >
      <div
        style={{
          display: "flex",
          fontSize: 72,
          fontWeight: 700,
          letterSpacing: "-0.02em",
          lineHeight: 1.1,
        }}
      >
        {text.title}
      </div>
      <div
        style={{
          display: "flex",
          marginTop: 28,
          fontSize: 40,
          fontWeight: 600,
          color: "#e5e7eb",
          lineHeight: 1.3,
        }}
      >
        {text.subtitle}
      </div>
      <div
        style={{
          display: "flex",
          marginTop: 20,
          fontSize: 28,
          fontWeight: 400,
          color: "#9ca3af",
          lineHeight: 1.4,
        }}
      >
        {text.caption}
      </div>
    </div>
  );
}

function buildImageResponse(text: OgText, fontData: ArrayBuffer | null) {
  const useKorean = fontData !== null;
  const fontFamily = useKorean ? "NotoSansKR" : "sans-serif";

  return new ImageResponse(<OgImage text={text} fontFamily={fontFamily} />, {
    width: 1200,
    height: 630,
    fonts: fontData
      ? [
          {
            name: "NotoSansKR",
            data: fontData,
            style: "normal",
            weight: 400,
          },
        ]
      : [],
  });
}

export async function GET() {
  try {
    const fontData = await loadNotoSansKr();
    const text = fontData ? KO_TEXT : EN_TEXT;
    return buildImageResponse(text, fontData);
  } catch {
    try {
      return buildImageResponse(EN_TEXT, null);
    } catch {
      return new ImageResponse(
        (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              width: "100%",
              height: "100%",
              backgroundColor: "#111827",
              color: "#ffffff",
              padding: "80px",
              fontFamily: "sans-serif",
            }}
          >
            <div style={{ display: "flex", fontSize: 72, fontWeight: 700 }}>
              FormFeed AI
            </div>
          </div>
        ),
        { width: 1200, height: 630 },
      );
    }
  }
}
