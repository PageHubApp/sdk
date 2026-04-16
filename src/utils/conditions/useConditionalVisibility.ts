import { ROOT_NODE, useEditor, useNode } from "@craftjs/core";
import { useEffect, useRef, useState } from "react";
import { buildClientContext } from "./context";
import { evaluateConditionGroups, evaluateConditions } from "./evaluate";
import type { Condition, ConditionGroup, ConditionLogic } from "./types";

/**
 * Hook for per-node conditional visibility.
 * - Editor mode: always visible (badge indicates condition status)
 * - Viewer mode: evaluates conditions and returns visibility
 */
export function useConditionalVisibility(): {
  visible: boolean;
  hasConditions: boolean;
} {
  const { conditions, conditionLogic, conditionGroups } = useNode(node => ({
    conditions: (node.data.props.conditions || []) as Condition[],
    conditionLogic: (node.data.props.conditionLogic || "all") as ConditionLogic,
    conditionGroups: (node.data.props.conditionGroups || null) as ConditionGroup[] | null,
  }));

  const { enabled, rootProps } = useEditor((state, query) => ({
    enabled: state.options.enabled,
    rootProps: query.node(ROOT_NODE).get()?.data?.props || {},
  }));

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
    if (enabled || !hasConditions) {
      setVisible(true);
      return;
    }

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

  return { visible, hasConditions };
}
