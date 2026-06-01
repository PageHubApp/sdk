/** Container catalog — base layout presets (Section, Row, Column). */
import { TbLayoutColumns, TbLayoutRows, TbSection } from "react-icons/tb";
import type { ComponentPreset } from "../../../../define/types";
import { buildSectionChildren } from "../structure";

export const basePresets: ComponentPreset[] = [
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
    props: {
      className: "flex flex-row flex-wrap gap-space-md items-start min-w-0 w-full",
    },
  },
  {
    label: "Column",
    icon: TbLayoutRows,
    description: "Stack things on top of each other in a column.",
    props: { className: "flex flex-col gap-space-md w-full" },
  },
];
