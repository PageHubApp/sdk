// Item context, interpolation, visibility helpers, axis helpers, runComputed.
//
// Authored as a real TS function; `stringifyChunk` lifts the body into the
// runtime IIFE. Globals declared in [runtime-globals.d.ts](./runtime-globals.d.ts).

import { stringifyChunk } from "./stringifyChunk";

export const ITEMS_CHUNK = stringifyChunk(function $items() {
  // Cross-chunk function bindings via runtime registry. See
  // staticPublishRuntime.ts preamble for the why.
  const { getStateValue, setVisibility } = __phRT;

  function walkItem(obj: any, parts: string[]) {
    let v = obj;
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      if (v == null || typeof v !== "object") return undefined;
      if (Array.isArray(v) && /^\d+$/.test(p)) v = v[parseInt(p, 10)];
      else if (p in v) v = v[p];
      else return undefined;
    }
    return v;
  }
  function interpolateItem(raw: unknown, item: unknown) {
    if (raw == null) return "";
    if (typeof raw !== "string" || !item) return String(raw);
    return raw.replace(/\{\{\s*item\.([\w.[\]]+)\s*\}\}/g, function (_, path) {
      const cleaned = path.replace(/\[(\d+)\]/g, ".$1");
      const v = walkItem(item, cleaned.split("."));
      return v == null ? "" : String(v);
    });
  }
  function resolveActionKey(raw: unknown, item: unknown) {
    if (!raw) return "";
    const out = interpolateItem(raw, item);
    if (/\{\{\s*item\./i.test(out)) return "";
    return out || (raw as string);
  }

  function readItemContext(el: Element) {
    // Walk up for data-item-json (full item) or data-item-id (just { id }).
    let cur: Element | null = el;
    while (cur) {
      if (cur.hasAttribute && cur.hasAttribute("data-item-json")) {
        try {
          return JSON.parse(cur.getAttribute("data-item-json") as string);
        } catch (e) {}
      }
      if (cur.hasAttribute && cur.hasAttribute("data-item-id")) {
        return { id: cur.getAttribute("data-item-id") };
      }
      cur = cur.parentElement;
    }
    return null;
  }

  function showEl(el: HTMLElement, method?: string) {
    if (method === "style") {
      el.style.display = "block";
      return;
    }
    el.classList.remove("hidden");
    if (el.id) setVisibility(el.id, "shown");
  }
  function hideEl(el: HTMLElement, method?: string) {
    if (method === "style") {
      el.style.display = "none";
      return;
    }
    el.classList.add("hidden");
    if (el.id) setVisibility(el.id, "hidden");
  }
  function toggleEl(el: HTMLElement, method?: string) {
    if (method === "style") {
      el.style.display = el.style.display === "none" ? "block" : "none";
      return;
    }
    const willHide = !el.classList.contains("hidden");
    el.classList.toggle("hidden");
    if (el.id) setVisibility(el.id, willHide ? "hidden" : "shown");
  }
  function applyShowHide(action: any) {
    const el = document.getElementById(action.target);
    if (!el) return;
    const method = action.method || "class";
    if (action.direction === "tab") {
      const group = action.group || action.target;
      const panels = document.querySelectorAll(
        '[data-tab-group="' + group + '"]'
      );
      for (let i = 0; i < panels.length; i++) {
        hideEl(panels[i] as HTMLElement, method);
      }
      showEl(el, method);
    } else if (action.direction === "show") showEl(el, method);
    else if (action.direction === "hide") hideEl(el, method);
    else toggleEl(el, method);
  }
  function revertShowHide(action: any) {
    const el = document.getElementById(action.target);
    if (!el) return;
    const method = action.method || "class";
    if (action.direction === "show") hideEl(el, method);
    else if (action.direction === "hide") showEl(el, method);
  }

  function toAxisArray(value: unknown): string[] {
    if (!value) return [];
    if (Object.prototype.toString.call(value) === "[object Array]") {
      return value as string[];
    }
    return String(value)
      .split(",")
      .map(function (s) {
        return s.replace(/^\s+|\s+$/g, "");
      })
      .filter(Boolean);
  }
  function axisToSlot(axes: string[]) {
    const out: Record<string, string> = {};
    for (let i = 0; i < axes.length && i < 3; i++) {
      out[axes[i]] = "option" + (i + 1);
    }
    return out;
  }
  function parseVariantMap(raw: unknown) {
    if (!raw) return [];
    try {
      const p = JSON.parse(raw as string);
      return Object.prototype.toString.call(p) === "[object Array]" ? p : [];
    } catch (e) {
      return [];
    }
  }
  function hasUnresolvedItemToken(s: unknown) {
    return /\{\{\s*item\./i.test(String(s));
  }

  function runComputed(binding: any, interp: (s: string) => string) {
    const c = binding.compute;
    const t = c && c.type;
    let i: number, k: string, v: unknown;
    if (t === "all-truthy") {
      const fromKeys = binding.from || [];
      for (i = 0; i < fromKeys.length; i++) {
        k = interp(fromKeys[i]);
        if (k) {
          if (getStateValue(k) == null || getStateValue(k) === "") return "";
        }
      }
      return fromKeys.length ? "on" : "";
    }
    if (t === "first-truthy") {
      const fk = binding.from || [];
      for (i = 0; i < fk.length; i++) {
        k = interp(fk[i]);
        if (!k) continue;
        v = getStateValue(k);
        if (v != null && v !== "") return v;
      }
      return "";
    }
    if (t === "join") {
      const sep = c.separator != null ? c.separator : ",";
      const fk2 = binding.from || [];
      const vals: unknown[] = [];
      for (i = 0; i < fk2.length; i++) {
        k = interp(fk2[i]);
        if (!k) continue;
        v = getStateValue(k);
        if (v != null && v !== "") vals.push(v);
      }
      return vals.join(sep);
    }
    if (t === "variant-match") {
      const rawMap = interp(c.variantMap);
      const rawAxes =
        typeof c.axes === "string" ? interp(c.axes) : (c.axes || []).join(",");
      if (hasUnresolvedItemToken(rawMap) || hasUnresolvedItemToken(rawAxes)) {
        return "";
      }
      const variants = parseVariantMap(rawMap);
      const axes = toAxisArray(rawAxes);
      const slots = axisToSlot(axes);
      const sel: Record<string, unknown> = {};
      for (i = 0; i < axes.length; i++) {
        const sk = interp(c.axisKeyTemplate.replace(/%axis%/g, axes[i]));
        if (hasUnresolvedItemToken(sk)) return "";
        v = getStateValue(sk);
        if (v != null && v !== "") sel[axes[i]] = v;
      }
      let complete = axes.length > 0;
      for (i = 0; i < axes.length; i++) {
        if (!sel[axes[i]]) {
          complete = false;
          break;
        }
      }
      if (!complete) return "";
      for (i = 0; i < variants.length; i++) {
        const vv = variants[i];
        let ok = true;
        for (let ai = 0; ai < axes.length; ai++) {
          if (vv[slots[axes[ai]]] !== sel[axes[ai]]) {
            ok = false;
            break;
          }
        }
        if (ok && vv.inventory !== 0) return JSON.stringify(vv);
      }
      return "";
    }
    if (t === "variant-axis-availability") {
      const rawMap2 = interp(c.variantMap);
      const rawOther =
        typeof c.otherAxes === "string"
          ? interp(c.otherAxes)
          : (c.otherAxes || []).join(",");
      if (
        hasUnresolvedItemToken(rawMap2) ||
        hasUnresolvedItemToken(rawOther)
      ) {
        return "";
      }
      const variants2 = parseVariantMap(rawMap2);
      const otherAxes = toAxisArray(rawOther);
      const allAxes = [c.axis].concat(otherAxes);
      const slots2 = axisToSlot(allAxes);
      const sel2: Record<string, unknown> = {};
      for (i = 0; i < otherAxes.length; i++) {
        const sk2 = interp(
          c.axisKeyTemplate.replace(/%axis%/g, otherAxes[i])
        );
        if (hasUnresolvedItemToken(sk2)) return "";
        v = getStateValue(sk2);
        if (v != null && v !== "") sel2[otherAxes[i]] = v;
      }
      const candidates: Record<string, boolean> = {};
      for (i = 0; i < variants2.length; i++) {
        const cand = variants2[i][slots2[c.axis]];
        if (typeof cand === "string") candidates[cand] = true;
      }
      const unavailable: string[] = [];
      for (const candName in candidates) {
        let live = false;
        for (i = 0; i < variants2.length; i++) {
          const vr = variants2[i];
          if (vr[slots2[c.axis]] !== candName) continue;
          if (vr.inventory === 0) continue;
          let matches = true;
          for (let oi = 0; oi < otherAxes.length; oi++) {
            if (!sel2[otherAxes[oi]]) continue;
            if (vr[slots2[otherAxes[oi]]] !== sel2[otherAxes[oi]]) {
              matches = false;
              break;
            }
          }
          if (matches) {
            live = true;
            break;
          }
        }
        if (!live) unavailable.push(candName);
      }
      return unavailable.join(",");
    }
    return "";
  }

  // Publish cross-chunk functions to the runtime registry. See state.ts.
  Object.assign(__phRT, {
    resolveActionKey,
    readItemContext,
    applyShowHide,
    revertShowHide,
    toggleEl,
    runComputed,
    interpolateItem,
  });
});
