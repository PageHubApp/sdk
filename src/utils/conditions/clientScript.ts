/**
 * Inline <script> emitting condition evaluator function bodies for static
 * HTML exports.
 *
 * Two consumers share these evaluator definitions:
 *   - The static-publish runtime IIFE — interpolates `buildConditionEvalFns`
 *     directly and registers `data-ph-conditions` / `data-ph-condition-groups`
 *     as Alpine directives that re-run `evalAll` / `evalGroups` inside
 *     `Alpine.effect` whenever the state store mutates.
 *   - `getLoadActionScript()` — load-trigger show-hide reveals + state seeds
 *     (`data-ph-load-show`, `data-ph-load-set-state`). Lives in
 *     utils/actions/load.ts and imports `buildConditionEvalFns` from here.
 *
 * Keeping the function definitions in one place stops the two scripts from
 * drifting on which condition types they understand or how they treat
 * indeterminate values.
 */

/**
 * Returns a JS string defining `applyOp`, `evalCond`, `evalAll`, `evalGroups`
 * in the enclosing scope. Caller wraps in its own IIFE + run loop.
 *
 * Supported condition types: `url-param`, `device`, `form-field`,
 * `localStorage`, `state`, `auth`, `company`, `connector`. `item` returns
 * `true` defensively — item-context conditions only make sense inside a
 * repeater iteration, which the static renderer resolves at SSR time before
 * any node ever reaches this eval pass.
 *
 * `state` reads from `window.__PH_STATE__` (seeded by the load-action script)
 * and treats missing keys as `null`, then runs the operator the author asked
 * for — same semantics as `evaluate.ts` so static and React routes agree.
 *
 * `auth` reads from `window.__PH_AUTH__` (seeded by an inline script emitted
 * by `renderToHTML.ts` that reads the `ph-customer` cookie). `company` reads
 * from `window.__PH_COMPANY__` (serialized rootProps.company). `connector`
 * reads from `window.__PH_CONNECTOR__` (serialized connectorData, when
 * present). All three walk dot-paths matching `evaluate.ts`.
 */
export function buildConditionEvalFns({
  mobileBreakpoint = 768,
}: { mobileBreakpoint?: number } = {}): string {
  const safeMobile = Number.isFinite(mobileBreakpoint) ? mobileBreakpoint : 768;
  return `
  var __PH_PARAMS = new URLSearchParams(window.location.search);
  var __PH_VW = window.innerWidth;
  var __PH_MOBILE = ${safeMobile};
  function walkPath(obj, parts) {
    var value = obj;
    for (var i = 0; i < parts.length; i++) {
      var part = parts[i];
      if (value && typeof value === 'object') {
        if (Array.isArray(value) && /^\\d+$/.test(part)) {
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
  function applyOp(actual, op, expected) {
    if (op === 'exists') return actual != null && actual !== '';
    if (op === 'not-exists') return actual == null || actual === '';
    if (actual == null) return false;
    if (op === 'equals') return actual === expected;
    if (op === 'not-equals') return actual !== expected;
    if (op === 'contains') return actual.indexOf(expected) !== -1;
    if (op === 'not-contains') return actual.indexOf(expected) === -1;
    if (op === 'greater-than') return Number(actual) > Number(expected);
    if (op === 'less-than') return Number(actual) < Number(expected);
    return false;
  }
  function evalCond(c) {
    if (!c || !c.type) return true;
    if (c.type === 'url-param') return applyOp(__PH_PARAMS.get(c.key), c.operator, c.value);
    if (c.type === 'device') {
      var isMobile = __PH_VW < __PH_MOBILE;
      var expected = c.value === 'mobile';
      return c.operator === 'equals' ? isMobile === expected : isMobile !== expected;
    }
    if (c.type === 'form-field') {
      var anchor = (c.target || c.key || '').replace(/["\\\\]/g, '');
      var el = anchor ? document.querySelector('[data-anchor="' + anchor + '"]') : null;
      var val = el ? (el.value || el.textContent || '') : null;
      return applyOp(val, c.operator, c.value);
    }
    if (c.type === 'localStorage') {
      var lsv = null;
      try { lsv = window.localStorage.getItem(c.key); } catch (e) { lsv = null; }
      return applyOp(lsv, c.operator, c.value);
    }
    if (c.type === 'state') {
      var s = window.__PH_STATE__;
      var hasEntry = !!(s && s[c.key]);
      var sv = hasEntry ? s[c.key].value : null;
      return applyOp(sv, c.operator, c.value);
    }
    if (c.type === 'auth') {
      var auth = window.__PH_AUTH__ || null;
      if (!auth) {
        if (c.operator === 'not-exists') return true;
        if (c.operator === 'exists') return false;
        return false;
      }
      var av = walkPath(auth, c.key.split('.'));
      return applyOp(av == null ? null : String(av), c.operator, c.value);
    }
    if (c.type === 'company') {
      var company = window.__PH_COMPANY__ || null;
      if (!company) {
        if (c.operator === 'not-exists') return true;
        if (c.operator === 'exists') return false;
        return false;
      }
      var cv = walkPath(company, c.key.split('.'));
      return applyOp(cv == null ? null : String(cv), c.operator, c.value);
    }
    if (c.type === 'connector') {
      var conn = window.__PH_CONNECTOR__ || null;
      if (!conn) {
        if (c.operator === 'not-exists') return true;
        if (c.operator === 'exists') return false;
        return false;
      }
      var nv = walkPath(conn, c.key.split('.'));
      if (Array.isArray(nv) && (c.operator === 'exists' || c.operator === 'not-exists')) {
        return applyOp(nv.length > 0 ? 'true' : null, c.operator, c.value);
      }
      if (Array.isArray(nv) && (c.operator === 'greater-than' || c.operator === 'less-than' || c.operator === 'equals')) {
        return applyOp(String(nv.length), c.operator, c.value);
      }
      return applyOp(nv == null ? null : String(nv), c.operator, c.value);
    }
    // 'item' conditions only make sense inside a repeater. The static renderer
    // resolves them DURING render (inside the iteration), so the client should
    // never see one. Defensive fail-open if a stray one slips through.
    if (c.type === 'item') return true;
    return true;
  }
  function evalAll(conds, logic) {
    if (!conds || !conds.length) return true;
    if (logic === 'any') {
      for (var i = 0; i < conds.length; i++) { if (evalCond(conds[i])) return true; }
      return false;
    }
    for (var j = 0; j < conds.length; j++) { if (!evalCond(conds[j])) return false; }
    return true;
  }
  function evalGroups(gs) {
    if (!gs || !gs.length) return true;
    for (var k = 0; k < gs.length; k++) {
      var g = gs[k];
      if (evalAll(g.conditions || [], g.logic || 'all')) return true;
    }
    return false;
  }`;
}
