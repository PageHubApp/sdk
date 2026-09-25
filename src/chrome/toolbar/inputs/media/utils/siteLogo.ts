import { getCdnUrl } from "@/utils/cdn";
import { replaceVariables } from "@/utils/design/variables";

/**
 * Image `src` tokens that link an Image to the site-wide logo in
 * `ROOT.props.company` (docs/features/site-logo.md). `logoDark` is the logo
 * for dark backgrounds; the resolver falls back to `logo` when it's unset.
 */
export const SITE_LOGO_TOKENS = {
  light: "{{company.logo}}",
  dark: "{{company.logoDark}}",
} as const;

export type SiteLogoVariant = keyof typeof SITE_LOGO_TOKENS;

export function siteLogoVariantOf(src: string): SiteLogoVariant | null {
  if (src === SITE_LOGO_TOKENS.light) return "light";
  if (src === SITE_LOGO_TOKENS.dark) return "dark";
  return null;
}

/**
 * Preview URL for an Image source that may hold `{{...}}` tokens: resolved
 * against ROOT props, then a bare mediaId goes through the CDN like the
 * Image's own `type: "cdn"` branch. Null when nothing resolves.
 */
export function previewUrlForSrc(src: string, rootProps: Record<string, any>): string | null {
  const resolved = src.includes("{{") ? replaceVariables(src, rootProps).trim() : src.trim();
  if (!resolved || resolved.includes("{{")) return null;
  if (/^(https?:|\/|data:)/.test(resolved)) return resolved;
  return getCdnUrl(resolved, { width: 600, format: "auto" });
}
