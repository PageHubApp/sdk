import { ROOT_NODE } from "@craftjs/utils";
import { useEditor, useNode } from "@craftjs/core";
import { useEffect, useRef, useState } from "react";
import { buildClientContext, buildStaticContext } from "./context";
import { evaluateConditionGroups } from "./evaluate";
import { getConnectorData } from "../design/variables";
import { useItemContext } from "../itemContext";
import { subscribe as subscribeStateTick } from "../state/stateRegistry";
import type { ConditionGroup } from "./types";

/**
 * Hook for per-node conditional visibility.
 * - Editor mode: always visible (badge indicates condition status)
 * - Viewer mode: evaluates conditions and returns visibility
 */
export function useConditionalVisibility(): {
  visible: boolean;
  hasConditions: boolean;
} {
  const { conditionGroups } = useNode(node => ({
    conditionGroups: (node.data.props.conditionGroups || null) as ConditionGroup[] | null,
  }));

  const { enabled, rootProps } = useEditor((state, query) => ({
    enabled: state.options.enabled,
    rootProps: query.node(ROOT_NODE).get()?.data?.props || {},
  }));

  const hasConditions = !!(conditionGroups && conditionGroups.length > 0);

  const itemContext = useItemContext();

  const [visible, setVisible] = useState(() => {
    if (enabled || !hasConditions) return true;
    const ctx = {
      ...buildStaticContext(rootProps, itemContext),
      connectorData: getConnectorData(),
    };
    const result = evaluateConditionGroups(conditionGroups!, ctx);
    return result === true;
  });
  const groupsRef = useRef(conditionGroups);
  const itemRef = useRef(itemContext);
  groupsRef.current = conditionGroups;
  itemRef.current = itemContext;

  useEffect(() => {
    if (enabled || !hasConditions) {
      setVisible(true);
      return;
    }

    const evaluate = () => {
      const ctx = buildClientContext(rootProps, itemRef.current);
      const result = evaluateConditionGroups(groupsRef.current!, ctx);
      setVisible(result !== false);
    };

    evaluate();

    // Re-evaluate when the URL changes (popstate is mirrored into `url:*`
    // state by the bridge, but popstate also covers route param changes the
    // bridge doesn't write) or the viewport resizes (device condition).
    // Auth changes propagate via the state registry — `setAuthState` writes
    // `auth:status`, which any state-tick subscriber (including this hook
    // through the global subscribe below) picks up.
    window.addEventListener("popstate", evaluate);
    window.addEventListener("resize", evaluate);
    const offState = subscribeStateTick(evaluate);

    return () => {
      window.removeEventListener("popstate", evaluate);
      window.removeEventListener("resize", evaluate);
      offState();
    };
  }, [hasConditions, enabled, rootProps, itemContext]);

  return { visible, hasConditions };
}
