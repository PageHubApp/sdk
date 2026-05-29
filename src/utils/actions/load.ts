/**
 * Load-trigger actions — fire once on mount in viewer mode, or via the
 * static-export bootstrap script for published HTML (no React).
 */
import type {
  ClearStateAction,
  DecrementStateAction,
  IncrementStateAction,
  NodeAction,
  SetStateAction,
  ToggleStateAction,
} from "../action";
import { buildConditionEvalFns } from "../conditions/clientScript";
import { deleteState, getState, getStateValue, setState } from "../state/stateRegistry";
import { actionGatePasses, applyStateStep } from "./gates";
import { applyShowHide } from "./internal";

/**
 * Static-export bootstrap for load-trigger actions. Static HTML has no React
 * → no `useEffect` → `Container` can't dispatch its own load actions on
 * mount. Container's `toHTML` stamps every load-trigger target with:
 *   - `data-ph-load-show=""` (presence marker)
 *   - `data-ph-load-method="class|style"`
 *   - `data-ph-load-conditions="<json>"` (optional gate)
 *   - `data-ph-load-set-state="<json[]>"` for state seeds
 *
 * Condition evaluator function definitions are shared with the static-publish
 * runtime IIFE's Alpine `data-ph-condition-groups` directive via
 * `buildConditionEvalFns` so load-trigger gating and node visibility agree
 * on which condition types are honored and how indeterminate values are
 * handled.
 *
 * In-app SSR routes (`/view`, `/static`, custom domains) hydrate React, so
 * `Container`'s mount effect fires `fireLoadAction` and this script is
 * unnecessary. Kept exclusive to static export to avoid double dispatch.
 */
export function getLoadActionScript({
  mobileBreakpoint = 768,
}: { mobileBreakpoint?: number } = {}): string {
  return `<script>
(function(){
  window.__PH_STATE__ = window.__PH_STATE__ || {};
  function seedSetState(){
    try {
      document.querySelectorAll('[data-ph-load-set-state]').forEach(function(el){
        var raw = el.getAttribute('data-ph-load-set-state');
        if (!raw) return;
        try {
          var arr = JSON.parse(raw);
          for (var i = 0; i < arr.length; i++) {
            var s = arr[i];
            if (s && s.key) {
              window.__PH_STATE__[s.key] = { kind: s.kind || 'value', value: s.value == null ? null : String(s.value) };
            }
          }
        } catch (e) {}
      });
    } catch (e) {}
  }
  seedSetState();
${buildConditionEvalFns({ mobileBreakpoint })}
  function run() {
    try {
      document.querySelectorAll('[data-ph-load-show]').forEach(function(el) {
        var raw = el.getAttribute('data-ph-load-conditions');
        if (raw) { try { if (!evalGroups(JSON.parse(raw))) return; } catch (e) {} }
        var m = el.getAttribute('data-ph-load-method') || 'class';
        if (m === 'style') el.style.display = 'block';
        else el.classList.remove('hidden');
        if (el.id) window.__PH_STATE__[el.id] = { kind: 'visibility', value: 'shown' };
      });
      seedSetState();
    } catch (e) {}
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
</script>`;
}

/**
 * Fire a single load-trigger action on mount (viewer mode only). Evaluates
 * `action.conditions` first — skips firing when ANY group evaluates `false`.
 * Returns `null` (indeterminate, e.g. SSR with no localStorage) → fires
 * (matches the "graceful degrade to show" pattern visitors see when
 * localStorage is blocked).
 *
 * Handles `show-hide` (panel reveal), `set-state` (registry seed), and
 * `toggle-state` / `clear-state`. All routes through the registry so React
 * rerenders pick up the change without className clobber.
 *
 * Caller (Container) is responsible for skipping editor mode and only
 * passing `trigger: "load"` actions; this helper trusts its inputs.
 */
export function fireLoadAction(action: NodeAction): void {
  if ((action as any).trigger !== "load") return;
  if (!actionGatePasses(action)) return;
  if (action.type === "show-hide") {
    applyShowHide(action);
    return;
  }
  if (action.type === "set-state") {
    const ss = action as SetStateAction;
    if (!ss.key) return;
    setState(ss.key, { kind: ss.kind ?? "value", value: ss.value, source: "load" }, "load");
    return;
  }
  if (action.type === "toggle-state") {
    const ts = action as ToggleStateAction;
    if (!ts.key) return;
    const current = getStateValue(ts.key);
    const kind = ts.kind ?? getState(ts.key)?.kind ?? "flag";
    let pair: [string, string] | null = ts.values ?? null;
    if (!pair) {
      if (kind === "visibility") pair = ["shown", "hidden"];
      else if (kind === "flag") pair = ["on", "off"];
      else return;
    }
    const next = current === pair[0] ? pair[1] : pair[0];
    setState(ts.key, { kind, value: next, source: "load" }, "load");
    return;
  }
  if (action.type === "clear-state") {
    const cs = action as ClearStateAction;
    if (cs.key) deleteState(cs.key);
    return;
  }
  if (action.type === "increment-state" || action.type === "decrement-state") {
    applyStateStep(action as IncrementStateAction | DecrementStateAction);
    return;
  }
}
