import React from "react";
import { Element } from "@craftjs/core";
import { TbCheck } from "react-icons/tb";
import { Container } from "../Container";
import { Icon } from "../../Icon/Icon";
import { Text } from "../../Text/Text";
import { Image } from "../../Image/Image";

// ─── List / Table preset helpers ───
// All List/Table presets are plain Containers using props.type to set the
// semantic HTML tag (ul/ol/li/table/tr/td/th/tbody/thead/tfoot). The legacy
// List/ListItem/Table* components were removed in favor of Container.

export function buildBulletedListChildren() {
  const items = ["First point", "Second point", "Third point"];
  return items.map((label, i) => (
    <Element
      key={`item-${i}`}
      canvas
      is={Container}
      type="li"
      custom={{ displayName: `Item ${i + 1}` }}
      canDelete={true}
      canEditName={true}
    >
      <Element
        is={Text}
        custom={{ displayName: "Text" }}
        text={`<p>${label}</p>`}
        canDelete={true}
        canEditName={true}
      />
    </Element>
  ));
}

export function buildNumberedListChildren() {
  return buildBulletedListChildren();
}

export function buildChecklistChildren() {
  const items = ["First item", "Second item", "Third item"];
  return items.map((label, i) => (
    <Element
      key={`item-${i}`}
      canvas
      is={Container}
      type="li"
      custom={{ displayName: `Item ${i + 1}` }}
      className="flex flex-row items-start gap-space-xs"
      canDelete={true}
      canEditName={true}
    >
      <Element
        is={Icon}
        custom={{ displayName: "Marker" }}
        value="ref-icon:tb/TbCheck"
        className="text-primary h-5 w-5 shrink-0"
        canDelete={true}
        canEditName={true}
      />
      <Element
        is={Text}
        custom={{ displayName: "Text" }}
        text={`<p>${label}</p>`}
        className="min-w-0 flex-1"
        canDelete={true}
        canEditName={true}
      />
    </Element>
  ));
}

export function buildTableCell(displayName: string, text: string, isHeader: boolean) {
  return (
    <Element
      canvas
      is={Container}
      type={isHeader ? "th" : "td"}
      custom={{ displayName }}
      className={
        isHeader
          ? "border-base-300 border-b px-space-sm py-space-xs text-left font-semibold"
          : "border-base-300 border-b px-space-sm py-space-xs"
      }
      attrs={isHeader ? { scope: "col" } : undefined}
      canDelete={true}
      canEditName={true}
    >
      <Element
        is={Text}
        custom={{ displayName: "Text" }}
        text={`<p>${text}</p>`}
        canDelete={true}
        canEditName={true}
      />
    </Element>
  );
}

export function buildTableChildren() {
  return [
    <Element
      key="thead"
      canvas
      is={Container}
      type="thead"
      custom={{ displayName: "Head" }}
      canDelete={true}
      canEditName={true}
    >
      <Element
        canvas
        is={Container}
        type="tr"
        custom={{ displayName: "Row" }}
        canDelete={true}
        canEditName={true}
      >
        {buildTableCell("Header", "Column A", true)}
        {buildTableCell("Header", "Column B", true)}
        {buildTableCell("Header", "Column C", true)}
      </Element>
    </Element>,
    <Element
      key="tbody"
      canvas
      is={Container}
      type="tbody"
      custom={{ displayName: "Body" }}
      canDelete={true}
      canEditName={true}
    >
      <Element
        canvas
        is={Container}
        type="tr"
        custom={{ displayName: "Row 1" }}
        canDelete={true}
        canEditName={true}
      >
        {buildTableCell("Cell", "Row 1, A", false)}
        {buildTableCell("Cell", "Row 1, B", false)}
        {buildTableCell("Cell", "Row 1, C", false)}
      </Element>
      <Element
        canvas
        is={Container}
        type="tr"
        custom={{ displayName: "Row 2" }}
        canDelete={true}
        canEditName={true}
      >
        {buildTableCell("Cell", "Row 2, A", false)}
        {buildTableCell("Cell", "Row 2, B", false)}
        {buildTableCell("Cell", "Row 2, C", false)}
      </Element>
    </Element>,
  ];
}

export function buildAvatarChildren() {
  return [
    <Element
      key="img"
      is={Image}
      custom={{ displayName: "Photo" }}
      canDelete={true}
      canEditName={true}
      className="h-full w-full object-cover"
    />,
  ];
}

export const alertSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;

export const baseGrid = "grid w-full min-w-0 text-base-content";

export function buildGridCells(count: number) {
  return Array.from({ length: count }, (_, i) => (
    <Element
      key={`cell-${i}`}
      canvas
      is={Container}
      custom={{ displayName: "Cell" }}
      className="flex flex-col gap-space-sm p-space-sm min-h-24 w-full bg-base-200 rounded-box"
      canDelete={true}
      canEditName={true}
    />
  ));
}

export function buildAlertChildren() {
  return [
    <Element
      key="icon"
      is={Text}
      custom={{ displayName: "Icon" }}
      text={`<span class="shrink-0">${alertSvg}</span>`}
      canDelete={true}
      canEditName={true}
    />,
    <Element
      key="text"
      is={Text}
      custom={{ displayName: "Message" }}
      text="<span>This is an important message for your visitors.</span>"
      canDelete={true}
      canEditName={true}
    />,
  ];
}

export function buildStatChildren() {
  return [
    <Element
      key="value"
      is={Text}
      custom={{ displayName: "Value" }}
      text="2,400+"
      className="font-heading text-primary text-4xl font-bold"
      canDelete={true}
      canEditName={true}
    />,
    <Element
      key="label"
      is={Text}
      custom={{ displayName: "Label" }}
      text="Happy Customers"
      className="text-base-content/60 text-sm"
      canDelete={true}
      canEditName={true}
    />,
  ];
}
