// State registry, directives, and URL ↔ state bridge.
// Pure JS string — concatenated into the static-publish IIFE.
// Depends on: PAGE_ID, _store, Alpine, STATE_ATTRS (preamble in orchestrator).

export const STATE_CHUNK = `
Alpine.directive('state-text', function(el, _dir, utils){
  var key = el.getAttribute('data-state-text');
  if (!key) return;
  utils.effect(function(){
    var entry = _store.entries[key];
    el.textContent = entry && entry.value != null ? entry.value : '';
  });
});

Alpine.directive('state-show-when-truthy', function(el, _dir, utils){
  var key = el.getAttribute('data-state-show-when-truthy');
  if (!key) return;
  utils.effect(function(){
    var entry = _store.entries[key];
    var v = entry ? entry.value : undefined;
    var truthy = v != null && v !== '' && v !== '0' && v !== 'false';
    el.classList.toggle('hidden', !truthy);
  });
});

Alpine.directive('visibility-state-key', function(el, _dir, utils){
  var key = el.getAttribute('data-visibility-state-key');
  if (!key) return;
  utils.effect(function(){
    var entry = _store.entries[key];
    var v = entry ? entry.value : undefined;
    if (v === 'shown') el.classList.remove('hidden');
    else if (v === 'hidden') el.classList.add('hidden');
  });
});

Alpine.directive('state-style-bindings', function(el, _dir, utils){
  var raw = el.getAttribute('data-state-style-bindings');
  var bindings;
  try { bindings = JSON.parse(raw); } catch(e){ return; }
  if (!Array.isArray(bindings) || !bindings.length) return;
  utils.effect(function(){
    for (var b=0; b<bindings.length; b++) {
      var bd = bindings[b];
      var entry = _store.entries[bd.key];
      var val = entry ? entry.value : undefined;
      if (val == null || val === '') val = bd.defaultValue != null ? bd.defaultValue : '0';
      var out = bd.template ? bd.template.replace(/\\{\\{\\s*value\\s*\\}\\}/g, val) : val;
      if (bd.styleProp.indexOf('--') === 0) el.style.setProperty(bd.styleProp, out);
      else el.style[bd.styleProp] = out;
    }
  });
});

Alpine.directive('state-modifiers', function(el, _dir, utils){
  var raw = el.getAttribute('data-state-modifiers');
  var bindings;
  try { bindings = JSON.parse(raw); } catch(e){ return; }
  if (!Array.isArray(bindings) || !bindings.length) return;
  var classLists = bindings.map(function(bd){
    if (typeof bd.classes === 'string' && bd.classes) return bd.classes.split(/\\s+/).filter(Boolean);
    if (Array.isArray(bd.modifiers)) return bd.modifiers.map(function(m){ return 'ph-mod-' + m; });
    return [];
  });
  // Walk conditions once to collect every state-key the directive reads.
  var trackedKeys = [];
  var seen = {};
  function collect(gs){
    if (!Array.isArray(gs)) return;
    for (var g=0; g<gs.length; g++) {
      var conds = gs[g].conditions || [];
      for (var c=0; c<conds.length; c++) {
        var co = conds[c];
        if (!co || !co.key) continue;
        if (co.type !== 'state' && co.type !== 'url-param' && co.type !== 'localStorage') continue;
        var sk = co.type === 'url-param' ? ('url:' + co.key) : co.key;
        if (seen[sk]) continue;
        seen[sk] = true;
        trackedKeys.push(sk);
      }
    }
  }
  for (var bi=0; bi<bindings.length; bi++) collect(bindings[bi].conditions);
  utils.effect(function(){
    for (var ti=0; ti<trackedKeys.length; ti++) void _store.entries[trackedKeys[ti]];
    for (var b=0; b<bindings.length; b++) {
      var pass = evalGroups(bindings[b].conditions) === true;
      var cls = classLists[b];
      for (var ci=0; ci<cls.length; ci++) el.classList.toggle(cls[ci], pass);
    }
  });
});

Alpine.directive('state-binding', function(el, _dir, utils){
  var raw = el.getAttribute('data-state-binding');
  var b;
  try { b = JSON.parse(raw); } catch(e){ return; }
  if (!b || !b.key) return;
  var input = el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT'
    ? el : el.querySelector('input, textarea, select');
  if (!input) return;
  var isChecked = b.mode === 'checked';
  var debounceMs = b.debounceMs || 0;
  var timer = null;
  var lastWrite = null;
  function writeToState(v){
    if (timer) clearTimeout(timer);
    var fire = function(){ lastWrite = v; setState(b.key, { kind: 'value', value: v, source: 'runtime' }, 'form-element'); };
    if (debounceMs > 0) timer = setTimeout(fire, debounceMs);
    else fire();
  }
  var initial = _store.entries[b.key];
  var initialVal = initial ? initial.value : undefined;
  if (initialVal == null || initialVal === '') {
    var dv = b.defaultValue;
    if (dv) setState(b.key, { kind: 'value', value: String(dv), source: 'load' }, 'form-element');
  }
  function onChange(){
    if (isChecked) writeToState(input.checked ? (input.value || 'on') : '');
    else writeToState(input.value);
  }
  input.addEventListener(isChecked ? 'change' : 'input', onChange);
  utils.cleanup(function(){
    if (timer) clearTimeout(timer);
    input.removeEventListener(isChecked ? 'change' : 'input', onChange);
  });
  utils.effect(function(){
    var entry = _store.entries[b.key];
    var v = entry ? entry.value : undefined;
    if (v == null) v = '';
    if (v === lastWrite) return;
    if (document.activeElement === input) return;
    if (isChecked) {
      var want = v === (input.value || 'on') || v === 'on';
      if (input.checked !== want) input.checked = want;
    } else {
      if (input.value !== v) input.value = v;
    }
  });
});

Alpine.directive('publish-state-keys', function(el){
  var raw = el.getAttribute('data-publish-state-keys');
  var keys;
  try { keys = JSON.parse(raw); } catch(e){ return; }
  if (!keys || typeof keys !== 'object') return;
  var count = el.querySelectorAll('[data-item-id]').length;
  if (keys.count) setState(keys.count, { kind: 'value', value: String(count), source: 'load' }, 'publish');
  if (keys.totalCount) setState(keys.totalCount, { kind: 'value', value: String(count), source: 'load' }, 'publish');
});

Alpine.directive('computed-state-bindings', function(el, _dir, utils){
  var raw = el.getAttribute('data-computed-state-bindings');
  var bindings;
  try { bindings = JSON.parse(raw); } catch(e){ return; }
  if (!Array.isArray(bindings) || !bindings.length) return;
  var itemContext = readItemContext(el);
  function interp(v){
    if (typeof v !== 'string' || !v) return v == null ? '' : String(v);
    return interpolateItem(v, itemContext);
  }
  utils.effect(function(){
    for (var i=0; i<bindings.length; i++) {
      var bd = bindings[i];
      if (!bd || !bd.compute) continue;
      var outKey = interp(bd.key);
      if (!outKey) continue;
      var nextVal = runComputed(bd, interp);
      var cur = _store.entries[outKey];
      if (cur && cur.value === nextVal) continue;
      setState(outKey, { kind: 'value', value: nextVal, source: 'computed' }, 'computed');
    }
  });
});

function installEsc(){
  if (_escInstalled) return; _escInstalled = true;
  document.addEventListener('keydown', function(e){
    if (e.key !== 'Escape' || !_shownStack.length) return;
    for (var i=_shownStack.length-1; i>=0; i--) {
      var top = _shownStack[i];
      var entry = _store.entries[top];
      if (!entry) { _shownStack.splice(i, 1); continue; }
      if (entry.source === 'computed') continue;
      var el = document.getElementById(top);
      if (el && el.getAttribute('data-close-on-escape') === 'false') continue;
      if (el) el.classList.add('hidden');
      setVisibility(top, 'hidden', 'esc');
      return;
    }
  });
}
function getState(key){ return _store.entries[key]; }
function getStateValue(key){ var e = _store.entries[key]; return e ? e.value : undefined; }
// disableEffectScheduling makes setState fire dependent effects synchronously,
// matching the old notify() contract that tests + custom JS handlers expect.
function setState(key, patch, writer){
  if (!key) return;
  Alpine.disableEffectScheduling(function(){
    var prev = _store.entries[key];
    var next = {
      key: key,
      kind: patch.kind != null ? patch.kind : (prev ? prev.kind : 'value'),
      value: patch.value !== undefined ? patch.value : (prev ? prev.value : null),
      source: patch.source != null ? patch.source : (prev ? prev.source : 'runtime'),
      lastWriter: writer != null ? writer : (patch.lastWriter != null ? patch.lastWriter : (prev ? prev.lastWriter : undefined))
    };
    if (!window.__PH_STATE__) window.__PH_STATE__ = {};
    window.__PH_STATE__[key] = { kind: next.kind, value: next.value };
    if (prev && prev.value === next.value && prev.kind === next.kind && prev.source === next.source) {
      // Identity-preserving update — mutate so the Proxy 'set' trap stays quiet.
      prev.lastWriter = next.lastWriter;
      return;
    }
    _store.entries[key] = next;
    _store.revision++;
    if (next.kind === 'visibility') {
      var idx = _shownStack.indexOf(key);
      if (next.value === 'shown') {
        if (idx !== -1) _shownStack.splice(idx, 1);
        _shownStack.push(key);
        installEsc();
      } else if (idx !== -1) {
        _shownStack.splice(idx, 1);
      }
    }
  });
}
function deleteState(key){
  if (!(key in _store.entries)) return;
  Alpine.disableEffectScheduling(function(){
    delete _store.entries[key];
    _store.revision++;
    if (window.__PH_STATE__) delete window.__PH_STATE__[key];
    var idx = _shownStack.indexOf(key);
    if (idx !== -1) _shownStack.splice(idx, 1);
  });
}
function setVisibility(key, value, writer){
  setState(key, { kind: 'visibility', value: value, source: 'runtime' }, writer);
}
function listStates(){
  var out = []; for (var k in _store.entries) out.push(_store.entries[k]); return out;
}
// subscribe — keyed: rerun fn on entries[key] mutation; global: rerun on
// store.revision bump. First call fires synchronously.
function subscribe(keyOrFn, fn){
  var runner;
  if (typeof keyOrFn === 'function') {
    runner = Alpine.effect(function(){ void _store.revision; keyOrFn(); });
  } else {
    runner = Alpine.effect(function(){ void _store.entries[keyOrFn]; fn(); });
  }
  return function(){ try { Alpine.release(runner); } catch(e){} };
}

function seedFromWindow(){
  var seed = window.__PH_STATE__;
  if (!seed) return;
  for (var key in seed) {
    if (!key) continue;
    var raw = seed[key];
    setState(key, { kind: (raw && raw.kind) || 'value', value: raw ? raw.value : null, source: 'load' }, 'seed');
  }
}

var URL_PREFIX = 'url:';
function syncUrlToState(source){
  var params = new URLSearchParams(window.location.search);
  var seen = {};
  params.forEach(function(v, k){
    seen[k] = true;
    setState(URL_PREFIX + k, { kind: 'value', value: v, source: source }, 'url-bridge');
  });
  var all = listStates();
  for (var i=0; i<all.length; i++) {
    var entry = all[i];
    if (entry.key.indexOf(URL_PREFIX) !== 0) continue;
    var param = entry.key.slice(URL_PREFIX.length);
    if (!seen[param] && entry.value) {
      setState(entry.key, { kind: 'value', value: '', source: source }, 'url-bridge');
    }
  }
}
function syncStateToUrl(){
  var next = new URLSearchParams();
  var all = listStates();
  for (var i=0; i<all.length; i++) {
    var entry = all[i];
    if (entry.key.indexOf(URL_PREFIX) !== 0) continue;
    var param = entry.key.slice(URL_PREFIX.length);
    if (typeof entry.value === 'string' && entry.value.length > 0) next.set(param, entry.value);
  }
  var nextSearch = next.toString();
  var cur = window.location.search.replace(/^\\?/, '');
  if (nextSearch === cur) return;
  var url = window.location.pathname + (nextSearch ? '?' + nextSearch : '') + window.location.hash;
  window.history.pushState({}, '', url);
}
function mountUrlBridge(){
  syncUrlToState('load');
  window.addEventListener('popstate', function(){ syncUrlToState('runtime'); });
  subscribe(function(){ syncStateToUrl(); });
}
`;
