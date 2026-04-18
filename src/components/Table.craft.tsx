/**
 * Table — Responsive wrapper + semantic table; children are TableSection only.
 */
import React from "react";
import { Element } from "@craftjs/core";
import { TbTable } from "react-icons/tb";
import { defineComponent } from "../define";
import { Table } from "./Table";
import { TableSection } from "./TableSection";
import { TableRow } from "./TableRow";
import { TableCell } from "./TableCell";
import { staticClasses, getInlineStyle, tag, type ToHTMLFn } from "../utils/static-html";
import { TableMainTab } from "../chrome/toolbar/unified-settings/mainTabs/TableMainTab";
import { HoverNodeController, DeleteNodeController, SelectTableTool } from "./editor-chrome";

const toHTML: ToHTMLFn = (props, children, ctx) => {
  "overflow-x-auto max-w-full w-full".split(/\s+/).forEach(c => c && ctx.classes.add(c));
  const cls = staticClasses(props, ctx);
  const style = getInlineStyle(props);
  const inner = tag(
    "table",
    {
      class: cls || "table w-full border-collapse text-sm",
      style: style || undefined,
    },
    children
  );
  return tag("div", { class: "overflow-x-auto max-w-full w-full" }, inner);
};

/** Children of the Table node — sections only (preset root is already Table). */
function buildPricingTablePreset() {
  const cell = (text: string, as: "td" | "th" = "td", key?: string) => (
    <Element
      key={key || text}
      is={TableCell}
      as={as}
      text={`<p>${text}</p>`}
      canDelete
      canEditName
      custom={{ displayName: text }}
      className={
        as === "th"
          ? "border-base-300 border px-3 py-2 text-left font-semibold"
          : "border-base-300 border px-3 py-2"
      }
    />
  );

  return [
    <Element
      key="thead"
      canvas
      is={TableSection}
      tableSection="thead"
      custom={{ displayName: "Header" }}
      canDelete
      canEditName
    >
      <Element canvas is={TableRow} custom={{ displayName: "Header row" }} canDelete canEditName>
        {cell("Plan", "th", "h1")}
        {cell("Price", "th", "h2")}
        {cell("Features", "th", "h3")}
      </Element>
    </Element>,
    <Element
      key="tbody"
      canvas
      is={TableSection}
      tableSection="tbody"
      custom={{ displayName: "Body" }}
      canDelete
      canEditName
    >
      <Element canvas is={TableRow} custom={{ displayName: "Row 1" }} canDelete canEditName>
        {cell("Starter")}
        {cell("$9")}
        {cell("Core")}
      </Element>
      <Element canvas is={TableRow} custom={{ displayName: "Row 2" }} canDelete canEditName>
        {cell("Pro")}
        {cell("$29")}
        {cell("Advanced")}
      </Element>
    </Element>,
    <Element
      key="tfoot"
      canvas
      is={TableSection}
      tableSection="tfoot"
      custom={{ displayName: "Footer" }}
      canDelete
      canEditName
    >
      <Element canvas is={TableRow} custom={{ displayName: "Footer row" }} canDelete canEditName>
        {cell("All plans")}
        {cell("—")}
        {cell("See site")}
      </Element>
    </Element>,
  ];
}

export const TableDef = defineComponent(
  {
    name: "Table",
    displayName: "Table",
    component: Table,
    icon: TbTable,
    category: "List",
    canvas: true,
    settings: TableMainTab,
    toHTML,
    disable: ["textColor", "bgColor", "shadow", "opacity", "hoverClick"],
    rules: {
      canDrag: () => true,
      canMoveIn: nodes => nodes.every(node => node.data?.name === "TableSection"),
    },
    tools: props => [
      <HoverNodeController
        key="tableHover"
        position="top"
        align="end"
        placement="end"
        alt={{ position: "bottom", align: "start", placement: "start" }}
      />,
      <SelectTableTool key="selectTable" />,
      <DeleteNodeController key="tableDelete" />,
    ],
    presets: [
      {
        label: "Table",
        description: "Scrollable table — add thead/tbody/tfoot sections.",
        props: {
          className: "border-base-300 text-base-content",
        },
      },
      {
        label: "Pricing table",
        description: "thead + tbody + tfoot with three columns.",
        props: {
          className: "border-base-300 text-base-content",
        },
        children: buildPricingTablePreset,
      },
    ],
  },
  { __internal: true }
);
