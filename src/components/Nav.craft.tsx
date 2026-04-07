/**
 * Nav — Component definition via defineComponent()
 *
 * 6 presets: Mobile Menu (Nav), Social Nav, Social Icons, Plain Nav,
 * Minimal Nav, Pill Nav (last 5 use ButtonList as element).
 * The Nav-specific presets have deeply nested Element trees for
 * mobile menu overlays with click handlers.
 *
 * NOTE: Social/Plain/Minimal/Pill presets use ButtonList, not Nav.
 * They live in the Navigation category because that's where users
 * expect to find them, but they create ButtonList nodes.
 * Since defineComponent presets always use the definition's component,
 * these are defined as separate ButtonList-based presets inline here
 * and rendered directly in the toolbox via buildNavToolboxEntries().
 */
import React from "react";
import { Element } from "@craftjs/core";
import { TbBrandTwitter, TbDeviceMobile, TbLayoutNavbar, TbMinus, TbPill } from "react-icons/tb";
import { defineComponent } from "../define";
import { Nav } from "./Nav";
import { staticClasses, getInlineStyle, tag, ariaAttrs, type ToHTMLFn } from "../utils/static-html";

const toHTML: ToHTMLFn = (props, children, ctx) => {
  return tag("nav", {
    class: staticClasses(props, ctx) || undefined,
    style: getInlineStyle(props) || undefined,
    ...ariaAttrs(props),
  }, children);
};
import { NavMainTab } from "../chrome/Toolbar/UnifiedSettings/mainTabs/NavMainTab";
import { HoverNodeController, DeleteNodeController } from "./editor-chrome";
import { Button } from "./Button";
import { ButtonList } from "./ButtonList";
import { Container } from "./Container";

// ─── Social media SVG icons ───────────────────────────────────────────────

const socialIcons = {
  twitter: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>`,
  facebook: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>`,
  instagram: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 6.62 5.367 11.987 11.988 11.987s11.987-5.367 11.987-11.987C24.014 5.367 18.647.001 12.017.001zM8.449 16.988c-1.297 0-2.448-.49-3.323-1.297C4.198 14.895 3.708 13.744 3.708 12.447s.49-2.448 1.297-3.323c.875-.807 2.026-1.297 3.323-1.297s2.448.49 3.323 1.297c.807.875 1.297 2.026 1.297 3.323s-.49 2.448-1.297 3.323c-.875.807-2.026 1.297-3.323 1.297zm7.83-9.281c-.49 0-.98-.49-.98-.98s.49-.98.98-.98.98.49.98.98-.49.98-.98.98zm-2.448 9.281c-1.297 0-2.448-.49-3.323-1.297-.807-.875-1.297-2.026-1.297-3.323s.49-2.448 1.297-3.323c.875-.807 2.026-1.297 3.323-1.297s2.448.49 3.323 1.297c.807.875 1.297 2.026 1.297 3.323s-.49 2.448-1.297 3.323c-.875.807-2.026 1.297-3.323 1.297z"/></svg>`,
  linkedin: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>`,
  youtube: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>`,
};

// ─── Shared button props for nav links ─────────────────────────────────────

const navButtonClassName = "px-(--button-padding-x) py-(--button-padding-y) flex-col gap-1.5 items-center justify-center";

const hiddenMobileButtonClassName = `${navButtonClassName} hidden md:block`;

const navListClassName = "flex flex-row items-center gap-(--container-gap) md:flex md:flex-row md:items-center md:gap-(--container-gap)";

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
      action={{ type: "show-hide", target: "mobile-menu", direction: "show", trigger: "click", method: "style" }}
      icon={{
        value: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><path d="M0 96C0 78.3 14.3 64 32 64H416c17.7 0 32 14.3 32 32s-14.3 32-32 32H32C14.3 128 0 113.7 0 96zM0 256c0-17.7 14.3-32 32-32H416c17.7 0 32 14.3 32 32s-14.3 32-32 32H32c-17.7 0-32-14.3-32-32zM448 416c0 17.7-14.3 32-32 32H32c-17.7 0-32-14.3-32-32s14.3-32 32-32H416c17.7 0 32 14.3 32 32z"/></svg>`,
        only: true,
      }}
      className="block px-(--button-padding-x) py-(--button-padding-y) md:hidden border-0"
    />,
    <Element
      key="overlay"
      canvas
      id="mobile-menu"
      is={Container}
      custom={{ displayName: "Mobile Menu Overlay" }}
      canDelete={false}
      canEditName={false}
      className="hidden fixed h-screen w-screen top-0 left-0 z-50 md:hidden bg-black/50"
      action={{ type: "show-hide", target: "mobile-menu", direction: "hide", trigger: "click", method: "style" }}
    >
      <Element
        canvas
        id="mobile-menu-panel"
        is={Container}
        custom={{ displayName: "Mobile Menu Panel" }}
        canDelete={false}
        canEditName={false}
        className="h-full w-80 max-w-sm bg-(--background) shadow-xl"
        action={{ type: "show-hide", target: "mobile-menu", direction: "toggle", trigger: "click", method: "style" }}
      >
        <Element
          canvas
          id="mobile-menu-header"
          is={Container}
          custom={{ displayName: "Mobile Nav Header" }}
          canDelete={false}
          canEditName={false}
          className="flex items-center justify-between px-(--container-padding-x) py-(--container-padding-y) border-b"
        >
          <Element
            canvas
            id="mobile-menu-close"
            is={Button}
            custom={{ displayName: "Mobile Nav Close" }}
            canDelete={false}
            canEditName={false}
            action={{ type: "show-hide", target: "mobile-menu", direction: "hide", trigger: "click", method: "style" }}
            text="×"
            url=""
            className="px-(--button-padding-x) py-(--button-padding-y) text-xl font-bold border-0"
          />
        </Element>
        <Element
          canvas
          id="mobile-menu-items"
          is={ButtonList}
          custom={{ displayName: "Mobile Navigation" }}
          canDelete={false}
          canEditName={false}
          className="flex flex-col gap-(--container-gap) w-full border-0"
        />
      </Element>
    </Element>,
  ];
}

function buildSocialButtons(filled: boolean) {
  const baseClassName = filled
    ? "px-(--button-padding-x) py-(--button-padding-y) bg-(--primary) text-(--primary-foreground) rounded-(--radius)"
    : "px-2 py-2 bg-transparent border-0";
  const colors: Record<string, string> = filled
    ? {}
    : { twitter: "text-[#1DA1F2]", facebook: "text-[#1877F2]", instagram: "text-[#E4405F]", linkedin: "text-[#0A66C2]", youtube: "text-[#FF0000]" };

  const items = ["twitter", "facebook", "instagram", "linkedin"] as const;
  const all = filled ? items : [...items, "youtube" as const];

  return all.map(name => (
    <Element
      key={name}
      is={Button}
      custom={{ displayName: name.charAt(0).toUpperCase() + name.slice(1) }}
      text={name.charAt(0).toUpperCase() + name.slice(1)}
      icon={{ value: socialIcons[name], only: true }}
      url="#"
      className={`${baseClassName}${colors[name] ? ` ${colors[name]}` : ""}`}
    />
  ));
}

function buildPlainNavButtons(withBg: boolean) {
  const names = ["Home", "About", "Services", "Contact"];
  return names.map(name => (
    <Element
      key={name}
      is={Button}
      custom={{ displayName: name }}
      text={name}
      url="#"
      className={withBg ? `${navButtonClassName} bg-(--primary) text-(--primary-foreground) rounded-(--radius)` : navButtonClassName}
    />
  ));
}

function buildPillNavButtons() {
  return ["Home", "About", "Contact"].map(name => (
    <Element
      key={name}
      is={Button}
      custom={{ displayName: name }}
      text={name}
      url="#"
      className={`${navButtonClassName} bg-transparent text-(--primary-foreground) border-0`}
    />
  ));
}

// ─── Nav definition (only the Mobile Menu preset uses Nav component) ───────

export const NavDef = defineComponent({
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
    canMoveIn: (nodes) => nodes.every(node => ["Button", "Container"].includes(node.data?.name)),
  },
  tools: (props) => [
    <HoverNodeController
      key="navHoverController"
      position="top"
      align="end"
      placement="end"
      alt={{ position: "bottom", align: "start", placement: "start" }}
    />,
    <DeleteNodeController key="navDelete" />,
  ],
  presets: [
    {
      label: "Mobile Menu",
      icon: TbDeviceMobile,
      props: {
        menu: { enabled: true, id: "mobile-menu", side: "left", type: "slide", breakpoint: "mobile" },
        className: "flex justify-between items-center gap-(--container-gap)",
      },
      children: buildMobileMenuChildren,
    },
  ],
}, { __internal: true });

/**
 * Extra nav toolbox presets that use ButtonList (not Nav).
 * These are exported separately and injected into the Navigation
 * toolbox category by the editor.
 *
 * This is a pragmatic choice: these presets create ButtonList nodes
 * but belong visually in the Navigation category.
 */
export const NAV_EXTRA_PRESETS = [
  {
    label: "Social Nav",
    icon: TbBrandTwitter,
    element: ButtonList,
    props: { className: navListClassName },
    children: () => buildSocialButtons(true),
  },
  {
    label: "Social Icons",
    icon: TbBrandTwitter,
    element: ButtonList,
    props: { className: navListClassName },
    children: () => buildSocialButtons(false),
  },
  {
    label: "Plain Nav",
    icon: TbMinus,
    element: ButtonList,
    props: { className: navListClassName },
    children: () => buildPlainNavButtons(false),
  },
  {
    label: "Minimal Nav",
    icon: TbLayoutNavbar,
    element: ButtonList,
    props: { className: navListClassName },
    children: () => buildPlainNavButtons(true),
  },
  {
    label: "Pill Nav",
    icon: TbPill,
    element: ButtonList,
    props: {
      className: "flex flex-row items-center gap-1 md:flex md:flex-row md:items-center md:gap-1 bg-(--primary) rounded-full px-2 py-1",
    },
    children: buildPillNavButtons,
  },
];
