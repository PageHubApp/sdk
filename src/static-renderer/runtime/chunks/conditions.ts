// Condition evaluation + conditions directives.
// `buildConditionEvalFns` injects evalCond/evalGroups/evalAll using a literal
// mobile breakpoint, so this module exposes a function that takes that value.
// Everything after the generated prelude is a real TS function whose body is
// concatenated through `stringifyChunk` — globals declared in
// [runtime-globals.d.ts](./runtime-globals.d.ts).

import { buildConditionEvalFns } from "../../../utils/conditions/clientScript";
import { stringifyChunk } from "./stringifyChunk";

const CONDITIONS_BODY = stringifyChunk(function $conditions() {
  function actionGatePasses(action: { conditions?: unknown[] } | null) {
    if (!action || !action.conditions || !action.conditions.length) return true;
    return evalGroups(action.conditions) !== false;
  }

  // SSR emits <div data-ph-conditions="…" style="display:none">; this flips
  // display to '' when evalAll passes. _store.revision read makes it reactive.
  Alpine.directive(
    "conditions",
    function (
      el: HTMLElement,
      _: unknown,
      opts: { effect: (fn: () => void) => void }
    ) {
      let conds: unknown[];
      try {
        conds = JSON.parse(el.getAttribute("data-ph-conditions") || "[]");
      } catch (e) {
        conds = [];
      }
      const logic = el.getAttribute("data-ph-condition-logic") || "all";
      opts.effect(function () {
        void _store.revision;
        el.style.display = evalAll(conds, logic) ? "" : "none";
      });
    }
  );
  Alpine.directive(
    "condition-groups",
    function (
      el: HTMLElement,
      _: unknown,
      opts: { effect: (fn: () => void) => void }
    ) {
      let groups: unknown[];
      try {
        groups = JSON.parse(el.getAttribute("data-ph-condition-groups") || "[]");
      } catch (e) {
        groups = [];
      }
      opts.effect(function () {
        void _store.revision;
        el.style.display = evalGroups(groups) ? "" : "none";
      });
    }
  );

  // Publish cross-chunk functions to the runtime registry. See state.ts.
  Object.assign(__phRT, { actionGatePasses, evalGroups, evalCond, evalAll });
});

export function getConditionsChunk(mobileBreakpoint: number): string {
  return `
${buildConditionEvalFns({ mobileBreakpoint })}
${CONDITIONS_BODY}
`;
}
