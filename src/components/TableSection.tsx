import { useEditor, useNode, UserComponent } from "@craftjs/core";
import React from "react";
import { TbLayoutRows } from "react-icons/tb";
import { getClonedState, setClonedProps } from "../utils/cloneHelper";
import { motionIt } from "../utils/lib";
import { applyAnimation, CSStoObj } from "../utils/tailwind/tailwind";
import { useScrollToSelected } from "./componentHooks";
import { BaseSelectorProps, applyAriaProps } from "./selectors";
import type { TableSectionKind } from "./tableTypes";
import { useMounted } from "../utils/hooks";

export interface TableSectionProps extends BaseSelectorProps {
  /** Which table section this node renders. */
  tableSection?: TableSectionKind;
}

export const TableSection: UserComponent<TableSectionProps> = (
  incomingProps: TableSectionProps
) => {
  let props: any = {
    tableSection: "tbody" as TableSectionKind,
    ...incomingProps,
  };

  const {
    connectors: { connect, drag },
    id,
  } = useNode();

  const { query, enabled } = useEditor(state => getClonedState(props, state));

  props = setClonedProps(props, query);
  const isMounted = useMounted();

  useScrollToSelected(id, enabled);

  const kind = props.tableSection || "tbody";
  const Tag = kind === "thead" ? "thead" : kind === "tfoot" ? "tfoot" : "tbody";

  const prop: any = {
    ref: (r: HTMLElement | null) => {
      connect(drag(r));
    },
    style: props.root?.style ? CSStoObj(props.root.style) || {} : {},
    className: props.className || "",
  };

  applyAriaProps(prop, props);

  if (enabled) {
    prop["data-bounding-box"] = enabled;
    if (isMounted) {
      prop["node-id"] = id;
    }
  }

  let hasRows = false;
  if (enabled && isMounted) {
    try {
      const node = query.node(id).get();
      hasRows = (node.data.nodes || []).some((cid: string) => {
        try {
          return query.node(cid).get().data.name === "TableRow";
        } catch {
          return false;
        }
      });
    } catch {
      hasRows = false;
    }
  } else if (!enabled) {
    hasRows = !!props.children;
  }

  const { children } = props;

  const content =
    hasRows || !enabled ? (
      children
    ) : (
      <tr>
        {kind === "thead" ? (
          <th
            scope="col"
            className="border-base-300 text-base-content/50 border p-2 text-center text-xs font-normal"
          >
            <TbLayoutRows className="mx-auto h-4 w-4 opacity-60" aria-hidden />
          </th>
        ) : (
          <td
            colSpan={1}
            className="border-base-300 text-base-content/50 border p-2 text-center text-xs"
          >
            <TbLayoutRows className="mx-auto h-4 w-4 opacity-60" aria-hidden />
          </td>
        )}
      </tr>
    );

  prop.children = content;

  return React.createElement(motionIt(props, Tag, enabled), {
    ...applyAnimation(prop, props, null, enabled),
  });
};

TableSection.craft = {
  displayName: "Table Section",
  rules: {
    canDrag: () => true,
    canMoveIn: nodes => nodes.every(node => node.data?.name === "TableRow"),
  },
};
