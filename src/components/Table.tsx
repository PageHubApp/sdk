import { useEditor, useNode, UserComponent } from "@craftjs/core";
import React from "react";
import { TbTable } from "react-icons/tb";
import { getClonedState, setClonedProps } from "../utils/cloneHelper";
import { motionIt } from "../utils/lib";
import { applyAnimation, CSStoObj } from "../utils/tailwind/tailwind";
import { useScrollToSelected } from "./componentHooks";
import { BaseSelectorProps, applyAriaProps } from "./selectors";
import { useMounted } from "../utils/hooks";

export interface TableProps extends BaseSelectorProps {}

export const Table: UserComponent<TableProps> = (incomingProps: TableProps) => {
  let props: any = {
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

  const tableClassName = ["table", "w-full", "border-collapse", "text-sm", props.className || ""]
    .filter(Boolean)
    .join(" ");

  const outer: any = {
    ref: (r: HTMLElement | null) => {
      connect(drag(r));
    },
    style: props.root?.style ? CSStoObj(props.root.style) || {} : {},
    className: "overflow-x-auto max-w-full w-full",
  };

  applyAriaProps(outer, props);

  if (enabled) {
    outer["data-bounding-box"] = enabled;
    if (isMounted) {
      outer["node-id"] = id;
    }
  }

  let hasSections = false;
  if (enabled && isMounted) {
    try {
      const node = query.node(id).get();
      hasSections = (node.data.nodes || []).some((cid: string) => {
        try {
          return query.node(cid).get().data.name === "TableSection";
        } catch {
          return false;
        }
      });
    } catch {
      hasSections = false;
    }
  } else if (!enabled) {
    hasSections = !!props.children;
  }

  const { children } = props;

  const inner =
    !hasSections && enabled ? (
      <tbody>
        <tr>
          <td className="border-base-300 text-base-content/50 border p-4 text-center text-xs">
            <span className="inline-flex items-center gap-2">
              <TbTable className="h-4 w-4 shrink-0" aria-hidden />
              Add sections (thead / tbody / tfoot) from the sidebar
            </span>
          </td>
        </tr>
      </tbody>
    ) : (
      children
    );

  outer.children = <table className={tableClassName}>{inner}</table>;

  return React.createElement(motionIt(props, "div", enabled), {
    ...applyAnimation(outer, props, null, enabled),
  });
};

Table.craft = {
  displayName: "Table",
  rules: {
    canDrag: () => true,
    canMoveIn: nodes => nodes.every(node => node.data?.name === "TableSection"),
  },
};
