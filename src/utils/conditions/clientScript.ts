/**
 * Inline <script> for evaluating conditions in static HTML exports.
 * Runs on page load — evaluates URL params and viewport width,
 * then shows/hides elements with data-ph-conditions.
 */
export const CONDITION_EVAL_SCRIPT = `<script>
(function(){
  var params = new URLSearchParams(window.location.search);
  var vw = window.innerWidth;
  var MOBILE = 768;

  function walkPath(obj, parts) {
    var val = obj;
    for (var i = 0; i < parts.length; i++) {
      if (val && typeof val === 'object') {
        val = val[parts[i]];
      } else {
        return undefined;
      }
    }
    return val;
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
    if (c.type === 'url-param') {
      return applyOp(params.get(c.key), c.operator, c.value);
    }
    if (c.type === 'device') {
      var isMobile = vw < MOBILE;
      var expected = c.value === 'mobile';
      return c.operator === 'equals' ? isMobile === expected : isMobile !== expected;
    }
    if (c.type === 'form-field') {
      var anchor = (c.target || c.key || '').replace(/["\\]/g, '');
      var el = anchor ? document.querySelector('[data-anchor="' + anchor + '"]') : null;
      var val = el ? (el.value || el.textContent || '') : null;
      return applyOp(val, c.operator, c.value);
    }
    // connector and company conditions can't be evaluated client-side in static export
    return true;
  }

  function evalAll(conds, logic) {
    if (!conds || !conds.length) return true;
    if (logic === 'any') {
      for (var i = 0; i < conds.length; i++) {
        if (evalCond(conds[i])) return true;
      }
      return false;
    }
    for (var j = 0; j < conds.length; j++) {
      if (!evalCond(conds[j])) return false;
    }
    return true;
  }

  document.querySelectorAll('[data-ph-conditions]').forEach(function(el) {
    var conds = JSON.parse(el.getAttribute('data-ph-conditions'));
    var logic = el.getAttribute('data-ph-condition-logic') || 'all';
    if (evalAll(conds, logic)) el.style.display = '';
  });

  document.querySelectorAll('[data-ph-condition-group]').forEach(function(el) {
    var branches = JSON.parse(el.getAttribute('data-ph-branches'));
    var children = el.children;
    var matched = false;
    for (var i = 0; i < branches.length && i < children.length; i++) {
      if (!matched && evalAll(branches[i].conditions || [], branches[i].conditionLogic || 'all')) {
        children[i].style.display = '';
        matched = true;
      } else {
        children[i].style.display = 'none';
      }
    }
  });
})();
</script>`;
