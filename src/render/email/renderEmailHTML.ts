/**
 * renderEmailHTML — a PageHub node tree → an email-safe `{ html, text }`.
 *
 * validate → emit tables through `renderToHTML` with `EMAIL_RESOLVER` →
 * compile + lower CSS → wrap in the email shell → inline with juice.
 * Server-only. See docs/sdk/email-export.md.
 */

import juice from "juice";
import lz from "lzutf8";
import type { ResolvedComponentDef } from "../../define/types";
import { generateDesignSystemCSSVariables } from "../../utils/design/designSystemVars";
import { resolveTheme } from "../../utils/design/resolveTheme";
import { PageHubError } from "../../utils/errors";
import { renderToHTML } from "../static/renderToHTML";
import type { SerializedNodes } from "../static/types";
import { buildEmailCss, type ResolvedGap } from "./emailCss";
import { EMAIL_RESOLVER, GAP_ATTR } from "./emitters";
import { EMAIL_RESPONSIVE_PREFIX_RE, stripEmailPrefix } from "./profile";
import { EMAIL_CLASS, emailShell } from "./shell";
import { htmlToText } from "./text";
import { validateEmailTree, type EmailIssue } from "./validate";

export interface RenderEmailOptions {
  /** Serialized nodes: object, JSON string, or lz-base64 (same detection as compileTailwindCSS). */
  content: string | SerializedNodes;
  /** Merged into ROOT.props.variables as { key, value } entries. */
  variables?: Record<string, string>;
  /** Host email components (toHTML-bearing defs), e.g. the app's EmailSlotDef. */
  components?: ResolvedComponentDef[];
  preheader?: string;
  title?: string;
  lang?: string;
}

export interface RenderEmailResult {
  html: string;
  text: string;
  warnings: EmailIssue[];
}

/** Parse content into a fresh node map the render can mutate. */
function parseContent(content: string | SerializedNodes): SerializedNodes {
  if (typeof content !== "string") return JSON.parse(JSON.stringify(content));
  const trimmed = content.trimStart();
  const json = trimmed.startsWith("{") ? trimmed : lz.decompress(lz.decodeBase64(content));
  return JSON.parse(json);
}

/**
 * Resolve `hidden` / `block` and their responsive variants per element. The
 * email is laid out desktop-first: a prefixed value is the desktop display
 * (inlined), the unprefixed value applies on phones (media query).
 */
function applyDisplayClasses(html: string): string {
  return html.replace(/ class="([^"]*)"/g, (whole, value: string) => {
    const tokens = value.split(/\s+/).filter(Boolean);
    let base: string | undefined;
    let desktop: string | undefined;
    const rest: string[] = [];
    for (const t of tokens) {
      const bare = stripEmailPrefix(t);
      if (bare !== "hidden" && bare !== "block") {
        rest.push(t);
        continue;
      }
      const display = bare === "hidden" ? "none" : "block";
      if (EMAIL_RESPONSIVE_PREFIX_RE.test(t)) desktop = display;
      else base = display;
    }
    if (!base && !desktop) return whole;
    const onDesktop = desktop ?? base;
    const onPhone = base ?? "block";
    if (onDesktop === "none") rest.push(EMAIL_CLASS.desktopNone);
    else if (onDesktop === "block") rest.push(EMAIL_CLASS.desktopBlock);
    if (onPhone !== onDesktop) {
      rest.push(onPhone === "none" ? EMAIL_CLASS.mobileNone : EMAIL_CLASS.mobileBlock);
    }
    return ` class="${rest.join(" ")}"`;
  });
}

/** Merge the resolved gaps of a cell's gap tokens (later tokens override). */
function resolveGap(tokens: string, gaps: Map<string, ResolvedGap>): ResolvedGap {
  const out: ResolvedGap = {};
  for (const t of tokens.split(" ")) Object.assign(out, gaps.get(t) ?? {});
  return out;
}

/** Turn the emitters' gap markers into inline cell padding. */
function applyGaps(html: string, gaps: Map<string, ResolvedGap>): string {
  const attrRe = (name: string) => new RegExp(` ${name}="([^"]*)"`);
  return html.replace(/<td\b([^>]*)>/g, (whole, attrs: string) => {
    if (!attrs.includes("data-ph-gap-")) return whole;
    const x = attrRe(GAP_ATTR.x).exec(attrs);
    const top = attrRe(GAP_ATTR.top).exec(attrs);
    const styles: string[] = [];
    const colGap = x ? resolveGap(x[1], gaps).x : undefined;
    if (colGap) styles.push(`padding-left:${colGap / 2}px;padding-right:${colGap / 2}px`);
    const rowGap = top ? resolveGap(top[1], gaps).y : undefined;
    if (rowGap) styles.push(`padding-top:${rowGap}px`);
    const rest = attrs.replace(attrRe(GAP_ATTR.x), "").replace(attrRe(GAP_ATTR.top), "");
    return `<td${rest}${styles.length ? ` style="${styles.join(";")}"` : ""}>`;
  });
}

export async function renderEmailHTML(opts: RenderEmailOptions): Promise<RenderEmailResult> {
  const nodes = parseContent(opts.content);
  if (!nodes?.ROOT) {
    throw new PageHubError({
      code: "EMAIL_RENDER_INVALID",
      message: "[renderEmailHTML] The email has no ROOT node.",
      hint: "Pass the serialized node map the editor saved.",
    });
  }
  nodes.ROOT.props = {
    ...nodes.ROOT.props,
    variables: Object.entries(opts.variables ?? {}).map(([key, value]) => ({ key, value })),
  };

  const issues = validateEmailTree(nodes, {
    extraComponents: opts.components?.map(d => d.name),
  });
  const errors = issues.filter(i => i.severity === "error");
  if (errors.length) {
    throw new PageHubError({
      code: "EMAIL_RENDER_INVALID",
      message: `[renderEmailHTML] ${errors.length} problem(s) stop this email from rendering: ${errors
        .map(e => `${e.nodeId}: ${e.message}`)
        .join("; ")}`,
      hint: "Run validateEmailTree() in the editor and fix each error before sending.",
    });
  }

  const result = renderToHTML(JSON.stringify(nodes), {
    compressed: false,
    view: "desktop",
    document: false,
    runtime: false,
    components: opts.components ?? [],
    resolver: EMAIL_RESOLVER,
  });

  // The same theme vars live pages get (fonts, spacing density, derived
  // `*-content` colors) — `result.themeCSS` carries only the palette.
  const themeVars = generateDesignSystemCSSVariables(resolveTheme(nodes.ROOT.props || {}));
  const { css, gaps } = await buildEmailCss(result.classes, themeVars);
  const body = applyGaps(applyDisplayClasses(result.html), gaps);
  const doc = emailShell({
    body,
    title: opts.title,
    lang: opts.lang,
    preheader: opts.preheader,
  });

  const html = juice(doc, {
    extraCss: css,
    preserveMediaQueries: true,
    applyWidthAttributes: true,
    applyHeightAttributes: true,
    applyAttributesTableElements: true,
    removeStyleTags: false,
    preserveImportant: true,
  });

  return { html, text: htmlToText(html), warnings: issues };
}
