import { useEditor, useNode } from "@craftjs/core";
import React, { useEffect, useState } from "react";
import { Box } from "@pagehub/ui";
import { TbLayout } from "react-icons/tb";
import { EditorEmptyLeafHint } from "../chrome/primitives/EditorEmptyLeafHint";
import { BaseSelectorProps } from "./selectors";
import { CSStoObj } from "../utils/tailwind/tailwind";

export interface TabsProps extends BaseSelectorProps {
  defaultTab?: number;
  orientation?: "horizontal" | "vertical";
  mobileMode?: "scroll" | "accordion" | "stack";
}

export const Tabs = ({
  children,
  ...incomingProps
}: Partial<TabsProps> & { children?: React.ReactNode }) => {
  const props: TabsProps = {
    defaultTab: 0,
    orientation: "horizontal",
    mobileMode: "scroll",
    ...incomingProps,
  };
  const { query, actions } = useEditor();
  const {
    id,
    connectors: { connect },
  } = useNode();
  const { enabled, isActive } = useEditor((state, q) => ({
    enabled: state.options.enabled,
    isActive: q.getEvent("selected").contains(id),
  }));

  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Auto-wire unique IDs on first mount — replace placeholder IDs
  useEffect(() => {
    if (!enabled || !isMounted) return;

    const node = query.node(id).get();
    if (!node) return;

    const childIds = node.data.nodes || [];
    const groupId = `tabs-${id}`;
    let panelIdx = 0;

    childIds.forEach((childId: string) => {
      const child = query.node(childId).get();
      if (!child) return;
      const dn = child.data.custom?.displayName || "";

      // Tab Bar — wire button actions
      if (dn.includes("Tab Bar")) {
        const barChildIds = child.data.nodes || [];
        barChildIds.forEach((btnId: string, btnIdx: number) => {
          const btn = query.node(btnId).get();
          if (!btn) return;
          const action = btn.data.props?.action;
          if (action?.type === "show-hide" && action.target?.startsWith("tab-panel-")) {
            const newTarget = `tab-${id}-panel-${btnIdx}`;
            actions.setProp(btnId, (p: any) => {
              p.action = { ...p.action, target: newTarget, group: groupId };
            });
          }
        });
        return;
      }

      // Tab Panels — wire IDs and tabGroup
      if (dn.includes("Tab Panel")) {
        const currentId = child.data.props?.id;
        if (currentId?.startsWith("tab-panel-")) {
          const newPanelId = `tab-${id}-panel-${panelIdx}`;
          actions.setProp(childId, (p: any) => {
            p.id = newPanelId;
            p.tabGroup = groupId;
          });
        }
        panelIdx++;
      }
    });
  }, [enabled, isMounted, id]);

  // In editor mode, show all panels for editing
  useEffect(() => {
    if (!enabled || !isMounted) return;

    const node = query.node(id).get();
    if (!node) return;

    const childIds = node.data.nodes || [];
    childIds.forEach((childId: string) => {
      const child = query.node(childId).get();
      if (!child) return;
      const dn = child.data.custom?.displayName || "";
      if (dn.includes("Tab Panel")) {
        const el = document.querySelector(`[node-id="${childId}"]`) as HTMLElement;
        if (el) {
          el.classList.remove("hidden");
          el.style.display = "";
        }
      }
    });
  }, [enabled, isMounted, id]);

  const prop: any = {
    ref: (ref: any) => connect(ref),
    className: props.className || "flex flex-col w-full",
    style: props.root?.style ? CSStoObj(props.root.style) : undefined,
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
          selected={isActive}
          icon={<TbLayout aria-hidden />}
          idleLabel="Empty tabs"
          selectedDetail="Drop tab bar and panels here"
        />
      ) : null)
  );
};

Tabs.craft = {
  displayName: "Tabs",
  rules: {
    canDrag: () => true,
    canDelete: () => true,
    canMoveIn: () => true,
  },
};
