// Repeater: slot interpolation, DOM reconciler, state-inputs (refetch) directive.
//
// Authored as a real TS function; `stringifyChunk` lifts the body into the
// runtime IIFE. Globals declared in [runtime-globals.d.ts](./runtime-globals.d.ts).

import { stringifyChunk } from "./stringifyChunk";

export const REPEATER_CHUNK = stringifyChunk(function $repeater() {
  // Cross-chunk function bindings via runtime registry. See
  // staticPublishRuntime.ts preamble for the why.
  const { setState, getStateValue } = __phRT;

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
      return String(v)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    });
  }
  // Reconcile child rows of a repeater wrapper. Keeps DOM nodes with unchanged
  // item ids (preserves focus, animations); replaces or inserts new rows;
  // removes stale rows.
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
      const cur = byId[id];
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
      const html = renderTemplate(template, item);
      const tmp = document.createElement("div");
      tmp.innerHTML = html;
      const row = tmp.firstElementChild;
      if (!row) continue;
      row.setAttribute("data-item-id", id);
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
        for (const opt in inputs) {
          const v = getStateValue(inputs[opt]);
          if (v != null && v !== "") params.set(opt, v as string);
        }
        // Smoke harness short-circuit: __PH_CONNECTOR__[provider][col] = [...].
        const seed =
          window.__PH_CONNECTOR__ &&
          window.__PH_CONNECTOR__[provider] &&
          window.__PH_CONNECTOR__[provider][col];
        let promise: Promise<any>;
        if (Object.prototype.toString.call(seed) === "[object Array]") {
          promise = Promise.resolve({ items: seed });
        } else {
          promise = fetch(
            PUBLIC_DATA_ENDPOINT + "?" + params.toString()
          ).then(function (r) {
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
            const ev = new CustomEvent("pagehub:repeater-refresh", {
              detail: { collection: col, items: d.items },
            });
            el.dispatchEvent(ev);
            const pubRaw = el.getAttribute("data-publish-state-keys");
            let pub: any;
            try {
              pub = JSON.parse(pubRaw || "");
            } catch (e) {}
            if (pub && pub.count) {
              setState(
                pub.count,
                {
                  kind: "value",
                  value: String(d.items.length),
                  source: "runtime",
                },
                "publish"
              );
            }
            if (pub && pub.totalCount) {
              setState(
                pub.totalCount,
                {
                  kind: "value",
                  value: String(d.items.length),
                  source: "runtime",
                },
                "publish"
              );
            }
          })
          .catch(function () {});
      }, 100);
      utils.effect(function () {
        for (const opt in inputs) void _store.entries[inputs[opt]];
        refetch();
      });
    }
  );
});
