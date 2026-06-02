// State registry, directives, and URL ↔ state bridge.
//
// Authored as a real TS function; `stringifyChunk` lifts the body into the
// runtime IIFE. Globals (`Alpine`, `_store`, `_shownStack`, `_escInstalled`,
// etc.) come from the preamble in `staticPublishRuntime.ts` and are declared
// ambient in [runtime-globals.d.ts](./runtime-globals.d.ts).

import { stringifyChunk } from "./stringifyChunk";

export const STATE_CHUNK = stringifyChunk(function $state() {
  Alpine.directive(
    "state-text",
    function (
      el: HTMLElement,
      _dir: unknown,
      utils: { effect: (fn: () => void) => void }
    ) {
      const key = el.getAttribute("data-state-text");
      if (!key) return;
      utils.effect(function () {
        const entry = _store.entries[key];
        el.textContent = entry && entry.value != null ? entry.value : "";
      });
    }
  );

  Alpine.directive(
    "state-show-when-truthy",
    function (
      el: HTMLElement,
      _dir: unknown,
      utils: { effect: (fn: () => void) => void }
    ) {
      const key = el.getAttribute("data-state-show-when-truthy");
      if (!key) return;
      utils.effect(function () {
        const entry = _store.entries[key];
        const v = entry ? entry.value : undefined;
        const truthy = v != null && v !== "" && v !== "0" && v !== "false";
        el.classList.toggle("hidden", !truthy);
      });
    }
  );

  Alpine.directive(
    "visibility-state-key",
    function (
      el: HTMLElement,
      _dir: unknown,
      utils: { effect: (fn: () => void) => void }
    ) {
      const key = el.getAttribute("data-visibility-state-key");
      if (!key) return;
      utils.effect(function () {
        const entry = _store.entries[key];
        const v = entry ? entry.value : undefined;
        if (v === "shown") el.classList.remove("hidden");
        else if (v === "hidden") el.classList.add("hidden");
      });
    }
  );

  Alpine.directive(
    "state-style-bindings",
    function (
      el: HTMLElement,
      _dir: unknown,
      utils: { effect: (fn: () => void) => void }
    ) {
      const raw = el.getAttribute("data-state-style-bindings");
      let bindings: any[];
      try {
        bindings = JSON.parse(raw as string);
      } catch (e) {
        return;
      }
      if (!Array.isArray(bindings) || !bindings.length) return;
      utils.effect(function () {
        for (let b = 0; b < bindings.length; b++) {
          const bd = bindings[b];
          const entry = _store.entries[bd.key];
          let val = entry ? entry.value : undefined;
          if (val == null || val === "") {
            val = bd.defaultValue != null ? bd.defaultValue : "0";
          }
          const out = bd.template
            ? bd.template.replace(/\{\{\s*value\s*\}\}/g, val)
            : val;
          if (bd.styleProp.indexOf("--") === 0) {
            el.style.setProperty(bd.styleProp, out);
          } else {
            (el.style as any)[bd.styleProp] = out;
          }
        }
      });
    }
  );

  Alpine.directive(
    "state-modifiers",
    function (
      el: HTMLElement,
      _dir: unknown,
      utils: { effect: (fn: () => void) => void }
    ) {
      const raw = el.getAttribute("data-state-modifiers");
      let bindings: any[];
      try {
        bindings = JSON.parse(raw as string);
      } catch (e) {
        return;
      }
      if (!Array.isArray(bindings) || !bindings.length) return;
      const classLists = bindings.map(function (bd: any) {
        if (typeof bd.classes === "string" && bd.classes) {
          return bd.classes.split(/\s+/).filter(Boolean);
        }
        if (Array.isArray(bd.modifiers)) {
          return bd.modifiers.map(function (m: string) {
            return "ph-mod-" + m;
          });
        }
        return [];
      });
      // Walk conditions once to collect every state-key the directive reads.
      const trackedKeys: string[] = [];
      const seen: Record<string, boolean> = {};
      function collect(gs: any[]) {
        if (!Array.isArray(gs)) return;
        for (let g = 0; g < gs.length; g++) {
          const conds = gs[g].conditions || [];
          for (let c = 0; c < conds.length; c++) {
            const co = conds[c];
            if (!co || !co.key) continue;
            if (
              co.type !== "state" &&
              co.type !== "url-param" &&
              co.type !== "localStorage"
            ) {
              continue;
            }
            const sk = co.type === "url-param" ? "url:" + co.key : co.key;
            if (seen[sk]) continue;
            seen[sk] = true;
            trackedKeys.push(sk);
          }
        }
      }
      for (let bi = 0; bi < bindings.length; bi++) {
        collect(bindings[bi].conditions);
      }
      utils.effect(function () {
        for (let ti = 0; ti < trackedKeys.length; ti++) {
          void _store.entries[trackedKeys[ti]];
        }
        for (let b = 0; b < bindings.length; b++) {
          // Read from __phRT at call time — the conditions chunk runs after
          // this one, so it isn't on __phRT yet at chunk-eval time.
          const pass = __phRT.evalGroups(bindings[b].conditions) === true;
          const cls = classLists[b];
          for (let ci = 0; ci < cls.length; ci++) {
            el.classList.toggle(cls[ci], pass);
          }
        }
      });
    }
  );

  Alpine.directive(
    "state-binding",
    function (
      el: HTMLElement,
      _dir: unknown,
      utils: {
        effect: (fn: () => void) => void;
        cleanup: (fn: () => void) => void;
      }
    ) {
      const raw = el.getAttribute("data-state-binding");
      let b: any;
      try {
        b = JSON.parse(raw as string);
      } catch (e) {
        return;
      }
      if (!b || !b.key) return;
      const input =
        el.tagName === "INPUT" ||
        el.tagName === "TEXTAREA" ||
        el.tagName === "SELECT"
          ? (el as HTMLInputElement)
          : (el.querySelector(
              "input, textarea, select"
            ) as HTMLInputElement | null);
      if (!input) return;
      const isChecked = b.mode === "checked";
      const debounceMs = b.debounceMs || 0;
      let timer: ReturnType<typeof setTimeout> | null = null;
      let lastWrite: string | null = null;
      function writeToState(v: string) {
        if (timer) clearTimeout(timer);
        const fire = function () {
          lastWrite = v;
          setState(
            b.key,
            { kind: "value", value: v, source: "runtime" },
            "form-element"
          );
        };
        if (debounceMs > 0) timer = setTimeout(fire, debounceMs);
        else fire();
      }
      const initial = _store.entries[b.key];
      const initialVal = initial ? initial.value : undefined;
      if (initialVal == null || initialVal === "") {
        const dv = b.defaultValue;
        if (dv) {
          setState(
            b.key,
            { kind: "value", value: String(dv), source: "load" },
            "form-element"
          );
        }
      }
      function onChange() {
        if (isChecked) {
          writeToState(
            (input as HTMLInputElement).checked ? input.value || "on" : ""
          );
        } else {
          writeToState(input.value);
        }
      }
      input.addEventListener(isChecked ? "change" : "input", onChange);
      utils.cleanup(function () {
        if (timer) clearTimeout(timer);
        input.removeEventListener(isChecked ? "change" : "input", onChange);
      });
      utils.effect(function () {
        const entry = _store.entries[b.key];
        let v = entry ? entry.value : undefined;
        if (v == null) v = "";
        if (v === lastWrite) return;
        if (document.activeElement === input) return;
        if (isChecked) {
          const want = v === (input.value || "on") || v === "on";
          if ((input as HTMLInputElement).checked !== want) {
            (input as HTMLInputElement).checked = want;
          }
        } else {
          if (input.value !== v) input.value = v;
        }
      });
    }
  );

  Alpine.directive("publish-state-keys", function (el: HTMLElement) {
    const raw = el.getAttribute("data-publish-state-keys");
    let keys: any;
    try {
      keys = JSON.parse(raw as string);
    } catch (e) {
      return;
    }
    if (!keys || typeof keys !== "object") return;
    const count = el.querySelectorAll("[data-item-id]").length;
    if (keys.count) {
      setState(
        keys.count,
        { kind: "value", value: String(count), source: "load" },
        "publish"
      );
    }
    if (keys.totalCount) {
      setState(
        keys.totalCount,
        { kind: "value", value: String(count), source: "load" },
        "publish"
      );
    }
  });

  Alpine.directive(
    "computed-state-bindings",
    function (
      el: HTMLElement,
      _dir: unknown,
      utils: { effect: (fn: () => void) => void }
    ) {
      const raw = el.getAttribute("data-computed-state-bindings");
      let bindings: any[];
      try {
        bindings = JSON.parse(raw as string);
      } catch (e) {
        return;
      }
      if (!Array.isArray(bindings) || !bindings.length) return;
      const itemContext = readItemContext(el);
      function interp(v: unknown) {
        if (typeof v !== "string" || !v) return v == null ? "" : String(v);
        return interpolateItem(v, itemContext);
      }
      utils.effect(function () {
        for (let i = 0; i < bindings.length; i++) {
          const bd = bindings[i];
          if (!bd || !bd.compute) continue;
          const outKey = interp(bd.key);
          if (!outKey) continue;
          const nextVal = runComputed(bd, interp as (s: string) => string);
          const cur = _store.entries[outKey];
          if (cur && cur.value === nextVal) continue;
          setState(
            outKey,
            { kind: "value", value: nextVal, source: "computed" },
            "computed"
          );
        }
      });
    }
  );

  function installEsc() {
    if (_escInstalled) return;
    _escInstalled = true;
    document.addEventListener("keydown", function (e) {
      if (e.key !== "Escape" || !_shownStack.length) return;
      for (let i = _shownStack.length - 1; i >= 0; i--) {
        const top = _shownStack[i];
        const entry = _store.entries[top];
        if (!entry) {
          _shownStack.splice(i, 1);
          continue;
        }
        if (entry.source === "computed") continue;
        const el = document.getElementById(top);
        if (el && el.getAttribute("data-close-on-escape") === "false") continue;
        if (el) el.classList.add("hidden");
        setVisibility(top, "hidden", "esc");
        return;
      }
    });
  }
  function getState(key: string) {
    return _store.entries[key];
  }
  function getStateValue(key: string) {
    const e = _store.entries[key];
    return e ? e.value : undefined;
  }
  // disableEffectScheduling makes setState fire dependent effects synchronously,
  // matching the old notify() contract that tests + custom JS handlers expect.
  function setState(key: string, patch: any, writer?: string) {
    if (!key) return;
    Alpine.disableEffectScheduling(function () {
      const prev = _store.entries[key];
      const next = {
        key: key,
        kind: patch.kind != null ? patch.kind : prev ? prev.kind : "value",
        value:
          patch.value !== undefined
            ? patch.value
            : prev
              ? prev.value
              : null,
        source:
          patch.source != null
            ? patch.source
            : prev
              ? prev.source
              : "runtime",
        lastWriter:
          writer != null
            ? writer
            : patch.lastWriter != null
              ? patch.lastWriter
              : prev
                ? prev.lastWriter
                : undefined,
      };
      if (!window.__PH_STATE__) window.__PH_STATE__ = {};
      window.__PH_STATE__[key] = { kind: next.kind, value: next.value };
      if (
        prev &&
        prev.value === next.value &&
        prev.kind === next.kind &&
        prev.source === next.source
      ) {
        // Identity-preserving update — mutate so the Proxy 'set' trap stays quiet.
        prev.lastWriter = next.lastWriter;
        return;
      }
      _store.entries[key] = next;
      _store.revision++;
      if (next.kind === "visibility") {
        const idx = _shownStack.indexOf(key);
        if (next.value === "shown") {
          if (idx !== -1) _shownStack.splice(idx, 1);
          _shownStack.push(key);
          installEsc();
        } else if (idx !== -1) {
          _shownStack.splice(idx, 1);
        }
      }
    });
  }
  function deleteState(key: string) {
    if (!(key in _store.entries)) return;
    Alpine.disableEffectScheduling(function () {
      delete _store.entries[key];
      _store.revision++;
      if (window.__PH_STATE__) delete window.__PH_STATE__[key];
      const idx = _shownStack.indexOf(key);
      if (idx !== -1) _shownStack.splice(idx, 1);
    });
  }
  function setVisibility(key: string, value: string, writer?: string) {
    setState(
      key,
      { kind: "visibility", value: value, source: "runtime" },
      writer
    );
  }
  function listStates() {
    const out: any[] = [];
    for (const k in _store.entries) out.push(_store.entries[k]);
    return out;
  }
  // subscribe — keyed: rerun fn on entries[key] mutation; global: rerun on
  // store.revision bump. First call fires synchronously.
  function subscribe(
    keyOrFn: string | (() => void),
    fn?: () => void
  ): () => void {
    let runner: any;
    if (typeof keyOrFn === "function") {
      runner = Alpine.effect(function () {
        void _store.revision;
        keyOrFn();
      });
    } else {
      runner = Alpine.effect(function () {
        void _store.entries[keyOrFn];
        if (fn) fn();
      });
    }
    return function () {
      try {
        Alpine.release(runner);
      } catch (e) {}
    };
  }

  function seedFromWindow() {
    const seed = window.__PH_STATE__;
    if (!seed) return;
    for (const key in seed) {
      if (!key) continue;
      const raw = seed[key];
      setState(
        key,
        {
          kind: (raw && raw.kind) || "value",
          value: raw ? raw.value : null,
          source: "load",
        },
        "seed"
      );
    }
  }

  const URL_PREFIX = "url:";
  function syncUrlToState(source: string) {
    const params = new URLSearchParams(window.location.search);
    const seen: Record<string, boolean> = {};
    params.forEach(function (v, k) {
      seen[k] = true;
      setState(
        URL_PREFIX + k,
        { kind: "value", value: v, source: source },
        "url-bridge"
      );
    });
    const all = listStates();
    for (let i = 0; i < all.length; i++) {
      const entry = all[i];
      if (entry.key.indexOf(URL_PREFIX) !== 0) continue;
      const param = entry.key.slice(URL_PREFIX.length);
      if (!seen[param] && entry.value) {
        setState(
          entry.key,
          { kind: "value", value: "", source: source },
          "url-bridge"
        );
      }
    }
  }
  function syncStateToUrl() {
    const next = new URLSearchParams();
    const all = listStates();
    for (let i = 0; i < all.length; i++) {
      const entry = all[i];
      if (entry.key.indexOf(URL_PREFIX) !== 0) continue;
      const param = entry.key.slice(URL_PREFIX.length);
      if (typeof entry.value === "string" && entry.value.length > 0) {
        next.set(param, entry.value);
      }
    }
    const nextSearch = next.toString();
    const cur = window.location.search.replace(/^\?/, "");
    if (nextSearch === cur) return;
    const url =
      window.location.pathname +
      (nextSearch ? "?" + nextSearch : "") +
      window.location.hash;
    window.history.pushState({}, "", url);
  }
  function mountUrlBridge() {
    syncUrlToState("load");
    window.addEventListener("popstate", function () {
      syncUrlToState("runtime");
    });
    subscribe(function () {
      syncStateToUrl();
    });
  }

  // Publish cross-chunk functions to the runtime registry by STRING keys.
  // Object-literal shorthand: `{ getState }` is `{ "getState": getState }`,
  // so even after a minifier renames the local `getState` binding, the
  // property KEY `"getState"` survives. Caller chunks destructure from
  // __phRT at the top of their body. See staticPublishRuntime.ts preamble.
  Object.assign(__phRT, {
    getState,
    getStateValue,
    setState,
    deleteState,
    setVisibility,
    listStates,
    subscribe,
    seedFromWindow,
    mountUrlBridge,
  });
});
