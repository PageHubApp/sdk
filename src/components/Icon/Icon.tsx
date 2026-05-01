import { useEditor, useNode, UserComponent } from "@craftjs/core";
import React from "react";
import { TbIcons } from "react-icons/tb";
import { useMounted } from "../../utils/hooks";

import { LazyEditorEmptyLeafHint as EditorEmptyLeafHint } from "../LazyEditorEmptyLeafHint";
import { getClonedState, setClonedProps } from "../../utils/cloneState";
import { useResolvedIcon } from "../../utils/icons/iconResolver";
import { motionIt } from "../../utils/motion";
import { applyAnimation } from "../../utils/tailwind/tailwind";
import { useScrollToSelected } from "../componentHooks";
import { BaseSelectorProps } from "../selectors";

export interface IconProps extends BaseSelectorProps {
  /** Icon reference — `ref-icon:<set>/<ExportName>` or `ref-image:<mediaId>`. */
  value?: string;
  /** Tailwind text color class (e.g. `text-primary`). Defaults to inheriting from parent. */
  color?: string;
  /** Optional accessible name — when omitted, the icon is treated as decorative (`aria-hidden`). */
  "aria-label"?: string;
}

export const Icon: UserComponent<IconProps> = (incomingProps: IconProps) => {
  let props: any = {
    canDelete: true,
    canEditName: true,
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

  const iconElement = useResolvedIcon(props.value, query);

  const colorClass = props.color || "";
  const className = [
    colorClass || "fill-current",
    "inline-flex",
    "items-center",
    "justify-center",
    props.className || "",
  ]
    .filter(Boolean)
    .join(" ");

  const hasLabel = typeof props["aria-label"] === "string" && props["aria-label"].length > 0;

  const prop: any = {
    ref: r => connect(drag(r)),
    className,
  };

  if (hasLabel) {
    prop.role = "img";
    prop["aria-label"] = props["aria-label"];
  } else {
    prop["aria-hidden"] = "true";
  }

  if (enabled) {
    prop["data-bounding-box"] = enabled;
    if (isMounted) prop["node-id"] = id;
  }

  // A decoratively-styled icon slot (colored circle, gradient swatch) is
  // intentional — don't flag it as empty. Mirrors Button/Link/Image/Video.
  const cn = props.className || "";
  const looksStyledShape =
    /\brounded-full\b/.test(cn) ||
    (/\bbg-/.test(cn) && (/\bw-\S+/.test(cn) || /\bh-\S+/.test(cn) || /\bsize-\S+/.test(cn)));
  const isLeafEmpty = enabled && isMounted && !iconElement && !looksStyledShape;

  prop.children = isLeafEmpty ? (
    <EditorEmptyLeafHint
      selected={isActive}
      icon={<TbIcons aria-hidden />}
      idleLabel="Empty icon"
      selectedLabel="Pick an icon"
    />
  ) : (
    iconElement
  );

  const final = applyAnimation({ ...prop, key: `${id}` }, props, null, enabled);

  return React.createElement(motionIt(props, "span", enabled), final);
};

Icon.craft = {
  displayName: "Icon",
  rules: {
    canDrag: () => true,
  },
};
