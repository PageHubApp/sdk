// Cart storage, recompute, mutations, checkout, drawer items directive.

export const CART_CHUNK = `
function readCartFromStorage(){
  if (!PAGE_ID) return [];
  try {
    var raw = localStorage.getItem('ph-cart-' + PAGE_ID);
    var arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch(e) { return []; }
}
function writeCartToStorage(items){
  if (!PAGE_ID) return;
  try { localStorage.setItem('ph-cart-' + PAGE_ID, JSON.stringify(items)); } catch(e){}
}
function recomputeCartState(items){
  var count = 0, total = 0;
  for (var i=0; i<items.length; i++) {
    var line = items[i] || {};
    var qty = Number(line.quantity) || 0;
    count += qty;
    var amount = (line.item && line.item.price && Number(line.item.price.amount)) || 0;
    total += amount * qty;
  }
  setState('cart:items-json', { kind: 'value', value: JSON.stringify(items), source: 'runtime' }, 'cart');
  setState('cart:count', { kind: 'value', value: String(count), source: 'runtime' }, 'cart');
  setState('cart:total', { kind: 'value', value: String(total), source: 'runtime' }, 'cart');
}
function addToCart(item, qty){
  var items = readCartFromStorage();
  var idKey = (item && (item.priceId || item.id)) || null;
  if (!idKey) return;
  var found = false;
  for (var i=0; i<items.length; i++) {
    var line = items[i];
    var lineKey = (line.item && (line.item.priceId || line.item.id)) || null;
    if (lineKey === idKey) { line.quantity = (Number(line.quantity) || 0) + qty; found = true; break; }
  }
  if (!found) items.push({ item: item, quantity: qty });
  writeCartToStorage(items);
  recomputeCartState(items);
  fireAnalytics('add_to_cart', { value: item && item.price && item.price.amount, currency: item && item.price && item.price.currency });
}
function setCartQuantity(priceId, qty){
  if (!priceId) return;
  var items = readCartFromStorage();
  var next = [];
  for (var i=0; i<items.length; i++) {
    var line = items[i];
    var lineKey = (line.item && (line.item.priceId || line.item.id)) || null;
    if (lineKey === priceId) {
      if (qty > 0) { line.quantity = qty; next.push(line); }
    } else next.push(line);
  }
  writeCartToStorage(next);
  recomputeCartState(next);
}
function removeCartItem(priceId){
  setCartQuantity(priceId, 0);
}
function cartCheckout(){
  var raw = getStateValue('cart:items-json');
  var items = [];
  try { items = raw ? JSON.parse(raw) : []; } catch(e){}
  if (!items.length || !PAGE_ID) return;
  fetch('/api/stripe/storefront-checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pageId: PAGE_ID, lineItems: items.map(function(l){
      return { priceId: (l.item && (l.item.priceId || (l.item.metadata && l.item.metadata.priceId))) || null, quantity: l.quantity };
    }) }),
    credentials: 'include'
  }).then(function(r){ return r.json(); }).then(function(d){ if (d && d.url) window.location.href = d.url; }).catch(function(){});
}

function escapeHTML(s){ return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
var CART_DEFAULTS = {
  'empty-class': 'text-base-content/50 flex flex-col items-center justify-center gap-4 py-16',
  'empty-text': 'Your cart is empty',
  'empty-text-class': 'text-sm',
  'list-class': 'flex flex-col gap-4',
  'row-class': 'flex gap-4',
  'image-class': 'size-20 shrink-0 rounded-lg object-cover',
  'body-class': 'flex flex-1 flex-col gap-1',
  'title-class': 'line-clamp-2 text-sm font-semibold',
  'variant-class': 'text-base-content/60 text-xs',
  'price-class': 'text-primary text-sm font-bold',
  'controls-class': 'mt-1 flex items-center gap-2',
  'quantity-class': 'min-w-[1.5rem] text-center text-sm font-medium',
  'control-button-class': 'btn btn-ghost btn-xs btn-circle',
  'remove-button-class': 'btn btn-ghost btn-xs btn-circle text-error ml-auto'
};
function renderCartItems(el, c){
  var items = readCartFromStorage();
  if (!items.length) return '<div class="' + escapeHTML(c['empty-class']) + '"><p class="' + escapeHTML(c['empty-text-class']) + '">' + escapeHTML(c['empty-text']) + '</p></div>';
  var parts = ['<div class="' + escapeHTML(c['list-class']) + '">'];
  for (var j=0; j<items.length; j++) {
    var line = items[j] || {}; var it = line.item || {}; var qty = Number(line.quantity) || 0;
    var pid = escapeHTML(it.priceId || it.id || '');
    var img = it.image ? '<img src="' + escapeHTML(it.image) + '" alt="' + escapeHTML(it.title || '') + '" class="' + escapeHTML(c['image-class']) + '" />' : '';
    var variant = it.variantLabel ? '<p class="' + escapeHTML(c['variant-class']) + '">' + escapeHTML(it.variantLabel) + '</p>' : '';
    var price = it.priceFormatted ? '<p class="' + escapeHTML(c['price-class']) + '">' + escapeHTML(it.priceFormatted) + '</p>' : '';
    var btn = escapeHTML(c['control-button-class']);
    parts.push('<div class="' + escapeHTML(c['row-class']) + '">' + img + '<div class="' + escapeHTML(c['body-class']) + '"><p class="' + escapeHTML(c['title-class']) + '">' + escapeHTML(it.title || '') + '</p>' + variant + price + '<div class="' + escapeHTML(c['controls-class']) + '">' +
      '<button type="button" data-ph-cart-action="dec" data-ph-cart-priceid="' + pid + '" class="' + btn + '">&minus;</button>' +
      '<span class="' + escapeHTML(c['quantity-class']) + '">' + qty + '</span>' +
      '<button type="button" data-ph-cart-action="inc" data-ph-cart-priceid="' + pid + '" class="' + btn + '">+</button>' +
      '<button type="button" data-ph-cart-action="remove" data-ph-cart-priceid="' + pid + '" class="' + escapeHTML(c['remove-button-class']) + '">&times;</button>' +
      '</div></div></div>');
  }
  parts.push('</div>');
  return parts.join('');
}
Alpine.directive('cart-items', function(el, _meta, utils){
  var cfg = {};
  for (var k in CART_DEFAULTS) cfg[k] = el.getAttribute('data-' + k) || CART_DEFAULTS[k];
  function render(){ el.innerHTML = renderCartItems(el, cfg); }
  function onClick(ev){
    var btn = ev.target && ev.target.closest && ev.target.closest('[data-ph-cart-action]');
    if (!btn) return;
    var pid = btn.getAttribute('data-ph-cart-priceid');
    var act = btn.getAttribute('data-ph-cart-action');
    if (!pid) return;
    var items = readCartFromStorage();
    var current = 0;
    for (var k=0; k<items.length; k++) {
      var lk = items[k].item && (items[k].item.priceId || items[k].item.id);
      if (lk === pid) { current = Number(items[k].quantity) || 0; break; }
    }
    if (act === 'inc') setCartQuantity(pid, current + 1);
    else if (act === 'dec') setCartQuantity(pid, current - 1);
    else if (act === 'remove') removeCartItem(pid);
  }
  el.addEventListener('click', onClick);
  utils.cleanup(function(){ el.removeEventListener('click', onClick); });
  utils.effect(function(){ void _store.entries['cart:items-json']; render(); });
});
`;
