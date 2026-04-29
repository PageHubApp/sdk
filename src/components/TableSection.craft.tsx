/**
 * TableSection — thead / tbody / tfoot; children are TableRow only.
 */
import React from "react";
import { TbLayoutRows } from "react-icons/tb";
import { defineComponent } from "../define";
import { TableSection } from "./TableSection";
import { staticClasses, getInlineStyle, tag, ariaAttrs, type ToHTMLFn } from "../utils/static-html";
import type { TableSectionKind } from "./tableTypes";
import { TableSectionMainTab } from "../chrome/toolbar/unified-settings/mainTabs/TableSectionMainTab";
import { HoverNodeController, DeleteNodeController, SelectTableTool } from "./editor-chrome";

const toHTML: ToHTMLFn = (props, children, ctx) => {
  const kind = (props.tableSection || "tbody") as TableSectionKind;
  const Tag = kind === "thead" ? "thead" : kind === "tfoot" ? "tfoot" : "tbody";
  return tag(
    Tag,
    {
      class: staticClasses(props, ctx) || undefined,
      style: getInlineStyle(props) || undefined,
      ...ariaAttrs(props),
    },
    children
  );
};

export const TableSectionDef = defineComponent(
  {
    name: "TableSection",
    displayName: "Table Section",
    component: TableSection,
    icon: TbLayoutRows,
    category: "Tables",
    canvas: true,
    settings: TableSectionMainTab,
    toHTML,
    disable: ["textColor", "bgColor", "shadow", "opacity", "hoverClick"],
    rules: {
      canDrag: () => true,
      canMoveIn: nodes => nodes.every(node => node.data?.name === "TableRow"),
    },
    tools: props => [
      <HoverNodeController
        key="tableSectionHover"
        position="top"
        align="end"
        placement="end"
        alt={{ position: "bottom", align: "start", placement: "start" }}
      />,
      <SelectTableTool key="selectTableFromSection" />,
      <DeleteNodeController key="tableSectionDelete" />,
    ],
    presets: [
      {
        label: "Table body",
        description: "The body of a table — where the data rows live.",
        props: { tableSection: "tbody", className: "" },
      },
      {
        label: "Table header",
        description: "The top row of a table — column titles.",
        props: { tableSection: "thead", className: "" },
      },
      {
        label: "Table footer",
        description: "The bottom of a table — totals or notes.",
        props: { tableSection: "tfoot", className: "" },
      },
    ],
  },
  { __internal: true }
);
