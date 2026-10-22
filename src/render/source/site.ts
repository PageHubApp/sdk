/**
 * Craft tree → a multi-file HTML-first site (see docs/strategy/html-first-converter.md).
 *
 * `convertSite` is the page-split step: it turns one Craft node map into a **folder of files**, one
 * document per page, instead of a single wrapped tree. It mirrors the engine's own page model
 * (`@pagehub-editor/engine` `renderPage`): pages are full `.liquid` documents at their route path,
 * shared chrome lives in `partials/`, and routing + SEO + access policy live on a host-owned page
 * RECORD outside the file — so the WYSIWYG editor only ever edits the HTML, never the plumbing.
 *
 *   convertSite("ROOT", nodes, ctx)
 *     → { files: { "index.liquid", "shop/[handle].liquid", "partials/header.liquid", "partials/head.liquid", … },
 *         site:  { name, pages:[{path,url,title}], routes },
 *         pages: [{ path, url, title, source, meta, policy }, …] }
 *
 * `files` is the writable tree (the folder writer dumps it to `sites/<id>/…`, and it also satisfies the
 * engine renderer's `files(path)` lookup). `pages` are the host records the renderer consumes; `policy`
 * on each is the non-HTML config (home page, 404, auth gate, redirect) a host record owns.
 */
import type { SerializedNode, SerializedNodes } from "../static/types";
import type { StaticRenderContext } from "../../utils/staticHtml";
import { pageNodeSlug } from "../../utils/page/pageSlug";
import { migrateActions } from "../../utils/action";
import { generateDesignSystemCSSVariables } from "../../utils/design/designSystemVars";
import { resolveTheme } from "../../utils/design/resolveTheme";
import { googleFontFamilyParam } from "../../utils/fonts/familyParam";
import { resolveAnchorScopes } from "./anchors";
import { componentSlug, renderNodeToSource } from "./toSource";
import { collectComponents, componentPartialSource, isComponentMaster, setComponentSource, setComponents } from "./componentSource";
import { toHTML as rootWrapperHTML } from "../../components/Background/Background.toHTML";

/** The Google Fonts stylesheet href for a site's typography, or "" when it uses system fonts. */
const UTILITY_WEIGHTS: Record<string, string> = { "font-light": "300", "font-normal": "400", "font-medium": "500", "font-semibold": "600", "font-bold": "700" };

/**
 * The `font-*` weight utilities the tree uses, split by the family they render in: `font-heading` nodes use the
 * Heading token's family, everything else the Body token's. The theme's typography tokens only name ONE weight
 * per family, so without these a `font-semibold` paragraph has no 600 face and the browser fakes it.
 */
function utilityWeights(nodes: SerializedNodes | undefined): { heading: Set<string>; body: Set<string> } {
  const out = { heading: new Set<string>(), body: new Set<string>() };
  for (const n of Object.values(nodes ?? {}) as SerializedNode[]) {
    const cls = (n as any)?.props?.className;
    if (typeof cls !== "string") continue;
    const toks = cls.split(/\s+/).map((t) => t.replace(/^.*:/, ""));
    const target = toks.includes("font-heading") ? out.heading : out.body;
    for (const t of toks) if (UTILITY_WEIGHTS[t]) target.add(UTILITY_WEIGHTS[t]);
  }
  return out;
}

/**
 * `supported` maps a family to the weights Google serves for it. Utility weights are only requested when the family
 * is listed and has them: Google answers 400 for the WHOLE css2 request if any one weight is missing, which would
 * break every font on the site. Without metadata no utility weight is added (token weights are always kept).
 */
function fontsHref(theme: { typography?: any[]; styleGuide?: Record<string, any> }, nodes?: SerializedNodes, supported?: Record<string, readonly string[]>): string {
  const families = new Map<string, Set<string>>();
  const add = (family?: unknown, weight?: unknown) => {
    const f = typeof family === "string" ? family.trim() : "";
    if (!f || /system-ui|sans-serif|serif|monospace/i.test(f)) return;
    const w = families.get(f) ?? new Set<string>();
    if (typeof weight === "string" && weight) w.add(weight);
    else if (typeof weight === "number") w.add(String(weight));
    families.set(f, w);
  };
  for (const t of theme.typography ?? []) add(t?.fontFamily, t?.fontWeight);
  for (const [k, v] of Object.entries(theme.styleGuide ?? {})) if (/FontFamily$/.test(k)) add(v);
  if (!families.size) return "";
  const used = utilityWeights(nodes);
  const famOf = (token: string, key: string) => {
    const t = (theme.typography ?? []).find((x) => x?.name === token)?.fontFamily ?? theme.styleGuide?.[key];
    return typeof t === "string" ? t.trim() : "";
  };
  for (const [token, key, ws] of [["Heading", "headingFontFamily", used.heading], ["Body", "bodyFontFamily", used.body]] as const) {
    const set = families.get(famOf(token, key));
    const fam = famOf(token, key);
    if (set) for (const w of ws) if (supported?.[fam]?.includes(w)) set.add(w);
  }
  const params = [...families].map(([f, w]) => googleFontFamilyParam(f, w.size ? [...w] : ["400", "700"])).join("&");
  return `https://fonts.googleapis.com/css2?${params}&display=swap`;
}

/** SEO / arbitrary values exposed to a page as `page.<key>` (the engine's `PageRecord.meta`). */
export type PageMeta = Record<string, string>;

/** The non-HTML policy a host record owns — never part of the editable file. */
export interface PagePolicy {
  isHome?: boolean;
  is404?: boolean;
  /** Node-visibility `conditionGroups` gating access to the whole page. */
  access?: unknown;
  /** What to do when `access` fails: redirect to a URL, or show another page. */
  failAction?: string;
  redirectUrl?: string;
  fallbackPath?: string;
}

/** One converted page: a full document (in `files[path]`) plus the host record fields. */
export interface ConvertedPage {
  /** File path inside the site, e.g. `index.liquid` or `shop/[handle].liquid`. */
  path: string;
  /** Public URL the route serves, e.g. `/` or `/shop/:handle`. */
  url: string;
  title: string;
  source: string;
  meta: PageMeta;
  policy: PagePolicy;
}

export interface SiteJson {
  name?: string;
  /** `<html lang>` for the document shell the host wraps each page fragment in. */
  lang?: string;
  pages: Array<{ path: string; url: string; title?: string }>;
  routes: Record<string, string>;
}

export interface SiteBundle {
  files: Record<string, string>;
  site: SiteJson;
  pages: ConvertedPage[];
  /** The site's design-system CSS (palette / fonts / typography / animations), scoped to `:root`. */
  css: string;
  /** Google Fonts stylesheet href for the site's typography, or "" for system fonts. */
  fonts: string;
  /** `/* report: … *‍/` notes bubbled up from condition conversion, deduped. */
  notes: string[];
}

/** Lowercase, hyphen-separated, filename/`{% render %}`-safe slug. */
function slugify(raw: string): string {
  const s = String(raw)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return s || "page";
}

type Kind = "page" | "header" | "footer" | "component" | "scaffold" | "other";

function classify(node: SerializedNode): Kind {
  const p = node.props || {};
  if (p.type === "page") return "page";
  if (p.type === "header") return "header";
  if (p.type === "footer") return "footer";
  if (p.type === "componentCanvas") return "scaffold";
  if (p.type === "component" || (p as any).component || (p as any).savedComponent) return "component";
  return "other";
}

/**
 * The route URL and file path for a page node. The slug comes from the ONE page-slug rule
 * (`pageNodeSlug`: explicit `pageSlug`, else slugged display name, else node id); `isHomePage` serves
 * `/` from `index.liquid`; `pathPattern` is the dynamic tail (`:handle`) appended to the URL and
 * turned into a `[handle]` file segment so the folder reads like file-based routing.
 */
function routeFor(node: Pick<SerializedNode, "props">, nodeId: string, retry?: "slug" | "id"): { url: string; path: string } {
  const props = node.props || {};
  // `retry`: a second page claiming the same file (two home pages, two pages with one slug) is routed by its own
  // slug, then by slug + node id, so every page keeps a file of its own.
  if (props.isHomePage && !retry) return { url: "/", path: "index.liquid" };
  const slug = slugify(retry === "id" ? `${pageNodeSlug(node, nodeId)}-${nodeId}` : pageNodeSlug(node, nodeId));
  const pattern = typeof props.pathPattern === "string" ? props.pathPattern.trim().replace(/^\/+/, "") : "";
  if (!pattern) return { url: `/${slug}`, path: `${slug}.liquid` };
  const urlTail = pattern.replace(/^\/+/, "");
  const fileTail = urlTail.replace(/:([A-Za-z0-9_]+)/g, "[$1]");
  return { url: `/${slug}/${urlTail}`, path: `${slug}/${fileTail}.liquid` };
}

/** Flatten page SEO props into the `page.<key>` meta the shared head partial reads. */
function metaFor(node: Pick<SerializedNode, "props">): { title: string; meta: PageMeta } {
  const props = node.props || {};
  const seo = { ...(props.seo || {}) };
  const title = String(seo.title || (node as any).custom?.displayName || props.title || props.name || "");
  const meta: PageMeta = {};
  if (seo.description || props.description) meta.description = String(seo.description || props.description);
  if (seo.canonical) meta.canonical = String(seo.canonical);
  if (seo.ogImage || seo.image) meta.image = String(seo.ogImage || seo.image);
  if (seo.jsonLd) meta.jsonLd = typeof seo.jsonLd === "string" ? seo.jsonLd : JSON.stringify(seo.jsonLd);
  else if (Array.isArray(seo.schema) && seo.schema.length) meta.jsonLd = JSON.stringify(seo.schema.length === 1 ? seo.schema[0] : seo.schema);
  return { title, meta };
}

function policyFor(props: Record<string, any>): PagePolicy {
  const policy: PagePolicy = {};
  if (props.isHomePage) policy.isHome = true;
  if (props.is404Page || props.is404 || props.isNotFound) policy.is404 = true;
  const groups = props.conditionGroups;
  if (Array.isArray(groups) && groups.length) policy.access = groups;
  if (props.pageConditionFailAction) policy.failAction = String(props.pageConditionFailAction);
  if (props.pageConditionRedirectUrl) policy.redirectUrl = String(props.pageConditionRedirectUrl);
  if (props.pageConditionFallbackPageId) policy.fallbackPath = String(props.pageConditionFallbackPageId);
  return policy;
}

/** The page slot inside the ordered chrome `sequence`; replaced per page with that page's own body. */
const PAGE_SLOT = "\u0000PAGE\u0000";

/**
 * A page file is a BODY FRAGMENT, not a full document — the ordered chrome `{% render %}` calls with
 * the page's own body in the page slot. The `<head>` and the `<html>`/`<body>` shell are the host's
 * (the editor wraps the fragment for the canvas; publish wraps it with a `<head>` built from the page
 * record's SEO meta). This is the shape the editor and the engine's `renderPage` both expect.
 */
function pageDocument(bodyParts: string[], rootProps: Record<string, any>, ctx: StaticRenderContext): string {
  // Live renders every page inside ROOT's `<main class=… style=…>` (Background.toHTML) — chrome, page
  // body and inject all sit within it. That wrapper carries the site's body font / bg / text colour,
  // so the bundle emits the same element, from the same function, around the whole sequence.
  const MARK = "\u0000MAIN\u0000";
  const [open = "<main>", close = "</main>"] = rootWrapperHTML(rootProps, MARK, { ...ctx, classes: ctx.classes ?? new Set() }).split(MARK);
  return [open, ...bodyParts.filter(Boolean), close].join("\n");
}

/** The source that goes inside a lifted partial (a `type:"component"` wrapper contributes its children). */
function partialBody(node: SerializedNode, id: string, nodes: SerializedNodes, ctx: StaticRenderContext): string {
  if ((node.props || {}).type === "component") {
    return (node.nodes || []).map((c) => renderNodeToSource(c, nodes, ctx)).join("");
  }
  return renderNodeToSource(id, nodes, ctx);
}

/**
 * Split a Craft tree into a folder of HTML-first files.
 *
 * ROOT's children are classified: `type:"page"` nodes each become their own document; header /
 * footer / reusable-component nodes are lifted once into `partials/` and referenced from every page;
 * the editor-only `componentCanvas` scaffold is dropped. A site with no `type:"page"` child is a
 * single-page site — its content (minus chrome) becomes `index.liquid`.
 */
export function convertSite(rootId: string, rawNodes: SerializedNodes, ctx: StaticRenderContext): SiteBundle {
  // `{{anchor.*}}` become the real per-instance ids before anything scans or emits (anchors.ts).
  const nodes = resolveAnchorScopes(rawNodes);
  const files: Record<string, string> = {};
  const pages: ConvertedPage[] = [];
  const notes = new Set<string>();
  const root = nodes[rootId];
  if (!root) return { files, site: { pages: [], routes: {} }, pages, css: "", fonts: "", notes: [] };

  const siteProps = root.props || {};
  const lang = String(siteProps?.seo?.lang || siteProps.lang || "en");
  const childIds = Array.isArray(root.nodes) ? root.nodes : [];

  // Seed the page index so `ref:<pageId>` links resolve to their route URL (`/shop`) instead of "#".
  // Same shape `renderToHTML` builds; `currentPath` is left unset so hrefs come out as clean paths.
  const pageIndex: Record<string, { isHomePage: boolean; displayName: string; pageSlug: string }> = {
    ...(siteProps._pageIndex || {}),
  };
  for (const id of childIds) {
    const n = nodes[id];
    if (!n || n.props?.type !== "page") continue;
    pageIndex[id] = {
      isHomePage: !!n.props?.isHomePage,
      displayName: (n as any).custom?.displayName || "Untitled",
      pageSlug: n.props?.pageSlug || "",
    };
  }
  (ctx as any).pageIndex = pageIndex;

  // Collect invoker TARGET ids tree-wide so a `show-hide` target becomes a `popover` and an
  // `open-modal` target becomes a `<dialog>` — otherwise the cart / menu / modal triggers that emit
  // `commandfor` have nothing to open. Scanned here (not per-node) because a trigger and its target
  // are different nodes.
  const popoverTargets = new Set<string>();
  const dialogTargets = new Set<string>();
  for (const node of Object.values(nodes)) {
    for (const a of migrateActions((node as any)?.props || {})) {
      if (a.type === "open-modal" && (a as any).anchor) dialogTargets.add(String((a as any).anchor));
      else if (a.type === "show-hide" && (a as any).target && (a as any).direction !== "tab" && (a as any).trigger !== "hover") popoverTargets.add(String((a as any).target));
    }
  }
  (ctx as any).popoverTargets = popoverTargets;
  // Constructs an emitter could not carry over (a modifier binding with no mapping) land here and join `notes`.
  const reports = new Set<string>();
  (ctx as any).reports = reports;
  (ctx as any).dialogTargets = dialogTargets;

  const hasPages = childIds.some((id) => nodes[id]?.props?.type === "page");
  const usedSlugs = new Set<string>();

  // Reusable components first, before anything renders: each master becomes its own partial, and every linked
  // instance anywhere (a page, the header, another component) renders as `{% render %}` of it (componentSource.ts).
  const components = collectComponents(rootId, nodes);
  setComponents(ctx, components);
  for (const c of components) {
    usedSlugs.add(c.slug);
    const text = componentPartialSource(c, nodes, ctx, renderNodeToSource);
    files[`partials/${c.slug}.liquid`] = text;
    setComponentSource(ctx, c.slug, text);
  }

  // Lift a ROOT-level chrome node (header / footer / loose site-wide block) into a uniquely-named
  // partial and return the `{% render %}` call for it. Every page renders these in ROOT child order,
  // so a cart drawer or checkout banner that sits beside the pages appears on all of them.
  // Which ROOT chrome each sequence entry is, so a page's `hideHeader` / `hideFooter` / `hideChrome` can drop
  // it (the walker's `filterChromeChildren`). Inject partials are document-level and never suppressed.
  const chromeKind = new Map<string, "header" | "footer" | "chrome">();
  const liftChrome = (base: string, node: SerializedNode, id: string): string => {
    let slug = slugify(base);
    for (let i = 2; usedSlugs.has(slug); i++) slug = `${slugify(base)}-${i}`;
    usedSlugs.add(slug);
    files[`partials/${slug}.liquid`] = partialBody(node, id, nodes, ctx);
    // Bare render: the engine exposes site/page/company/… as globals, which `{% render %}` partials
    // inherit, so a chrome partial's `{{ company.name }}` resolves without forwarding args here.
    const call = `{% render '${slug}' %}`;
    chromeKind.set(call, classify(node) === "header" ? "header" : classify(node) === "footer" ? "footer" : "chrome");
    return call;
  };

  // One ordered pass: build the shared chrome `sequence` (with ONE page slot) and collect page ids.
  const sequence: string[] = [];
  const pageIds: string[] = [];
  const looseIds: string[] = [];
  let pageSlotPlaced = false;
  const placeSlot = () => {
    if (!pageSlotPlaced) { sequence.push(PAGE_SLOT); pageSlotPlaced = true; }
  };

  for (const id of childIds) {
    const node = nodes[id];
    if (!node || (node as any).hidden) continue;
    const kind = classify(node);
    if (kind === "scaffold") continue;
    if (kind === "page") { pageIds.push(id); placeSlot(); continue; }
    if (kind === "header") { sequence.push(liftChrome("header", node, id)); continue; }
    if (kind === "footer") { sequence.push(liftChrome("footer", node, id)); continue; }
    // A component master is on no page: it is only its partial (written above).
    if (isComponentMaster(node)) continue;
    if (kind === "component") { sequence.push(liftChrome(componentSlug(node.props || {}, id), node, id)); continue; }
    // A loose ROOT child with pages present is site-wide chrome (cart drawer, promo/checkout banner);
    // on a single-page site it is the page body, rendered inline where it sits.
    if (hasPages) { sequence.push(liftChrome((node as any).custom?.displayName || id, node, id)); continue; }
    looseIds.push(id);
    placeSlot();
  }

  // Author code is verbatim: `{% raw %}` keeps Liquid (and the editor's parser) off its `{{` / `}}` / `{%`.
  const rawLiquid = (code: string) => `{% raw %}${code}{% endraw %}`;
  // Site-wide head/footer code (`ROOT.props.inject`) — author CSS/JS that site features depend on
  // (facade styling + its tap-to-load script, scrollbar hiding, mobile-nav toggle, etc.). Lifted into
  // partials and rendered on EVERY page: head styles first, footer scripts last. Without this the
  // custom-section markup survives but its styling and interactivity are silently dropped, so the
  // feature looks broken (an unstyled, inert placeholder) in both the canvas and the real render.
  const inject = siteProps.inject && typeof siteProps.inject === "object" ? siteProps.inject : {};
  const injectHead = typeof inject.head === "string" ? inject.head.trim() : "";
  const injectFooter = typeof inject.footer === "string" ? inject.footer.trim() : "";
  if (injectHead) {
    let slug = "inject-head";
    for (let i = 2; usedSlugs.has(slug); i++) slug = `inject-head-${i}`;
    usedSlugs.add(slug);
    files[`partials/${slug}.liquid`] = rawLiquid(injectHead);
    sequence.unshift(`{% render '${slug}' %}`);
  }
  if (injectFooter) {
    let slug = "inject-footer";
    for (let i = 2; usedSlugs.has(slug); i++) slug = `inject-footer-${i}`;
    usedSlugs.add(slug);
    files[`partials/${slug}.liquid`] = rawLiquid(injectFooter);
    sequence.push(`{% render '${slug}' %}`);
  }

  const emitPage = (bodyIds: string[], node: Pick<SerializedNode, "props">, nodeId: string) => {
    const rendered = bodyIds.map((id) => renderNodeToSource(id, nodes, ctx)).join("\n");
    // Per-page `headCode` / `footerCode` (raw author HTML scoped to this one page — e.g. the `<style>`
    // that paints a `.hero-bg` background-image) ride with the page body, verbatim. A page file is a
    // body fragment, so the head code lands at the top of it; without this the page's own CSS is lost.
    const pp = (node.props || {}) as any;
    const pageHead = typeof pp.headCode === "string" ? pp.headCode.trim() : "";
    const pageFoot = typeof pp.footerCode === "string" ? pp.footerCode.trim() : "";
    const body = [pageHead && rawLiquid(pageHead), rendered, pageFoot && rawLiquid(pageFoot)].filter(Boolean).join("\n");
    let route = routeFor(node, nodeId);
    const policy = policyFor(node.props || {});
    for (const retry of ["slug", "id"] as const) {
      if (!pages.some((p) => p.path === route.path)) break;
      route = routeFor(node, nodeId, retry);
      delete policy.isHome; // only the first page to claim `/` is the home page
    }
    const { url, path } = route;
    const { title, meta } = metaFor(node);
    const visible = sequence.filter((s) => {
      const kind = chromeKind.get(s);
      if (!kind) return true;
      if (pp.hideChrome === true) return false;
      return !((kind === "header" && pp.hideHeader === true) || (kind === "footer" && pp.hideFooter === true));
    });
    const source = pageDocument(visible.map((s) => (s === PAGE_SLOT ? body : s)), siteProps, ctx);
    files[path] = source;
    pages.push({ path, url, title, source, meta, policy });
  };

  if (pageIds.length === 0) {
    // Single-page site: the loose body is the home page. SEO comes from ROOT props.
    emitPage(looseIds, { props: { ...siteProps, isHomePage: true } }, "ROOT");
  } else {
    for (const id of pageIds) emitPage([id], nodes[id]!, id);
  }

  // Surface the condition notes the walker inlined into the source (`/* report: <reason> */`).
  const REPORT = /\/\* report: ([^*]+) \*\//g;
  for (const src of Object.values(files)) {
    for (const m of src.matchAll(REPORT)) notes.add(m[1]!.trim());
  }

  reports.forEach((r) => notes.add(r));

  // Exactly one home: if none was flagged, the first page serves `/`.
  if (!pages.some((p) => p.policy.isHome) && pages.length) {
    const first = pages[0]!;
    first.policy.isHome = true;
    first.url = "/";
    // keep its file where it is; the record's url is what routes
  }

  const site: SiteJson = {
    name: String(siteProps?.company?.name || siteProps?.name || siteProps?.title || ""),
    lang,
    pages: pages.map((p) => ({ path: p.path, url: p.url, title: p.title })),
    routes: Object.fromEntries(pages.map((p) => [p.path.replace(/\.liquid$/, ""), p.url])),
  };

  const theme = resolveTheme(siteProps);
  const css = generateDesignSystemCSSVariables(theme, ":root");
  const fonts = fontsHref(theme, nodes, (ctx as any).fontWeights);

  return { files, site, pages, css, fonts, notes: [...notes] };
}
