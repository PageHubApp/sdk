import { useEditor, useNode } from "@craftjs/core";
import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";
import { useAtomValue } from "@zedux/react";
import { TbArrowDown, TbContainer, TbNote } from "react-icons/tb";
import { LazyEditorEmptyLeafHint as EditorEmptyLeafHint } from "../LazyEditorEmptyLeafHint";
import { useIsolate, usePreview, useView } from "../../core/store";
import { ViewModeAtom } from "../../utils/atoms";
import { usePanelUrl } from "../../utils/usePanelUrl";
import { registerLiveComponent } from "../../utils/component/liveComponentRegistry";
import { mergeAccessibilityProps } from "../../utils/accessibility";
import { addCustomHandlers, fireIntervalActions, fireLoadAction } from "../../utils/actions";
import { getStateValue } from "../../utils/state/stateRegistry";
import { migrateActions, type NodeAction } from "../../utils/action";
import { getClonedState, setClonedProps } from "../../utils/cloneState";
import { applyBackgroundImage } from "../../utils/background";
import { motionIt } from "../../utils/motion";
import { CSStoObj, applyAnimation } from "../../utils/tailwind/tailwind";
import { useHorizontalDragScroll } from "../../utils/hooks/useHorizontalDragScroll";
import { useContainerScrollEffect } from "./useContainerScrollEffect";
import { useDragOverDetection, useMounted } from "../../utils/hooks";
import { applyContainerOverflowUX } from "./applyContainerOverflowUX";
import {
  applyContainerActions,
  applyContainerEditorChrome,
  pickContainerTag,
} from "./containerPropHelpers";
import { RenderPattern, inlayProps } from "../componentHooks";
import { replaceVariables } from "../../utils/design/variables";
import { useRuntimeVarsVersion } from "../../utils/design/RuntimeVarsContext";
import { applyShowHideOverride, useShowHideVersion } from "../../utils/state/showHideStore";
import { applyStateModifiers } from "../../utils/conditions/stateModifiers";
import {
  applyComputedStateBindings,
  computeBindingsSnapshot,
  type ComputedStateBinding,
} from "../../utils/conditions/computedState";
import { buildClientContext } from "../../utils/conditions/context";
import { useItemContext } from "../../utils/itemContext";
import { applyAttrs } from "../../utils/applyAttrs";
import { useAnchors, resolveAnchors } from "../../utils/anchors/anchorContext";
import { ROOT_NODE } from "@craftjs/utils";

import { BaseSelectorProps, applyAriaProps } from "../selectors";
import type { OverflowProps } from "../types";
export interface ContainerProps extends BaseSelectorProps {
  type: string;
  isHomePage?: boolean;
  is404Page?: boolean;
  anchor?: string;
  tabGroup?: string;
  /**
   * Explicit registry key to read for `applyShowHideOverride` instead of the
   * element's own DOM id. Lets sibling Containers (e.g. cart panel +
   * backdrop) react to the SAME visibility entry without sharing a DOM `id`
   * (which would be invalid HTML). `{{anchor.X}}` tokens are resolved
   * against the nearest <AnchorProvider> the same way `id` / `action.target`
   * are.
   */
  visibilityStateKey?: string;
  /**
   * Click action(s) — array for multi-action chains, single object for one
   * action, or a string when this Container is form-mode (`type === "form"`),
   * where `action` is the form submission URL.
   */
  action?: string | NodeAction | NodeAction[];
  method?: string;
  onSubmit?: any;
  target?: any;
  id?: any;
  role?: string;
  "aria-label"?: string;

  open?: boolean;
  /** Pass-through DOM attrs (data-*, role, autocomplete, name, etc.). Documented in templates.md. */
  attrs?: Record<string, string | number | boolean>;
  /**
   * Bind state-registry values into inline CSS — write the live value of
   * `state[key]` into a CSS property (typically a custom variable like
   * `--carousel-index`). Used by carousel tracks, stepper indicators, any
   * "DOM follows numeric state" pattern. Reactive via the global state tick.
   *
   *   stateStyleBindings: [{ key: "carousel-1", styleProp: "--carousel-index" }]
   */
  stateStyleBindings?: Array<{
    key: string;
    styleProp: string;
    /** Optional template — `{{value}}` is replaced with the resolved state value. */
    template?: string;
    /** Default when state is unset (or non-numeric). Defaults to `"0"`. */
    defaultValue?: string;
  }>;
  /**
   * Derived state — declarative replacement for ad-hoc JS handlers that
   * recompute state from other state. The variant chip's selection state
   * machine, "all required fields filled" gates, "first non-empty value"
   * fallbacks etc. all become typed compute declarations the editor can
   * pick from. See `utils/conditions/computedState.ts`.
   */
  computedStateBindings?: ComputedStateBinding[];
  actionProp?: NodeAction;
  click?: any; // Legacy — handled by migrateAction()
  scrollEffect?: string;
  scrollDirection?: "ltr" | "rtl";
  scrollSnap?: boolean;
  scrollSpeed?: number;
  scrollSmoothing?: number;
  scrollTimelineRunway?: number;

  /** Pointer-drag scroll UX (not GSAP scroll effects) on published/view/static routes. See {@link OverflowProps}. */
  overflow?: OverflowProps;
}

/**
 * Options for {@link useContainerRender}. Used by the `Data` component to
 * compose its repeater/connector behavior on top of the shared shell without
 * duplicating any layout, scroll, or action code.
 */
export interface ContainerRenderOptions {
  /** Pre-process children before they hit RenderPattern (e.g. Data repeats per item). */
  renderChildren?: (children: React.ReactNode) => React.ReactNode;
  /** Extra DOM attrs merged onto the rendered element (e.g. data-ph-connector-*). */
  extraAttrs?: Record<string, any>;
}

/**
 * Shared render body for `Container` and `Data`. Owns layout, scroll effects,
 * overflow UX, actions, accessibility, and tag selection. Does NOT know about
 * data sources — `Data` supplies a `renderChildren` override and binding attrs
 * via {@link ContainerRenderOptions}.
 */
export function useContainerRender(
  incomingProps: Partial<ContainerProps>,
  opts?: ContainerRenderOptions
) {
  let props: any = {
    type: "container",
    canDelete: true,
    canEditName: true,
    isHomePage: false,
    ...incomingProps,
    background: {
      fetchPriority: "low",
      ...(incomingProps?.background ?? {}),
    },
  };

  const view = useView();
  const viewMode = useAtomValue(ViewModeAtom);
  const isolate = useIsolate();
  const preview = usePreview();
  const settings = null;

  const {
    connectors: { connect, drag },
  } = useNode();

  const { query, enabled } = useEditor(state => getClonedState(props, state));
  const router = useRouter();
  const parentItem = useItemContext();
  const anchors = useAnchors();
  const { open: openPanel } = usePanelUrl();
  useRuntimeVarsVersion();
  useShowHideVersion();

  const { name, id, isHovered, hasChildNodes, isCanvasNode, isActive } = useNode(node => ({
    name: node.data.custom.displayName || node.data.displayName,
    isActive: node.events.selected,
    isHovered: node.events.hovered,
    hasChildNodes: node.data.nodes.length > 0,
    isCanvasNode: node.data.isCanvas,
  }));

  props = setClonedProps(props, query, ["order"]);

  const isGsaponHorizontalStrip = props.scrollEffect === "horizontal-scroll";
  const overflow: OverflowProps = props.overflow ?? {};
  const overflowUxActive = !!(overflow.dragScroll || overflow.autoHide) && !isGsaponHorizontalStrip;

  const dragDisabled = !overflow.dragScroll || enabled || !overflowUxActive;
  const wheelMaps = !!overflow.dragScroll && overflow.wheelHorizontal !== false;

  const rawSmooth = overflow.smoothing;
  const dragSmooth = (() => {
    const n =
      typeof rawSmooth === "number"
        ? rawSmooth
        : typeof rawSmooth === "string"
          ? parseFloat(rawSmooth)
          : NaN;
    if (Number.isNaN(n)) return 0;
    return Math.min(0.5, Math.max(0, n));
  })();

  const { scrollRef, onDragPointerDown } = useHorizontalDragScroll({
    disabled: dragDisabled,
    verticalWheelScrollsHorizontal: wheelMaps,
    dragScrollSmoothing: dragSmooth,
    deps: [id, props.className, dragSmooth],
  });

  const [overflowScrollEl, setOverflowScrollEl] = useState<HTMLElement | null>(null);

  const isMounted = useMounted();
  const { ref, isDragOver } = useDragOverDetection();
  const { wrapProp: scrollEffectWrap } = useContainerScrollEffect(props, enabled);

  // Fire load-trigger actions on mount in viewer mode. Skipped in editor —
  // `useShowOnLoadAutoReveal` keeps banners visible to the author regardless
  // of localStorage gates.
  useEffect(() => {
    if (enabled) return;
    const actions = migrateActions(props);
    actions.filter(a => (a as any).trigger === "load").forEach(fireLoadAction);
    // Interval triggers (autoscroll carousels, ticker bands, etc.) — set up
    // on mount, tear down on unmount.
    const cleanup = fireIntervalActions(actions);
    return cleanup;
    // Mount-only — re-fires only when toggling between editor and viewer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  // Computed-state bindings — derived registry entries (variant matching,
  // all-truthy gates, etc). Runs in an effect (not the render body) so the
  // setState writes happen AFTER the render commits — never mid-render.
  //
  // Dep: a snapshot string that fingerprints (a) declared `from` keys'
  // current values, (b) axis-derived input keys for variant-* computes,
  // (c) interpolated variantMap literal. Render-on-tick still happens via
  // `useShowHideVersion` above, but the EFFECT only re-runs when an actual
  // input value changes — not every render. Avoids re-applying bindings on
  // unrelated state tick bumps (e.g. cart open/close).
  const bindings = (props as any).computedStateBindings as ComputedStateBinding[] | undefined;
  const computedSnapshot = computeBindingsSnapshot(bindings, raw =>
    typeof raw === "string" ? replaceVariables(raw, query, parentItem, anchors) : (raw as any)
  );
  useEffect(() => {
    if (!Array.isArray(bindings) || bindings.length === 0) return;
    applyComputedStateBindings(bindings, raw =>
      typeof raw === "string" ? replaceVariables(raw, query, parentItem, anchors) : (raw as any)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [computedSnapshot]);

  const { children } = props;

  let className = typeof props.className === "string" ? props.className : "";

  // Apply class-based show-hide override. In viewer the action handler writes
  // here when buttons fire; in editor the action-panel "peek" button writes
  // here so authors can see hidden targets (modal backdrops, drawers, etc.)
  // without leaving the trigger's settings panel.
  {
    // `visibilityStateKey` is the explicit opt-in: read visibility from this
    // registry entry instead of the element's own DOM id. Lets multiple
    // sibling Containers (e.g. cart panel + backdrop) react to the SAME
    // visibility state without sharing a DOM id (which would be invalid HTML).
    const showHideTarget = resolveAnchors(
      (typeof props.visibilityStateKey === "string" ? props.visibilityStateKey : undefined) ||
        (props.attrs && typeof props.attrs.id === "string" ? props.attrs.id : undefined) ||
        (typeof props.id === "string" ? props.id : undefined) ||
        (typeof props.anchor === "string" ? props.anchor : undefined),
      anchors
    );
    if (showHideTarget) {
      className = applyShowHideOverride(className, showHideTarget);
    }
  }

  // Apply state-bound modifier classes — author-declared "when state X, apply
  // modifier Y" bindings on `props.stateModifiers`. Subscribes to the global
  // state tick via `useShowHideVersion()` above so changes rerender us.
  if (Array.isArray(props.stateModifiers) && props.stateModifiers.length > 0) {
    let rootProps: any = null;
    try {
      rootProps = query.node(ROOT_NODE).get()?.data?.props ?? null;
    } catch {
      /* root may be unavailable in isolated previews */
    }
    className = applyStateModifiers(
      className,
      props.stateModifiers,
      buildClientContext(rootProps, parentItem, anchors),
      "Container",
      rootProps
    );
  }

  // Hide component containers in non-canvas modes. Canvas isolation (hiding
  // non-target components when one is isolated) is handled by setHidden via
  // applyCanvasVisibility — CraftJS RenderNode returns null for hidden nodes,
  // so the className branch isn't needed there.
  if (props.type === "component") {
    if (!enabled || viewMode === "page" || viewMode === "preview") {
      className = `${className} hidden`;
    }
  }

  // The componentCanvas singleton is hidden everywhere except canvas list mode.
  // applyCanvasVisibility hides it via setHidden in non-canvas / isolation
  // modes, but keep the className guard for the brief window between viewMode
  // change and the visibility effect running.
  if (props.type === "componentCanvas") {
    if (!enabled || viewMode !== "canvas") {
      className = `${className} hidden`;
    }
  }

  /** Skip dashed empty hint when this canvas already has a background (image, inline style, or Tailwind `bg-*`).
   *  Page containers always show the hint — their `bg-base-100` is the default surface, not decorative. */
  const suppressEmptyCanvasHint =
    props.type !== "page" &&
    (!!props.background?.image || !!props.root?.style || /\bbg-/.test(className.trim()));

  if (overflowUxActive) {
    if (!/\boverflow-x-[^\s]+/.test(className)) {
      className = `${className} overflow-x-auto`.trim();
    }
  }

  // Resolve final children: Data supplies a wrapper for repeater rendering;
  // Container uses raw children and optional editor hints.
  const resolvedChildren = opts?.renderChildren ? opts.renderChildren(children) : children;

  // State-bound inline style — read live state values and write into CSS
  // (typically custom properties like `--carousel-index`). Reactive via the
  // global state tick already subscribed to above.
  const stateStyle: Record<string, string> = {};
  if (Array.isArray(props.stateStyleBindings) && props.stateStyleBindings.length > 0) {
    for (const b of props.stateStyleBindings) {
      if (!b || !b.key || !b.styleProp) continue;
      const raw =
        getStateValue(b.key) ?? (typeof b.defaultValue === "string" ? b.defaultValue : "0");
      const out = b.template ? b.template.replace(/\{\{value\}\}/g, raw) : raw;
      stateStyle[b.styleProp] = out;
    }
  }

  let prop: any = {
    ref: r => {
      ref.current = r;
      (scrollRef as React.MutableRefObject<HTMLDivElement | null>).current = r;
      setOverflowScrollEl(r);
      // Canvas-mode pinning bridge: register every Container DOM in the live
      // registry whenever it mounts/unmounts. Component cards key off
      // type === "component" containers; state cards (Modal panels, Tab panes,
      // show-hide targets) pin descendants by id, so the registry must cover
      // every Container — not just component roots.
      registerLiveComponent(id, r);
      connect(drag(r));
    },
    style: {
      ...(props.root?.style ? CSStoObj(props.root.style) || {} : {}),
      ...stateStyle,
    },
    className,
    ...(props.type === "component" ? { "data-component-container": "true" } : {}),
    ...(props.type === "componentCanvas" ? { "data-component-canvas": "true" } : {}),
    children: (
      <RenderPattern
        props={props}
        settings={settings}
        view={view}
        enabled={enabled}
        properties={inlayProps}
        preview={preview}
        query={query}
      >
        {resolvedChildren ? (
          resolvedChildren
        ) : isCanvasNode && !hasChildNodes && enabled && !suppressEmptyCanvasHint ? (
          <EditorEmptyLeafHint
            selected={isActive}
            icon={props.type === "page" ? <TbNote aria-hidden /> : <TbContainer aria-hidden />}
            selectedIcon={<TbArrowDown aria-hidden />}
            idleLabel={
              props.type === "page"
                ? "Empty page"
                : props.type === "header"
                  ? "Global header"
                  : props.type === "footer"
                    ? "Global footer"
                    : name
            }
            selectedLabel={
              props.type === "page" ? "Drop sections or right-click" : "Drop here or right-click"
            }
            typeLabel={name}
            showActionIcons
            onClick={props.type === "page" ? () => openPanel("blocks") : undefined}
          />
        ) : null}
      </RenderPattern>
    ),
  };

  const { resolvedUrl, firstLink } = applyContainerActions(prop, {
    props,
    enabled,
    query,
    router,
    parentItem,
    anchors,
  });

  // After action + form setup so `handlers.onSubmit` composes with the form
  // submit handler instead of being overwritten by it.
  addCustomHandlers(prop, props.handlers, enabled);

  if (props.scrollEffect) prop["data-scroll-effect"] = props.scrollEffect;
  {
    const rawId = props.id || props.anchor;
    const resolvedId = resolveAnchors(typeof rawId === "string" ? rawId : undefined, anchors);
    if (resolvedId) prop.id = resolvedId;
    else if (rawId) prop.id = rawId;
  }
  if (props.tabGroup)
    prop["data-tab-group"] = resolveAnchors(props.tabGroup, anchors) || props.tabGroup;
  if (props.type === "details" && props.open) prop.open = true;

  // Data supplies connector binding attrs here.
  if (opts?.extraAttrs) {
    for (const [k, v] of Object.entries(opts.extraAttrs)) {
      prop[k] = v;
    }
  }

  applyAriaProps(prop, props);

  // Pass through plain string attrs (data-*, role, autocomplete, etc.) so
  // app URL/commerce hooks and other runtime wiring can query the DOM.
  // Interpolate string attrs against repeater item context so blocks can
  // author e.g. `data-ph-zero="{{item.count}}"` on per-item wrappers —
  // parity with Button + FormElement.
  applyAttrs(prop, props.attrs, v =>
    typeof v === "string" ? replaceVariables(v, query, parentItem, anchors) : v
  );

  if (enabled) {
    applyContainerEditorChrome(prop, {
      props,
      id,
      isMounted,
      isDragOver,
      hasChildren: !!children,
      className,
    });
  }

  prop = mergeAccessibilityProps(
    {
      ...applyBackgroundImage(prop, props, settings, query),
      ...applyAnimation({ ...prop, key: id }, props, null, enabled),
    },
    props
  );

  const { tagName, UiComponent } = pickContainerTag(props.type, prop);

  scrollEffectWrap(prop);

  if (overflowUxActive) {
    applyContainerOverflowUX(prop, {
      overflow,
      enabled,
      scrollEl: overflowScrollEl,
      onDragPointerDown,
      dragSmooth,
      wheelMaps,
    });
  }

  // If this Container has a link action and would otherwise render as a plain
  // <div>, swap the tag to <a> so the card is a real, right-clickable link.
  // Don't override semantic tags (section/article/header/footer/etc).
  const renderTag = resolvedUrl && firstLink && !enabled && tagName === "div" ? "a" : tagName;

  return React.createElement(motionIt(props, UiComponent, enabled), {
    ...prop,
    as: renderTag,
  });
}

export const Container = (incomingProps: Partial<ContainerProps>) => {
  return useContainerRender(incomingProps);
};

const SECTION_PARENTS = new Set(["page", "component", "header", "footer"]);

const canMoveIn = (nodes, into) => {
  return nodes.every(node => {
    if (node?.data?.props?.type === "form") {
      if (into.data?.props?.type === "form") return false;
    }
    if (node?.data?.props?.type === "page") {
      return into.id === "ROOT";
    }
    // Blocks/sections can only go into pages, components, headers, or footers
    if (node?.data?.props?.type === "section") {
      return SECTION_PARENTS.has(into.data?.props?.type);
    }
    return true;
  });
};

Container.craft = {
  displayName: "Container",
  rules: {
    canDrag: () => true,
    canDelete: () => true,
    canMoveIn: (node, into) => canMoveIn(node, into),
  },
};
