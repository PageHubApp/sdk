// Customer token detect, analytics stubs, Leaflet map mount.

export const AUX_CHUNK = `
function detectCustomerToken(){
  var params = new URLSearchParams(window.location.search);
  var token = params.get('token');
  if (!token) return;
  params.delete('token');
  var qs = params.toString();
  var clean = window.location.pathname + (qs ? '?' + qs : '') + window.location.hash;
  window.history.replaceState({}, '', clean);
  fetch('/api/customer/verify?token=' + encodeURIComponent(token))
    .then(function(r){ if (!r.ok) return null; return fetch('/api/customer/me', { credentials: 'include' }); })
    .then(function(r){ return r && r.ok ? r.json() : null; })
    .then(function(data){
      var status = data ? 'logged-in' : 'logged-out';
      setState('auth:status', { kind: 'value', value: status, source: 'runtime' }, 'customer-token');
      if (data) {
        setState('customer:email', { kind: 'value', value: data.email || '', source: 'runtime' }, 'customer');
        setState('customer:name', { kind: 'value', value: data.name || '', source: 'runtime' }, 'customer');
        setState('customer:orderCount', { kind: 'value', value: String(data.orderCount || 0), source: 'runtime' }, 'customer');
        setState('customer:totalSpent', { kind: 'value', value: String(data.totalSpent || 0), source: 'runtime' }, 'customer');
      }
    })
    .catch(function(){});
}

function ensureAnalyticsStubs(){
  var w = window;
  if (typeof w.dataLayer === 'undefined') w.dataLayer = [];
  if (typeof w.gtag !== 'function') w.gtag = function(){ w.dataLayer.push(arguments); };
  if (typeof w.fbq !== 'function') {
    w.fbq = function(){ (w.fbq.queue = w.fbq.queue || []).push(arguments); };
  }
}
function fireAnalytics(event, params){
  var w = window;
  try {
    if (typeof w.gtag === 'function') w.gtag('event', event, params || {});
    if (event === 'form_submit' && typeof w.fbq === 'function') w.fbq('track', 'Lead');
    if (event === 'add_to_cart' && typeof w.fbq === 'function') w.fbq('track', 'AddToCart', params || {});
    if (w.dataLayer && typeof w.dataLayer.push === 'function') w.dataLayer.push(Object.assign({ event: event }, params || {}));
  } catch(e){}
}

var LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
var LEAFLET_JS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
var TILE_URLS = {
  osm: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  'cartodb-positron': 'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
  'cartodb-dark': 'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
  'cartodb-voyager': 'https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png'
};
function loadLeaflet(){
  return new Promise(function(resolve, reject){
    if (window.L) return resolve(window.L);
    var link = document.createElement('link');
    link.rel = 'stylesheet'; link.href = LEAFLET_CSS;
    document.head.appendChild(link);
    var script = document.createElement('script');
    script.src = LEAFLET_JS; script.async = true;
    script.onload = function(){ resolve(window.L); };
    script.onerror = reject;
    document.head.appendChild(script);
  });
}
function mountMaps(){
  var nodes = document.querySelectorAll('[data-ph-map]');
  if (!nodes.length) return;
  loadLeaflet().then(function(L){
    for (var i=0; i<nodes.length; i++) {
      var el = nodes[i];
      var raw = el.getAttribute('data-ph-map');
      var cfg; try { cfg = JSON.parse(raw); } catch(e){ continue; }
      if (!cfg || (!cfg.lat && !cfg.lng)) continue;
      el.innerHTML = '';
      var map = L.map(el, { scrollWheelZoom: cfg.type === 'interactive', dragging: cfg.type === 'interactive' }).setView([cfg.lat, cfg.lng], cfg.zoom || 13);
      L.tileLayer(TILE_URLS[cfg.tileStyle] || TILE_URLS.osm, { attribution: '&copy; OpenStreetMap' }).addTo(map);
      var pts = cfg.points || [];
      for (var j=0; j<pts.length; j++) {
        var p = pts[j];
        var m = L.marker([p.lat, p.lng]).addTo(map);
        if (p.title || p.description) m.bindPopup('<b>' + (p.title || '') + '</b>' + (p.description ? '<br/>' + p.description : ''));
      }
    }
  }).catch(function(){});
}
`;
