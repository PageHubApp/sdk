/** Container catalog — list presets (Bulleted, Numbered, Checklist, List Item). */
import { Element } from "@craftjs/core";
import { TbList, TbListCheck, TbListNumbers } from "react-icons/tb";
import type { ComponentPreset } from "../../../../define/types";
import { Text } from "../../../Text/Text";
import { buildBulletedListChildren, buildChecklistChildren, buildNumberedListChildren } from "../lists";

export const listPresets: ComponentPreset[] = [
  {
    label: "Bulleted List",
    description: "A simple bulleted list of points.",
    icon: TbList,
    category: "Lists",
    props: {
      type: "ul",
      className: "list-disc pl-space-md space-y-space-xs",
    },
    children: buildBulletedListChildren,
  },
  {
    label: "Numbered List",
    description: "An ordered list with numbers down the left.",
    icon: TbListNumbers,
    category: "Lists",
    props: {
      type: "ol",
      className: "list-decimal pl-space-md space-y-space-xs",
    },
    children: buildNumberedListChildren,
  },
  {
    label: "Checklist",
    description: "A list of rows each with a leading check icon.",
    icon: TbListCheck,
    category: "Lists",
    props: {
      type: "ul",
      className: "list-none flex flex-col gap-space-sm",
    },
    children: buildChecklistChildren,
  },
  {
    label: "List Item",
    description: "A single <li> row inside a list.",
    icon: TbList,
    category: "Lists",
    props: { type: "li" },
    children: () => [
      <Element
        key="text"
        is={Text}
        custom={{ displayName: "Text" }}
        text="<p>List item</p>"
        canDelete={true}
        canEditName={true}
      />,
    ],
  },
];
