/** Brand logos via Logo.dev (https://www.logo.dev). Use publishable key only — never ship secrets to the client. */
export function logoDevImgUrl(domain: string): string | null {
  const raw =
    (import.meta.env.NEXT_PUBLIC_LOGO_DEV_KEY as string | undefined)?.trim() ||
    (import.meta.env.VITE_LOGO_DEV_KEY as string | undefined)?.trim();
  if (!raw) return null;
  const host = domain
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/.*$/, "")
    .replace(/^www\./i, "");
  if (!host) return null;
  // Logo.dev expects a clean hostname in the path (see https://www.logo.dev/docs)
  return `https://img.logo.dev/${host}?token=${encodeURIComponent(raw)}`;
}

/** Map free-text platform labels from campaign JSON to Logo.dev domains. */
export function platformLabelToLogoDomain(label: string): string | null {
  const s = label.toLowerCase().trim();
  if (/\btiktok\b/.test(s)) return "tiktok.com";
  if (/\binstagram\b|\big\b|\breels\b/.test(s)) return "instagram.com";
  if (/\blinkedin\b/.test(s)) return "linkedin.com";
  if (/\bthreads\b/.test(s)) return "threads.net";
  if (/\btwitter\b|\bx\b/.test(s)) return "x.com";
  if (/\byoutube\b|\bshorts\b/.test(s)) return "youtube.com";
  if (/\bfacebook\b/.test(s)) return "facebook.com";
  return null;
}
