import { migrateActions } from "../../utils/action";
import {
  actionsAttr,
  ariaAttrs,
  getInlineStyle,
  handlerAttrs,
  stateAttrs,
  staticClasses,
  tag,
  type ToHTMLFn,
} from "../../utils/staticHtml";

export const toHTML: ToHTMLFn = (props, children, ctx) => {
  if (props.type === "component" || props.type === "componentCanvas") return "";

  let t = "div";
  if (props.type === "page") t = "article";
  else if (props.type === "section") t = "section";
  else if (props.type === "header") t = "header";
  else if (props.type === "footer") t = "footer";
  else if (props.type === "nav") t = "nav";
  else if (props.type === "aside") t = "aside";
  else if (props.type === "main") t = "main";
  else if (props.type === "form") t = "form";
  else if (props.type === "details") t = "details";
  else if (props.type === "summary") t = "summary";
  else if (props.type === "label") t = "label";
  else if (
    props.type === "ul" ||
    props.type === "ol" ||
    props.type === "li" ||
    props.type === "table" ||
    props.type === "thead" ||
    props.type === "tbody" ||
    props.type === "tfoot" ||
    props.type === "tr" ||
    props.type === "td" ||
    props.type === "th"
  )
    t = props.type;

  const attrs: Record<string, any> = {
    class: staticClasses(props, ctx) || undefined,
    style: getInlineStyle(props) || undefined,
    id: props.id || props.anchor || undefined,
    ...ariaAttrs(props),
    ...handlerAttrs(props),
    ...(t === "form" ? {} : actionsAttr(props, ctx)),
    ...stateAttrs(props, ctx),
    action: t === "form" ? props.action || "" : undefined,
    method: t === "form" ? props.method || "POST" : undefined,
    open: t === "details" && props.open ? "" : undefined,
    "data-tab-group": props.tabGroup || undefined,
  };
  if (props.attrs && typeof props.attrs === "object") {
    for (const [k, v] of Object.entries(props.attrs)) {
      if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
        attrs[k] = v as any;
      }
    }
  }

  // Stamp load-trigger show actions for the static-export bootstrap script
  // (`getLoadActionScript()`). The script reveals `[data-ph-load-show]`
  // elements on first visit (gated by optional `conditions`). React routes
  // don't need this — Container's mount effect dispatches the same actions
  // via `fireLoadAction`. `migrateActions` reads the canonical action prop
  // shape (single object or array), so the static stamp can never diverge
  // from runtime semantics.
  // Stamp load-trigger set-state actions so the bootstrap script can seed
  // `window.__PH_STATE__` pre-hydration. Multiple set-states on one node are
  // emitted as a JSON array. Mirrors the show-hide stamp below.
  const loadStateWrites: Array<{ key: string; value: string; kind?: string }> = [];
  for (const la of migrateActions(props)) {
    if (la.type !== "show-hide") {
      if ((la as any).trigger === "load" && la.type === "set-state") {
        const ss = la as any;
        if (ss.key) {
          loadStateWrites.push({
            key: ss.key,
            value: ss.value ?? "",
            ...(ss.kind ? { kind: ss.kind } : {}),
          });
          ctx.hasLoadActions = true;
        }
      }
      continue;
    }
    if (la.trigger !== "load") continue;
    if (la.direction !== "show") continue;
    // Only stamp the target element. If it's not this node, skip — the
    // target Container's own toHTML pass will stamp itself when walked.
    const targetId = props.id || props.anchor;
    if (la.target !== targetId) continue;
    attrs["data-ph-load-show"] = "";
    if (la.method === "style") attrs["data-ph-load-method"] = "style";
    if (Array.isArray(la.conditions) && la.conditions.length > 0) {
      attrs["data-ph-load-conditions"] = JSON.stringify(la.conditions);
    }
    ctx.hasLoadActions = true;
  }
  if (loadStateWrites.length > 0) {
    attrs["data-ph-load-set-state"] = JSON.stringify(loadStateWrites);
  }

  // Horizontal scroll section: wrap children in sticky viewport + flex track
  if (props.scrollEffect === "horizontal-scroll") {
    attrs["data-scroll-effect"] = "horizontal-scroll";
    attrs["data-scroll-direction"] = props.scrollDirection || "ltr";
    attrs["data-scroll-speed"] = String(props.scrollSpeed ?? 1.5);
    attrs["data-scroll-smoothing"] = String(props.scrollSmoothing ?? 0.8);
    attrs["data-scroll-snap"] = String(!!props.scrollSnap);
    ctx.classes.add("ph-hscroll");
    const inner =
      `<div class="ph-hscroll-sticky" style="height:100vh;overflow:hidden">` +
      `<div class="ph-hscroll-track" style="display:flex;height:100%;will-change:transform">${children}</div>` +
      `</div>`;
    return tag(t, attrs, inner);
  }

  // Scroll timeline section: pin + per-child animations via data attributes
  if (props.scrollEffect === "scroll-timeline") {
    attrs["data-scroll-effect"] = "scroll-timeline";
    attrs["data-scroll-runway"] = String(props.scrollTimelineRunway ?? 3);
    attrs["data-scroll-smoothing"] = String(props.scrollSmoothing ?? 0.8);
    ctx.classes.add("ph-scroll-timeline");
    return tag(t, attrs, children);
  }

  const overflow = props.overflow || {};
  const overflowUx =
    (overflow.dragScroll || overflow.autoHide) && props.scrollEffect !== "horizontal-scroll";
  if (overflowUx) {
    const baseClass = attrs.class || "";
    if (!/\boverflow-x-[^\s]+/.test(baseClass)) {
      attrs.class = [baseClass, "overflow-x-auto"].filter(Boolean).join(" ");
      ctx.classes.add("overflow-x-auto");
    }
    ctx.classes.add("ph-overflow-site");
    if (overflow.dragScroll) {
      attrs["data-ph-overflow-drag"] = "";
      const rawS = overflow.smoothing;
      const n = typeof rawS === "number" ? rawS : typeof rawS === "string" ? parseFloat(rawS) : NaN;
      const sm = Number.isNaN(n) ? 0 : Math.min(0.5, Math.max(0, n));
      if (sm > 0) attrs["data-ph-overflow-smooth"] = String(sm);
    }
    if (overflow.autoHide) {
      attrs["data-ph-overflow-autohide"] = "";
      ctx.classes.add("ph-overflow-hide-native-scrollbar");
      attrs.class = [attrs.class, "ph-overflow-hide-native-scrollbar"].filter(Boolean).join(" ");
    }
    if (overflow.dragScroll && overflow.wheelHorizontal !== false) {
      attrs["data-ph-overflow-wheel"] = "";
    }
    attrs["data-ph-overflow-hide-delay"] = String(overflow.hideDelay ?? 1000);
  }

  return tag(t, attrs, children);
};
