/** Integration / output destinations shown on marketing surfaces (Logo.dev domains). */
export type MarketingIntegration = {
  label: string;
  domain: string;
  /** Soft tint behind the pill — kept light so brand logos still pop. */
  tint: string;
  /** Solid accent for ring / dot / underline accents. */
  accent: string;
};

export const MARKETING_INTEGRATIONS: MarketingIntegration[] = [
  { label: "Reddit", domain: "reddit.com", tint: "#FFE6DA", accent: "#FF4500" },
  { label: "Instagram", domain: "instagram.com", tint: "#FFE2EC", accent: "#E1306C" },
  { label: "Google", domain: "google.com", tint: "#E6F0FF", accent: "#1A73E8" },
  { label: "Apify", domain: "apify.com", tint: "#E8F2EA", accent: "#22C55E" },
  { label: "TikTok", domain: "tiktok.com", tint: "#E8FFFB", accent: "#25F4EE" },
  { label: "LinkedIn", domain: "linkedin.com", tint: "#E2F0FB", accent: "#0A66C2" },
  { label: "X", domain: "x.com", tint: "#EDEDED", accent: "#0F0F0F" },
  { label: "YouTube Shorts", domain: "youtube.com", tint: "#FFE2E2", accent: "#FF0000" },
  { label: "Image prompts", domain: "leonardo.ai", tint: "#F1E8FF", accent: "#8A5BFF" },
  { label: "Carousel", domain: "canva.com", tint: "#E0F1FF", accent: "#00C4CC" },
  { label: "Script", domain: "openai.com", tint: "#E6F4EE", accent: "#10A37F" },
  { label: "Schedule", domain: "buffer.com", tint: "#E2ECFF", accent: "#2C4BFF" },
];
