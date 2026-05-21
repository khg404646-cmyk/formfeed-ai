import type { Metadata } from "next";
import { buildDefaultMetadata } from "../lib/site-metadata";
import { getSiteUrl } from "../lib/site-url";
import "./globals.css";

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  ...buildDefaultMetadata(),
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
