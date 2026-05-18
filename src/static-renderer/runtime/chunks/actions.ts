// Action dispatcher (15+ action types) + actions directive.

export const ACTIONS_CHUNK = `
function fireAction(action, ev, itemContext){
  if (!action || !action.type) return;
  if (!actionGatePasses(action)) return;
  var t = action.type;

  if (t === 'link' || t === 'scroll-to') {
    var href = (t === 'scroll-to') ? null : action.href;
    var anchor = (t === 'scroll-to') ? action.anchor : (typeof href === 'string' && href.charAt(0) === '#' ? href.slice(1) : null);
    if (anchor) {
      if (ev) ev.preventDefault();
      if (anchor === 'top') { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
      var el = document.getElementById(anchor);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // Match native <a href="#x"> URL semantics; replaceState avoids back-stack pollution.
      if (t === 'link') {
        try { history.replaceState(history.state, '', '#' + anchor); } catch(e){}
      }
      return;
    }
    if (t === 'link' && href) {
      if (ev) ev.preventDefault();
      var resolved = interpolateItem(href, itemContext);
      if (action.target === '_blank') window.open(resolved, '_blank', 'noopener,noreferrer');
      else window.location.assign(resolved);
    }
    return;
  }
  if (t === 'open-modal') {
    if (ev) ev.preventDefault();
    var mEl = document.getElementById(action.anchor);
    if (mEl) toggleEl(mEl, 'class');
    return;
  }
  if (t === 'show-hide') {
    if (ev) ev.preventDefault && ev.preventDefault();
    applyShowHide(action);
    return;
  }
  if (t === 'toggle-theme') {
    if (ev) ev.preventDefault();
    var next = !document.documentElement.classList.contains('dark');
    document.documentElement.classList.toggle('dark', next);
    try { localStorage.setItem('theme', next ? 'dark' : 'light'); } catch(e){}
    return;
  }
  if (t === 'set-local-storage') {
    try { if (action.key) localStorage.setItem(action.key, action.value || ''); } catch(e){}
    return;
  }
  if (t === 'remove-local-storage') {
    try { if (action.key) localStorage.removeItem(action.key); } catch(e){}
    return;
  }
  if (t === 'copy-to-clipboard') {
    var text = interpolateItem(action.text, itemContext);
    if (!text) return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(text); return; }
    } catch(e){}
    try {
      var ta = document.createElement('textarea'); ta.value = text;
      ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
    } catch(e){}
    return;
  }
  if (t === 'download-file') {
    var url = interpolateItem(action.url, itemContext);
    if (!url) return;
    if (ev) ev.preventDefault();
    var a = document.createElement('a');
    a.href = url;
    var fn = interpolateItem(action.filename, itemContext);
    a.download = fn || '';
    a.rel = 'noopener'; a.style.display = 'none';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    return;
  }
  if (t === 'set-state') {
    if (!action.key) return;
    var sk = resolveActionKey(action.key, itemContext);
    var sv = interpolateItem(action.value, itemContext);
    setState(sk, { kind: action.kind || 'value', value: sv, source: 'runtime' }, 'set-state');
    return;
  }
  if (t === 'toggle-state') {
    if (!action.key) return;
    var tk = resolveActionKey(action.key, itemContext);
    var cur = getStateValue(tk);
    var kind = action.kind || (getState(tk) && getState(tk).kind) || 'flag';
    var pair = action.values || (kind === 'visibility' ? ['shown', 'hidden'] : (kind === 'flag' ? ['on', 'off'] : null));
    if (!pair) return;
    var nx = cur === pair[0] ? pair[1] : pair[0];
    setState(tk, { kind: kind, value: nx, source: 'runtime' }, 'toggle-state');
    return;
  }
  if (t === 'clear-state') {
    if (!action.key) return;
    deleteState(resolveActionKey(action.key, itemContext));
    return;
  }
  if (t === 'increment-state' || t === 'decrement-state') {
    var ik = resolveActionKey(action.key, itemContext);
    if (!ik) return;
    var sign = t === 'increment-state' ? 1 : -1;
    var step = (action.step != null ? action.step : 1) * sign;
    var n = parseInt(getStateValue(ik) || '0', 10) || 0;
    var nv = n + step;
    var maxRaw = action.max;
    var maxN = undefined;
    if (typeof maxRaw === 'number') maxN = maxRaw;
    else if (typeof maxRaw === 'string') {
      if (maxRaw.indexOf('state:') === 0) {
        var rr = parseInt(getStateValue(maxRaw.slice(6)) || '', 10);
        if (isFinite(rr)) maxN = rr;
      } else {
        var pn = parseInt(maxRaw, 10);
        if (isFinite(pn)) maxN = pn;
      }
    }
    var minN = action.min;
    if (action.wrap) {
      if (maxN !== undefined && nv > maxN) nv = minN != null ? minN : 0;
      else if (minN !== undefined && nv < minN) nv = maxN != null ? maxN : minN;
    } else {
      if (maxN !== undefined) nv = Math.min(maxN, nv);
      if (minN !== undefined) nv = Math.max(minN, nv);
    }
    setState(ik, { kind: 'value', value: String(nv), source: 'runtime' }, t);
    return;
  }
  if (t === 'add-to-cart') {
    if (ev) ev.preventDefault();
    // Standalone "Buy X" buttons (no repeater) supply product fields on the action itself.
    if (!itemContext && (action.productId || action.priceId)) {
      itemContext = {
        id: action.productId || action.priceId,
        title: action.title || 'Item',
        price: action.price || 0,
        currency: action.currency || 'usd',
        metadata: { priceId: action.priceId || action.productId, sku: action.sku },
      };
    }
    if (!itemContext) { console.warn('[PageHub] add-to-cart needs item context'); return; }
    var qty = action.quantity || 1;
    if (action.quantityField) {
      var btn = ev && ev.currentTarget;
      var scope = btn && btn.closest('form, section, body');
      var fld = scope && scope.querySelector('[name="' + action.quantityField + '"]');
      var pp = fld ? Number(fld.value) : NaN;
      if (isFinite(pp) && pp > 0) qty = Math.floor(pp);
    }
    var item = itemContext;
    var matchedOk = false;
    if (action.variantMatchStateKey) {
      var vk = interpolateItem(action.variantMatchStateKey, itemContext) || action.variantMatchStateKey;
      var raw = getStateValue(vk);
      if (raw) {
        try {
          var matched = JSON.parse(raw);
          if (matched && typeof matched === 'object') {
            item = Object.assign({}, itemContext, matched, {
              metadata: Object.assign({}, (itemContext.metadata || {}), { priceId: matched.priceId, sku: matched.sku || (itemContext.metadata && itemContext.metadata.sku) })
            });
            matchedOk = true;
          }
        } catch(e){}
      }
    }
    if (itemContext.hasMultipleVariants && !matchedOk) {
      setState('cart:error', { kind: 'value', value: 'Select an option before adding to cart', source: 'runtime' }, 'add-to-cart');
      return;
    }
    setState('cart:error', { kind: 'value', value: '', source: 'runtime' }, 'add-to-cart');
    addToCart(item, qty);
    return;
  }
  if (t === 'toggle-cart') {
    if (ev) ev.preventDefault();
    var cur2 = getStateValue('cart:open');
    setVisibility('cart:open', cur2 === 'shown' ? 'hidden' : 'shown', 'toggle-cart');
    return;
  }
  if (t === 'cart-checkout') {
    if (ev) ev.preventDefault();
    cartCheckout();
    return;
  }
  if (t === 'manage-subscription') {
    if (ev) ev.preventDefault();
    fetch('/api/customer/portal', { method: 'POST', credentials: 'include' })
      .then(function(r){ return r.json(); })
      .then(function(d){ if (d && d.url) window.location.href = d.url; })
      .catch(function(){});
    return;
  }
  if (t === 'agent-send') {
    if (ev) ev.preventDefault();
    var bt = ev && ev.currentTarget;
    var root = bt && bt.closest('[data-ph-agent-chat]');
    if (!root) return;
    var fn2 = (action.field || 'agentMessage');
    fn2 = interpolateItem(fn2, itemContext) || fn2;
    var fld2 = root.querySelector('[name="' + fn2 + '"]');
    var val = fld2 ? (fld2.value || '').trim() : '';
    if (!val) return;
    var cid = root.id || 'ph-chat-default';
    setState(cid + ':outbox', { kind: 'value', value: JSON.stringify({ nonce: Date.now(), value: val }), source: 'runtime' }, 'agent-send');
    if (fld2) { fld2.value = ''; fld2.focus(); }
    return;
  }
}

Alpine.directive('actions', function(el, _meta, _ctx){
  var cleanup = _ctx.cleanup;
  var raw = el.getAttribute('data-ph-actions');
  if (!raw) return;
  var actions; try { actions = JSON.parse(raw); } catch(e){ return; }
  if (!Array.isArray(actions) || !actions.length) return;
  var itemContext = readItemContext(el);
  var clickActions = [], enterActions = [], leaveActions = [];
  for (var k=0; k<actions.length; k++) {
    var a = actions[k];
    if (!a || a.trigger === 'load' || a.trigger === 'interval') continue;
    if (a.trigger === 'hover') {
      enterActions.push(a);
      if (a.type === 'set-state' || a.type === 'toggle-state' || a.type === 'clear-state' || a.type === 'show-hide') leaveActions.push(a);
    } else {
      clickActions.push(a);
    }
  }
  var onClick = null, onEnter = null, onLeave = null;
  if (clickActions.length) {
    onClick = function(e){
      for (var i=0; i<clickActions.length; i++) fireAction(clickActions[i], e, itemContext);
    };
    el.addEventListener('click', onClick);
  }
  var hoverSnap = {};
  if (enterActions.length) {
    onEnter = function(e){
      for (var i=0; i<enterActions.length; i++) {
        var a = enterActions[i];
        if (a.type === 'set-state' || a.type === 'toggle-state' || a.type === 'clear-state') {
          var snapKey = resolveActionKey(a.key, itemContext);
          if (snapKey && !(snapKey in hoverSnap)) {
            var snapPrev = getState(snapKey);
            hoverSnap[snapKey] = snapPrev
              ? { kind: snapPrev.kind, value: snapPrev.value, source: snapPrev.source, existed: true }
              : { existed: false };
          }
        }
        fireAction(a, e, itemContext);
      }
    };
    el.addEventListener('mouseenter', onEnter);
  }
  if (leaveActions.length) {
    onLeave = function(e){
      for (var i=0; i<leaveActions.length; i++) {
        var a = leaveActions[i];
        if (a.type === 'show-hide') { revertShowHide(a); continue; }
        if (a.type === 'set-state' || a.type === 'toggle-state' || a.type === 'clear-state') {
          var k = resolveActionKey(a.key, itemContext);
          if (!k) continue;
          var snap = hoverSnap[k];
          delete hoverSnap[k];
          if (snap && snap.existed) {
            setState(k, { kind: snap.kind, value: snap.value, source: snap.source }, 'hover-revert');
          } else {
            deleteState(k);
          }
        }
      }
    };
    el.addEventListener('mouseleave', onLeave);
  }
  cleanup(function(){
    if (onClick) el.removeEventListener('click', onClick);
    if (onEnter) el.removeEventListener('mouseenter', onEnter);
    if (onLeave) el.removeEventListener('mouseleave', onLeave);
  });
});
`;
