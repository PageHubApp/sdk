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

const socialRefIcons = {
  twitter: "ref-icon:fa6/FaXTwitter",
  facebook: "ref-icon:fa6/FaFacebook",
  instagram: "ref-icon:fa6/FaInstagram",
  linkedin: "ref-icon:fa6/FaLinkedin",
  youtube: "ref-icon:fa6/FaYoutube",
} as const;

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
      icon={{ value: socialRefIcons[name], only: true }}
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
