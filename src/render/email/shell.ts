/**
 * Email document shell: head (site web fonts, mobile `<style>`), hidden
 * preheader, and the centered 600px frame (with an Outlook fixed-width
 * wrapper) the body sits in.
 */

import { escapeHTML } from "../../utils/staticHtml";
import { EMAIL_STACK_BREAKPOINT, EMAIL_WIDTH } from "./profile";

/** Marks the preheader so `htmlToText` can skip it. */
export const PREHEADER_ATTR = "data-ph-preheader";

/**
 * Class names the email pipeline adds itself. Display toggles are resolved per
 * element from `hidden` / `block` and their responsive variants: `ph-d-*` is the
 * desktop display (inlined), `ph-m-*` the phone display (media query).
 */
export const EMAIL_CLASS = {
  col: "ph-col",
  desktopNone: "ph-d-none",
  desktopBlock: "ph-d-block",
  mobileNone: "ph-m-none",
  mobileBlock: "ph-m-block",
} as const;

/** Inlined with the compiled CSS. */
export const EMAIL_INLINE_CSS = `.${EMAIL_CLASS.desktopNone}{display:none;mso-hide:all}.${EMAIL_CLASS.desktopBlock}{display:block}`;

/** Kept in `<style>`: stack columns and apply phone-only display toggles. */
export const EMAIL_MEDIA_CSS =
  `@media (max-width:${EMAIL_STACK_BREAKPOINT}px){` +
  `.${EMAIL_CLASS.col}{display:block!important;width:100%!important;padding-left:0!important;padding-right:0!important}` +
  `.${EMAIL_CLASS.mobileNone}{display:none!important}` +
  `.${EMAIL_CLASS.mobileBlock}{display:block!important}` +
  `}`;

const TABLE_ATTRS = `role="presentation" cellpadding="0" cellspacing="0" border="0"`;

/** `<table role="presentation" …>` opening tag with extra attributes. */
export function presentationTable(extra = ""): string {
  return `<table ${TABLE_ATTRS}${extra ? ` ${extra}` : ""}>`;
}

/**
 * The body frame: a full-width table carrying the ROOT classes (background),
 * an Outlook-only fixed-width table, and a centered max-600px table holding the
 * rendered content.
 */
export function emailFrame(rootClass: string, inner: string): string {
  const cls = rootClass ? ` class="${escapeHTML(rootClass)}"` : "";
  return (
    `${presentationTable(`width="100%"`)}<tr><td align="center"${cls}>` +
    `<!--[if mso]>${presentationTable(`width="${EMAIL_WIDTH}" align="center"`)}<tr><td><![endif]-->` +
    `${presentationTable(`width="100%" style="max-width:${EMAIL_WIDTH}px;margin:0 auto"`)}<tr><td>` +
    inner +
    `</td></tr></table>` +
    `<!--[if mso]></td></tr></table><![endif]-->` +
    `</td></tr></table>`
  );
}

/**
 * Outlook for Windows ignores the rest of a `font-family` stack when the first
 * font isn't installed and falls back to Times New Roman, so with a web font in
 * play it's pinned to a web-safe face. Other clients use the inlined stack:
 * the web font where `<link>` fonts load (Apple Mail, iOS Mail), else its
 * generic fallback.
 */
export const EMAIL_MSO_FONT_CSS =
  "body,table,td,p,a,span,h1,h2,h3,h4,h5,h6{font-family:Arial,Helvetica,sans-serif!important}";

export interface EmailShellOptions {
  body: string;
  title?: string;
  lang?: string;
  preheader?: string;
  /** Web-font stylesheet URLs (Google Fonts) for the site's fonts. */
  fontUrls?: string[];
}

function fontHead(fontUrls: string[]): string {
  if (!fontUrls.length) return "";
  const links = fontUrls.map(url => `<link rel="stylesheet" href="${escapeHTML(url)}">`).join("\n");
  return `${links}\n<!--[if mso]><style>${EMAIL_MSO_FONT_CSS}</style><![endif]-->\n`;
}

export function emailShell({
  body,
  title = "",
  lang = "en",
  preheader,
  fontUrls = [],
}: EmailShellOptions): string {
  const pre = preheader
    ? `<div ${PREHEADER_ATTR} style="display:none;max-height:0;overflow:hidden;mso-hide:all">${escapeHTML(preheader)}</div>`
    : "";
  return `<!DOCTYPE html>
<html lang="${escapeHTML(lang)}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${escapeHTML(title)}</title>
${fontHead(fontUrls)}<style>${EMAIL_MEDIA_CSS}</style>
</head>
<body style="margin:0;padding:0">
${pre}${body}
</body>
</html>`;
}
