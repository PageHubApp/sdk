import { useEditor, useNode } from "@craftjs/core";
import React, { useEffect, useState, useCallback } from "react";
import { Box } from "@pagehub/ui";
import { BaseSelectorProps } from "./selectors";
import { CSStoObj } from "../utils/tailwind/tailwind";
import { EmptyState } from "./EmptyState";

export interface DropdownProps extends BaseSelectorProps {
  trigger?: "click" | "hover";
  position?: "bottom-start" | "bottom-end" | "top-start" | "top-end";
  closeOnClickOutside?: boolean;
}

const TRIGGER_CLASSES: Record<string, { show: string; hide: string }> = {
  click: { show: "group-focus-within:flex", hide: "hidden" },
  hover: { show: "group-hover:flex", hide: "hidden" },
};

const POSITION_CLASSES: Record<string, string> = {
  "bottom-start": "top-full left-0",
  "bottom-end": "top-full right-0",
  "top-start": "bottom-full left-0",
  "top-end": "bottom-full right-0",
};

export const Dropdown = ({ children, ...incomingProps }: Partial<DropdownProps> & { children?: React.ReactNode }) => {
  const props: DropdownProps = {
    trigger: "click",
    position: "bottom-start",
    closeOnClickOutside: true,
    ...incomingProps,
  };

  const { id } = useNode();
  const { enabled, actions, query } = useEditor((state) => ({
    enabled: state.options.enabled,
  }));

  const [isMounted, setIsMounted] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  useEffect(() => { setIsMounted(true); }, []);

  const { connectors: { connect } } = useNode();

  // Check if this node or any child is selected
  const { isSelectedOrChildSelected } = useEditor((state) => {
    if (!enabled) return { isSelectedOrChildSelected: false };
    try {
      const selectedId = state.events?.selected?.values?.().next?.()?.value;
      if (!selectedId) return { isSelectedOrChildSelected: false };
      if (selectedId === id) return { isSelectedOrChildSelected: true };
      // Check if selected node is a descendant
      const node = state.nodes[id];
      const childIds = node?.data?.nodes || [];
      const isChild = childIds.some((cid: string) => {
        if (cid === selectedId) return true;
        const child = state.nodes[cid];
        const grandchildren = child?.data?.nodes || [];
        return grandchildren.some((gid: string) => gid === selectedId);
      });
      return { isSelectedOrChildSelected: isChild };
    } catch {
      return { isSelectedOrChildSelected: false };
    }
  });

  // Reset editing state when deselected
  useEffect(() => {
    if (!isSelectedOrChildSelected) setIsEditing(false);
  }, [isSelectedOrChildSelected]);

  // Double-click to enter edit mode (show panel)
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    if (!enabled) return;
    setIsEditing(true);
  }, [enabled]);

  // Update panel CSS classes when trigger/position props change
  useEffect(() => {
    if (!enabled || !isMounted) return;

    const node = query.node(id).get();
    if (!node) return;

    const childIds = node.data.nodes || [];
    childIds.forEach((childId: string) => {
      const child = query.node(childId).get();
      if (!child) return;
      const dn = child.data.custom?.displayName || "";

      if (dn.includes("Panel") || dn.includes("panel")) {
        const currentClassName = child.data.props?.className || "";
        const trigger = props.trigger || "click";
        const position = props.position || "bottom-start";

        let newClassName = currentClassName;
        // Remove old trigger classes
        Object.values(TRIGGER_CLASSES).forEach(({ show }) => {
          newClassName = newClassName.replace(show, "").trim();
        });
        // Remove old position classes
        Object.values(POSITION_CLASSES).forEach((cls) => {
          cls.split(" ").forEach((c) => {
            newClassName = newClassName.replace(new RegExp(`\\b${c}\\b`, "g"), "").trim();
          });
        });

        // Add new classes
        const triggerCls = TRIGGER_CLASSES[trigger];
        const posCls = POSITION_CLASSES[position];
        if (!newClassName.includes(triggerCls.show)) {
          newClassName = `${newClassName} ${triggerCls.show}`.trim();
        }
        if (!newClassName.includes("hidden")) {
          newClassName = `hidden ${newClassName}`.trim();
        }
        newClassName = `${newClassName} ${posCls}`.trim();
        newClassName = newClassName.replace(/\s+/g, " ");

        if (newClassName !== currentClassName) {
          actions.setProp(childId, (p: any) => { p.className = newClassName; });
        }
      }
    });
  }, [enabled, isMounted, props.trigger, props.position, id]);

  // Show/hide panel based on editing state
  useEffect(() => {
    if (!enabled || !isMounted) return;

    const node = query.node(id).get();
    if (!node) return;

    const childIds = node.data.nodes || [];
    childIds.forEach((childId: string) => {
      const child = query.node(childId).get();
      if (!child) return;
      const dn = child.data.custom?.displayName || "";
      if (dn.includes("Panel") || dn.includes("panel")) {
        const el = document.querySelector(`[node-id="${childId}"]`) as HTMLElement;
        if (!el) return;
        if (isEditing) {
          el.style.display = "flex";
          el.style.position = "relative";
        } else {
          el.style.display = "";
          el.style.position = "";
        }
      }
    });
  }, [enabled, isMounted, isEditing, id]);

  const prop: any = {
    ref: (ref: any) => connect(ref),
    className: props.className || "group relative inline-flex flex-col",
    style: props.root?.style ? CSStoObj(props.root.style) : undefined,
    tabIndex: props.trigger === "click" ? 0 : undefined,
    onDoubleClick: handleDoubleClick,
  };

  if (enabled && isMounted) {
    prop["node-id"] = id;
    prop["data-bounding-box"] = true;
  }

  return React.createElement(Box, prop, children || (enabled ? <EmptyState text="Drop trigger and panel here" /> : null));
};

Dropdown.craft = {
  displayName: "Dropdown",
  rules: {
    canDrag: () => true,
    canDelete: () => true,
    canMoveIn: () => true,
  },
};
