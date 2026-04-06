import { useEditor, useNode, UserComponent } from "@craftjs/core";
import React, { useEffect, useState } from "react";
import { TbLayoutNavbar } from "react-icons/tb";
import { getClonedState, setClonedProps } from "../utils/cloneHelper";
import { Nav as UiNav } from "@pagehub/ui";
import { motionIt } from "../utils/lib";

import { applyAnimation, CSStoObj } from "../utils/tailwind/tailwind";
import { useScrollToSelected } from "./lib";

import { BaseSelectorProps, applyAriaProps } from "./selectors";

interface NavMenu {
  enabled?: boolean;
  id?: string;
  side?: "left" | "right";
  type?: "slide" | "fullscreen" | "dropdown";
  breakpoint?: "mobile" | "tablet";
}

export interface NavProps extends BaseSelectorProps {
  buttons?: any[];
  flexDirection?: string;
  alignItems?: string;
  justifyContent?: string;
  gap?: string;
  menu?: NavMenu;
  view?: string;
}

const defaultMenu: NavMenu = {
  enabled: true,
  id: "mobile-menu",
  side: "left",
  type: "slide",
  breakpoint: "mobile",
};

export const Nav: UserComponent<NavProps> = (incomingProps: NavProps) => {
  let props: any = { buttons: [], alignItems: "items-center", justifyContent: "justify-start", gap: "gap-2", menu: defaultMenu, ...incomingProps };

  const {
    connectors: { connect, drag },
    id,
  } = useNode();

  const { actions, query, enabled } = useEditor(state => getClonedState(props, state));



  props = setClonedProps(props, query);

  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Auto-wire unique IDs on first mount — replace placeholder "mobile-menu" with nav-{nodeId}
  useEffect(() => {
    if (!enabled || !isMounted) return;
    const menu = { ...defaultMenu, ...props.menu };
    if (menu.id && menu.id !== "mobile-menu") return; // already customized

    const uniqueId = `nav-${id}`;
    try {
      const node = query.node(id).get();
      const childIds = node.data.nodes || [];

      const walkAndFix = (nid) => {
        try {
          const n = query.node(nid).get();
          // Fix Container id prop
          if (n.data.props?.id === "mobile-menu") {
            actions.setProp(nid, (p) => { p.id = uniqueId; });
          }
          // Fix action.target references (new system)
          if (n.data.props?.action?.target === "mobile-menu") {
            actions.setProp(nid, (p) => { p.action = { ...p.action, target: uniqueId }; });
          }
          // Fix legacy click.value references
          if (n.data.props?.click?.value === "mobile-menu") {
            actions.setProp(nid, (p) => { p.click = { ...p.click, value: uniqueId }; });
          }
          for (const cid of (n.data.nodes || [])) walkAndFix(cid);
        } catch {}
      };

      for (const childId of childIds) walkAndFix(childId);

      // Update the Nav's own menu.id
      actions.setProp(id, (p) => { p.menu = { ...p.menu, id: uniqueId }; });
    } catch (e) {
      console.warn("Nav: failed to auto-wire IDs", e);
    }
  }, [enabled, isMounted]);

  useScrollToSelected(id, enabled);

  const prop: any = {
    ref: r => {
      connect(drag(r));
    },
    style: props.root?.style ? CSStoObj(props.root.style) || {} : {},
    className: props.className || "",
  };

  applyAriaProps(prop, props);

  if (enabled) {
    prop["data-bounding-box"] = enabled;
    if (isMounted) {
      prop["node-id"] = id;
    }
  }

  const element = motionIt(props, UiNav, enabled);

  const { children } = props;

  const menu = { ...defaultMenu, ...props.menu };

  // Check if there are non-hamburger Button children
  // Nav owns the hamburger — any Button whose click.value matches our menu.id is ours
  let hasActualButtons = false;
  if (enabled) {
    try {
      const node = query.node(id).get();
      const childNodes = node.data.nodes || [];

      hasActualButtons = childNodes.some(childId => {
        try {
          const childNode = query.node(childId).get();
          if (childNode.data.name === "Button") {
            const clickValue = childNode.data.props?.click?.value;
            const isHamburger = clickValue === menu.id;
            return !isHamburger;
          }
          // Container children (mobile menu overlay) don't count as "actual buttons"
          return false;
        } catch (e) {
          return false;
        }
      });
    } catch (e) {
      hasActualButtons = !!children;
    }
  } else {
    hasActualButtons = !!children;
  }

  // Mobile menu preview: toggle visibility of the mobile-menu Container child
  const isMobileMenuView = enabled && props.view === "menu";

  // Sync desktop nav buttons into mobile menu ButtonList
  useEffect(() => {
    if (!enabled || !isMounted || !isMobileMenuView) return;
    const menuId = menu.id || "mobile-menu";

    try {
      const navNode = query.node(id).get();
      const childIds = navNode.data.nodes || [];

      // Find the mobile-menu-items ButtonList by linked node ID
      const menuContainerId = childIds.find(cid => {
        try { return query.node(cid).get().data.props?.id === menuId || document.getElementById(menuId)?.getAttribute("node-id") === cid; } catch { return false; }
      });
      if (!menuContainerId) return;

      // Walk into mobile-menu > mobile-menu-panel > mobile-menu-items
      const findButtonList = (nodeId: string): string | null => {
        try {
          const n = query.node(nodeId).get();
          if (n.data.name === "ButtonList") return nodeId;
          for (const cid of (n.data.nodes || [])) {
            const found = findButtonList(cid);
            if (found) return found;
          }
        } catch {}
        return null;
      };

      const buttonListId = findButtonList(menuContainerId);
      if (!buttonListId) return;

      const buttonList = query.node(buttonListId).get();
      const existingMobileButtons = buttonList.data.nodes || [];

      // Get desktop nav buttons (exclude hamburger)
      const desktopButtons = childIds
        .map(cid => { try { return query.node(cid).get(); } catch { return null; } })
        .filter(n => n && n.data.name === "Button" && n.data.props?.click?.value !== menuId);

      // Get existing mobile button texts to avoid duplicates
      const existingTexts = new Set(
        existingMobileButtons.map(cid => {
          try { return query.node(cid).get().data.props?.text; } catch { return null; }
        }).filter(Boolean)
      );

      // Add missing buttons
      const Button = query.getOptions().resolver.Button;
      if (!Button) return;

      desktopButtons.forEach(btn => {
        if (existingTexts.has(btn.data.props.text)) return;
        const tree = query.parseReactElement(
          <Button
            text={btn.data.props.text || "Link"}
            url={btn.data.props.url || "#"}
            icon={btn.data.props.icon}
            className="flex w-full justify-start px-(--button-padding-x) py-(--button-padding-y)"
          />
        ).toNodeTree();
        actions.addNodeTree(tree, buttonListId);
      });
    } catch (e) {
      console.warn("Nav: failed to sync mobile menu items", e);
    }
  }, [isMobileMenuView]);

  useEffect(() => {
    if (!enabled || !isMounted) return;
    const menuId = menu.id || "mobile-menu";
    const menuEl = document.getElementById(menuId) as HTMLElement;
    if (!menuEl) return;

    if (isMobileMenuView) {
      menuEl.classList.remove("hidden");
      menuEl.style.cssText = "position:absolute;top:0;left:0;right:0;bottom:0;z-index:9999;display:flex;";
      // Force mobile layout on child elements in the overlay preview at wide viewport
      Array.from(menuEl.querySelectorAll("[node-id]")).forEach(el => {
        const nid = el.getAttribute("node-id");
        if (!nid) return;
        try {
          const htmlEl = el as HTMLElement;
          const n = query.node(nid).get();
          const name = n.data.name;
          const displayName = n.data.custom?.displayName || "";
          // Save original inline style so we can restore on toggle-off
          if (!htmlEl.dataset.origStyle) {
            htmlEl.dataset.origStyle = htmlEl.style.cssText || "";
          }
          if (name === "ButtonList") {
            htmlEl.style.cssText = "display:flex;flex-direction:column;width:100%;gap:0.25rem;";
          } else if (displayName.includes("Header") || displayName.includes("header")) {
            htmlEl.style.cssText = "display:flex;align-items:center;justify-content:flex-end;padding:0.75rem 1rem;border-bottom:1px solid rgba(0,0,0,0.1);";
          }
        } catch {}
      });
    } else {
      menuEl.classList.add("hidden");
      menuEl.style.cssText = "";
      // Restore original inline styles
      Array.from(menuEl.querySelectorAll("[node-id]")).forEach(el => {
        const htmlEl = el as HTMLElement;
        htmlEl.style.cssText = htmlEl.dataset.origStyle || "";
        delete htmlEl.dataset.origStyle;
      });
    }
  }, [isMobileMenuView, enabled, isMounted, menu.id]);

  const content = (
    <>
      {hasActualButtons || !enabled
        ? children
        : enabled && (
          <div className="flex w-auto items-center justify-center p-4">
            <div data-empty-state={true} className="text-3xl">
              <TbLayoutNavbar />
            </div>
          </div>
        )}
    </>
  );

  prop.children = content;

  if (isMobileMenuView) {
    prop.style = { ...prop.style, position: "relative", minHeight: "300px" };
  }

  return React.createElement(element, {
    ...applyAnimation(prop, props, null, enabled),
  });
};

Nav.craft = {
  displayName: "Nav",
  rules: {
    canDrag: () => true,
    canMoveIn: nodes => nodes.every(node => ["Button", "Container"].includes(node.data?.name)),
  },
};
