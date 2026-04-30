/**
 * TableCell — td or th with HTML body.
 */
import React from "react";
import { TbBorderInner } from "react-icons/tb";
import { defineComponent } from "../define";
import { TableCell } from "./TableCell";
import {
  staticClasses,
  getInlineStyle,
  tag,
  ariaAttrs,
  type ToHTMLFn,
} from "../utils/static-html";
const TableCellMainTab = React.lazy(() =>
  import("../chrome/toolbar/unified-settings/mainTabs/TableCellMainTab").then((mod) => ({ default: mod.TableCellMainTab })),
);
import { HoverNodeController, DeleteNodeController, SelectTableRowTool } from "./editor-chrome";

const toHTML: ToHTMLFn = (props, _children, ctx) => {
  const Tag = props.as === "th" ? "th" : "td";
  const cls = staticClasses(props, ctx) || undefined;
  const style = getInlineStyle(props);
  const text = props.text || "";
  const attrs: Record<string, string | boolean | undefined> = {
    class: cls,
    style: style || undefined,
    ...ariaAttrs(props),
  };
  const cs = props.colSpan;
  const rs = props.rowSpan;
  if (cs != null && Number(cs) > 1) attrs.colspan = String(cs);
  if (rs != null && Number(rs) > 1) attrs.rowspan = String(rs);
  if (Tag === "th" && props.scope) attrs.scope = props.scope;
  return tag(Tag, attrs, text);
};

export const TableCellDef = defineComponent(
  {
    name: "TableCell",
    displayName: "Table Cell",
    component: TableCell,
    icon: TbBorderInner,
    category: "Tables",
    canvas: false,
    settings: TableCellMainTab,
    toHTML,
    disable: ["textColor", "bgColor", "shadow", "opacity", "hoverClick", "pattern"],
    rules: {
      canDrag: () => true,
      canMoveIn: () => false,
    },
    tools: props => [
      <HoverNodeController
        key="tableCellHover"
        position="top"
        align="end"
        placement="end"
        alt={{ position: "bottom", align: "start", placement: "start" }}
      />,
      <SelectTableRowTool key="selectTableRow" />,
      <DeleteNodeController key="tableCellDelete" />,
    ],
    presets: [
      {
        label: "Cell",
        description: "One cell inside a table row.",
        props: {
          text: "<p>Cell</p>",
          as: "td",
          className: "border-base-300 border px-3 py-2 align-top",
        },
      },
    ],
  },
  { __internal: true }
);
