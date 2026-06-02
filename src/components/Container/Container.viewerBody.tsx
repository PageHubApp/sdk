/**
 * Viewer-only Container render body.
 *
 * Copy of `renderContainerBody` with editor-only hooks/branches stripped:
 *   - useView / useIsolate / usePreview / useAtomValue(ViewModeAtom) — never read on viewer
 *   - usePanelUrl — only used by EditorEmptyLeafHint (gated on ctx.enabled)
 *   - useDragOverDetection — only used by applyContainerEditorChrome (gated on ctx.enabled)
 *   - registerLiveComponent / ctx.connect / ctx.drag — editor canvas pinning
 *   - EditorEmptyLeafHint render branch + applyContainerEditorChrome
 *
 * Same prop contract + DOM output as the editor body, so swapping the resolver
 * is transparent. Keeps the bundle off `@zedux/react` for the viewer path.
 */
/* eslint-disable react-hooks/rules-of-hooks -- mirrors render*Body fns from Container.body. */
import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";
import { mergeAccessibilityProps } from "../../utils/accessibility";
import { addCustomHandlers } from "../../utils/actions/customHandlers";
import { fireIntervalActions } from "../../utils/actions/interval";
import { fireLoadAction } from "../../utils/actions/load";
import { getStateValue } from "../../utils/state/stateRegistry";
import { actionTrigger, migrateActions } from "../../utils/action";
import { applyBackgroundImage, applyPattern } from "../../utils/background";
import { motionIt } from "../../utils/motion";
import { CSStoObj, applyAnimation } from "../../utils/tailwind/tailwind";
import { useHorizontalDragScroll } from "../../utils/hooks/useHorizontalDragScroll";
import { useContainerScrollEffect } from "./useContainerScrollEffect";
import { applyContainerOverflowUX } from "./applyContainerOverflowUX";
import { applyContainerActions, pickContainerTag } from "./containerPropHelpers";
import { replaceVariables } from "../../utils/design/variables";
import { useRuntimeVarsVersion } from "../../utils/design/RuntimeVarsContext";
import { applyShowHideOverride, useShowHideVersion } from "../../utils/state/showHideStore";
import { applyStateModifiers } from "../../utils/conditions/stateModifiers";
import {
  applyComputedStateBindings,
  computeBindingsSnapshot,
} from "../../utils/conditions/computedState";
import { buildClientContext } from "../../utils/conditions/context";
import { useItemContext } from "../../utils/itemContext";
import { applyAttrs } from "../../utils/applyAttrs";
import { useAnchors, resolveAnchors } from "../../utils/anchors/anchorContext";
import type { RenderCtx } from "../../render/react/RenderCtx";
import { applyAriaProps } from "../selectors";
import type { OverflowProps } from "../types";
import type { ContainerProps, ContainerRenderOptions } from "./Container.body";

const RenderPatternBody = ({ children, props }: any) => {
  const inlayProps = applyPattern({}, props, null);
  const inlayClass = "flex flex-col flex-1 w-full";
  if (inlayProps?.style?.backgroundImage) {
    return <div className={inlayClass} {...inlayProps}>{children}</div>;
  }
  return children;
};

export function renderContainerViewerBody(
  incomingProps: Partial<ContainerProps>,
  ctx: RenderCtx,
  opts?: ContainerRenderOptions
) {
  const props: ContainerProps = {
    type: "container",
    isHomePage: false,
    ...incomingProps,
    background: {
      fetchPriority: "low",
      ...(incomingProps?.background ?? {}),
    },
  };

  const settings = null;
  const router = useRouter();
  const parentItem = useItemContext();
  const anchors = useAnchors();
  useRuntimeVarsVersion();
  useShowHideVersion();

  const isGsaponHorizontalStrip = props.scrollEffect === "horizontal-scroll";
  const overflow: OverflowProps = props.overflow ?? {};
  const overflowUxActive = !!(overflow.dragScroll || overflow.autoHide) && !isGsaponHorizontalStrip;

  // ctx.enabled is always false on viewer — bake the constant.
  const dragDisabled = !overflow.dragScroll || !overflowUxActive;
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

  const { wrapProp: scrollEffectWrap } = useContainerScrollEffect(props, false);

  useEffect(() => {
    const actions = migrateActions(props);
    actions.filter(a => actionTrigger(a) === "load").forEach(fireLoadAction);
    const cleanup = fireIntervalActions(actions);
    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const bindings = props.computedStateBindings;
  const computedSnapshot = computeBindingsSnapshot(bindings, raw =>
    replaceVariables(raw, ctx.rootProps, parentItem, anchors)
  );
  useEffect(() => {
    if (!Array.isArray(bindings) || bindings.length === 0) return;
    applyComputedStateBindings(bindings, raw =>
      replaceVariables(raw, ctx.rootProps, parentItem, anchors)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [computedSnapshot]);

  const { children } = props;

  let className = typeof props.className === "string" ? props.className : "";

  {
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

  if (Array.isArray(props.stateModifiers) && props.stateModifiers.length > 0) {
    className = applyStateModifiers(
      className,
      props.stateModifiers,
      buildClientContext(ctx.rootProps, parentItem, anchors),
      "Container",
      ctx.rootProps
    );
  }

  // `component` / `componentCanvas` are editor-only types — on viewer they
  // would always evaluate to hidden in the original body (ctx.enabled=false
  // short-circuits both branches). Preserve that with a single hidden class.
  if (props.type === "component" || props.type === "componentCanvas") {
    className = `${className} hidden`;
  }

  if (overflowUxActive) {
    if (!/\boverflow-x-[^\s]+/.test(className)) {
      className = `${className} overflow-x-auto`.trim();
    }
  }

  const resolvedChildren = opts?.renderChildren ? opts.renderChildren(children) : children;

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
      (scrollRef as React.MutableRefObject<HTMLDivElement | null>).current = r;
      setOverflowScrollEl(r);
    },
    style: {
      ...(props.root?.style ? CSStoObj(props.root.style) || {} : {}),
      ...stateStyle,
    },
    className,
    children: (
      <RenderPatternBody props={props}>
        {resolvedChildren}
      </RenderPatternBody>
    ),
  };

  const { resolvedUrl, firstLink } = applyContainerActions(prop, {
    props,
    enabled: false,
    rootProps: ctx.rootProps,
    pageIndex: ctx.pageIndex,
    router,
    parentItem,
    anchors,
  });

  addCustomHandlers(prop, props.handlers, false, props.handlerOptions);

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

  if (opts?.extraAttrs) {
    for (const [k, v] of Object.entries(opts.extraAttrs)) {
      prop[k] = v;
    }
  }

  applyAriaProps(prop, props);

  applyAttrs(prop, props.attrs, v =>
    typeof v === "string" ? replaceVariables(v, ctx.rootProps, parentItem, anchors) : v
  );

  prop = mergeAccessibilityProps(
    {
      ...applyBackgroundImage(prop, props, settings, ctx.pageMedia ?? null),
      ...applyAnimation({ ...prop, key: ctx.id }, props, null, false),
    },
    props
  );

  const { tagName, UiComponent } = pickContainerTag(props.type, prop);
  scrollEffectWrap(prop);
  if (overflowUxActive) {
    applyContainerOverflowUX(prop, {
      overflow,
      enabled: false,
      scrollEl: overflowScrollEl,
      onDragPointerDown,
      dragSmooth,
      wheelMaps,
    });
  }
  const renderTag = resolvedUrl && firstLink && tagName === "div" ? "a" : tagName;
  return React.createElement(motionIt(props, UiComponent, false), {
    ...prop,
    as: renderTag,
  });
}
