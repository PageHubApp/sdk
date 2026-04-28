/**
 * Nav — Component definition via defineComponent()
 *
 * Single preset: Mobile Menu (responsive nav with hamburger + slide-out
 * panel). Other Navigation-category variants (Social Nav, Plain Nav,
 * Pill Nav, etc.) are ButtonList-based and live in `ButtonList.craft.tsx`
 * with `category: "Navigation"`.
 */
import React from "react";
import { Element } from "@craftjs/core";
import { TbDeviceMobile, TbLayoutNavbar } from "react-icons/tb";
import { defineComponent } from "../define";
import { Nav } from "./Nav";
import { staticClasses, getInlineStyle, tag, ariaAttrs, type ToHTMLFn } from "../utils/static-html";

const toHTML: ToHTMLFn = (props, children, ctx) => {
  return tag(
    "nav",
    {
      class: staticClasses(props, ctx) || undefined,
      style: getInlineStyle(props) || undefined,
      ...ariaAttrs(props),
    },
    children
  );
};
import { NavMainTab } from "../chrome/toolbar/unified-settings/mainTabs/NavMainTab";
import { HoverNodeController, DeleteNodeController } from "./editor-chrome";
import { Button } from "./Button";
import { ButtonList } from "./ButtonList";
import { navButtonClassName } from "./ButtonList.craft";
import { Container } from "./Container";

// Mobile menu links share ButtonList's nav button styling so the slide-out
// panel matches in-page nav variants.
const hiddenMobileButtonClassName = `${navButtonClassName} hidden md:block`;

// ─── Preset children builders ──────────────────────────────────────────────

function buildMobileMenuChildren() {
  return [
    <Element
      key="home"
      is={Button}
      custom={{ displayName: "Home" }}
      text="Home"
      url="#"
      className={hiddenMobileButtonClassName}
    />,
    <Element
      key="about"
      is={Button}
      custom={{ displayName: "About Us" }}
      text="About Us"
      url="#"
      className={hiddenMobileButtonClassName}
    />,
    <Element
      key="contact"
      is={Button}
      custom={{ displayName: "Contact us" }}
      text="Contact us"
      url="#"
      className={hiddenMobileButtonClassName}
    />,
    <Button
      key="hamburger"
      text="Menu"
      url=""
      action={
        {
          type: "show-hide",
          target: "mobile-menu",
          direction: "show",
          trigger: "click",
          method: "style",
        } as any
      }
      icon={{
        value: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><path d="M0 96C0 78.3 14.3 64 32 64H416c17.7 0 32 14.3 32 32s-14.3 32-32 32H32C14.3 128 0 113.7 0 96zM0 256c0-17.7 14.3-32 32-32H416c17.7 0 32 14.3 32 32s-14.3 32-32 32H32c-17.7 0-32-14.3-32-32zM448 416c0 17.7-14.3 32-32 32H32c-17.7 0-32-14.3-32-32s14.3-32 32-32H416c17.7 0 32 14.3 32 32z"/></svg>`,
        only: true,
      }}
      className="block border-0 px-(--button-padding-x) py-(--button-padding-y) md:hidden"
    />,
    <Element
      key="overlay"
      canvas
      id="mobile-menu"
      is={Container}
      custom={{ displayName: "Mobile Menu Overlay", rules: { canMoveOut: () => false } }}
      canDelete={false}
      canEditName={false}
      className="fixed top-0 left-0 z-50 hidden h-screen w-screen bg-black/50 md:hidden"
      action={
        {
          type: "show-hide",
          target: "mobile-menu",
          direction: "hide",
          trigger: "click",
          method: "style",
        } as any
      }
    >
      <Element
        canvas
        id="mobile-menu-panel"
        is={Container}
        custom={{ displayName: "Mobile Menu Panel", rules: { canMoveOut: () => false } }}
        canDelete={false}
        canEditName={false}
        className="bg-base-100 h-full w-80 max-w-sm shadow-xl"
        action={
          {
            type: "show-hide",
            target: "mobile-menu",
            direction: "toggle",
            trigger: "click",
            method: "style",
          } as any
        }
      >
        <Element
          canvas
          id="mobile-menu-header"
          is={Container}
          custom={{ displayName: "Mobile Nav Header", rules: { canMoveOut: () => false } }}
          canDelete={false}
          canEditName={false}
          className="px-container-x py-container-y flex items-center justify-between border-b"
        >
          <Element
            canvas
            id="mobile-menu-close"
            is={Button}
            custom={{ displayName: "Mobile Nav Close" }}
            canDelete={false}
            canEditName={false}
            action={
              {
                type: "show-hide",
                target: "mobile-menu",
                direction: "hide",
                trigger: "click",
                method: "style",
              } as any
            }
            text="×"
            url=""
            className="border-0 px-(--button-padding-x) py-(--button-padding-y) text-xl font-bold"
          />
        </Element>
        <Element
          canvas
          id="mobile-menu-items"
          is={ButtonList}
          custom={{ displayName: "Mobile Navigation" }}
          canDelete={false}
          canEditName={false}
          className="gap-container flex w-full flex-col border-0"
        />
      </Element>
    </Element>,
  ];
}

// ─── Nav definition (only the Mobile Menu preset uses Nav component) ───────

export const NavDef = defineComponent(
  {
    name: "Nav",
    component: Nav,
    icon: TbLayoutNavbar,
    category: "Navigation",
    canvas: true,
    settings: NavMainTab,
    toHTML,
    disable: ["textColor", "bgColor", "shadow", "opacity", "hoverClick"],
    rules: {
      canDrag: () => true,
      canMoveIn: nodes => nodes.every(node => ["Button", "Container"].includes(node.data?.name)),
    },
    tools: [],
    presets: [
      {
        label: "Mobile Menu",
        icon: TbDeviceMobile,
        description: "Responsive nav with hamburger menu and slide-out panel.",
        props: {
          menu: {
            enabled: true,
            id: "mobile-menu",
            side: "left",
            type: "slide",
            breakpoint: "mobile",
          },
          className: "flex justify-between items-center gap-container",
        },
        children: buildMobileMenuChildren,
      },
    ],
  },
  { __internal: true }
);
