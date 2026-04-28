/**
 * ButtonList — Component definition via defineComponent()
 *
 * Includes the Navigation-category preset variants (Social Nav, Plain Nav,
 * Pill Nav, etc) — they create ButtonList nodes but each carries
 * `category: "Navigation"` so the toolbox routes them out of "Content".
 */
import React from "react";
import { Element } from "@craftjs/core";
import { TbBrandTwitter, TbLayoutNavbar, TbMinus, TbPill, TbStack2 } from "react-icons/tb";
import { defineComponent } from "../define";
import { Button } from "./Button";
import { ButtonList } from "./ButtonList";
import { staticClasses, getInlineStyle, tag, ariaAttrs, type ToHTMLFn } from "../utils/static-html";

const toHTML: ToHTMLFn = (props, children, ctx) => {
  return tag(
    "div",
    {
      class: staticClasses(props, ctx) || undefined,
      style: getInlineStyle(props) || undefined,
      ...ariaAttrs(props),
    },
    children
  );
};
import { ButtonListMainTab } from "../chrome/toolbar/unified-settings/mainTabs/ButtonListMainTab";

// ─── Shared helpers (also imported by Nav.craft.tsx for mobile menu) ───────

export const navButtonClassName =
  "px-(--button-padding-x) py-(--button-padding-y) flex-col gap-1.5 items-center justify-center";

const navListClassName =
  "flex flex-row items-center gap-container md:flex md:flex-row md:items-center md:gap-container";

export const socialIcons = {
  twitter: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>`,
  facebook: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>`,
  instagram: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 6.62 5.367 11.987 11.988 11.987s11.987-5.367 11.987-11.987C24.014 5.367 18.647.001 12.017.001zM8.449 16.988c-1.297 0-2.448-.49-3.323-1.297C4.198 14.895 3.708 13.744 3.708 12.447s.49-2.448 1.297-3.323c.875-.807 2.026-1.297 3.323-1.297s2.448.49 3.323 1.297c.807.875 1.297 2.026 1.297 3.323s-.49 2.448-1.297 3.323c-.875.807-2.026 1.297-3.323 1.297zm7.83-9.281c-.49 0-.98-.49-.98-.98s.49-.98.98-.98.98.49.98.98-.49.98-.98.98zm-2.448 9.281c-1.297 0-2.448-.49-3.323-1.297-.807-.875-1.297-2.026-1.297-3.323s.49-2.448 1.297-3.323c.875-.807 2.026-1.297 3.323-1.297s2.448.49 3.323 1.297c.807.875 1.297 2.026 1.297 3.323s-.49 2.448-1.297 3.323c-.875.807-2.026 1.297-3.323 1.297z"/></svg>`,
  linkedin: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>`,
  youtube: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>`,
};

// ─── Nav-flavored preset children builders ─────────────────────────────────

function buildSocialButtons(filled: boolean) {
  const baseClassName = filled
    ? "px-(--button-padding-x) py-(--button-padding-y) bg-primary text-primary-content rounded-box"
    : "btn btn-ghost";
  const colors: Record<string, string> = filled
    ? {}
    : {
        twitter: "text-[#1DA1F2]",
        facebook: "text-[#1877F2]",
        instagram: "text-[#E4405F]",
        linkedin: "text-[#0A66C2]",
        youtube: "text-[#FF0000]",
      };

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
      className={
        withBg
          ? `${navButtonClassName} bg-primary text-primary-content rounded-box`
          : navButtonClassName
      }
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
      className={`${navButtonClassName} text-primary-content border-0 bg-transparent`}
    />
  ));
}

export const ButtonListDef = defineComponent(
  {
    name: "ButtonList",
    component: ButtonList,
    icon: TbStack2,
    category: "Content",
    canvas: true,
    settings: ButtonListMainTab,
    toHTML,
    disable: ["textColor", "bgColor", "shadow", "opacity", "hoverClick"],
    rules: {
      canDrag: () => true,
      canMoveIn: nodes => nodes.every(node => node.data?.name === "Button"),
    },
    tools: [],
    presets: [
      {
        label: "Button List",
        description: "Group of buttons in a row or column.",
        props: {
          className:
            "flex flex-col items-center justify-start gap-space-xs md:flex-row md:items-center md:justify-start w-auto",
          buttons: [{ text: "Button 1" }, { text: "Button 2" }],
        },
      },
      // ─── Navigation-category variants ────────────────────────────────────
      {
        label: "Social Nav",
        description: "Social media icon buttons with brand fills.",
        icon: TbBrandTwitter,
        category: "Navigation",
        props: { className: navListClassName },
        children: () => buildSocialButtons(true),
      },
      {
        label: "Social Icons",
        description: "Social media icon buttons with brand colors.",
        icon: TbBrandTwitter,
        category: "Navigation",
        props: { className: navListClassName },
        children: () => buildSocialButtons(false),
      },
      {
        label: "Plain Nav",
        description: "Simple text navigation links.",
        icon: TbMinus,
        category: "Navigation",
        props: { className: navListClassName },
        children: () => buildPlainNavButtons(false),
      },
      {
        label: "Minimal Nav",
        description: "Nav links with primary background fills.",
        icon: TbLayoutNavbar,
        category: "Navigation",
        props: { className: navListClassName },
        children: () => buildPlainNavButtons(true),
      },
      {
        label: "Pill Nav",
        description: "Compact pill-shaped navigation bar.",
        icon: TbPill,
        category: "Navigation",
        props: {
          className:
            "flex flex-row items-center gap-space-xs md:flex md:flex-row md:items-center md:gap-space-xs bg-primary rounded-full px-space-xs py-space-xs",
        },
        children: buildPillNavButtons,
      },
    ],
  },
  { __internal: true }
);
