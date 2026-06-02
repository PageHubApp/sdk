/**
 * Condition evaluator for static HTML exports — authored as a REAL TS function
 * and lifted to a runtime string via `stringifyChunk`, NOT a backtick "trust
 * me it's JS" template. tsc / eslint / refactor tools all see real code;
 * runtime globals are declared ambient in
 * [runtime-globals.d.ts](../../render/static/runtime/chunks/runtime-globals.d.ts).
 *
 * Two consumers concatenate this chunk into their own IIFE:
 *   - The static-publish runtime ([conditions.ts](../../render/static/runtime/chunks/conditions.ts)) —
 *     prepends it to the `data-ph-condition-groups` Alpine directive chunk.
 *   - The load-action bootstrap ([load.ts](../actions/load.ts)) —
 *     `getLoadActionScript()` for `data-ph-load-show` reveals + state seeds.
 *
 * Because each chunk is minified independently, function declarations get
 * renamed (e.g. `evalGroups` → `e`), so cross-chunk callers can't reference
 * them by identifier. This chunk therefore PUBLISHES `evalCond` / `evalAll` /
 * `evalGroups` onto the shared `__phRT` registry via STRING keys (which
 * minifiers don't mangle); callers destructure from `__phRT`. Both consumers
 * provide `__phRT` (and `MOBILE`) in their enclosing IIFE.
 *
 * Supported condition types: `url-param`, `device`, `form-field`,
 * `localStorage`, `state`, `auth`, `company`, `connector`. `item` returns
 * `true` defensively — item-context conditions only make sense inside a
 * repeater iteration, which the static renderer resolves at SSR time before
 * any node reaches this eval pass. Semantics mirror `evaluate.ts` so static
 * and React routes agree.
 *
 * Reads:
 *   - `url-param`  → `window.location.search`
 *   - `device`    → `window.innerWidth` vs the `MOBILE` global (set per-site
 *                   from `theme.breakpoints.md` in each consumer's preamble)
 *   - `state`     → `window.__PH_STATE__` (seeded by the load-action script)
 *   - `auth`      → `window.__PH_AUTH__` (seeded by `renderToHTML.ts` from the
 *                   `ph-customer` cookie presence)
 *   - `company`   → `window.__PH_COMPANY__` (serialized `rootProps.company`)
 *   - `connector` → `window.__PH_CONNECTOR__` (serialized connector data)
 * All object reads walk dot-paths matching `evaluate.ts`.
 */
import { stringifyChunk } from "../../render/static/runtime/chunks/stringifyChunk";

export const CONDITION_EVAL_CHUNK = stringifyChunk(function $conditionEval() {
  const params = new URLSearchParams(window.location.search);
  const vw = window.innerWidth;

  function walkPath(obj: any, parts: string[]): any {
    let value: any = obj;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (value && typeof value === "object") {
        if (Array.isArray(value) && /^\d+$/.test(part)) {
          value = value[parseInt(part, 10)];
        } else if (part in value) {
          value = value[part];
        } else {
          return undefined;
        }
      } else {
        return undefined;
      }
    }
    return value;
  }

  function applyOp(actual: any, op: string, expected: any): boolean {
    if (op === "exists") return actual != null && actual !== "";
    if (op === "not-exists") return actual == null || actual === "";
    if (actual == null) return false;
    if (op === "equals") return actual === expected;
    if (op === "not-equals") return actual !== expected;
    if (op === "contains") return actual.indexOf(expected) !== -1;
    if (op === "not-contains") return actual.indexOf(expected) === -1;
    if (op === "greater-than") return Number(actual) > Number(expected);
    if (op === "less-than") return Number(actual) < Number(expected);
    return false;
  }

  function evalCond(c: any): boolean {
    if (!c || !c.type) return true;
    if (c.type === "url-param") return applyOp(params.get(c.key), c.operator, c.value);
    if (c.type === "device") {
      const isMobile = vw < MOBILE;
      const expected = c.value === "mobile";
      return c.operator === "equals" ? isMobile === expected : isMobile !== expected;
    }
    if (c.type === "form-field") {
      const anchor = (c.target || c.key || "").replace(/["\\]/g, "");
      const el: any = anchor
        ? document.querySelector('[data-anchor="' + anchor + '"]')
        : null;
      const val = el ? el.value || el.textContent || "" : null;
      return applyOp(val, c.operator, c.value);
    }
    if (c.type === "localStorage") {
      let lsv: string | null = null;
      try {
        lsv = window.localStorage.getItem(c.key);
      } catch (e) {
        lsv = null;
      }
      return applyOp(lsv, c.operator, c.value);
    }
    if (c.type === "state") {
      const s = window.__PH_STATE__;
      const sv = s && s[c.key] ? s[c.key].value : null;
      return applyOp(sv, c.operator, c.value);
    }
    if (c.type === "auth") {
      const auth = window.__PH_AUTH__ || null;
      if (!auth) {
        if (c.operator === "not-exists") return true;
        if (c.operator === "exists") return false;
        return false;
      }
      const av = walkPath(auth, c.key.split("."));
      return applyOp(av == null ? null : String(av), c.operator, c.value);
    }
    if (c.type === "company") {
      const company = window.__PH_COMPANY__ || null;
      if (!company) {
        if (c.operator === "not-exists") return true;
        if (c.operator === "exists") return false;
        return false;
      }
      const cv = walkPath(company, c.key.split("."));
      return applyOp(cv == null ? null : String(cv), c.operator, c.value);
    }
    if (c.type === "connector") {
      const conn = window.__PH_CONNECTOR__ || null;
      if (!conn) {
        if (c.operator === "not-exists") return true;
        if (c.operator === "exists") return false;
        return false;
      }
      const nv = walkPath(conn, c.key.split("."));
      if (Array.isArray(nv) && (c.operator === "exists" || c.operator === "not-exists")) {
        return applyOp(nv.length > 0 ? "true" : null, c.operator, c.value);
      }
      if (
        Array.isArray(nv) &&
        (c.operator === "greater-than" ||
          c.operator === "less-than" ||
          c.operator === "equals")
      ) {
        return applyOp(String(nv.length), c.operator, c.value);
      }
      return applyOp(nv == null ? null : String(nv), c.operator, c.value);
    }
    // 'item' conditions only make sense inside a repeater. The static renderer
    // resolves them DURING render (inside the iteration), so the client should
    // never see one. Defensive fail-open if a stray one slips through.
    if (c.type === "item") return true;
    return true;
  }

  function evalAll(conds: any[], logic?: string): boolean {
    if (!conds || !conds.length) return true;
    if (logic === "any") {
      for (let i = 0; i < conds.length; i++) {
        if (evalCond(conds[i])) return true;
      }
      return false;
    }
    for (let j = 0; j < conds.length; j++) {
      if (!evalCond(conds[j])) return false;
    }
    return true;
  }

  function evalGroups(gs: any[]): boolean {
    if (!gs || !gs.length) return true;
    for (let k = 0; k < gs.length; k++) {
      const g = gs[k];
      if (evalAll(g.conditions || [], g.logic || "all")) return true;
    }
    return false;
  }

  // Publish cross-chunk functions to the registry by STRING keys so they
  // survive minifier identifier-mangling. Callers destructure from __phRT.
  Object.assign(__phRT, { evalCond, evalAll, evalGroups });
});
