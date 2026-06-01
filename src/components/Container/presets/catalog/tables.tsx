/** Container catalog — table presets (Table, Thead, Tbody, Tfoot, Row, Cell, Header Cell). */
import { Element } from "@craftjs/core";
import { TbTable } from "react-icons/tb";
import type { ComponentPreset } from "../../../../define/types";
import { Container } from "../../Container";
import { Text } from "../../../Text/Text";
import { buildTableCell, buildTableChildren } from "../lists";

export const tablePresets: ComponentPreset[] = [
  {
    label: "Table",
    description: "A data table with header row and body rows.",
    icon: TbTable,
    category: "Tables",
    props: {
      type: "table",
      className: "table w-full border-collapse text-sm",
    },
    children: buildTableChildren,
  },
  {
    label: "Table Head",
    description: "A <thead> section — header rows for a table.",
    icon: TbTable,
    category: "Tables",
    props: { type: "thead" },
    children: () => [
      <Element
        key="row"
        canvas
        is={Container}
        type="tr"
        custom={{ displayName: "Row" }}
        canDelete={true}
        canEditName={true}
      >
        {buildTableCell("Header", "Column", true)}
      </Element>,
    ],
  },
  {
    label: "Table Body",
    description: "A <tbody> section — data rows for a table.",
    icon: TbTable,
    category: "Tables",
    props: { type: "tbody" },
    children: () => [
      <Element
        key="row"
        canvas
        is={Container}
        type="tr"
        custom={{ displayName: "Row" }}
        canDelete={true}
        canEditName={true}
      >
        {buildTableCell("Cell", "Cell", false)}
      </Element>,
    ],
  },
  {
    label: "Table Foot",
    description: "A <tfoot> section — footer rows for a table.",
    icon: TbTable,
    category: "Tables",
    props: { type: "tfoot" },
    children: () => [
      <Element
        key="row"
        canvas
        is={Container}
        type="tr"
        custom={{ displayName: "Row" }}
        canDelete={true}
        canEditName={true}
      >
        {buildTableCell("Cell", "Total", false)}
      </Element>,
    ],
  },
  {
    label: "Table Row",
    description: "A single <tr> with one cell.",
    icon: TbTable,
    category: "Tables",
    props: { type: "tr" },
    children: () => [buildTableCell("Cell", "Cell", false)],
  },
  {
    label: "Table Cell",
    description: "A single <td> data cell.",
    icon: TbTable,
    category: "Tables",
    props: {
      type: "td",
      className: "border-base-300 border-b px-space-sm py-space-xs",
    },
    children: () => [
      <Element
        key="text"
        is={Text}
        custom={{ displayName: "Text" }}
        text="<p>Cell</p>"
        canDelete={true}
        canEditName={true}
      />,
    ],
  },
  {
    label: "Table Header Cell",
    description: "A single <th> header cell with scope=col.",
    icon: TbTable,
    category: "Tables",
    props: {
      type: "th",
      className: "border-base-300 border-b px-space-sm py-space-xs text-left font-semibold",
      attrs: { scope: "col" },
    },
    children: () => [
      <Element
        key="text"
        is={Text}
        custom={{ displayName: "Text" }}
        text="<p>Header</p>"
        canDelete={true}
        canEditName={true}
      />,
    ],
  },
];
