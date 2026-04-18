import { useEditor, useNode, UserComponent } from "@craftjs/core";
import React, { useEffect, useState } from "react";
import { TbSeparatorHorizontal } from "react-icons/tb";
import { getClonedState, setClonedProps } from "../utils/cloneHelper";
import { motionIt } from "../utils/lib";
import { applyAnimation, CSStoObj } from "../utils/tailwind/tailwind";
import { useScrollToSelected } from "./componentHooks";
import { BaseSelectorProps, applyAriaProps } from "./selectors";

export interface TableRowProps extends BaseSelectorProps {}

export const TableRow: UserComponent<TableRowProps> = (incomingProps: TableRowProps) => {
  let props: any = {
    ...incomingProps,
  };

  const {
    connectors: { connect, drag },
    id,
  } = useNode();

  const { query, enabled } = useEditor(state => getClonedState(props, state));

  props = setClonedProps(props, query);

  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useScrollToSelected(id, enabled);

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

  let hasCells = false;
  if (enabled && isMounted) {
    try {
      const node = query.node(id).get();
      hasCells = (node.data.nodes || []).some((cid: string) => {
        try {
          return query.node(cid).get().data.name === "TableCell";
        } catch {
          return false;
        }
      });
    } catch {
      hasCells = false;
    }
  } else if (!enabled) {
    hasCells = !!props.children;
  }

  const { children } = props;

  const content =
    hasCells || !enabled ? (
      children
    ) : (
      <>
        <td className="border-base-300 text-base-content/50 border p-2 text-center text-xs">
          <TbSeparatorHorizontal className="mx-auto h-4 w-4 opacity-60" aria-hidden />
        </td>
      </>
    );

  prop.children = content;

  return React.createElement(motionIt(props, "tr", enabled), {
    ...applyAnimation(prop, props, null, enabled),
  });
};

TableRow.craft = {
  displayName: "Table Row",
  rules: {
    canDrag: () => true,
    canMoveIn: nodes => nodes.every(node => node.data?.name === "TableCell"),
  },
};
