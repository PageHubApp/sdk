/**
 * ConditionalContainer — Component definition via defineComponent()
 *
 * Branching container: children are branches, only the first matching one renders.
 * True if/else/else-if logic. Editor shows all branches with dimming.
 */
import React from "react";
import { TbGitBranch } from "react-icons/tb";
import { defineComponent } from "../define";
import { ConditionalContainer } from "./ConditionalContainer";
import { staticClasses, getInlineStyle, tag, ariaAttrs, type ToHTMLFn } from "../utils/static-html";
import { buildStaticContext } from "../utils/conditions/context";
import { evaluateConditions } from "../utils/conditions/evaluate";
import type { ConditionBranch } from "../utils/conditions/types";
import { ConditionalContainerMainTab } from "../chrome/toolbar/unified-settings/mainTabs/ConditionalContainerMainTab";

const toHTML: ToHTMLFn = (props, children, ctx) => {
  const branches: ConditionBranch[] = props.branches || [];

  // If no branches defined, render all children normally
  if (branches.length === 0) {
    return tag(
      "div",
      {
        class: staticClasses(props, ctx) || undefined,
        style: getInlineStyle(props) || undefined,
        ...ariaAttrs(props),
      },
      children
    );
  }

  // Try static evaluation
  const rootProps = ctx.nodes["ROOT"]?.props || {};
  const condCtx = buildStaticContext(rootProps, null, ctx.connectorData ?? null);

  // Get child node IDs from the node tree
  const nodeId = Object.keys(ctx.nodes).find(
    nid =>
      ctx.nodes[nid]?.type?.resolvedName === "ConditionalContainer" &&
      ctx.nodes[nid]?.props === props
  );
  const childIds = nodeId ? ctx.nodes[nodeId]?.nodes || [] : [];

  // Check if any branch has client-only conditions
  let hasClientOnly = false;
  let matchedIndex = -1;

  for (let i = 0; i < branches.length && i < childIds.length; i++) {
    const b = branches[i];
    if (!b.conditions || b.conditions.length === 0) {
      if (matchedIndex === -1) matchedIndex = i;
      continue;
    }
    const result = evaluateConditions(b.conditions, b.conditionLogic || "all", condCtx);
    if (result === null) {
      hasClientOnly = true;
      break;
    }
    if (result === true && matchedIndex === -1) {
      matchedIndex = i;
    }
  }

  if (hasClientOnly) {
    // Client-only: render all branches hidden, let client script pick one
    ctx.hasClientConditions = true;
    const branchesData = JSON.stringify(branches).replace(/"/g, "&quot;");
    return tag(
      "div",
      {
        class: staticClasses(props, ctx) || undefined,
        style: getInlineStyle(props) || undefined,
        "data-ph-condition-group": "true",
        "data-ph-branches": branchesData,
        ...ariaAttrs(props),
      },
      children
    );
  }

  // Fully resolved: render only the matching branch
  if (matchedIndex === -1) {
    // Fallback
    if (props.fallback === "last" && childIds.length > 0) {
      matchedIndex = childIds.length - 1;
    } else {
      return ""; // hide all
    }
  }

  const matchedChildId = childIds[matchedIndex];
  if (!matchedChildId) return "";
  return ctx.renderChildren([matchedChildId]);
};

export const ConditionalContainerDef = defineComponent(
  {
    name: "ConditionalContainer",
    displayName: "Conditional",
    description: "Hides what's inside until rules say to show it.",
    component: ConditionalContainer,
    icon: TbGitBranch,
    category: "Layout",
    canvas: true,
    settings: ConditionalContainerMainTab,
    toHTML,
    defaultProps: {
      className: "flex flex-col w-full",
      branches: [],
      fallback: "last" as const,
    },
    disable: ["shadow", "opacity", "pattern"],
    rules: {
      canDrag: () => true,
      canMoveIn: () => true,
      canMoveOut: () => true,
    },
  },
  { __internal: true }
);
