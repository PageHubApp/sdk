/**
 * A node's visibility conditions (`props.conditionGroups`) applied to its emitted source, for `renderNodeToSource`:
 *
 *   device part          a responsive hide class on the element (`md:hidden` / `max-md:hidden`, conditions.ts
 *                        `deviceGate`); a node shown on no device emits nothing
 *   runtime state only   `data-state-show` on the element (the runtime's `state` chunk decides, live)
 *   server-readable      a Liquid `{% if %}` around it
 *   anything else        emitted ungated with a `<!--/* report: <reason> *\/-->` note the migration counts
 */
import { conditionExpr, deviceGate, stateShowExpr } from "./conditions";

/** The opening tag of a body's single plain-element root: `[whole, "<tag", attrs]`. */
const ROOT_TAG = /^(\s*<[a-zA-Z][\w-]*)([^>]*)>/;

export function gateNode(props: Record<string, any>, body: string): string {
  const device = deviceGate(props.conditionGroups);
  if (device === "never") return "";
  if (device) {
    const hidden = device.hide ? addRootClass(body, device.hide) : body;
    return device.rest === true ? hidden : gateGroups(device.rest, hidden);
  }
  return gateGroups(props.conditionGroups, body);
}

/** `body` behind non-device condition groups (see the module comment). */
function gateGroups(groups: any, body: string): string {
  if (!Array.isArray(groups) || groups.length === 0) return body;
  // A gate that is ENTIRELY runtime `state` conditions can't be decided server-side, but the runtime can: stamp the
  // equivalent `test()` expression as `data-state-show` on the element itself. The `state` chunk then sets
  // `hidden = !test(expr)` and re-tests on every store change, so a filter chip's `data-state-set` drives it live.
  const show = stateShowExpr(groups);
  if (show) {
    const gated = injectAttr(body, "data-state-show", show);
    if (gated) return gated;
    // The body root isn't a single plain element (e.g. a Data `{% for %}`): fall through to report.
  }
  // Client-only / non-flattenable conditions can't be decided at render time: the node is emitted ungated with the
  // reported note so the migration surfaces them per site. The note is wrapped in a real HTML comment — a bare
  // `/* report: … */` sits in body position and renders as VISIBLE text. `site.ts` still extracts the note inside.
  const notes: string[] = [];
  const expr = conditionExpr(groups, (n) => notes.push(n));
  if (expr) return `{% if ${expr} %}${body}{% endif %}`;
  return `${notes.map((n) => `<!--${n}-->`).join("")}${body}`;
}

/**
 * Add an attribute to the single plain-element root of an emitted body (`<div …>…</div>` →
 * `<div data-x="…" …>…</div>`), or `null` when the body doesn't start with one (a `{% … %}` wrapper or text).
 */
export function injectAttr(body: string, name: string, value: string): string | null {
  const m = /^(\s*<[a-zA-Z][\w-]*)(?=[\s/>])/.exec(body);
  if (!m) return null;
  const esc = value.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  return `${m[1]} ${name}="${esc}"${body.slice(m[1].length)}`;
}

/**
 * Add a class to the single plain-element root of an emitted body, merged into its `class` attribute. A body whose
 * root is not one element (a `{% for %}`, text) is wrapped in a `contents` div carrying the class: no box of its own,
 * so the layout is unchanged, and `md:hidden` / `max-md:hidden` still take the subtree out.
 */
export function addRootClass(body: string, cls: string): string {
  const m = ROOT_TAG.exec(body);
  if (!m) return `<div class="contents ${cls}">${body}</div>`;
  const [open, tag, rawAttrs] = m as unknown as [string, string, string];
  const selfClosing = /\/\s*$/.test(rawAttrs);
  const attrs = selfClosing ? rawAttrs.replace(/\s*\/\s*$/, "") : rawAttrs;
  const withClass = /\sclass="/.test(attrs) ? attrs.replace(/(\sclass=")/, `$1${cls} `) : `${attrs} class="${cls}"`;
  return `${tag}${withClass}${selfClosing ? " /" : ""}>${body.slice(open.length)}`;
}
