// Action dispatcher (15+ action types) + actions directive.
//
// Authored as a real TS function; `stringifyChunk` lifts the body into the
// runtime IIFE. Globals declared in [runtime-globals.d.ts](./runtime-globals.d.ts).

import { stringifyChunk } from "./stringifyChunk";

export const ACTIONS_CHUNK = stringifyChunk(function $actions() {
  // Cross-chunk function bindings via runtime registry. See
  // staticPublishRuntime.ts preamble for the why.
  const {
    setState,
    getState,
    getStateValue,
    setVisibility,
    deleteState,
    actionGatePasses,
    readItemContext,
    resolveActionKey,
    applyShowHide,
    revertShowHide,
    toggleEl,
    interpolateItem,
    fireConversion,
    addToCart,
    cartCheckout,
  } = __phRT;

  function fireAction(action: any, ev: any, itemContext: any) {
    if (!action || !action.type) return;
    if (!actionGatePasses(action)) return;
    const t = action.type;

    if (t === "link" || t === "scroll-to") {
      const href = t === "scroll-to" ? null : action.href;
      const anchor =
        t === "scroll-to"
          ? action.anchor
          : typeof href === "string" && href.charAt(0) === "#"
            ? href.slice(1)
            : null;
      if (anchor) {
        if (ev) ev.preventDefault();
        if (anchor === "top") {
          window.scrollTo({ top: 0, behavior: "smooth" });
        } else {
          const el = document.getElementById(anchor);
          if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
        // Match native <a href="#x"> URL semantics; replaceState avoids back-stack pollution.
        if (t === "link" && anchor !== "top") {
          try {
            history.replaceState(history.state, "", "#" + anchor);
          } catch (e) {}
        }
        // Anchor scroll happens immediately; fire-and-forget conversion.
        if (action.conversion) {
          try {
            fireConversion(action.conversion);
          } catch (e) {}
        }
        return;
      }
      if (t === "link" && href) {
        if (ev) ev.preventDefault();
        const resolved = interpolateItem(href, itemContext);
        if (action.target === "_blank") {
          // Popup must open synchronously inside the user-gesture handler.
          window.open(resolved, "_blank", "noopener,noreferrer");
          if (action.conversion) {
            try {
              fireConversion(action.conversion);
            } catch (e) {}
          }
        } else {
          // Same-tab nav defers through gtag event_callback (+1 s safety timer).
          if (action.conversion) {
            try {
              fireConversion(action.conversion, {
                navigate: function () {
                  window.location.assign(resolved);
                },
              });
            } catch (e) {
              window.location.assign(resolved);
            }
          } else {
            window.location.assign(resolved);
          }
        }
      }
      return;
    }

    // Non-link dispatch — wrapped in an IIFE so each branch's `return;` only
    // exits the dispatcher. After it returns, fire the optional conversion.
    (function () {
      if (t === "open-modal") {
        if (ev) ev.preventDefault();
        const mEl = document.getElementById(action.anchor);
        if (mEl) toggleEl(mEl, "class");
        return;
      }
      if (t === "show-hide") {
        if (ev) ev.preventDefault && ev.preventDefault();
        applyShowHide(action);
        return;
      }
      if (t === "toggle-theme") {
        if (ev) ev.preventDefault();
        const next = !document.documentElement.classList.contains("dark");
        document.documentElement.classList.toggle("dark", next);
        try {
          localStorage.setItem("theme", next ? "dark" : "light");
        } catch (e) {}
        return;
      }
      if (t === "set-local-storage") {
        try {
          if (action.key) localStorage.setItem(action.key, action.value || "");
        } catch (e) {}
        return;
      }
      if (t === "remove-local-storage") {
        try {
          if (action.key) localStorage.removeItem(action.key);
        } catch (e) {}
        return;
      }
      if (t === "copy-to-clipboard") {
        const text = interpolateItem(action.text, itemContext);
        if (!text) return;
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text);
            return;
          }
        } catch (e) {}
        try {
          const ta = document.createElement("textarea");
          ta.value = text;
          ta.setAttribute("readonly", "");
          ta.style.position = "fixed";
          ta.style.opacity = "0";
          document.body.appendChild(ta);
          ta.select();
          document.execCommand("copy");
          document.body.removeChild(ta);
        } catch (e) {}
        return;
      }
      if (t === "download-file") {
        const url = interpolateItem(action.url, itemContext);
        if (!url) return;
        if (ev) ev.preventDefault();
        const a = document.createElement("a");
        a.href = url;
        const fn = interpolateItem(action.filename, itemContext);
        a.download = fn || "";
        a.rel = "noopener";
        a.style.display = "none";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        return;
      }
      if (t === "set-state") {
        if (!action.key) return;
        const sk = resolveActionKey(action.key, itemContext);
        const sv = interpolateItem(action.value, itemContext);
        setState(
          sk,
          { kind: action.kind || "value", value: sv, source: "runtime" },
          "set-state"
        );
        return;
      }
      if (t === "toggle-state") {
        if (!action.key) return;
        const tk = resolveActionKey(action.key, itemContext);
        const cur = getStateValue(tk);
        const kind =
          action.kind || (getState(tk) && getState(tk)!.kind) || "flag";
        const pair =
          action.values ||
          (kind === "visibility"
            ? ["shown", "hidden"]
            : kind === "flag"
              ? ["on", "off"]
              : null);
        if (!pair) return;
        const nx = cur === pair[0] ? pair[1] : pair[0];
        setState(
          tk,
          { kind: kind, value: nx, source: "runtime" },
          "toggle-state"
        );
        return;
      }
      if (t === "clear-state") {
        if (!action.key) return;
        deleteState(resolveActionKey(action.key, itemContext));
        return;
      }
      if (t === "increment-state" || t === "decrement-state") {
        const ik = resolveActionKey(action.key, itemContext);
        if (!ik) return;
        const sign = t === "increment-state" ? 1 : -1;
        const step = (action.step != null ? action.step : 1) * sign;
        const n =
          parseInt((getStateValue(ik) as string) || "0", 10) || 0;
        let nv = n + step;
        const maxRaw = action.max;
        let maxN: number | undefined = undefined;
        if (typeof maxRaw === "number") maxN = maxRaw;
        else if (typeof maxRaw === "string") {
          if (maxRaw.indexOf("state:") === 0) {
            const rr = parseInt(
              (getStateValue(maxRaw.slice(6)) as string) || "",
              10
            );
            if (isFinite(rr)) maxN = rr;
          } else {
            const pn = parseInt(maxRaw, 10);
            if (isFinite(pn)) maxN = pn;
          }
        }
        const minN = action.min;
        if (action.wrap) {
          if (maxN !== undefined && nv > maxN) nv = minN != null ? minN : 0;
          else if (minN !== undefined && nv < minN) {
            nv = maxN != null ? maxN : minN;
          }
        } else {
          if (maxN !== undefined) nv = Math.min(maxN, nv);
          if (minN !== undefined) nv = Math.max(minN, nv);
        }
        setState(
          ik,
          { kind: "value", value: String(nv), source: "runtime" },
          t
        );
        return;
      }
      if (t === "add-to-cart") {
        if (ev) ev.preventDefault();
        // Standalone "Buy X" buttons (no repeater) supply product fields on the action itself.
        if (!itemContext && (action.productId || action.priceId)) {
          itemContext = {
            id: action.productId || action.priceId,
            title: action.title || "Item",
            price: action.price || 0,
            currency: action.currency || "usd",
            metadata: {
              priceId: action.priceId || action.productId,
              sku: action.sku,
            },
          };
        }
        if (!itemContext) {
          console.warn("[PageHub] add-to-cart needs item context");
          return;
        }
        let qty = action.quantity || 1;
        if (action.quantityField) {
          const btn = ev && ev.currentTarget;
          const scope = btn && btn.closest("form, section, body");
          const fld =
            scope && scope.querySelector('[name="' + action.quantityField + '"]');
          const pp = fld ? Number(fld.value) : NaN;
          if (isFinite(pp) && pp > 0) qty = Math.floor(pp);
        }
        let item = itemContext;
        let matchedOk = false;
        if (action.variantMatchStateKey) {
          const vk =
            interpolateItem(action.variantMatchStateKey, itemContext) ||
            action.variantMatchStateKey;
          const raw = getStateValue(vk);
          if (raw) {
            try {
              const matched = JSON.parse(raw as string);
              if (matched && typeof matched === "object") {
                item = Object.assign({}, itemContext, matched, {
                  metadata: Object.assign(
                    {},
                    itemContext.metadata || {},
                    {
                      priceId: matched.priceId,
                      sku:
                        matched.sku ||
                        (itemContext.metadata && itemContext.metadata.sku),
                    }
                  ),
                });
                matchedOk = true;
              }
            } catch (e) {}
          }
        }
        if (itemContext.hasMultipleVariants && !matchedOk) {
          setState(
            "cart:error",
            {
              kind: "value",
              value: "Select an option before adding to cart",
              source: "runtime",
            },
            "add-to-cart"
          );
          return;
        }
        setState(
          "cart:error",
          { kind: "value", value: "", source: "runtime" },
          "add-to-cart"
        );
        addToCart(item, qty);
        return;
      }
      if (t === "toggle-cart") {
        if (ev) ev.preventDefault();
        const cur2 = getStateValue("cart:open");
        setVisibility(
          "cart:open",
          cur2 === "shown" ? "hidden" : "shown",
          "toggle-cart"
        );
        return;
      }
      if (t === "cart-checkout") {
        if (ev) ev.preventDefault();
        cartCheckout();
        return;
      }
      if (t === "manage-subscription") {
        if (ev) ev.preventDefault();
        fetch("/api/customer/portal", {
          method: "POST",
          credentials: "include",
        })
          .then(function (r) {
            return r.json();
          })
          .then(function (d) {
            if (d && d.url) window.location.href = d.url;
          })
          .catch(function () {});
        return;
      }
      if (t === "agent-send") {
        if (ev) ev.preventDefault();
        const bt = ev && ev.currentTarget;
        const root = bt && bt.closest("[data-ph-agent-chat]");
        if (!root) return;
        let fn2 = action.field || "agentMessage";
        fn2 = interpolateItem(fn2, itemContext) || fn2;
        const fld2 = root.querySelector('[name="' + fn2 + '"]');
        const val = fld2 ? (fld2.value || "").trim() : "";
        if (!val) return;
        const cid = root.id || "ph-chat-default";
        setState(
          cid + ":outbox",
          {
            kind: "value",
            value: JSON.stringify({ nonce: Date.now(), value: val }),
            source: "runtime",
          },
          "agent-send"
        );
        if (fld2) {
          fld2.value = "";
          fld2.focus();
        }
        return;
      }
    })();

    // Author-configured conversion (Google Ads / GA4 / Meta) for non-link actions.
    // Link branch fires its own (nav-aware) and returned above before this point.
    if (action.conversion) {
      try {
        fireConversion(action.conversion);
      } catch (e) {}
    }
  }

  Alpine.directive(
    "actions",
    function (
      el: HTMLElement,
      _meta: unknown,
      _ctx: { cleanup: (fn: () => void) => void }
    ) {
      const cleanup = _ctx.cleanup;
      const raw = el.getAttribute("data-ph-actions");
      if (!raw) return;
      let actions: any[];
      try {
        actions = JSON.parse(raw);
      } catch (e) {
        return;
      }
      if (!Array.isArray(actions) || !actions.length) return;
      const itemContext = readItemContext(el);
      const clickActions: any[] = [],
        enterActions: any[] = [],
        leaveActions: any[] = [];
      for (let k = 0; k < actions.length; k++) {
        const a = actions[k];
        if (!a || a.trigger === "load" || a.trigger === "interval") continue;
        if (a.trigger === "hover") {
          enterActions.push(a);
          if (
            a.type === "set-state" ||
            a.type === "toggle-state" ||
            a.type === "clear-state" ||
            a.type === "show-hide"
          ) {
            leaveActions.push(a);
          }
        } else {
          clickActions.push(a);
        }
      }
      let onClick: ((e: any) => void) | null = null;
      let onEnter: ((e: any) => void) | null = null;
      let onLeave: ((e: any) => void) | null = null;
      if (clickActions.length) {
        onClick = function (e) {
          for (let i = 0; i < clickActions.length; i++) {
            fireAction(clickActions[i], e, itemContext);
          }
        };
        el.addEventListener("click", onClick as EventListener);
      }
      const hoverSnap: Record<string, any> = {};
      if (enterActions.length) {
        onEnter = function (e) {
          for (let i = 0; i < enterActions.length; i++) {
            const a = enterActions[i];
            if (
              a.type === "set-state" ||
              a.type === "toggle-state" ||
              a.type === "clear-state"
            ) {
              const snapKey = resolveActionKey(a.key, itemContext);
              if (snapKey && !(snapKey in hoverSnap)) {
                const snapPrev = getState(snapKey);
                hoverSnap[snapKey] = snapPrev
                  ? {
                      kind: snapPrev.kind,
                      value: snapPrev.value,
                      source: snapPrev.source,
                      existed: true,
                    }
                  : { existed: false };
              }
            }
            fireAction(a, e, itemContext);
          }
        };
        el.addEventListener("mouseenter", onEnter as EventListener);
      }
      if (leaveActions.length) {
        onLeave = function (_e) {
          for (let i = 0; i < leaveActions.length; i++) {
            const a = leaveActions[i];
            if (a.type === "show-hide") {
              revertShowHide(a);
              continue;
            }
            if (
              a.type === "set-state" ||
              a.type === "toggle-state" ||
              a.type === "clear-state"
            ) {
              const k = resolveActionKey(a.key, itemContext);
              if (!k) continue;
              const snap = hoverSnap[k];
              delete hoverSnap[k];
              if (snap && snap.existed) {
                setState(
                  k,
                  { kind: snap.kind, value: snap.value, source: snap.source },
                  "hover-revert"
                );
              } else {
                deleteState(k);
              }
            }
          }
        };
        el.addEventListener("mouseleave", onLeave as EventListener);
      }
      cleanup(function () {
        if (onClick) el.removeEventListener("click", onClick as EventListener);
        if (onEnter) {
          el.removeEventListener("mouseenter", onEnter as EventListener);
        }
        if (onLeave) {
          el.removeEventListener("mouseleave", onLeave as EventListener);
        }
      });
    }
  );
});
