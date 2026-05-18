// Item context, interpolation, visibility helpers, axis helpers, runComputed.

export const ITEMS_CHUNK = `
function walkItem(obj, parts){
  var v = obj;
  for (var i=0; i<parts.length; i++) {
    var p = parts[i];
    if (v == null || typeof v !== 'object') return undefined;
    if (Array.isArray(v) && /^\\d+$/.test(p)) v = v[parseInt(p, 10)];
    else if (p in v) v = v[p];
    else return undefined;
  }
  return v;
}
function interpolateItem(raw, item){
  if (raw == null) return '';
  if (typeof raw !== 'string' || !item) return String(raw);
  return raw.replace(/\\{\\{\\s*item\\.([\\w.\\[\\]]+)\\s*\\}\\}/g, function(_, path){
    var cleaned = path.replace(/\\[(\\d+)\\]/g, '.$1');
    var v = walkItem(item, cleaned.split('.'));
    return v == null ? '' : String(v);
  });
}
function resolveActionKey(raw, item){
  if (!raw) return '';
  var out = interpolateItem(raw, item);
  if (/\\{\\{\\s*item\\./i.test(out)) return '';
  return out || raw;
}

function readItemContext(el){
  // Walk up for data-item-json (full item) or data-item-id (just { id }).
  var cur = el;
  while (cur) {
    if (cur.hasAttribute && cur.hasAttribute('data-item-json')) {
      try { return JSON.parse(cur.getAttribute('data-item-json')); } catch(e){}
    }
    if (cur.hasAttribute && cur.hasAttribute('data-item-id')) {
      return { id: cur.getAttribute('data-item-id') };
    }
    cur = cur.parentElement;
  }
  return null;
}

function showEl(el, method){
  if (method === 'style') { el.style.display = 'block'; return; }
  el.classList.remove('hidden');
  if (el.id) setVisibility(el.id, 'shown');
}
function hideEl(el, method){
  if (method === 'style') { el.style.display = 'none'; return; }
  el.classList.add('hidden');
  if (el.id) setVisibility(el.id, 'hidden');
}
function toggleEl(el, method){
  if (method === 'style') { el.style.display = el.style.display === 'none' ? 'block' : 'none'; return; }
  var willHide = !el.classList.contains('hidden');
  el.classList.toggle('hidden');
  if (el.id) setVisibility(el.id, willHide ? 'hidden' : 'shown');
}
function applyShowHide(action){
  var el = document.getElementById(action.target);
  if (!el) return;
  var method = action.method || 'class';
  if (action.direction === 'tab') {
    var group = action.group || action.target;
    var panels = document.querySelectorAll('[data-tab-group="' + group + '"]');
    for (var i=0; i<panels.length; i++) hideEl(panels[i], method);
    showEl(el, method);
  } else if (action.direction === 'show') showEl(el, method);
  else if (action.direction === 'hide') hideEl(el, method);
  else toggleEl(el, method);
}
function revertShowHide(action){
  var el = document.getElementById(action.target);
  if (!el) return;
  var method = action.method || 'class';
  if (action.direction === 'show') hideEl(el, method);
  else if (action.direction === 'hide') showEl(el, method);
}

function toAxisArray(value){
  if (!value) return [];
  if (Object.prototype.toString.call(value) === '[object Array]') return value;
  return String(value).split(',').map(function(s){ return s.replace(/^\\s+|\\s+$/g, ''); }).filter(Boolean);
}
function axisToSlot(axes){
  var out = {};
  for (var i=0; i<axes.length && i<3; i++) out[axes[i]] = 'option' + (i+1);
  return out;
}
function parseVariantMap(raw){
  if (!raw) return [];
  try { var p = JSON.parse(raw); return Object.prototype.toString.call(p) === '[object Array]' ? p : []; } catch(e){ return []; }
}
function hasUnresolvedItemToken(s){ return /\\{\\{\\s*item\\./i.test(String(s)); }

function runComputed(binding, interp){
  var c = binding.compute;
  var t = c && c.type;
  var i, k, v;
  if (t === 'all-truthy') {
    var fromKeys = binding.from || [];
    for (i=0; i<fromKeys.length; i++) { k = interp(fromKeys[i]); if (k) { if (getStateValue(k) == null || getStateValue(k) === '') return ''; } }
    return fromKeys.length ? 'on' : '';
  }
  if (t === 'first-truthy') {
    var fk = binding.from || [];
    for (i=0; i<fk.length; i++) { k = interp(fk[i]); if (!k) continue; v = getStateValue(k); if (v != null && v !== '') return v; }
    return '';
  }
  if (t === 'join') {
    var sep = c.separator != null ? c.separator : ',';
    var fk2 = binding.from || [];
    var vals = [];
    for (i=0; i<fk2.length; i++) { k = interp(fk2[i]); if (!k) continue; v = getStateValue(k); if (v != null && v !== '') vals.push(v); }
    return vals.join(sep);
  }
  if (t === 'variant-match') {
    var rawMap = interp(c.variantMap);
    var rawAxes = typeof c.axes === 'string' ? interp(c.axes) : (c.axes || []).join(',');
    if (hasUnresolvedItemToken(rawMap) || hasUnresolvedItemToken(rawAxes)) return '';
    var variants = parseVariantMap(rawMap);
    var axes = toAxisArray(rawAxes);
    var slots = axisToSlot(axes);
    var sel = {};
    for (i=0; i<axes.length; i++) {
      var sk = interp(c.axisKeyTemplate.replace(/%axis%/g, axes[i]));
      if (hasUnresolvedItemToken(sk)) return '';
      v = getStateValue(sk);
      if (v != null && v !== '') sel[axes[i]] = v;
    }
    var complete = axes.length > 0;
    for (i=0; i<axes.length; i++) if (!sel[axes[i]]) { complete = false; break; }
    if (!complete) return '';
    for (i=0; i<variants.length; i++) {
      var vv = variants[i];
      var ok = true;
      for (var ai=0; ai<axes.length; ai++) if (vv[slots[axes[ai]]] !== sel[axes[ai]]) { ok = false; break; }
      if (ok && vv.inventory !== 0) return JSON.stringify(vv);
    }
    return '';
  }
  if (t === 'variant-axis-availability') {
    var rawMap2 = interp(c.variantMap);
    var rawOther = typeof c.otherAxes === 'string' ? interp(c.otherAxes) : (c.otherAxes || []).join(',');
    if (hasUnresolvedItemToken(rawMap2) || hasUnresolvedItemToken(rawOther)) return '';
    var variants2 = parseVariantMap(rawMap2);
    var otherAxes = toAxisArray(rawOther);
    var allAxes = [c.axis].concat(otherAxes);
    var slots2 = axisToSlot(allAxes);
    var sel2 = {};
    for (i=0; i<otherAxes.length; i++) {
      var sk2 = interp(c.axisKeyTemplate.replace(/%axis%/g, otherAxes[i]));
      if (hasUnresolvedItemToken(sk2)) return '';
      v = getStateValue(sk2);
      if (v != null && v !== '') sel2[otherAxes[i]] = v;
    }
    var candidates = {};
    for (i=0; i<variants2.length; i++) {
      var cand = variants2[i][slots2[c.axis]];
      if (typeof cand === 'string') candidates[cand] = true;
    }
    var unavailable = [];
    for (var candName in candidates) {
      var live = false;
      for (i=0; i<variants2.length; i++) {
        var vr = variants2[i];
        if (vr[slots2[c.axis]] !== candName) continue;
        if (vr.inventory === 0) continue;
        var matches = true;
        for (var oi=0; oi<otherAxes.length; oi++) {
          if (!sel2[otherAxes[oi]]) continue;
          if (vr[slots2[otherAxes[oi]]] !== sel2[otherAxes[oi]]) { matches = false; break; }
        }
        if (matches) { live = true; break; }
      }
      if (!live) unavailable.push(candName);
    }
    return unavailable.join(',');
  }
  return '';
}
`;
