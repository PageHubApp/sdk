import React from "react";
import { useEditor, useNode } from "@craftjs/core";
import { useEffect, useRef, useState } from "react";
import { buildClientContext, buildStaticContext } from "./context";
import { evaluateConditionGroups, evaluateConditions } from "./evaluate";
import { getConnectorData, replaceVariables } from "../design/variables";
import { useItemContext } from "../itemContext";
import { subscribe as subscribeState } from "../stateRegistry";
import type { Condition, ConditionGroup, ConditionLogic } from "./types";

/**
 * Walk all conditions (top-level + groups) and collect the state keys they
 * read. We subscribe per-key in the runtime evaluator so unrelated state
 * writes (cart open, toast tick, search input on another grid) don't trigger
 * a condition re-eval on every node with conditions. `auth` conditions are
 * mirrored to `auth:status` by `setAuthState`, so subscribing to that key
 * covers them. Other condition types (url-param, viewport, form-field) are
 * handled by their own listeners (popstate/resize/etc).
 */
function collectStateKeys(
  conditions: Condition[],
  groups: ConditionGroup[] | null
): string[] {
  const keys = new Set<string>();
  const visit = (c: Condition) => {
    if (c.type === "state" && (c as any).key) keys.add((c as any).key);
    if (c.type === "auth") keys.add("auth:status");
  };
  for (const c of conditions) visit(c);
  if (groups) {
    for (const g of groups) {
      for (const c of g.conditions || []) visit(c);
    }
  }
  return Array.from(keys);
}

/**
 * HOC that wraps a component with conditional visibility.
 * Reads conditions from CraftJS node props via useNode().
 * - Viewer mode: returns null when conditions evaluate to hidden.
 * - Editor mode: always renders (badge indicates condition status).
 */
export function withConditionalVisibility<P extends object>(
  WrappedComponent: React.ComponentType<P>
): React.ComponentType<P> {
  const WithConditions = React.forwardRef<any, P>(function WithConditions(props, ref) {
    return <VisibilityGate wrappedProps={props} wrappedRef={ref} Component={WrappedComponent} />;
  });

  const original = WrappedComponent as any;
  const wrapped = WithConditions as any;
  wrapped.craft = original.craft;
  wrapped.displayName = original.displayName || original.name;
  return wrapped;
}

function VisibilityGate({ wrappedProps, wrappedRef, Component }: any) {
  const {
    conditions,
    conditionLogic,
    conditionGroups,
    nodeType,
    nodeId,
    displayName,
    pageConditionFailAction,
    pageConditionRedirectUrl,
    pageConditionFallbackPageId,
  } = useNode(node => ({
    conditions: (node.data.props.conditions || []) as Condition[],
    conditionLogic: (node.data.props.conditionLogic || "all") as ConditionLogic,
    conditionGroups: (node.data.props.conditionGroups || null) as ConditionGroup[] | null,
    nodeType: node.data.props.type as string | undefined,
    nodeId: node.id,
    displayName: node.data.props.custom?.displayName || node.data.displayName || node.id,
    pageConditionFailAction: (node.data.props.pageConditionFailAction || "") as string,
    pageConditionRedirectUrl: (node.data.props.pageConditionRedirectUrl || "") as string,
    pageConditionFallbackPageId: (node.data.props.pageConditionFallbackPageId || "") as string,
  }));

  const { enabled, rootProps, query } = useEditor((state, query) => {
    try {
      return {
        enabled: state.options.enabled,
        rootProps: query.node("ROOT").get()?.data?.props || {},
        query,
      };
    } catch {
      return { enabled: state.options.enabled, rootProps: {}, query };
    }
  });

  const hasConditions = (conditionGroups && conditionGroups.length > 0) || conditions.length > 0;

  // Current repeater item (null outside ItemProvider) — drives `item` conditions.
  const itemContext = useItemContext();

  const [visible, setVisible] = useState(() => {
    if (enabled || !hasConditions) return true;
    // First-render eval (SSR + client hydration): use a hydration-safe context —
    // connectorData (set in parent render body by useViewerSetup) + itemContext +
    // company. No window access, so server and client first render agree → no
    // hydration mismatch. Client-only signals (URL params, viewport, auth) return
    // null here and are resolved by the useEffect below.
    const ctx = { ...buildStaticContext(rootProps, itemContext), connectorData: getConnectorData() };
    const result = conditionGroups && conditionGroups.length > 0
      ? evaluateConditionGroups(conditionGroups, ctx)
      : evaluateConditions(conditions, conditionLogic, ctx);
    // Match the runtime evaluator (L115): treat indeterminate (`null`) as
    // visible. A static-context `null` for an auth/url-param/localStorage
    // condition would otherwise flash `visible=false`, fire the page-level
    // redirect, and beat the client useEffect that resolves correctly.
    return result !== false;
  });
  const conditionsRef = useRef(conditions);
  const logicRef = useRef(conditionLogic);
  const groupsRef = useRef(conditionGroups);
  const itemRef = useRef(itemContext);
  conditionsRef.current = conditions;
  logicRef.current = conditionLogic;
  groupsRef.current = conditionGroups;
  itemRef.current = itemContext;

  useEffect(() => {
    // Editor mode: always visible
    if (enabled) {
      setVisible(true);
      return;
    }

    // No conditions: always visible
    if (!hasConditions) {
      setVisible(true);
      return;
    }

    // Viewer mode: evaluate conditions
    const evaluate = () => {
      const ctx = buildClientContext(rootProps, itemRef.current);
      let result: boolean | null;
      if (groupsRef.current && groupsRef.current.length > 0) {
        result = evaluateConditionGroups(groupsRef.current, ctx);
      } else {
        result = evaluateConditions(conditionsRef.current, logicRef.current, ctx);
      }
      const newVisible = result !== false;
      setVisible(newVisible);
    };

    evaluate();
    const onPop = () => evaluate();
    const onResize = () => evaluate();
    window.addEventListener("popstate", onPop);
    window.addEventListener("resize", onResize);
    // Subscribe per-key for `state` and `auth` conditions. Avoids the global
    // state-tick fan-out that re-ran evaluate() on every node with conditions
    // for every cart toggle / unrelated state write. Other condition types
    // (url-param, viewport, form-field) are covered by popstate/resize and
    // by their own listeners elsewhere.
    const stateKeys = collectStateKeys(conditionsRef.current, groupsRef.current);
    const offs = stateKeys.map(k => subscribeState(k, evaluate));
    return () => {
      window.removeEventListener("popstate", onPop);
      window.removeEventListener("resize", onResize);
      offs.forEach(off => off());
    };
  }, [hasConditions, enabled, rootProps, itemContext]);

  // Page-level fail actions (redirect or show another page)
  const didRedirect = useRef(false);
  useEffect(() => {
    if (visible || enabled || nodeType !== "page" || didRedirect.current) return;

    // Resolve a relative path against the current route context.
    // On /view/siteId or /build/siteId, prepend the base so "/login" → "/view/siteId/login".
    // On custom domains (no prefix), leave as-is.
    const resolveUrl = (url: string) => {
      if (!url.startsWith("/") || /^https?:\/\//.test(url)) return url;
      const pathOnly = window.location.pathname.split(/[?#]/)[0];
      const parts = pathOnly.split("/").filter(Boolean);
      if (parts.length >= 2 && (parts[0] === "build" || parts[0] === "view")) {
        return `/${parts[0]}/${parts[1]}${url}`;
      }
      return url;
    };

    if (pageConditionFailAction === "redirect" && pageConditionRedirectUrl) {
      didRedirect.current = true;
      const interpolated = replaceVariables(pageConditionRedirectUrl, query);
      window.location.href = resolveUrl(interpolated);
    } else if (pageConditionFailAction === "show-page" && pageConditionFallbackPageId) {
      didRedirect.current = true;
      window.location.href = resolveUrl(`/${pageConditionFallbackPageId}`);
    }
  }, [
    visible,
    enabled,
    nodeType,
    pageConditionFailAction,
    pageConditionRedirectUrl,
    pageConditionFallbackPageId,
    query,
  ]);

  if (!visible) return null;

  return <Component {...wrappedProps} ref={wrappedRef} />;
}
