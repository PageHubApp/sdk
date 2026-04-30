/**
 * Inline <script> for evaluating conditions in static HTML exports.
 *
 * Two consumers share the same evaluator function bodies:
 *   - `getConditionEvalScript()` — node visibility (`data-ph-conditions`).
 *   - `getLoadActionScript()` — load-trigger show-hide reveals + state seeds
 *     (`data-ph-load-show`, `data-ph-load-set-state`). Lives in clickControls.ts
 *     and imports `buildConditionEvalFns` from here.
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
 * `localStorage`, `state`. Any other type returns `true` (can't evaluate
 * client-side without server data — connector/company/auth/item — graceful
 * degrade to "show / fire").
 *
 * `state` reads from `window.__PH_STATE__` (seeded by the load-action script)
 * and treats missing keys as `null`, then runs the operator the author asked
 * for — same semantics as `evaluate.ts` so static and React routes agree.
 */
export function buildConditionEvalFns({
  mobileBreakpoint = 768,
}: { mobileBreakpoint?: number } = {}): string {
  const safeMobile = Number.isFinite(mobileBreakpoint) ? mobileBreakpoint : 768;
  return `
  var __PH_PARAMS = new URLSearchParams(window.location.search);
  var __PH_VW = window.innerWidth;
  var __PH_MOBILE = ${safeMobile};
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

/**
 * Inline <script> for evaluating node-visibility in static HTML exports.
 *
 * @param mobileBreakpoint - px threshold for `device: mobile`. Defaults to 768
 *   (Tailwind `md`). Pass `theme.breakpoints?.md` to honor per-site overrides.
 */
export function getConditionEvalScript({
  mobileBreakpoint = 768,
}: { mobileBreakpoint?: number } = {}): string {
  return `<script>
(function(){${buildConditionEvalFns({ mobileBreakpoint })}
  function run(){
    document.querySelectorAll('[data-ph-conditions]').forEach(function(el) {
      var conds = JSON.parse(el.getAttribute('data-ph-conditions'));
      var logic = el.getAttribute('data-ph-condition-logic') || 'all';
      if (evalAll(conds, logic)) el.style.display = '';
    });
  }
  // Wait for DOMContentLoaded so the load-action script has populated
  // window.__PH_STATE__ before state conditions read. End-of-body scripts
  // usually run with readyState='interactive' (load script fires
  // synchronously too), but DCL ordering is the only guaranteed contract.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
</script>`;
}

/**
 * @deprecated Use `getConditionEvalScript()` instead — defaults to mobileBreakpoint=768
 * (matches the prior literal export). Kept as a back-compat shim; remove once no
 * consumers reference it.
 */
export const CONDITION_EVAL_SCRIPT = getConditionEvalScript();
