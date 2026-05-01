import React from "react";
import { Element } from "@craftjs/core";
import { Container } from "../Container";
import { Button } from "../../Button/Button";

// ─── Button-group / nav-strip preset helpers ───
// Plain Container roots with Button children — no wrapper component required.
// 3+ contiguous Buttons trigger the auto-list editor in the toolbar.

export const navButtonClassName =
  "px-(--button-padding-x) py-(--button-padding-y) flex-col gap-1.5 items-center justify-center";

export const navListClassName =
  "flex flex-row items-center gap-container md:flex md:flex-row md:items-center md:gap-container";

export const socialRefIcons = {
  twitter: "ref-icon:fa6/FaXTwitter",
  facebook: "ref-icon:fa6/FaFacebook",
  instagram: "ref-icon:fa6/FaInstagram",
  linkedin: "ref-icon:fa6/FaLinkedin",
  youtube: "ref-icon:fa6/FaYoutube",
} as const;

export function buildSocialButtons(filled: boolean) {
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
      canDelete={true}
      canEditName={true}
    />
  ));
}

export function buildPlainNavButtons(withBg: boolean) {
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
      canDelete={true}
      canEditName={true}
    />
  ));
}

export function buildPillNavButtons() {
  return ["Home", "About", "Contact"].map(name => (
    <Element
      key={name}
      is={Button}
      custom={{ displayName: name }}
      text={name}
      url="#"
      className={`${navButtonClassName} text-primary-content border-0 bg-transparent`}
      canDelete={true}
      canEditName={true}
    />
  ));
}

export function buildButtonGroupChildren() {
  // 3 buttons hits the auto-list detector threshold immediately, so the
  // toolbar shows the Buttons list editor as soon as the preset is dropped.
  return ["Button 1", "Button 2", "Button 3"].map((text, i) => (
    <Element
      key={i}
      is={Button}
      custom={{ displayName: text }}
      text={text}
      url="#"
      className="btn btn-primary rounded-box px-space-md py-space-xs min-h-12 font-semibold"
      canDelete={true}
      canEditName={true}
    />
  ));
}

