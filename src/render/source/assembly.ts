/**
 * Partial lifting + page/document assembly for the Craft → HTML-first converter.
 *
 * `liftPartials` walks a root's direct children and pulls header / footer / reusable-component nodes
 * out into `partials/<slug>.liquid` files, replacing each call site in the page with a
 * `{% render '<slug>' %}` tag (the format's partial mechanism — edit one, every page follows). Every
 * other child is emitted inline via `renderNodeToSource` from `toSource.ts`.
 *
 * `renderDocument` wraps that body in the same document shell the static walker produces
 * (`renderToHTML`'s `<!DOCTYPE html>` → `<head>` with title / SEO meta / canonical → `<body>`), so the
 * output is a faithful page `.liquid`. See docs/strategy/html-first-converter.md.
 */
import type { SerializedNode, SerializedNodes } from "../static/types";
import type { StaticRenderContext } from "../static/types";
import { escapeHTML } from "../../utils/staticHtml";
import { componentSlug, renderNodeToSource } from "./toSource";

/** Lowercase, hyphen-separated, filename/`{% render %}`-safe slug. */
function slugify(raw: string): string {
  const s = String(raw)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return s || "partial";
}

/** The partial slug for a liftable node, or `null` when the node stays inline. */
function partialSlugFor(node: SerializedNode, nodeId: string): string | null {
  const props = node.props || {};
  if (props.type === "header") return "header";
  if (props.type === "footer") return "footer";
  // A reusable-component definition, or an instance carrying a saved-component ref.
  if (props.type === "component" || props.component || props.savedComponent) {
    return slugify(componentSlug(props, nodeId));
  }
  return null;
}

/**
 * The source that goes inside a partial file. A `type:"component"` wrapper is editor-only chrome
 * (the static walker emits nothing for it), so its partial is its children; header / footer and
 * saved-component instances are the element itself.
 */
function partialBody(node: SerializedNode, nodeId: string, nodes: SerializedNodes, ctx: StaticRenderContext): string {
  const props = node.props || {};
  if (props.type === "component") {
    return (node.nodes || []).map(id => renderNodeToSource(id, nodes, ctx)).join("");
  }
  return renderNodeToSource(nodeId, nodes, ctx);
}

/**
 * Lift header / footer / reusable components under `rootId` into partials.
 *
 * Returns the page body (with `{% render %}` call sites in place of the lifted nodes) and a
 * `slug → partial source` map. Header / footer / saved-component instances usually sit as direct
 * children of ROOT alongside the `page` containers, so one pass over `rootId`'s children covers them.
 * The editor-only `componentCanvas` scaffold is dropped (it renders to nothing on the static path).
 */
export function liftPartials(
  rootId: string,
  nodes: SerializedNodes,
  ctx: StaticRenderContext
): { page: string; partials: Record<string, string> } {
  const partials: Record<string, string> = {};
  const root = nodes[rootId];
  if (!root) return { page: "", partials };

  const childIds = Array.isArray(root.nodes) ? root.nodes : [];
  const parts: string[] = [];
  for (const id of childIds) {
    const node = nodes[id];
    if (!node || node.hidden) continue;
    if (node.props?.type === "componentCanvas") continue; // editor-only scaffold
    const slug = partialSlugFor(node, id);
    if (slug) {
      partials[slug] = partialBody(node, id, nodes, ctx);
      parts.push(`{% render '${slug}' %}`);
    } else {
      parts.push(renderNodeToSource(id, nodes, ctx));
    }
  }
  return { page: parts.filter(Boolean).join("\n"), partials };
}

/** The `lang` attribute for the document shell. */
function docLang(rootProps: Record<string, any>): string {
  return rootProps?.seo?.lang || rootProps?.lang || "en";
}

/** The `<head>` SEO tags for a page: title, description, canonical, JSON-LD. */
function headTags(pageProps: Record<string, any>, siteProps: Record<string, any>): string {
  const seo = { ...(siteProps.seo || {}), ...(pageProps.seo || {}) };
  const title = seo.title || pageProps.title || siteProps.title || "";
  const description = seo.description || pageProps.description || "";
  const canonical = seo.canonical || "";

  const lines = [
    `    <meta charset="UTF-8" />`,
    `    <meta name="viewport" content="width=device-width, initial-scale=1.0" />`,
    `    <title>${escapeHTML(String(title))}</title>`,
  ];
  if (description) lines.push(`    <meta name="description" content="${escapeHTML(String(description))}" />`);
  if (canonical) lines.push(`    <link rel="canonical" href="${escapeHTML(String(canonical))}" />`);
  if (seo.jsonLd) {
    lines.push(`    <script type="application/ld+json">${String(seo.jsonLd)}</script>`);
  } else if (Array.isArray(seo.schema) && seo.schema.length) {
    for (const s of seo.schema) {
      lines.push(`    <script type="application/ld+json">${JSON.stringify(s)}</script>`);
    }
  }
  return lines.join("\n");
}

/**
 * The full page `.liquid` document: the shell the static walker wraps around the body, with the
 * lifted body from `liftPartials` inside `<body>`. Partial files are obtained from `liftPartials`
 * (exported) by the caller that writes the file set.
 */
export function renderDocument(rootId: string, nodes: SerializedNodes, ctx: StaticRenderContext): string {
  const { page } = liftPartials(rootId, nodes, ctx);
  const pageProps = nodes[rootId]?.props || {};
  const siteProps = nodes["ROOT"]?.props || {};

  return `<!DOCTYPE html>
<html lang="${docLang(siteProps)}">
<head>
${headTags(pageProps, siteProps)}
</head>
<body>
${page}
</body>
</html>`;
}
