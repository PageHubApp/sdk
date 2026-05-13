/** Pure body for Container. NO `@craftjs/core`. */
/* eslint-disable react-hooks/rules-of-hooks -- render*Body fns are invoked once from a wrapper component; hook order is preserved. Renamed to use* would change exported public-ish API across the SDK. */
import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";
import { useAtomValue } from "@zedux/react";
import { TbArrowDown, TbContainer, TbNote } from "../_emptyHintIcons";
import { EditorEmptyLeafHint } from "../../chrome/primitives/EditorEmptyLeafHint";
import { useIsolate, usePreview, useView } from "../../core/store";
import { ViewModeAtom } from "../../utils/atoms";
import { usePanelUrl } from "../../utils/usePanelUrl";
import { registerLiveComponent } from "../../utils/component/liveComponentRegistry";
import { mergeAccessibilityProps } from "../../utils/accessibility";
import { addCustomHandlers } from "../../utils/actions/customHandlers";
import { fireIntervalActions } from "../../utils/actions/interval";
import { fireLoadAction } from "../../utils/actions/load";
import { getStateValue } from "../../utils/state/stateRegistry";
import { migrateActions, type NodeAction } from "../../utils/action";
import { applyBackgroundImage, applyPattern } from "../../utils/background";
import { motionIt } from "../../utils/motion";
import { CSStoObj, applyAnimation } from "../../utils/tailwind/tailwind";
import { useHorizontalDragScroll } from "../../utils/hooks/useHorizontalDragScroll";
import { useContainerScrollEffect } from "./useContainerScrollEffect";
import { useDragOverDetection } from "../../utils/hooks/useDragOverDetection";
import { applyContainerOverflowUX } from "./applyContainerOverflowUX";
import {
  applyContainerActions,
  applyContainerEditorChrome,
  pickContainerTag,
} from "./containerPropHelpers";
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
import type { RenderCtx } from "../../render/RenderCtx";
import { BaseSelectorProps, applyAriaProps } from "../selectors";
import type { OverflowProps } from "../types";

// Inline RenderPattern (the version from core/componentHooks.tsx but
// without the `useEditor` craft import that lives there). Pure passthrough.
const RenderPatternBody = ({ children, props }: any) => {
  const inlayProps = applyPattern({}, props, null);
  const inlayClass = "flex flex-col flex-1 w-full";
  if (inlayProps?.style?.backgroundImage) {
    return <div className={inlayClass} {...inlayProps}>{children}</div>;
  }
  return children;
};

const inlayPropsList = [
  "backgroundGradient", "backgroundGradientTo", "backgroundGradientFrom",
  "px", "py", "flexDirection", "alignItems", "justifyContent", "flexGrow",
  "p", "gap",
];

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
export function renderContainerBody(
  incomingProps: Partial<ContainerProps>,
  ctx: RenderCtx,
  opts?: ContainerRenderOptions
) {
  const props: any = {
    type: "container",
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

  const router = useRouter();
  const parentItem = useItemContext();
  const anchors = useAnchors();
  const { open: openPanel } = usePanelUrl();
  useRuntimeVarsVersion();
  useShowHideVersion();

  const isGsaponHorizontalStrip = props.scrollEffect === "horizontal-scroll";
  const overflow: OverflowProps = props.overflow ?? {};
  const overflowUxActive = !!(overflow.dragScroll || overflow.autoHide) && !isGsaponHorizontalStrip;

  const dragDisabled = !overflow.dragScroll || ctx.enabled || !overflowUxActive;
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
    deps: [ctx.id, props.className, dragSmooth],
  });

  const [overflowScrollEl, setOverflowScrollEl] = useState<HTMLElement | null>(null);

  const { ref, isDragOver } = useDragOverDetection();
  const { wrapProp: scrollEffectWrap } = useContainerScrollEffect(props, ctx.enabled);

  useEffect(() => {
    if (ctx.enabled) return;
    const actions = migrateActions(props);
    actions.filter(a => (a as any).trigger === "load").forEach(fireLoadAction);
    const cleanup = fireIntervalActions(actions);
    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx.enabled]);

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
    typeof raw === "string" ? replaceVariables(raw, ctx.rootProps, parentItem, anchors) : (raw as any)
  );
  useEffect(() => {
    if (!Array.isArray(bindings) || bindings.length === 0) return;
    applyComputedStateBindings(bindings, raw =>
      typeof raw === "string" ? replaceVariables(raw, ctx.rootProps, parentItem, anchors) : (raw as any)
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
    className = applyStateModifiers(
      className,
      props.stateModifiers,
      buildClientContext(ctx.rootProps, parentItem, anchors),
      "Container",
      ctx.rootProps
    );
  }

  // Hide component containers in non-canvas modes. Canvas isolation (hiding
  // non-target components when one is isolated) is handled by setHidden via
  // applyCanvasVisibility — CraftJS RenderNode returns null for hidden nodes,
  // so the className branch isn't needed there.
  if (props.type === "component") {
    if (!ctx.enabled || viewMode === "page" || viewMode === "preview") {
      className = `${className} hidden`;
    }
  }

  // The componentCanvas singleton is hidden everywhere except canvas list mode.
  // applyCanvasVisibility hides it via setHidden in non-canvas / isolation
  // modes, but keep the className guard for the brief window between viewMode
  // change and the visibility effect running.
  if (props.type === "componentCanvas") {
    if (!ctx.enabled || viewMode !== "canvas") {
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
    ref: (r: any) => {
      ref.current = r;
      (scrollRef as React.MutableRefObject<HTMLDivElement | null>).current = r;
      setOverflowScrollEl(r);
      registerLiveComponent(ctx.id, r);
      ctx.connect(ctx.drag(r));
    },
    style: {
      ...(props.root?.style ? CSStoObj(props.root.style) || {} : {}),
      ...stateStyle,
    },
    className,
    ...(props.type === "component" ? { "data-component-container": "true" } : {}),
    ...(props.type === "componentCanvas" ? { "data-component-canvas": "true" } : {}),
    children: (
      <RenderPatternBody props={props}>
        {resolvedChildren ? (
          resolvedChildren
        ) : ctx.isCanvasNode && !ctx.hasChildNodes && ctx.enabled && !suppressEmptyCanvasHint ? (
          <EditorEmptyLeafHint
            selected={ctx.isActive}
            icon={props.type === "page" ? <TbNote aria-hidden /> : <TbContainer aria-hidden />}
            selectedIcon={<TbArrowDown aria-hidden />}
            idleLabel={
              props.type === "page"
                ? "Empty page"
                : props.type === "header"
                  ? "Global header"
                  : props.type === "footer"
                    ? "Global footer"
                    : ctx.name
            }
            selectedLabel={
              props.type === "page" ? "Drop sections or right-click" : "Drop here or right-click"
            }
            typeLabel={ctx.name}
            showActionIcons
            onClick={props.type === "page" ? () => openPanel("blocks") : undefined}
          />
        ) : null}
      </RenderPatternBody>
    ),
  };

  const { resolvedUrl, firstLink } = applyContainerActions(prop, {
    props,
    enabled: ctx.enabled,
    rootProps: ctx.rootProps,
    pageIndex: ctx.pageIndex,
    router,
    parentItem,
    anchors,
  });

  addCustomHandlers(prop, props.handlers, ctx.enabled);

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
    typeof v === "string" ? replaceVariables(v, ctx.rootProps, parentItem, anchors) : v
  );

  if (ctx.enabled) {
    applyContainerEditorChrome(prop, {
      props,
      id: ctx.id,
      isMounted: ctx.isMounted,
      isDragOver,
      hasChildren: !!children,
      className,
    });
  }

  prop = mergeAccessibilityProps(
    {
      ...applyBackgroundImage(prop, props, settings, ctx.pageMedia ?? null),
      ...applyAnimation({ ...prop, key: ctx.id }, props, null, ctx.enabled),
    },
    props
  );

  const { tagName, UiComponent } = pickContainerTag(props.type, prop);
  scrollEffectWrap(prop);
  if (overflowUxActive) {
    applyContainerOverflowUX(prop, {
      overflow,
      enabled: ctx.enabled,
      scrollEl: overflowScrollEl,
      onDragPointerDown,
      dragSmooth,
      wheelMaps,
    });
  }
  const renderTag = resolvedUrl && firstLink && !ctx.enabled && tagName === "div" ? "a" : tagName;
  return React.createElement(motionIt(props, UiComponent, ctx.enabled), {
    ...prop,
    as: renderTag,
  });
}

