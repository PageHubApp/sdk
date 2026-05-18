// Condition evaluation + conditions directives.
// `buildConditionEvalFns` injects evalCond/evalGroups/evalAll using a literal
// mobile breakpoint, so this chunk is a function that takes that value.

import { buildConditionEvalFns } from "../../../utils/conditions/clientScript";

export function getConditionsChunk(mobileBreakpoint: number): string {
  return `
${buildConditionEvalFns({ mobileBreakpoint })}
function actionGatePasses(action){
  if (!action || !action.conditions || !action.conditions.length) return true;
  return evalGroups(action.conditions) !== false;
}

// SSR emits <div data-ph-conditions="…" style="display:none">; this flips
// display to '' when evalAll passes. _store.revision read makes it reactive.
Alpine.directive('conditions', function(el, _, opts){
  var conds; try { conds = JSON.parse(el.getAttribute('data-ph-conditions') || '[]'); } catch(e){ conds = []; }
  var logic = el.getAttribute('data-ph-condition-logic') || 'all';
  opts.effect(function(){
    void _store.revision;
    el.style.display = evalAll(conds, logic) ? '' : 'none';
  });
});
Alpine.directive('condition-groups', function(el, _, opts){
  var groups; try { groups = JSON.parse(el.getAttribute('data-ph-condition-groups') || '[]'); } catch(e){ groups = []; }
  opts.effect(function(){
    void _store.revision;
    el.style.display = evalGroups(groups) ? '' : 'none';
  });
});
`;
}
