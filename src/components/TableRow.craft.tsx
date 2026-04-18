/**
 * TableRow — tr; children are TableCell only.
 */
import React from "react";
import { TbLineDashed } from "react-icons/tb";
import { defineComponent } from "../define";
import { TableRow } from "./TableRow";
import { staticClasses, getInlineStyle, tag, ariaAttrs, type ToHTMLFn } from "../utils/static-html";
import { TableRowMainTab } from "../chrome/toolbar/unified-settings/mainTabs/TableRowMainTab";
import { HoverNodeController, DeleteNodeController, SelectTableSectionTool } from "./editor-chrome";

const toHTML: ToHTMLFn = (props, children, ctx) => {
  return tag(
    "tr",
    {
      class: staticClasses(props, ctx) || undefined,
      style: getInlineStyle(props) || undefined,
      ...ariaAttrs(props),
    },
    children
  );
};

export const TableRowDef = defineComponent(
  {
    name: "TableRow",
    displayName: "Table Row",
    component: TableRow,
    icon: TbLineDashed,
    category: "List",
    canvas: true,
    settings: TableRowMainTab,
    toHTML,
    disable: ["textColor", "bgColor", "shadow", "opacity", "hoverClick"],
    rules: {
      canDrag: () => true,
      canMoveIn: nodes => nodes.every(node => node.data?.name === "TableCell"),
    },
    tools: props => [
      <HoverNodeController
        key="tableRowHover"
        position="top"
        align="end"
        placement="end"
        alt={{ position: "bottom", align: "start", placement: "start" }}
      />,
      <SelectTableSectionTool key="selectTableSectionFromRow" />,
      <DeleteNodeController key="tableRowDelete" />,
    ],
    presets: [
      {
        label: "Row",
        description: "One table row — add cells inside.",
        props: { className: "" },
      },
    ],
  },
  { __internal: true }
);
