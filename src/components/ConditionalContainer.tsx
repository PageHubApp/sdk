import { ROOT_NODE } from "@craftjs/utils";
import { useEditor, useNode } from "@craftjs/core";
import React, { useEffect, useMemo, useState } from "react";
import { TbGitBranch } from "react-icons/tb";
import { Box } from "@pagehub/ui";
import { EditorEmptyLeafHint } from "../chrome/primitives/EditorEmptyLeafHint";
import { BaseSelectorProps } from "./selectors";
import { CSStoObj } from "../utils/tailwind/tailwind";
import { buildClientContext } from "../utils/conditions/context";
import { evaluateConditions } from "../utils/conditions/evaluate";
import type { ConditionBranch, ConditionLogic } from "../utils/conditions/types";
import { useMounted } from "../utils/hooks";

export interface ConditionalContainerProps extends BaseSelectorProps {
  branches?: ConditionBranch[];
  fallback?: "hide" | "last";
}

export const ConditionalContainer = ({
  children,
  ...incomingProps
}: Partial<ConditionalContainerProps> & { children?: React.ReactNode }) => {
  const props: ConditionalContainerProps = {
    branches: [],
    fallback: "last",
    ...incomingProps,
  };

  const { query } = useEditor();
  const {
    id,
    connectors: { connect },
  } = useNode();
  const { enabled } = useEditor(state => ({
    enabled: state.options.enabled,
  }));
  const isMounted = useMounted();

  // Get child node IDs
  const childIds = useMemo(() => {
    try {
      const node = query.node(id).get();
      return (node?.data?.nodes || []) as string[];
    } catch {
      return [];
    }
  }, [id, query, isMounted]);

  const branches = props.branches || [];

  // Evaluate which branch is active (viewer mode only)
  const rootProps = useMemo(() => {
    try {
      return query.node(ROOT_NODE).get()?.data?.props || {};
    } catch {
      return {};
    }
  }, [query]);

  const activeBranchIndex = useMemo(() => {
    if (enabled) return -1; // editor shows all

    const ctx = buildClientContext(rootProps);
    for (let i = 0; i < branches.length && i < childIds.length; i++) {
      const b = branches[i];
      if (!b.conditions || b.conditions.length === 0) {
        return i; // fallback / else branch
      }
      const result = evaluateConditions(b.conditions, b.conditionLogic || "all", ctx);
      if (result !== false) return i; // true or indeterminate → show
    }

    // No match
    if (props.fallback === "last" && childIds.length > 0) {
      return childIds.length - 1;
    }
    return -1; // hide all
  }, [enabled, branches, childIds, rootProps, props.fallback]);

  // In viewer mode, hide non-active branches via DOM manipulation
  useEffect(() => {
    if (enabled || !isMounted) return;

    childIds.forEach((childId, i) => {
      const el = document.querySelector(`[node-id="${childId}"]`) as HTMLElement;
      if (!el) return;
      if (i === activeBranchIndex) {
        el.style.display = "";
      } else {
        el.style.display = "none";
      }
    });
  }, [enabled, isMounted, childIds, activeBranchIndex]);

  // In editor mode, dim inactive branches
  useEffect(() => {
    if (!enabled || !isMounted) return;

    const ctx = buildClientContext(rootProps);
    childIds.forEach((childId, i) => {
      const el = document.querySelector(`[node-id="${childId}"]`) as HTMLElement;
      if (!el) return;
      const b = branches[i];
      const isActive =
        !b || !b.conditions || b.conditions.length === 0
          ? true
          : evaluateConditions(b.conditions, b.conditionLogic || "all", ctx) !== false;

      el.style.opacity = isActive ? "1" : "0.4";
      el.style.display = "";
    });
  }, [enabled, isMounted, childIds, branches, rootProps]);

  const rootStyle = props.root?.style ? CSStoObj(props.root.style) : undefined;

  const prop: any = {
    ref: (ref: any) => connect(ref),
    className: props.className || "flex flex-col w-full",
    style: rootStyle,
  };

  if (enabled && isMounted) {
    prop["node-id"] = id;
    prop["data-bounding-box"] = true;
  }

  return React.createElement(
    Box,
    prop,
    children ||
      (enabled ? (
        <EditorEmptyLeafHint
          selected={false}
          icon={<TbGitBranch aria-hidden />}
          idleLabel="Empty condition group"
          selectedLabel="Add branches here"
        />
      ) : null)
  );
};

ConditionalContainer.craft = {
  displayName: "Conditional Container",
  rules: {
    canDrag: () => true,
    canDelete: () => true,
    canMoveIn: () => true,
  },
};
