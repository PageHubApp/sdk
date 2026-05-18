// Repeater: slot interpolation, DOM reconciler, state-inputs (refetch) directive.

export const REPEATER_CHUNK = `
function walkSlotPath(obj, parts){
  var v = obj;
  for (var i=0; i<parts.length; i++) {
    if (v == null) return null;
    var p = parts[i];
    if (Object.prototype.toString.call(v) === '[object Array]' && /^\\d+$/.test(p)) v = v[parseInt(p,10)];
    else if (typeof v === 'object' && p in v) v = v[p];
    else return null;
  }
  return v;
}
function renderTemplate(tmpl, item){
  return String(tmpl).replace(/\\{\\{slot:([\\w.]+)\\}\\}/g, function(_, path){
    var v = walkSlotPath(item, path.split('.'));
    if (v == null) return '';
    return String(v)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  });
}
// Reconcile child rows of a repeater wrapper. Keeps DOM nodes with unchanged
// item ids (preserves focus, animations); replaces or inserts new rows;
// removes stale rows.
function reconcileItems(wrapper, template, items){
  if (!template) return;
  var existing = wrapper.querySelectorAll(':scope > [data-item-id]');
  var byId = {};
  for (var i=0; i<existing.length; i++) byId[existing[i].getAttribute('data-item-id')] = existing[i];
  var seen = {};
  var anchor = null;
  for (var j=0; j<items.length; j++) {
    var item = items[j];
    var id = String(item && (item.id != null ? item.id : j));
    seen[id] = true;
    var cur = byId[id];
    if (cur) {
      var expectedNext = anchor ? anchor.nextElementSibling : wrapper.firstElementChild;
      if (cur !== expectedNext) wrapper.insertBefore(cur, anchor ? anchor.nextSibling : wrapper.firstChild);
      anchor = cur;
      continue;
    }
    var html = renderTemplate(template, item);
    var tmp = document.createElement('div');
    tmp.innerHTML = html;
    var row = tmp.firstElementChild;
    if (!row) continue;
    row.setAttribute('data-item-id', id);
    wrapper.insertBefore(row, anchor ? anchor.nextSibling : wrapper.firstChild);
    anchor = row;
  }
  for (var k=0; k<existing.length; k++) {
    var idk = existing[k].getAttribute('data-item-id');
    if (!seen[idk]) existing[k].parentNode && existing[k].parentNode.removeChild(existing[k]);
  }
}

function debounce(fn, ms){
  var t = null;
  return function(){
    var args = arguments;
    if (t) clearTimeout(t);
    t = setTimeout(function(){ fn.apply(null, args); }, ms);
  };
}

// state-scope: repeater whose items come from a JSON-encoded array in the
// state registry. Author writes via window.__phSetData(key, [...]); this
// directive subscribes to the key, parses, and reconciles.
Alpine.directive('state-scope', function(el, _meta, utils){
  var key = el.getAttribute('data-state-scope');
  if (!key) return;
  var tplEl = el.querySelector(':scope > template[data-item-template]');
  var templateHTML = tplEl ? tplEl.innerHTML : '';
  utils.effect(function(){
    void _store.entries[key];
    var raw = getStateValue(key);
    var items = null;
    if (raw != null && raw !== '') {
      try {
        var parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        if (Object.prototype.toString.call(parsed) === '[object Array]') items = parsed;
      } catch(e){}
    }
    reconcileItems(el, templateHTML, items || []);
  });
});

// __phSetData / __phGetData — author globals for custom JS handlers that
// produce an array for a state-scoped Data repeater. JSON-encodes on write,
// JSON-decodes on read; state registry stays string-valued.
window.__phSetData = function(key, value){
  if (!key) return;
  var enc;
  try { enc = JSON.stringify(value == null ? null : value); } catch(e){ enc = 'null'; }
  setState(key, { kind: 'value', value: enc, source: 'runtime' }, 'user-script');
};
window.__phGetData = function(key){
  if (!key) return null;
  var raw = getStateValue(key);
  if (raw == null || raw === '') return null;
  try { return JSON.parse(raw); } catch(e){ return null; }
};

Alpine.directive('state-inputs', function(el, _meta, utils){
  if (!el.getAttribute('data-connector-id')) return;
  var provider = el.getAttribute('data-connector-id');
  var collection = el.getAttribute('data-binding-collection') || el.getAttribute('data-binding-key') || '';
  var inputs; try { inputs = JSON.parse(el.getAttribute('data-state-inputs') || ''); } catch(e){ return; }
  if (!inputs || typeof inputs !== 'object') return;
  var tplEl = el.querySelector(':scope > template[data-item-template]');
  var templateHTML = tplEl ? tplEl.innerHTML : '';
  var refetch = debounce(function(){
    if (!PAGE_ID || !provider) return;
    var params = new URLSearchParams();
    params.set('pageId', PAGE_ID);
    params.set('provider', provider);
    var col = collection.split('::')[0] || 'products';
    params.set('collection', col);
    for (var opt in inputs) {
      var v = getStateValue(inputs[opt]);
      if (v != null && v !== '') params.set(opt, v);
    }
    // Smoke harness short-circuit: __PH_CONNECTOR__[provider][col] = [...].
    var seed = window.__PH_CONNECTOR__ && window.__PH_CONNECTOR__[provider] && window.__PH_CONNECTOR__[provider][col];
    var promise;
    if (Object.prototype.toString.call(seed) === '[object Array]') {
      promise = Promise.resolve({ items: seed });
    } else {
      promise = fetch(PUBLIC_DATA_ENDPOINT + '?' + params.toString()).then(function(r){ return r.json(); });
    }
    promise
      .then(function(d){
        if (!d || Object.prototype.toString.call(d.items) !== '[object Array]') return;
        reconcileItems(el, templateHTML, d.items);
        var ev = new CustomEvent('pagehub:repeater-refresh', { detail: { collection: col, items: d.items } });
        el.dispatchEvent(ev);
        var pubRaw = el.getAttribute('data-publish-state-keys');
        var pub; try { pub = JSON.parse(pubRaw || ''); } catch(e){}
        if (pub && pub.count) setState(pub.count, { kind: 'value', value: String(d.items.length), source: 'runtime' }, 'publish');
        if (pub && pub.totalCount) setState(pub.totalCount, { kind: 'value', value: String(d.items.length), source: 'runtime' }, 'publish');
      }).catch(function(){});
  }, 100);
  utils.effect(function(){
    for (var opt in inputs) void _store.entries[inputs[opt]];
    refetch();
  });
});
`;
