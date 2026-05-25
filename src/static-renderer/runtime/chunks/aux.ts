// Customer token detect, analytics stubs, Leaflet map mount.
//
// Authored as a real TS function; `stringifyChunk` lifts the body into the
// runtime IIFE. Globals declared in [runtime-globals.d.ts](./runtime-globals.d.ts).

import { stringifyChunk } from "./stringifyChunk";

export const AUX_CHUNK = stringifyChunk(function $aux() {
  // Cross-chunk function bindings via runtime registry. See
  // staticPublishRuntime.ts preamble for the why.
  const { setState } = __phRT;

  function detectCustomerToken() {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (!token) return;
    params.delete("token");
    const qs = params.toString();
    const clean =
      window.location.pathname +
      (qs ? "?" + qs : "") +
      window.location.hash;
    window.history.replaceState({}, "", clean);
    fetch("/api/customer/verify?token=" + encodeURIComponent(token))
      .then(function (r) {
        if (!r.ok) return null;
        return fetch("/api/customer/me", { credentials: "include" });
      })
      .then(function (r) {
        return r && r.ok ? r.json() : null;
      })
      .then(function (data) {
        const status = data ? "logged-in" : "logged-out";
        setState(
          "auth:status",
          { kind: "value", value: status, source: "runtime" },
          "customer-token"
        );
        if (data) {
          setState(
            "customer:email",
            { kind: "value", value: data.email || "", source: "runtime" },
            "customer"
          );
          setState(
            "customer:name",
            { kind: "value", value: data.name || "", source: "runtime" },
            "customer"
          );
          setState(
            "customer:orderCount",
            {
              kind: "value",
              value: String(data.orderCount || 0),
              source: "runtime",
            },
            "customer"
          );
          setState(
            "customer:totalSpent",
            {
              kind: "value",
              value: String(data.totalSpent || 0),
              source: "runtime",
            },
            "customer"
          );
        }
      })
      .catch(function () {});
  }

  function ensureAnalyticsStubs() {
    const w = window as any;
    if (typeof w.dataLayer === "undefined") w.dataLayer = [];
    if (typeof w.gtag !== "function") {
      w.gtag = function () {
        w.dataLayer.push(arguments);
      };
    }
    if (typeof w.fbq !== "function") {
      w.fbq = function () {
        (w.fbq.queue = w.fbq.queue || []).push(arguments);
      };
    }
  }

  function fireAnalytics(event: string, params?: Record<string, unknown>) {
    const w = window as any;
    try {
      if (typeof w.gtag === "function") w.gtag("event", event, params || {});
      if (event === "form_submit" && typeof w.fbq === "function") {
        w.fbq("track", "Lead");
      }
      if (event === "add_to_cart" && typeof w.fbq === "function") {
        w.fbq("track", "AddToCart", params || {});
      }
      if (w.dataLayer && typeof w.dataLayer.push === "function") {
        w.dataLayer.push(Object.assign({ event: event }, params || {}));
      }
    } catch (e) {}
  }

  // Author-configured conversion (Google Ads / GA4 / Meta). Mirrors
  // utils/actions/conversion.ts for the static-publish runtime. Accepts an
  // optional navigate callback so same-tab link actions can defer navigation
  // through gtag's event_callback (+1 s safety timer).
  function fireConversion(c: any, opts?: { navigate?: () => void }) {
    const w = window as any;
    const navigate = opts && opts.navigate;
    let fired = false;
    const safeNavigate = navigate
      ? function () {
          if (fired) return;
          fired = true;
          try {
            navigate();
          } catch (e) {}
        }
      : null;
    if (!c) {
      if (safeNavigate) safeNavigate();
      return;
    }
    const value =
      typeof c.value === "number" && !isNaN(c.value) ? c.value : undefined;
    const currency = c.currency || undefined;
    if (c.provider === "meta") {
      try {
        if (typeof w.fbq === "function") {
          w.fbq("track", c.eventName, { value: value, currency: currency });
        }
      } catch (e) {}
      if (safeNavigate) safeNavigate();
      return;
    }
    const payload: any = {};
    if (value !== undefined) payload.value = value;
    if (currency) payload.currency = currency;
    if (c.provider === "google-ads") {
      if (!c.sendTo) {
        if (safeNavigate) safeNavigate();
        return;
      }
      payload.send_to = c.sendTo;
    }
    if (safeNavigate) {
      payload.event_callback = safeNavigate;
      payload.event_timeout = 1000;
      setTimeout(safeNavigate, 1000);
    }
    const eventName =
      c.provider === "google-ads" ? "conversion" : c.eventName;
    try {
      if (typeof w.gtag === "function") w.gtag("event", eventName, payload);
    } catch (e) {}
  }

  const LEAFLET_CSS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
  const LEAFLET_JS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
  const TILE_URLS: Record<string, string> = {
    osm: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    "cartodb-positron":
      "https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
    "cartodb-dark":
      "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
    "cartodb-voyager":
      "https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
  };

  function loadLeaflet() {
    return new Promise(function (resolve, reject) {
      if (window.L) return resolve(window.L);
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = LEAFLET_CSS;
      document.head.appendChild(link);
      const script = document.createElement("script");
      script.src = LEAFLET_JS;
      script.async = true;
      script.onload = function () {
        resolve(window.L);
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  function mountMaps() {
    const nodes = document.querySelectorAll("[data-ph-map]");
    if (!nodes.length) return;
    loadLeaflet()
      .then(function (L: any) {
        for (let i = 0; i < nodes.length; i++) {
          const el = nodes[i];
          const raw = el.getAttribute("data-ph-map");
          let cfg: any;
          try {
            cfg = JSON.parse(raw as string);
          } catch (e) {
            continue;
          }
          if (!cfg || (!cfg.lat && !cfg.lng)) continue;
          el.innerHTML = "";
          const map = L.map(el, {
            scrollWheelZoom: cfg.type === "interactive",
            dragging: cfg.type === "interactive",
          }).setView([cfg.lat, cfg.lng], cfg.zoom || 13);
          L.tileLayer(TILE_URLS[cfg.tileStyle] || TILE_URLS.osm, {
            attribution: "&copy; OpenStreetMap",
          }).addTo(map);
          const pts = cfg.points || [];
          for (let j = 0; j < pts.length; j++) {
            const p = pts[j];
            const m = L.marker([p.lat, p.lng]).addTo(map);
            if (p.title || p.description) {
              m.bindPopup(
                "<b>" +
                  (p.title || "") +
                  "</b>" +
                  (p.description ? "<br/>" + p.description : "")
              );
            }
          }
        }
      })
      .catch(function () {});
  }

  // Publish cross-chunk functions to the runtime registry. See state.ts.
  Object.assign(__phRT, {
    detectCustomerToken,
    ensureAnalyticsStubs,
    fireAnalytics,
    fireConversion,
    mountMaps,
  });
});
