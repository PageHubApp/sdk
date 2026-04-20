import { useEditor, useNode, UserComponent } from "@craftjs/core";
import React, { useEffect, useMemo, useState } from "react";
import { TbCheck, TbTypography } from "react-icons/tb";
import { getClonedState, setClonedProps } from "../utils/cloneHelper";
import { useResolvedIcon } from "../utils/iconResolver";
import { motionIt } from "../utils/lib";
import { applyAnimation, CSStoObj } from "../utils/tailwind/tailwind";
import { replaceVariables } from "../utils/design/variables";
import { useScrollToSelected } from "./componentHooks";
import { EditorEmptyLeafHint } from "../chrome/primitives/EditorEmptyLeafHint";
import { isVisuallyEmptyRichText } from "../utils/isVisuallyEmptyRichText";
import { BaseSelectorProps, applyAriaProps } from "./selectors";
import type { ListMarkerIconProps, ListMarkerStyle } from "./List";

export interface ListItemProps extends BaseSelectorProps {
  text?: string;
  /** When set, overrides the parent List marker. Omit to inherit. */
  markerStyle?: ListMarkerStyle;
  markerIcon?: ListMarkerIconProps;
}

function useParentListProps(id: string) {
  return useEditor((_, q) => {
    try {
      const pid = q.node(id).get().data.parent;
      if (!pid) return null;
      const pn = q.node(pid).get();
      if (pn.data.name !== "List") return null;
      const p = pn.data.props || {};
      return {
        ordered: !!p.ordered,
        markerStyle: (p.markerStyle || "check") as ListMarkerStyle,
        markerIcon: (p.markerIcon || {
          value: "ref-icon:tb/TbCheck",
          size: "w-5 h-5",
        }) as ListMarkerIconProps,
      };
    } catch {
      return null;
    }
  });
}

export const ListItem: UserComponent<ListItemProps> = (incomingProps: ListItemProps) => {
  let props: any = {
    text: "<p>List item</p>",
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

  const parentList = useParentListProps(id);

  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useScrollToSelected(id, enabled);

  const ordered = parentList?.ordered === true;
  const inheritedMarker = parentList?.markerStyle || "check";
  const inheritedIcon = parentList?.markerIcon || { value: "ref-icon:tb/TbCheck", size: "w-5 h-5" };

  const rawOverride = props.markerStyle;
  const effectiveMarker: ListMarkerStyle =
    rawOverride && rawOverride !== "inherit" ? rawOverride : inheritedMarker;
  const effectiveIcon: ListMarkerIconProps = {
    ...inheritedIcon,
    ...props.markerIcon,
  };

  const iconSizeEarly = effectiveIcon.size || "w-5 h-5";
  const iconElement = useResolvedIcon(effectiveIcon.value, query);

  const iconClass = useMemo(
    () =>
      [
        iconSizeEarly,
        "fill-current text-primary shrink-0",
        "flex items-center justify-center",
      ]
        .filter(Boolean)
        .join(" "),
    [iconSizeEarly],
  );

  const renderMarker = () => {
    if (ordered) return null;
    switch (effectiveMarker) {
      case "bullet":
        return (
          <span className="text-base-content/80 mt-0.5 shrink-0 select-none" aria-hidden>
            &bull;
          </span>
        );
      case "dash":
        return (
          <span className="text-base-content/70 mt-0.5 shrink-0 select-none" aria-hidden>
            &ndash;
          </span>
        );
      case "check":
        return <TbCheck className="text-primary mt-0.5 h-5 w-5 shrink-0" aria-hidden />;
      case "icon":
        return iconElement ? (
          <span className={iconClass} aria-hidden="true">
            {iconElement}
          </span>
        ) : (
          <TbTypography className="text-base-content/50 h-5 w-5 shrink-0" aria-hidden />
        );
      default:
        return (
          <span className="text-base-content/80 mt-0.5 shrink-0 select-none" aria-hidden>
            &bull;
          </span>
        );
    }
  };

  const rawHtml = replaceVariables(String(props.text ?? ""), query);
  const isEmptyLeaf = enabled && isMounted && isVisuallyEmptyRichText(rawHtml);

  const inner = isEmptyLeaf ? (
    <EditorEmptyLeafHint
      selected={isActive}
      icon={<TbTypography aria-hidden />}
      idleLabel="Empty list item"
      selectedLabel="Add text in the sidebar"
    />
  ) : (
    <div
      className="min-w-0 flex-1 text-base-content [&_a]:text-primary [&_a]:underline-offset-2 [&_a]:hover:underline"
      dangerouslySetInnerHTML={{ __html: rawHtml }}
    />
  );

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

  const element = motionIt(props, "li", enabled);

  prop.children = ordered ? (
    inner
  ) : (
    <div className="flex items-start gap-2">
      <span className="flex shrink-0">{renderMarker()}</span>
      {inner}
    </div>
  );

  return React.createElement(element, {
    ...applyAnimation(prop, props, null, enabled),
  });
};

ListItem.craft = {
  displayName: "List Item",
  rules: {
    canDrag: () => true,
    canMoveIn: () => false,
  },
};
