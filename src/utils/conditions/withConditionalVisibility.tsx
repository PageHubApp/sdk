import React from "react";
import { useEditor, useNode } from "@craftjs/core";
import { useEffect, useRef, useState } from "react";
import { buildClientContext } from "./context";
import { evaluateConditionGroups, evaluateConditions } from "./evaluate";
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
  const WithConditions = React.forwardRef<any, P>((props, ref) => {
    return <VisibilityGate wrappedProps={props} wrappedRef={ref} Component={WrappedComponent} />;
  });

  const original = WrappedComponent as any;
  const wrapped = WithConditions as any;
  wrapped.craft = original.craft;
  wrapped.displayName = original.displayName || original.name;
  return wrapped;
}

function VisibilityGate({ wrappedProps, wrappedRef, Component }: any) {
  const { conditions, conditionLogic, conditionGroups } = useNode(node => ({
    conditions: (node.data.props.conditions || []) as Condition[],
    conditionLogic: (node.data.props.conditionLogic || "all") as ConditionLogic,
    conditionGroups: (node.data.props.conditionGroups || null) as ConditionGroup[] | null,
  }));

  const { enabled, rootProps } = useEditor((state, query) => {
    try {
      return {
        enabled: state.options.enabled,
        rootProps: query.node("ROOT").get()?.data?.props || {},
      };
    } catch {
      return { enabled: state.options.enabled, rootProps: {} };
    }
  });

  const hasConditions =
    (conditionGroups && conditionGroups.length > 0) || conditions.length > 0;

  const [visible, setVisible] = useState(true);
  const conditionsRef = useRef(conditions);
  const logicRef = useRef(conditionLogic);
  const groupsRef = useRef(conditionGroups);
  conditionsRef.current = conditions;
  logicRef.current = conditionLogic;
  groupsRef.current = conditionGroups;

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
      const ctx = buildClientContext(rootProps);
      let result: boolean | null;
      if (groupsRef.current && groupsRef.current.length > 0) {
        result = evaluateConditionGroups(groupsRef.current, ctx);
      } else {
        result = evaluateConditions(conditionsRef.current, logicRef.current, ctx);
      }
      setVisible(result !== false);
    };

    evaluate();
    window.addEventListener("popstate", evaluate);
    window.addEventListener("resize", evaluate);
    return () => {
      window.removeEventListener("popstate", evaluate);
      window.removeEventListener("resize", evaluate);
    };
  }, [hasConditions, enabled, rootProps]);

  if (!visible) return null;

  return <Component {...wrappedProps} ref={wrappedRef} />;
}
