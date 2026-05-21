import type { Metadata } from "next";
import { getSiteUrl } from "../lib/site-url";
import "./globals.css";

const siteUrl = getSiteUrl();

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
