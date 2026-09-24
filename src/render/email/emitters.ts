/**
 * Email emitters — table-based replacements for the built-in static emitters.
 *
 * Passed to `renderToHTML` as `resolver`, which overrides the defaults by name.
 * Text keeps the built-in emitter; host components render through their own
 * `toHTML`. Layout classes (`flex-row`, `grid-cols-N`, `gap-*`, `items-*`,
 * `justify-*`) become table structure here; everything else stays a `class`
 * the CSS step inlines.
 */

import { actionTarget, actionToHref, findLinkAction, migrateActions } from "../../utils/action";
import {
  collectClasses,
  escapeAttr,
  getCdnUrl,
  getInlineStyle,
  getPageIndex,
  interpolate,
  staticClasses,
  tag,
  type StaticRenderContext,
  type ToHTMLFn,
} from "../../utils/staticHtml";
import { getImageSrc } from "../../components/Image/imageProps";
import {
  EMAIL_RESPONSIVE_PREFIX_RE,
  EMAIL_WIDTH,
  hasUnsafeEmailClass,
  isEmailClassAllowed,
  isEmailLayoutToken,
  nodeClassTokens,
  readEmailLayout,
} from "./profile";
import { filterChromeChildren } from "../shared/chromeSuppression";
import { EMAIL_CLASS, emailFrame, presentationTable } from "./shell";

/** Attribute the CSS step replaces with the resolved gap as inline padding. */
export const GAP_ATTR = { x: "data-ph-gap-x", top: "data-ph-gap-top" } as const;

const TEXT_CLASS_RE =
  /^(text-|font-|leading-|tracking-|uppercase$|lowercase$|capitalize$|italic$|underline$|no-underline$)/;

/** Resolved `href` of a node's first link action, with variables interpolated. */
function linkHref(props: Record<string, any>, ctx: StaticRenderContext) {
  const link = findLinkAction(migrateActions(props));
  const raw = actionToHref(link, getPageIndex(ctx), ctx.currentPath);
  return { href: raw ? interpolate(raw, ctx) : "", target: actionTarget(link) };
}

function wrapLink(html: string, href: string, target?: string): string {
  if (!href) return html;
  return tag("a", { href, target: target || undefined, style: "text-decoration:none" }, html);
}

function gapAttr(side: keyof typeof GAP_ATTR, tokens: string[]): string {
  return tokens.length ? ` ${GAP_ATTR[side]}="${escapeAttr(tokens.join(" "))}"` : "";
}

/**
 * Cache a node emitter's output per render. The walker renders every child
 * before calling its parent's emitter, and the Container emitter renders each
 * child again to give it its own cell — without the cache, work doubles at
 * every nesting level.
 */
const renderMemo = new WeakMap<StaticRenderContext, Map<string, string>>();
function memoByNode(fn: ToHTMLFn): ToHTMLFn {
  return (props, childrenHTML, ctx) => {
    const id = ctx.renderingNodeId;
    if (!id) return fn(props, childrenHTML, ctx);
    let memo = renderMemo.get(ctx);
    if (!memo) renderMemo.set(ctx, (memo = new Map()));
    const hit = memo.get(id);
    if (hit !== undefined) return hit;
    const html = fn(props, childrenHTML, ctx);
    memo.set(id, html);
    return html;
  };
}

/** Render each child separately: each needs its own cell, and the walker's
 *  joined `childrenHTML` can't be split back apart. */
function renderEach(childIds: string[], ctx: StaticRenderContext): string[] {
  return childIds.map(id => ctx.renderChildren([id])).filter(Boolean);
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/**
 * Container → nested tables. Column layouts get one `ph-col` cell per child
 * (stacked on phones by the shell's media query); anything else stacks one row
 * per child. The Container's own non-layout classes go on the outer cell.
 */
const containerToEmail: ToHTMLFn = (props, _childrenHTML, ctx) => {
  if (props.type === "component" || props.type === "componentCanvas") return "";
  const node = ctx.renderingNodeId ? ctx.nodes[ctx.renderingNodeId] : null;
  const childIds: string[] = node
    ? [...(node.nodes || []), ...Object.values((node.linkedNodes || {}) as Record<string, string>)]
    : [];
  const rendered = renderEach(childIds, ctx);

  const tokens = staticClasses(props, ctx).split(/\s+/).filter(Boolean);
  const layout = readEmailLayout(tokens, rendered.length);
  const own = tokens.filter(t => !isEmailLayoutToken(t)).join(" ");
  const align = layout.center ? ` align="center"` : "";

  let inner = "";
  if (layout.columns > 0) {
    const width = `${Math.round(100 / layout.columns)}%`;
    const rows = chunk(rendered, layout.columns).map(
      (cells, r) =>
        "<tr>" +
        cells
          .map(
            html =>
              `<td class="${EMAIL_CLASS.col}" width="${width}" valign="${layout.valign}"${align}` +
              `${gapAttr("x", layout.gapTokens)}${r > 0 ? gapAttr("top", layout.gapTokens) : ""}>${html}</td>`
          )
          .join("") +
        "</tr>"
    );
    inner = `${presentationTable(`width="100%"`)}${rows.join("")}</table>`;
  } else if (rendered.length) {
    const rows = rendered.map(
      (html, i) =>
        `<tr><td${align}${i > 0 ? gapAttr("top", layout.gapTokens) : ""}>${html}</td></tr>`
    );
    inner = `${presentationTable(`width="100%"`)}${rows.join("")}</table>`;
  }

  const style = getInlineStyle(props);
  const outer =
    `${presentationTable(`width="100%"`)}<tr>` +
    tag("td", { class: own || undefined, style: style || undefined }, inner) +
    `</tr></table>`;
  const { href, target } = linkHref(props, ctx);
  return wrapLink(outer, href, target);
};

/** Button → a bulletproof table button. `icon` is dropped (validator warning). */
const buttonToEmail: ToHTMLFn = (props, _childrenHTML, ctx) => {
  const cls = staticClasses(props, ctx);
  const textCls = cls
    .split(/\s+/)
    .filter(t => TEXT_CLASS_RE.test(t))
    .join(" ");
  const { href, target } = linkHref(props, ctx);
  const label = props.text ? interpolate(String(props.text), ctx) : "";
  const anchor = tag(
    "a",
    {
      href: href || undefined,
      target: target || undefined,
      class: textCls || undefined,
      style: "display:inline-block;text-decoration:none",
    },
    label
  );
  return `${presentationTable()}<tr>${tag("td", { class: cls || undefined }, anchor)}</tr></table>`;
};

const PNG_TYPES = /^image\/(png|gif|svg)/;

/**
 * Width of the cell a node renders in: the email width divided by every
 * ancestor Container's column count. Outlook sizes images by the `width`
 * attribute alone, so a full-width image in a half column needs half the width.
 */
function availableWidth(ctx: StaticRenderContext): number {
  let width = EMAIL_WIDTH;
  let id = ctx.renderingNodeId ? ctx.nodes[ctx.renderingNodeId]?.parent : null;
  while (id) {
    const node = ctx.nodes[id];
    if (!node) break;
    const childCount = (node.nodes || []).length;
    const { columns } = readEmailLayout(nodeClassTokens(node.props), childCount);
    if (columns > 1) width = width / columns;
    id = node.parent;
  }
  return Math.floor(width);
}

/** `width` attribute from `w-[Npx]` / `w-N`, capped at — and defaulting to — the cell width. */
function imageWidth(tokens: string[], max: number): number {
  for (const t of [...tokens].reverse()) {
    if (EMAIL_RESPONSIVE_PREFIX_RE.test(t)) continue;
    const px = /^w-\[(\d+)px\]$/.exec(t);
    if (px) return Math.min(parseInt(px[1], 10), max);
    const n = /^w-(\d+)$/.exec(t);
    if (n) return Math.min(parseInt(n[1], 10) * 4, max);
  }
  return max;
}

/** CDN images are pinned to png / jpeg: `format=auto` can serve webp/avif, which Outlook can't show. */
function cdnSrc(id: string, ctx: StaticRenderContext): string {
  const media = ctx.nodes?.ROOT?.props?.pageMedia;
  const entry = Array.isArray(media) ? media.find((m: any) => m?.id === id) : null;
  const format = PNG_TYPES.test(entry?.metadata?.contentType ?? "") ? "png" : "jpeg";
  return getCdnUrl(id, { width: 1200, format });
}

/** Image → a plain block `<img>`. Inline SVG images are left out. */
const imageToEmail: ToHTMLFn = (props, _childrenHTML, ctx) => {
  if (props.type === "svg") return "";
  const raw = getImageSrc(props);
  const content = typeof raw === "string" ? interpolate(raw, ctx) : "";
  const cdnId =
    props.videoId ||
    (props.type === "cdn" && content && !/^(https?:|\/|data:)/.test(content) ? content : "");
  const src = cdnId ? cdnSrc(cdnId, ctx) : content;
  if (!src) return "";
  const cls = staticClasses(props, ctx);
  const img = tag("img", {
    src,
    alt: interpolate(props.alt || props.title || "", ctx),
    width: String(imageWidth(cls.split(/\s+/), availableWidth(ctx))),
    class: cls || undefined,
    style: "display:block;border:0;outline:none;height:auto;max-width:100%",
  });
  const { href, target } = linkHref(props, ctx);
  return wrapLink(img, href, target);
};

/**
 * ROOT (Background) → the centered 600px frame. ROOT isn't validated, so its
 * classes are narrowed here to the ones an email can carry (a site ROOT
 * usually has `min-h-dvh`, `overflow-*`, `flex` …).
 */
const backgroundToEmail: ToHTMLFn = (props, _childrenHTML, ctx) => {
  const rootClass = nodeClassTokens(props)
    .filter(
      t =>
        !EMAIL_RESPONSIVE_PREFIX_RE.test(t) &&
        !isEmailLayoutToken(t) &&
        isEmailClassAllowed(t) &&
        !hasUnsafeEmailClass(t)
    )
    .join(" ");
  collectClasses(rootClass, ctx);
  const childIds = filterChromeChildren(ctx.nodes.ROOT?.nodes || [], id => ctx.nodes[id]?.props);
  const rows = renderEach(childIds, ctx)
    .map(html => `<tr><td>${html}</td></tr>`)
    .join("");
  return emailFrame(rootClass, `${presentationTable(`width="100%"`)}${rows}</table>`);
};

export const EMAIL_RESOLVER: Record<string, ToHTMLFn> = {
  Background: backgroundToEmail,
  Container: memoByNode(containerToEmail),
  Button: buttonToEmail,
  Image: imageToEmail,
};
