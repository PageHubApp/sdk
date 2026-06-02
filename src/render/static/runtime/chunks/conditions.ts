// Condition evaluation + conditions directives.
// The evaluator functions (`evalCond`/`evalAll`/`evalGroups`) live in
// [clientScript.ts](../../../../utils/conditions/clientScript.ts) as
// `CONDITION_EVAL_CHUNK` (shared verbatim with the load-action bootstrap) and
// publish themselves onto `__phRT`. This chunk consumes `evalGroups` from
// there, adds `actionGatePasses` + the Alpine directive, and re-publishes
// `actionGatePasses`. The `device` branch reads the `MOBILE` preamble global.
// Everything is a real TS function whose body is concatenated through
// `stringifyChunk` — globals declared in [runtime-globals.d.ts](./runtime-globals.d.ts).

import { CONDITION_EVAL_CHUNK } from "../../../../utils/conditions/clientScript";
import { stringifyChunk } from "./stringifyChunk";

const CONDITIONS_BODY = stringifyChunk(function $conditions() {
  const { evalGroups } = __phRT;

  function actionGatePasses(action: { conditions?: unknown[] } | null) {
    if (!action || !action.conditions || !action.conditions.length) return true;
    return evalGroups(action.conditions) !== false;
  }

  // SSR emits <div data-ph-condition-groups="…" style="display:none">; this
  // flips display to '' when evalGroups passes. _store.revision read makes
  // it reactive.
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
  // evalCond/evalAll/evalGroups are already published by CONDITION_EVAL_CHUNK.
  Object.assign(__phRT, { actionGatePasses });
});

export function getConditionsChunk(): string {
  return `
${CONDITION_EVAL_CHUNK}
${CONDITIONS_BODY}
`;
}
