import React from "react";
import { useEditor, useNode } from "@craftjs/core";
import { useEffect, useRef, useState } from "react";
import { buildClientContext } from "./context";
import { evaluateConditionGroups, evaluateConditions } from "./evaluate";
import { replaceVariables } from "../design/variables";
import { useItemContext } from "../itemContext";
import type { Condition, ConditionGroup, ConditionLogic } from "./types";

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

  const [visible, setVisible] = useState(true);
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
    const onAuth = () => evaluate();
    window.addEventListener("popstate", onPop);
    window.addEventListener("resize", onResize);
    window.addEventListener("pagehub:auth-changed", onAuth);
    return () => {
      window.removeEventListener("popstate", onPop);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pagehub:auth-changed", onAuth);
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
