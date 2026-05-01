import React from "react";
import { Element } from "@craftjs/core";
import { Container } from "../Container";

export function buildSectionChildren() {
  return [
    <Element
      key="content"
      canvas
      is={Container}
      custom={{ displayName: "Content" }}
      canDelete={true}
      canEditName={true}
      className="gap-space-md max-w-page mx-auto flex w-full flex-col"
    />,
  ];
}

import {
  TbBadge,
  TbLayoutColumns,
  TbLayoutRows,
  TbMinus,
  TbSection,
  TbSpace,
} from "react-icons/tb";
import { Text } from "../../Text/Text";
import type { ComponentPreset } from "../../../define/types";

export const structurePresets: ComponentPreset[] = [
  {
    label: "Section",
    icon: TbSection,
    description: "A full-width strip of the page with built-in padding.",
    props: {
      type: "section",
      className:
        "bg-base-100 text-base-content w-full flex flex-col items-center py-space-lg px-container-x",
    },
    children: buildSectionChildren,
  },
  {
    label: "Row",
    icon: TbLayoutColumns,
    description: "Lay things side-by-side in a row.",
    props: { className: "flex flex-row flex-wrap gap-space-md items-start min-w-0 w-full" },
  },
  {
    label: "Column",
    icon: TbLayoutRows,
    description: "Stack things on top of each other in a column.",
    props: { className: "flex flex-col gap-space-md w-full" },
  },
  {
    label: "Badge",
    description: "A tiny pill for tags, status, or labels.",
    icon: TbBadge,
    category: "Components",
    props: { className: "badge badge-primary font-medium self-start" },
    children: () => [
      <Element
        key="label"
        is={Text}
        custom={{ displayName: "Label" }}
        text="New"
        canDelete={true}
        canEditName={true}
      />,
    ],
  },
  {
    label: "Spacer",
    description: "An empty gap that pushes things apart.",
    icon: TbSpace,
    category: "Dividers",
    props: {
      className: "h-16 w-full bg-transparent",
      attrs: { "aria-hidden": "true" },
    },
  },
  {
    label: "Divider",
    description: "A thin line between sections.",
    icon: TbMinus,
    category: "Dividers",
    props: {
      className: "border-t w-full",
      attrs: { role: "separator" },
    },
  },
];
