import type { Metadata } from "next";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  title: "FormFeed AI",
  description: "운동영상에 AI 피드백을 얹어 공유하는 도구",
  metadataBase: new URL(siteUrl),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className="h-full antialiased"
      suppressHydrationWarning
    >
      <body className="min-h-full" suppressHydrationWarning>
        <div className="app-container">{children}</div>
      </body>
    </html>
  );
}
