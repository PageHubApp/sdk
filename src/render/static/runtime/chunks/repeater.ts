// Repeater: slot interpolation, DOM reconciler, state-inputs (refetch) directive.
//
// Authored as a real TS function; `stringifyChunk` lifts the body into the
// runtime IIFE. Globals declared in [runtime-globals.d.ts](./runtime-globals.d.ts).

import { stringifyChunk } from "./stringifyChunk";

export const REPEATER_CHUNK = stringifyChunk(function $repeater() {
  // Cross-chunk function bindings via runtime registry. See
  // staticPublishRuntime.ts preamble for the why.
  const { setState, getStateValue, evalGroups, escapeHtml, safeHref, listStates } = __phRT;

  function walkSlotPath(obj: any, parts: string[]) {
    let v = obj;
    for (let i = 0; i < parts.length; i++) {
      if (v == null) return null;
      const p = parts[i];
      if (
        Object.prototype.toString.call(v) === "[object Array]" &&
        /^\d+$/.test(p)
      ) {
        v = v[parseInt(p, 10)];
      } else if (typeof v === "object" && p in v) {
        v = v[p];
      } else {
        return null;
      }
    }
    return v;
  }
  function renderTemplate(tmpl: string, item: any) {
    return String(tmpl).replace(/\{\{slot:([\w.]+)\}\}/g, function (_, path) {
      const v = walkSlotPath(item, path.split("."));
      if (v == null) return "";
      // Rich-text fields are the owner's markup (htmlSafety.ts RICH_HTML_KEYS).
      const rich = item && Array.isArray(item.__richHtml) && item.__richHtml.includes(path.split(".")[0]);
      return rich ? String(v) : escapeHtml(v);
    });
  }
  // Build one row from the item template. Template nodes gated on `item`
  // conditions arrive wrapped in `data-ph-item-conditions` (walker.ts): drop
  // the ones this item fails, unwrap the rest so the row matches SSR markup.
  // A template with several top-level nodes becomes one `display: contents`
  // row so it reconciles as a unit.
  function buildRow(html: string, item: any): HTMLElement | null {
    const tmp = document.createElement("div");
    tmp.innerHTML = html;
    // Slot values are escaped, but a URL attribute filled from one can still
    // carry a script scheme. Same allow-list as the server walker.
    const urls = tmp.querySelectorAll("[href], iframe[src]");
    for (let u = 0; u < urls.length; u++) {
      const attr = urls[u].hasAttribute("href") ? "href" : "src";
      const url = urls[u].getAttribute(attr);
      if (url && !safeHref(url)) urls[u].removeAttribute(attr);
    }
    const gated = tmp.querySelectorAll("[data-ph-item-conditions]");
    for (let g = 0; g < gated.length; g++) {
      const el = gated[g];
      let groups: unknown[] = [];
      try {
        groups = JSON.parse(el.getAttribute("data-ph-item-conditions") || "[]");
      } catch (e) {}
      const parent = el.parentNode;
      if (!parent) continue;
      if (evalGroups(groups, item)) {
        while (el.firstChild) parent.insertBefore(el.firstChild, el);
      }
      parent.removeChild(el);
    }
    expandNestedScopes(tmp, item);
    const els = tmp.children;
    if (els.length === 1) return els[0] as HTMLElement;
    if (!els.length) return null;
    const wrap = document.createElement("div");
    wrap.style.display = "contents";
    while (tmp.firstChild) wrap.appendChild(tmp.firstChild);
    return wrap;
  }

  // Nested `item.*` repeaters inside a freshly built row (Data.toHTML
  // `data-scope-path`): their template's slots are escaped one `^` deeper so
  // the parent fill skipped them — unescape a level and fill from this row's
  // item. Strings/numbers wrap like resolveNestedItems so `{{item.value}}` works.
  function expandNestedScopes(root: Element, item: any) {
    const scopes = root.querySelectorAll("[data-scope-path]");
    for (let s = 0; s < scopes.length; s++) {
      const el = scopes[s];
      const tpl = el.querySelector(":scope > template[data-item-template]") as HTMLTemplateElement | null;
      if (!tpl) continue;
      const html = tpl.innerHTML.replace(/\{\{slot\^(\^*):/g, "{{slot$1:");
      const path = el.getAttribute("data-scope-path") || "";
      let v = walkSlotPath(item, path.split("."));
      const split = el.getAttribute("data-scope-split");
      if (split && typeof v === "string") v = v.split(split).map(function (x) { return x.trim(); }).filter(Boolean);
      const list = Object.prototype.toString.call(v) === "[object Array]" ? (v as any[]) : [];
      reconcileItems(
        el,
        html,
        list.map(function (x, i) {
          if (typeof x !== "string" && typeof x !== "number") return x;
          const str = String(x);
          return { id: path + "-" + i, value: str, title: str, src: str, image: str };
        })
      );
    }
  }

  // Show the Data node's empty-state slot (`<template data-empty-template>`)
  // when a client fetch resolved to no rows; drop it once rows arrive.
  function syncEmptySlot(wrapper: Element, count: number) {
    const tpl = wrapper.querySelector(":scope > template[data-empty-template]") as HTMLTemplateElement | null;
    if (!tpl) return;
    const shown = wrapper.querySelector(":scope > [data-ph-empty-slot]");
    if (count > 0) {
      if (shown) wrapper.removeChild(shown);
      return;
    }
    if (shown) return;
    const box = document.createElement("div");
    box.style.display = "contents";
    box.setAttribute("data-ph-empty-slot", "");
    box.innerHTML = tpl.innerHTML;
    wrapper.insertBefore(box, tpl);
  }

  // Reconcile child rows of a repeater wrapper. Keeps DOM nodes whose item id
  // and rendered markup are unchanged (preserves focus, animations); rebuilds
  // rows whose item changed (e.g. a message still streaming in); inserts new
  // rows; removes stale rows.
  function reconcileItems(wrapper: Element, template: string, items: any[]) {
    if (!template) return;
    const existing = wrapper.querySelectorAll(":scope > [data-item-id]");
    const byId: Record<string, Element> = {};
    for (let i = 0; i < existing.length; i++) {
      byId[existing[i].getAttribute("data-item-id") as string] = existing[i];
    }
    const seen: Record<string, boolean> = {};
    let anchor: Element | null = null;
    for (let j = 0; j < items.length; j++) {
      const item = items[j];
      const id = String(item && (item.id != null ? item.id : j));
      seen[id] = true;
      const html = renderTemplate(template, item);
      let cur: (Element & { __phHtml?: string }) | undefined = byId[id];
      // Rows the server rendered carry no `__phHtml`; keep them as-is.
      if (cur && cur.__phHtml !== undefined && cur.__phHtml !== html) {
        cur.parentNode && cur.parentNode.removeChild(cur);
        cur = undefined;
      }
      if (cur) {
        const expectedNext = anchor
          ? anchor.nextElementSibling
          : wrapper.firstElementChild;
        if (cur !== expectedNext) {
          wrapper.insertBefore(
            cur,
            anchor ? anchor.nextSibling : wrapper.firstChild
          );
        }
        anchor = cur;
        continue;
      }
      const row = buildRow(html, item) as (HTMLElement & { __phHtml?: string }) | null;
      if (!row) continue;
      row.setAttribute("data-item-id", id);
      // Same rule as Data.toHTML's ITEM_CONTEXT_RE: rows whose actions or
      // state modifiers read the whole item carry it for readItemContext.
      if (
        /add-to-cart|data-computed-state-bindings|\{\{\s*item\.|data-state-modifiers="[^"]*&quot;type&quot;:&quot;item&quot;/.test(html) &&
        item &&
        typeof item === "object"
      ) {
        row.setAttribute("data-item-json", JSON.stringify(item));
      }
      row.__phHtml = html;
      wrapper.insertBefore(
        row,
        anchor ? anchor.nextSibling : wrapper.firstChild
      );
      anchor = row;
    }
    for (let k = 0; k < existing.length; k++) {
      const idk = existing[k].getAttribute("data-item-id") as string;
      if (!seen[idk]) {
        existing[k].parentNode &&
          existing[k].parentNode!.removeChild(existing[k]);
      }
    }
  }

  function debounce(fn: (...args: any[]) => void, ms: number) {
    let t: ReturnType<typeof setTimeout> | null = null;
    return function (this: any) {
      // eslint-disable-next-line prefer-rest-params
      const args = arguments;
      if (t) clearTimeout(t);
      t = setTimeout(function () {
        fn.apply(null, args as any);
      }, ms);
    };
  }

  // state-scope: repeater whose items come from a JSON-encoded array in the
  // state registry. Author writes via window.__phSetData(key, [...]); this
  // directive subscribes to the key, parses, and reconciles.
  Alpine.directive(
    "state-scope",
    function (
      el: HTMLElement,
      _meta: unknown,
      utils: { effect: (fn: () => void) => void }
    ) {
      const key = el.getAttribute("data-state-scope");
      if (!key) return;
      const tplEl = el.querySelector(
        ":scope > template[data-item-template]"
      ) as HTMLTemplateElement | null;
      const templateHTML = tplEl ? tplEl.innerHTML : "";
      utils.effect(function () {
        void _store.entries[key];
        const raw = getStateValue(key);
        let items: any[] | null = null;
        if (raw != null && raw !== "") {
          try {
            const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
            if (Object.prototype.toString.call(parsed) === "[object Array]") {
              items = parsed;
            }
          } catch (e) {}
        }
        reconcileItems(el, templateHTML, items || []);
      });
    }
  );

  // __phSetData / __phGetData — author globals for custom JS handlers that
  // produce an array for a state-scoped Data repeater. JSON-encodes on write,
  // JSON-decodes on read; state registry stays string-valued.
  window.__phSetData = function (key, value) {
    if (!key) return;
    let enc: string;
    try {
      enc = JSON.stringify(value == null ? null : value);
    } catch (e) {
      enc = "null";
    }
    setState(
      key,
      { kind: "value", value: enc, source: "runtime" },
      "user-script"
    );
  };
  window.__phGetData = function (key) {
    if (!key) return null;
    const raw = getStateValue(key);
    if (raw == null || raw === "") return null;
    try {
      return JSON.parse(raw as string);
    } catch (e) {
      return null;
    }
  };

  Alpine.directive(
    "state-inputs",
    function (
      el: HTMLElement,
      _meta: unknown,
      utils: { effect: (fn: () => void) => void }
    ) {
      if (!el.getAttribute("data-connector-id")) return;
      const provider = el.getAttribute("data-connector-id") as string;
      const collection =
        el.getAttribute("data-binding-collection") ||
        el.getAttribute("data-binding-key") ||
        "";
      let inputs: Record<string, string>;
      try {
        inputs = JSON.parse(el.getAttribute("data-state-inputs") || "");
      } catch (e) {
        return;
      }
      if (!inputs || typeof inputs !== "object") return;
      let fetchOpts: Record<string, any> = {};
      try {
        fetchOpts = JSON.parse(el.getAttribute("data-fetch-opts") || "{}") || {};
      } catch (e) {}
      // Storefront grid + facets feed also follow the visitor's facet picks
      // (`url:facet.<key>` → `facet.<key>`), like useDataSource.
      const baseCollection = collection.split("::")[0];
      const followsFacets = baseCollection === "products" || baseCollection === "products.facets";
      function facetParams() {
        const out: Record<string, string> = {};
        if (!followsFacets) return out;
        const all = listStates();
        for (let i = 0; i < all.length; i++) {
          const e = all[i] as any;
          if (!e || typeof e.key !== "string" || e.key.indexOf("url:facet.") !== 0) continue;
          if (e.value == null || e.value === "") continue;
          out["facet." + e.key.slice("url:facet.".length)] = String(e.value);
        }
        return out;
      }
      const tplEl = el.querySelector(
        ":scope > template[data-item-template]"
      ) as HTMLTemplateElement | null;
      const templateHTML = tplEl ? tplEl.innerHTML : "";
      const refetch = debounce(function () {
        if (!PAGE_ID || !provider) return;
        const params = new URLSearchParams();
        params.set("pageId", PAGE_ID);
        params.set("provider", provider);
        const col = collection.split("::")[0] || "products";
        params.set("collection", col);
        // The binding's own query (Data.toHTML `data-fetch-opts`), under the
        // live inputs — same request the React fetcher sends.
        for (const opt in fetchOpts) {
          const v = fetchOpts[opt];
          if (opt === "filter") params.set("dsFilter", JSON.stringify(v));
          else if (v != null && v !== "") params.set(opt, String(v));
        }
        for (const opt in inputs) {
          const v = getStateValue(inputs[opt]);
          if (v != null && v !== "") params.set(opt, v as string);
        }
        const picks = facetParams();
        for (const k in picks) params.set(k, picks[k]);
        // Smoke harness short-circuit: __PH_CONNECTOR__[provider][col] = [...].
        const seed =
          window.__PH_CONNECTOR__ &&
          window.__PH_CONNECTOR__[provider] &&
          window.__PH_CONNECTOR__[provider][col];
        let promise: Promise<any>;
        if (Object.prototype.toString.call(seed) === "[object Array]") {
          promise = Promise.resolve({ items: seed });
        } else {
          // `customer` reads and customer-gated collections need the
          // `ph-customer` cookie (same rule as the React fetcher).
          promise = fetch(PUBLIC_DATA_ENDPOINT + "?" + params.toString(), {
            credentials: provider === "customer" || provider === "collection" ? "include" : "omit",
          }).then(function (r) {
            return r.json();
          });
        }
        promise
          .then(function (d) {
            if (
              !d ||
              Object.prototype.toString.call(d.items) !== "[object Array]"
            ) {
              return;
            }
            reconcileItems(el, templateHTML, d.items);
            syncEmptySlot(el, d.items.length);
            const ev = new CustomEvent("pagehub:repeater-refresh", {
              detail: { collection: col, items: d.items },
            });
            el.dispatchEvent(ev);
            const pubRaw = el.getAttribute("data-publish-state-keys");
            let pub: any;
            try {
              pub = JSON.parse(pubRaw || "");
            } catch (e) {}
            // Same writes as useDataSource: this query's totals (`meta`), the
            // page asked for, and the rows on screen.
            if (pub) {
              const meta = d.meta || {};
              const writes: Array<[string | undefined, unknown]> = [
                [pub.totalPages, meta.totalPages],
                [pub.totalCount, meta.totalCount],
                [pub.page, params.get("page") || 1],
                [pub.count, d.items.length],
              ];
              for (let w = 0; w < writes.length; w++) {
                const key = writes[w][0];
                const value = writes[w][1];
                if (!key || value == null) continue;
                if (getStateValue(key) === String(value)) continue;
                setState(key, { kind: "value", value: String(value), source: "runtime" }, "publish");
              }
            }
          })
          .catch(function () {});
      }, 100);
      // Refetch when an input or facet pick changes — not on every state write.
      let lastSnap: string | null = null;
      utils.effect(function () {
        const parts: string[] = [];
        for (const opt in inputs) {
          const e = _store.entries[inputs[opt]];
          parts.push(opt + "=" + (e ? e.value : ""));
        }
        if (followsFacets) {
          void _store.revision;
          parts.push(JSON.stringify(facetParams()));
        }
        const snap = parts.join("|");
        if (snap === lastSnap) return;
        lastSnap = snap;
        refetch();
      });
    }
  );
});
