import { useEditor, useNode, UserComponent } from "@craftjs/core";
import React, { useEffect, useState } from "react";
import { TbTypography } from "react-icons/tb";
import { getClonedState, setClonedProps } from "../utils/cloneHelper";
import { motionIt } from "../utils/lib";
import { applyAnimation, CSStoObj } from "../utils/tailwind/tailwind";
import { replaceVariables } from "../utils/design/variables";
import { useRuntimeVarsVersion } from "../utils/design/RuntimeVarsContext";
import { useScrollToSelected } from "./componentHooks";
import { LazyEditorEmptyLeafHint as EditorEmptyLeafHint } from "./LazyEditorEmptyLeafHint";
import { isVisuallyEmptyRichText } from "../utils/isVisuallyEmptyRichText";
import { BaseSelectorProps, applyAriaProps } from "./selectors";
import type { TableCellKind } from "./tableTypes";
import { useMounted } from "../utils/hooks";

export interface TableCellProps extends BaseSelectorProps {
  text?: string;
  as?: TableCellKind;
  colSpan?: number;
  rowSpan?: number;
  scope?: string;
}

export const TableCell: UserComponent<TableCellProps> = (incomingProps: TableCellProps) => {
  let props: any = {
    text: "<p>Cell</p>",
    as: "td" as TableCellKind,
    ...incomingProps,
  };

  const {
    connectors: { connect, drag },
    id,
  } = useNode();

  const { query, enabled } = useEditor(state => getClonedState(props, state));
  const { isActive } = useEditor((_, q) => ({
    isActive: q.getEvent("selected").contains(id),
  }));

  props = setClonedProps(props, query);
  const isMounted = useMounted();

  useScrollToSelected(id, enabled);
  useRuntimeVarsVersion();

  const Tag = props.as === "th" ? "th" : "td";
  const rawHtml = replaceVariables(String(props.text ?? ""), query);
  const isEmptyLeaf = enabled && isMounted && isVisuallyEmptyRichText(rawHtml);

  const prop: any = {
    ref: (r: HTMLElement | null) => {
      connect(drag(r));
    },
    style: props.root?.style ? CSStoObj(props.root.style) || {} : {},
    className: props.className || "",
  };

  if (props.colSpan && props.colSpan > 1) {
    prop.colSpan = props.colSpan;
  }
  if (props.rowSpan && props.rowSpan > 1) {
    prop.rowSpan = props.rowSpan;
  }
  if (props.scope && Tag === "th") {
    prop.scope = props.scope;
  }

  applyAriaProps(prop, props);

  if (enabled) {
    prop["data-bounding-box"] = enabled;
    if (isMounted) {
      prop["node-id"] = id;
    }
  }

  prop.children = isEmptyLeaf ? (
    <EditorEmptyLeafHint
      selected={isActive}
      icon={<TbTypography aria-hidden />}
      idleLabel="Empty cell"
      selectedLabel="Add text in the sidebar"
    />
  ) : (
    <div
      className="text-base-content [&_a]:text-primary [&_a]:underline-offset-2 [&_a]:hover:underline"
      dangerouslySetInnerHTML={{ __html: rawHtml }}
    />
  );

  return React.createElement(motionIt(props, Tag, enabled), {
    ...applyAnimation(prop, props, null, enabled),
  });
};

TableCell.craft = {
  displayName: "Table Cell",
  rules: {
    canDrag: () => true,
    canMoveIn: () => false,
  },
};
