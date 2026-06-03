
import {
  actionToHref,
  actionTarget,
  findLinkAction,
  isAnchorAction,
  isHandlerAction,
  isLinkAction,
  migrateActions,
  type NodeAction,
} from "../../utils/action";
import { resolveAnchorsInActions } from "../../utils/anchors/resolveAnchorsInAction";
import { addActionHandlers } from "../../utils/actions/dispatcher";
import { replaceVariables } from "../../utils/design/variables";
import type { PageIndex } from "../../utils/page/pageManagement";

/**
 * Pick the rendered HTML tag for a Container based on
 * `props.type`. Returns the canonical tag (`section` for `"section"`,
 * `article` for `"page"`, …); caller may upgrade `div` → `a` when a link
 * action is present.
 *
 * Side-effect: writes `id: "main-content"` on `prop` for `type === "page"`
 * when no id is set, to keep the WCAG 2.4.1 skip-nav target stable.
 */
export function pickContainerTag(type: string | undefined, prop: any): { tagName: string } {
  let tagName = "div";
  switch (type) {
    case "page":
      tagName = "article";
      if (!prop.id) prop.id = "main-content";
      break;
    case "section":
      tagName = "section";
      break;
    case "header":
    case "footer":
    case "nav":
    case "aside":
    case "main":
    case "form":
    case "details":
    case "summary":
      tagName = type;
      break;
    case "label":
      // Wrapping label — clicking anywhere inside toggles the first child input.
      tagName = "label";
      break;
    case "ul":
    case "ol":
    case "li":
    case "table":
    case "thead":
    case "tbody":
    case "tfoot":
    case "tr":
    case "td":
    case "th":
      tagName = type;
      break;
  }

  // Section/page roots were historically rendered through a wrapper that forced
  // `w-full`; preserve that base so existing sites don't shrink.
  if (type === "section" || type === "page") {
    const cls = prop.className || "";
    if (!/\bw-full\b/.test(cls)) prop.className = ("w-full " + cls).trim();
  }
  return { tagName };
}

interface ApplyActionsCtx {
  props: any;
  enabled: boolean;
  rootProps: Record<string, any> | null;
  pageIndex: PageIndex;
  router: any;
  parentItem: any;
  anchors: any;
}

interface ApplyActionsResult {
  resolvedUrl: string | null | undefined;
  firstLink: NodeAction | undefined;
}

/**
 * Wires Container action props onto `prop` — link href + target + Next router
 * SPA shortcut, multi-action JS dispatcher, form submit fields. Returns
 * `{ resolvedUrl, firstLink }` so the caller can decide tag swaps (div→a).
 *
 * Mirrors the inline block extracted from Container.tsx; preserves the
 * form-mode collision (when `props.type === "form"`, `props.action` is the
 * submission URL string, not a `NodeAction[]`).
 */
export function applyContainerActions(prop: any, ctx: ApplyActionsCtx): ApplyActionsResult {
  const { props, enabled, rootProps, pageIndex, router, parentItem, anchors } = ctx;

  const rawActions = migrateActions(props);
  const actions = resolveAnchorsInActions(rawActions, anchors) as NodeAction[];
  const firstLink = findLinkAction(actions);
  const rawUrl = actionToHref(firstLink, pageIndex, router?.asPath);
  const resolvedUrl =
    rawUrl && rootProps
      ? (() => {
          try {
            return replaceVariables(rawUrl, rootProps, parentItem, anchors);
          } catch {
            return rawUrl;
          }
        })()
      : rawUrl;
  const linkTarget = actionTarget(firstLink);
  const isInternalLink =
    !!firstLink && typeof resolvedUrl === "string" && resolvedUrl.startsWith("/");

  if (resolvedUrl && firstLink && !enabled) {
    prop.href = resolvedUrl;
    if (linkTarget) prop.target = linkTarget;
    if (/^https?:\/\//.test(resolvedUrl as string)) prop.rel = "noopener noreferrer";
    // Internal same-window links → SPA navigation via Next router.
    // Skip when the chain has more than one action; the JS dispatcher below
    // handles ordered execution + nav at the link's turn.
    if (isInternalLink && !linkTarget && actions.length === 1) {
      prop.onClick = (e: any) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button === 1) return;
        e.preventDefault();
        router.push(resolvedUrl).catch(() => {});
      };
    }
  }

  // Multi-action chains, anchor links, and any handler-action route through
  // `addActionHandlers`. Single-link cases above already wired native nav.
  const needsJsDispatch =
    actions.length > 1 ||
    actions.some(a => isHandlerAction(a) || isAnchorAction(a)) ||
    (actions.length === 1 && !isLinkAction(actions[0]));
  if (needsJsDispatch) {
    addActionHandlers(prop, actions, enabled, {
      resolvedLinkHref: typeof resolvedUrl === "string" ? resolvedUrl : null,
    });
  }

  if (props.type === "form") {
    prop.action = typeof props.action === "string" ? props.action : "";
    prop.method = props.method || "POST";
    prop.onSubmit = props.onSubmit;
    prop.target = props.target || "iframe";
  }

  return { resolvedUrl: resolvedUrl as any, firstLink };
}

interface ApplyEditorChromeCtx {
  props: any;
  id: string;
  isMounted: boolean;
  isDragOver: boolean;
  hasChildren: boolean;
  className: string;
}

/**
 * Editor-only `data-*` annotations + the section-positioning safety class.
 * No-op when not enabled. The `node-id` attr is gated on `isMounted` to
 * prevent SSR/hydration mismatch.
 */
export function applyContainerEditorChrome(prop: any, ctx: ApplyEditorChromeCtx): void {
  const { props, id, isMounted, isDragOver, hasChildren, className } = ctx;

  prop["data-border"] = /\bborder(-[^\s])?/.test(props.className || "");
  prop["data-bounding-box"] = true;
  prop["data-empty-state"] = !hasChildren;
  if (isMounted) prop["node-id"] = id;
  prop["data-enabled"] = true;
  prop["data-node-type"] = props.type;
  prop["data-dragged-over"] = isDragOver;

  // Sections must be positioning bounds for the absolute AddSectionNodeController.
  if (props.type === "section" && !className.includes("relative")) {
    prop.className = (prop.className || "") + " relative";
  }
}
