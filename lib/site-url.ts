/** Canonical site origin for metadata / OG (Vercel-safe). */
export function getSiteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fromEnv) {
    try {
      const withProtocol = fromEnv.startsWith("http") ? fromEnv : `https://${fromEnv}`;
      return new URL(withProtocol).origin;
    } catch {
      /* fall through */
    }
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return "http://localhost:3000";
}
