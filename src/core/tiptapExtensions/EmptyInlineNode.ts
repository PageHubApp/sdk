import { Node } from "@tiptap/core";

import { PAGEHUB_RTT_GLOBAL_ID } from "@/chrome/primitives/layout/tooltipSurface";

/**
 * `id` / `role` / `aria-*` / `data-*` on an inline tag. Kept through an edit so a
 * site's own script (`getElementById("year")`) and accessible names still work.
 * Names are matched, never wildcarded, so `on*` handlers and `style` can't ride along;
 * `javascript:` values are dropped.
 */
const PASSTHROUGH_ATTR = /^(id|role|aria-[a-z0-9-]+|data-[a-z0-9_.:-]+)$/i;
const SCRIPT_URL = /^\s*javascript:/i;

export function readPassthroughAttrs(element: HTMLElement): Record<string, string> | null {
  const out: Record<string, string> = {};
  for (const { name, value } of Array.from(element.attributes)) {
    if (PASSTHROUGH_ATTR.test(name) && !SCRIPT_URL.test(value)) out[name] = value;
  }
  return Object.keys(out).length ? out : null;
}

const EMPTY_INLINE_TAGS = ["span", "i", "em", "b", "strong", "small"] as const;

/** Passthrough attrs plus `class` — what an empty inline element keeps. */
function readEmptyInlineAttrs(element: HTMLElement): Record<string, string> | null {
  if (element.hasAttribute("data-variable")) return null;
  if (element.childNodes.length > 0) return null;
  const attrs = readPassthroughAttrs(element) ?? {};
  const cls = element.getAttribute("class");
  if (cls) attrs.class = cls;
  return Object.keys(attrs).length ? attrs : null;
}

/**
 * An empty inline element with attributes (`© <span id="year"></span>`), kept as an
 * atom because a mark can't exist without text. Imported sites' scripts fill these in.
 * Serializes back to the same tag + safe attributes; shows as a small chip while editing.
 */
export const EmptyInlineNode = Node.create({
  name: "emptyInline",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      tag: { default: "span", rendered: false },
      attrs: { default: {} as Record<string, string>, rendered: false },
    };
  },

  parseHTML() {
    return EMPTY_INLINE_TAGS.map((tag) => ({
      tag,
      priority: 1000,
      getAttrs: (element: HTMLElement) => {
        const attrs = readEmptyInlineAttrs(element);
        return attrs ? { tag, attrs } : false;
      },
    }));
  },

  renderHTML({ node }) {
    const tag = EMPTY_INLINE_TAGS.includes(node.attrs.tag) ? node.attrs.tag : "span";
    return [tag, { ...(node.attrs.attrs as Record<string, string>) }];
  },

  addNodeView() {
    return ({ node }) => {
      const attrs = node.attrs.attrs as Record<string, string>;
      const label = attrs.id ? `#${attrs.id}` : `<${node.attrs.tag}>`;
      const dom = document.createElement("span");
      dom.className = "variable-node px-0.5 text-[0.7em] opacity-60";
      dom.contentEditable = "false";
      dom.textContent = label;
      dom.setAttribute("data-tooltip-id", PAGEHUB_RTT_GLOBAL_ID);
      dom.setAttribute(
        "data-tooltip-content",
        `Empty <${node.attrs.tag}${attrs.id ? ` id="${attrs.id}"` : ""}>. The site's own script fills it in.`
      );
      return { dom };
    };
  },
});
