/**
 * Craft `props.handlers` (author-written JS on an element: `onClick`, `onKeyDown`, ...) → HTML-first source.
 *
 * A published HTML-first site carries no inline JS (`on*` attributes are stripped by the sanitizer and flagged by lint), so
 * every handler becomes the runtime's own equivalent:
 *
 *  - backdrop click on an overlay        → the overlay commands itself (`commandfor="<own id>" command="hide-popover|close"`)
 *  - a click on a link inside a drawer   → `data-close-link="<selector>"` closes it
 *  - a panel's `stopPropagation()`       → dropped when the only click listener above it is such a backdrop (the runtime
 *                                          closes on a click that LANDS on the overlay, never one bubbling up from a panel)
 *  - Enter / Space activates a div       → `data-key-click`
 *  - `window.print()`                    → `data-print` (a selector marks the ancestor to print, e.g. a coupon)
 *  - a track's prev / next `scrollBy`    → `data-scroll-by` + `data-scroll-step`
 *  - a link that presets a form field    → `data-set-field` + `data-set-value`
 *  - the gallery lightbox open / step    → `data-lightbox*` (site-runtime `lightbox` chunk)
 *  - a tab's `aria-expanded` bookkeeping → the runtime keeps it (`[data-tab-target][aria-expanded]`)
 *
 * What none of those cover (a site's own fetch calls, a consent update, a menu that toggles its own class) is not dropped:
 * the body is registered once as a named function in the site's `handlers` partial (`PageHub.on(name, fn)`) and the
 * element carries `data-on="click:<name>"` (site-runtime `on` chunk). Nothing is ever emitted as an `on*` attribute.
 *
 * Every recogniser matches the exact code the editor and the importers wrote; anything that differs by a character
 * goes down the register-a-function path, which runs the author's code unchanged.
 */
import { migrateActions } from "../../utils/action";
import { applyHandlerOptions, readHandlerOptions } from "../../utils/actions/handlerCode";
import type { StaticRenderContext } from "../../utils/staticHtml";

export type OverlayKind = "popover" | "dialog" | null;

/** The DOM id an invoker's `commandfor` points at: the passthrough `attrs.id`, else `id`/`anchor`. */
export function domId(props: Record<string, any>): string | undefined {
  const a = props.attrs && typeof props.attrs === "object" ? (props.attrs as any).id : undefined;
  return (typeof a === "string" && a) || props.id || props.anchor || undefined;
}

/**
 * Make an element a valid invoker TARGET when another node's action points at its id: a `show-hide`
 * target gets the `popover` attribute (`command="show/hide/toggle-popover"` acts on it) and an
 * `open-modal` target becomes a `<dialog>` (`command="show-modal"`). Without this the trigger has
 * nothing to open. The target id set is collected tree-wide by `convertSite` onto `ctx`.
 */
export function invokerTarget(props: Record<string, any>, ctx: StaticRenderContext): { tag: "dialog" | null; attrs: Record<string, string | undefined> } {
  const id = domId(props);
  if (!id) return { tag: null, attrs: {} };
  if ((ctx as any).dialogTargets?.has?.(id)) return { tag: "dialog", attrs: {} };
  if ((ctx as any).popoverTargets?.has?.(id)) return { tag: null, attrs: { popover: "manual" } };
  return { tag: null, attrs: {} };
}

function overlayKind(props: Record<string, any>, ctx: StaticRenderContext): OverlayKind {
  const t = invokerTarget(props, ctx);
  return t.tag ? "dialog" : "popover" in t.attrs ? "popover" : null;
}

type Attrs = Record<string, string>;
/** What a recogniser decided: attributes to emit (and nothing else), or `drop` (the handler has no job left). */
type Verdict = { attrs: Attrs } | { drop: true };

const Q = String.raw`['"]`;
const HIDE = String.raw`event\.currentTarget\.classList\.add\(\s*${Q}hidden${Q}\s*\)`;
const SEL = String.raw`(?<q>['"])(?<sel>[^'"]+)\k<q>`;
const LINK = String.raw`event\.target\.closest\s*(?:&&\s*event\.target\.closest\s*)?\(\s*${SEL}\s*\)`;
const re = (src: string) => new RegExp(`^\\s*${src}\\s*;?\\s*$`);

const BACKDROP = re(String.raw`if\s*\(\s*event\.target\s*===\s*event\.currentTarget\s*\)\s*\{?\s*${HIDE}\s*;?\s*\}?`);
const LINK_ONLY = re(String.raw`var\s+a\s*=\s*${LINK}\s*;\s*if\s*\(\s*a\s*\)\s*${HIDE}`);
const BACKDROP_OR_LINK = re(String.raw`if\s*\(\s*event\.target\s*===\s*event\.currentTarget\s*\|\|\s*${LINK}\s*\)\s*${HIDE}`);
const BACKDROP_OR_LINK_VAR = re(String.raw`var\s+t\s*=\s*event\.target\s*;\s*if\s*\(\s*t\s*===\s*event\.currentTarget\s*\|\|\s*t\.closest\(\s*${SEL}\s*\)\s*\)\s*${HIDE}`);
const STOP = re(String.raw`event\.stopPropagation\(\)`);
const KEY_CLICK = re(String.raw`if\s*\(\s*event\.key\s*===\s*'Enter'\s*\|\|\s*event\.key\s*===\s*' '\s*\)\s*\{\s*event\.preventDefault\(\)\s*;\s*event\.currentTarget\.click\(\)\s*;?\s*\}`);
const PRINT = re(String.raw`(?:event\.preventDefault\(\)\s*;\s*)?window\.print\(\)`);
const PRINT_SCOPED = re(String.raw`var c\s*=\s*event\.currentTarget\.closest\('([^']+)'\)\s*;\s*if\s*\(!c\)\s*return\s*;\s*c\.classList\.add\('ph-print'\)\s*;\s*window\.addEventListener\('afterprint',\s*function\s*\(\)\s*\{\s*c\.classList\.remove\('ph-print'\)\s*;\s*\}\s*,\s*\{\s*once:\s*true\s*\}\)\s*;\s*window\.print\(\)`);
const SCROLL_BY = re(String.raw`var t=document\.getElementById\('([\w-]+)'\);\s*if\(t\)\s*t\.scrollBy\(\{left:(-?)t\.clientWidth,\s*behavior:'smooth'\}\)`);
const SET_FIELD = re(String.raw`var s=document\.(getElementById|querySelector)\('([^']+)'\);\s*if\(s\)\{?\s*s\.value='([^']*)'\s*;?(?:\s*s\.dispatchEvent\(new Event\('change',\{bubbles:true\}\)\);)?\s*\}?`);
const TAB_ARIA = re(String.raw`var b=event\.currentTarget;document\.querySelectorAll\('\[data-k-board="'\+b\.getAttribute\('data-k-board'\)\+'"\]'\)\.forEach\(function\(t\)\{t\.setAttribute\('aria-expanded',t===b\?'true':'false'\)\}\)`);

const squash = (s: string) => s.replace(/\s+/g, "");

/** The gallery lightbox's three handlers, regenerated from their ids: a recognised handler must equal this text exactly. */
const LB_FILL = (cap: string, step: boolean) =>
  `var im=m.querySelector('img');if(im&&s){var r=s.currentSrc||s.src;im.removeAttribute('srcset');im.removeAttribute('sizes');im.src=r.indexOf('imagedelivery.net')>=0?r.replace(/\\/[^\\/]*$/,'/w=1600'):r;im.alt=s.alt||'';}` +
  (step ? `var c=document.getElementById('${cap}');if(c&&s)c.textContent=s.alt||'';` : `var a=s?(s.alt||''):'';var f=function(){var c=document.getElementById('${cap}');if(c)c.textContent=a;};f();requestAnimationFrame(f);setTimeout(f,120);`);
const LB_OPEN = (m: string, g: string, cap: string) =>
  `var m=document.getElementById('${m}');var g=document.getElementById('${g}');if(!m||!g)return;var t=[].slice.call(g.children);var i=t.indexOf(event.currentTarget);if(i<0)i=0;m.setAttribute('data-idx',String(i));var s=event.currentTarget.querySelector('img');` +
  LB_FILL(cap, false);
const LB_STEP = (m: string, g: string, cap: string, sign: "-" | "+") =>
  `event.stopPropagation();var m=document.getElementById('${m}');var g=document.getElementById('${g}');if(!m||!g)return;var t=[].slice.call(g.children).filter(function(x){return x.querySelector('img');});var n=t.length;if(!n)return;var i=((parseInt(m.getAttribute('data-idx')||'0',10)${sign}1)%n+n)%n;m.setAttribute('data-idx',String(i));var s=t[i].querySelector('img');` +
  LB_FILL(cap, true);
const LB_IDS = /getElementById\('([\w-]+)'\);varg=document\.getElementById\('([\w-]+)'\)/;
const LB_CAP = /varc=document\.getElementById\('([\w-]+)'\);if\(c/;

function lightbox(code: string): Attrs | null {
  const n = squash(code);
  const ids = LB_IDS.exec(n);
  const cap = LB_CAP.exec(n);
  if (!ids || !cap) return null;
  const [, m, g] = ids;
  const c = cap[1]!;
  if (n === squash(LB_OPEN(m!, g!, c))) return { "data-lightbox": m!, "data-lightbox-caption": c };
  for (const [sign, step] of [["-", "-1"], ["+", "1"]] as const) {
    if (n === squash(LB_STEP(m!, g!, c, sign))) return { "data-lightbox": m!, "data-lightbox-step": step, "data-lightbox-grid": g!, "data-lightbox-caption": c };
  }
  return null;
}

/** Does this handler close an overlay on a click that lands on its backdrop, and/or on something clickable inside it (`link` is that selector)? */
function closeTokens(code: string): { backdrop: boolean; link: string | null } | null {
  if (BACKDROP.test(code)) return { backdrop: true, link: null };
  const linkOnly = LINK_ONLY.exec(code);
  if (linkOnly) return { backdrop: false, link: linkOnly.groups!.sel! };
  const both = BACKDROP_OR_LINK.exec(code) ?? BACKDROP_OR_LINK_VAR.exec(code);
  if (both) return { backdrop: true, link: both.groups!.sel! };
  return null;
}

/** `x.classList.add('hidden')` / `.remove('hidden')` → the overlay's native close / open. */
function overlayClassToggle(code: string, kind: Exclude<OverlayKind, null>): string {
  const [shut, open] = kind === "dialog" ? ["close()", "showModal()"] : ["hidePopover()", "showPopover()"];
  return code
    .replace(/([\w.$]+)\.classList\.add\((['"])hidden\2\)/g, `$1.${shut}`)
    .replace(/([\w.$]+)\.classList\.remove\((['"])hidden\2\)/g, `$1.${open}`);
}

const EVENT_NAME: Record<string, string> = { onDoubleClick: "dblclick" };
const eventOf = (key: string) => EVENT_NAME[key] ?? key.slice(2).toLowerCase();

/** Each `props.handlers` entry as `[key, code]`, handler options (`preventDefault`) baked in. */
function handlerEntries(props: Record<string, any>): Array<[string, string]> {
  const h = props.handlers;
  if (!h || typeof h !== "object") return [];
  const out: Array<[string, string]> = [];
  for (const [k, v] of Object.entries(h as Record<string, unknown>)) {
    if (typeof v !== "string" || !v.trim() || !/^on[A-Z]/.test(k)) continue;
    out.push([k, applyHandlerOptions(v, readHandlerOptions(props.handlerOptions, k))]);
  }
  return out;
}

/** An overlay that acts on itself (`show-hide` / `open-modal` naming its own id): the runtime runs that on a click that LANDS on it, never on one bubbling up. */
const commandsItself = (props: Record<string, any>): boolean => {
  const id = domId(props);
  return !!id && migrateActions(props).some((a) => (a.type === "show-hide" && (a as any).target === id) || (a.type === "open-modal" && (a as any).anchor === id));
};

const hasClickBehavior = (props: Record<string, any>): boolean => migrateActions(props).length > 0 || handlerEntries(props).some(([k]) => k === "onClick");

/** Does an ancestor of the node being emitted close an overlay on a backdrop click (so the node's `stopPropagation()` guards nothing)? */
function guardedByBackdrop(ctx: StaticRenderContext): boolean {
  const nodes = (ctx as any).nodes as Record<string, any> | undefined;
  let id: string | undefined = (ctx as any).renderingNodeId;
  let sawClickAbove = false;
  for (let parent = id && nodes?.[id]?.parent; parent && nodes?.[parent]; parent = nodes[parent].parent) {
    const props = nodes[parent].props || {};
    const close = handlerEntries(props).map(([k, c]) => (k === "onClick" ? closeTokens(c) : null)).find(Boolean);
    if ((close?.backdrop && overlayKind(props, ctx) && domId(props)) || commandsItself(props)) return true;
    if (hasClickBehavior(props)) sawClickAbove = true;
  }
  // No click listener anywhere above: stopping the event guards nothing.
  return !sawClickAbove;
}

function recognise(key: string, code: string, props: Record<string, any>, ctx: StaticRenderContext, native: Record<string, unknown>): Verdict | null {
  if (key === "onKeyDown" && KEY_CLICK.test(code)) return { attrs: { "data-key-click": "true" } };
  if (key !== "onClick") return null;

  const close = closeTokens(code);
  if (close) {
    const kind = overlayKind(props, ctx);
    const id = domId(props);
    if (!kind || !id) return null;
    const attrs: Attrs = {};
    if (close.backdrop) {
      if (native.commandfor) return null; // the node already commands something else
      attrs.commandfor = id;
      attrs.command = kind === "dialog" ? "close" : "hide-popover";
    }
    if (close.link) attrs["data-close-link"] = close.link;
    return { attrs };
  }
  if (STOP.test(code)) return guardedByBackdrop(ctx) ? { drop: true } : null;
  if (PRINT.test(code)) return { attrs: { "data-print": "page" } };
  const scoped = PRINT_SCOPED.exec(code);
  if (scoped) return { attrs: { "data-print": scoped[1]! } };
  const scroll = SCROLL_BY.exec(code);
  if (scroll) return { attrs: { "data-scroll-by": scroll[1]!, "data-scroll-step": scroll[2] ? "-1" : "1" } };
  const field = SET_FIELD.exec(code);
  if (field) return { attrs: { "data-set-field": field[1] === "getElementById" ? `#${field[2]}` : field[2]!, "data-set-value": field[3]! } };
  if (TAB_ARIA.test(code) && migrateActions(props).some((a) => a.type === "show-hide" && (a as any).direction === "tab")) return { drop: true };
  const lb = lightbox(code);
  if (lb) return { attrs: lb };
  return null;
}

/** A small stable hash for a handler's registered name (the same code on two elements shares one function). */
function nameFor(event: string, code: string): string {
  let h = 0x811c9dc5;
  const s = `${event}\0${code}`;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193) >>> 0;
  return `ph_h_${h.toString(36)}`;
}

export interface LiftedHandler {
  event: string;
  code: string;
}

/**
 * The element attributes for `props.handlers` (and for `javascript:` links, which `splitJavascriptLinks` turns into an
 * `onClick`). `native` is what the element's own actions already set, so a handler never overwrites an invoker.
 */
export function handlerSource(props: Record<string, any>, ctx: StaticRenderContext, native: Record<string, unknown> = {}): Record<string, string> {
  const out: Record<string, string> = {};
  const on: string[] = [];
  for (const [key, code] of handlerEntries(props)) {
    const verdict = recognise(key, code, props, ctx, { ...native, ...out });
    if (verdict) {
      if ("attrs" in verdict) Object.assign(out, verdict.attrs);
      continue;
    }
    const event = eventOf(key);
    // On an overlay target the author's `classList.add/remove('hidden')` is the native close/open, which is what drives it.
    const kind = overlayKind(props, ctx);
    const body = kind ? overlayClassToggle(code, kind) : code;
    // Code that carries a Liquid binding cannot move into a raw script: report it and keep the element honest.
    if (/\{\{|\{%/.test(body)) {
      ((ctx as any).reports as Set<string> | undefined)?.add(`handler ${key} uses a binding and was not carried over`);
      continue;
    }
    const name = nameFor(event, body);
    const lifted: Map<string, LiftedHandler> = ((ctx as any).liftedHandlers ??= new Map());
    lifted.set(name, { event, code: body });
    on.push(`${event}:${name}`);
  }
  if (on.length) out["data-on"] = [String((native as any)["data-on"] ?? ""), ...on].filter(Boolean).join("; ");
  return out;
}

/**
 * A link action whose href is `javascript:` is a handler, not a link: it leaves the action list and its code joins
 * `handlers.onClick`, where the recognisers (`window.print()`) or the registered-function path take it.
 */
export function splitJavascriptLinks(props: Record<string, any>): Record<string, any> {
  const actions = Array.isArray(props.action) ? props.action : props.action && typeof props.action === "object" ? [props.action] : null;
  if (!actions) return props;
  const isJs = (a: any) => a?.type === "link" && typeof a.href === "string" && /^\s*javascript:/i.test(a.href);
  const js = actions.filter(isJs);
  if (!js.length) return props;
  const code = js.map((a: any) => {
    const body = String(a.href).replace(/^\s*javascript:/i, "");
    try {
      return decodeURIComponent(body);
    } catch {
      return body;
    }
  });
  const prior = typeof props.handlers?.onClick === "string" ? [props.handlers.onClick] : [];
  return {
    ...props,
    action: actions.filter((a: any) => !isJs(a)),
    handlers: { ...(props.handlers || {}), onClick: [...prior, ...code].join("; ") },
  };
}

/** The partial that registers every lifted handler (`PageHub.on(name, fn)`), as raw Liquid. Empty map → "". */
export function liftedHandlersPartial(lifted: Map<string, LiftedHandler> | undefined): string {
  if (!lifted?.size) return "";
  const fns = [...lifted].map(([name, { code }]) => `P.on(${JSON.stringify(name)},function(event){${code}\n});`).join("\n");
  const script = `<script>\n(function(){var P=window.PageHub=window.PageHub||{fns:{},on:function(n,f){this.fns[n]=f}};\n${fns}\n})();\n</script>`;
  return `{% raw %}${script}{% endraw %}`;
}
