/** Pure body for Icon. NO `@craftjs/core`. */
import React from "react";
import { TbIcons } from "../_emptyHintIcons";
import { EditorEmptyLeafHint } from "../../chrome/primitives/EditorEmptyLeafHint";
import { motionIt } from "../../utils/motion";
import { applyAnimation } from "../../utils/tailwind/tailwind";
import type { RenderCtx } from "../../render/react/RenderCtx";
import { BaseSelectorProps } from "../selectors";

export interface IconProps extends BaseSelectorProps {
  value?: string;
  color?: string;
  "aria-label"?: string;
}

export function renderIconBody(props: IconProps, ctx: RenderCtx, iconElement: React.ReactNode) {
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

  const hasLabel = typeof props["aria-label"] === "string" && (props["aria-label"] as string).length > 0;
  const prop: any = {
    ref: (r: any) => {
      ctx.connect(ctx.drag(r));
    },
    className,
  };
  if (hasLabel) {
    prop.role = "img";
    prop["aria-label"] = props["aria-label"];
  } else {
    prop["aria-hidden"] = "true";
  }
  if (ctx.enabled) {
    prop["data-bounding-box"] = ctx.enabled;
    if (ctx.isMounted) prop["node-id"] = ctx.id;
  }

  const cn = props.className || "";
  const looksStyledShape =
    /\brounded-full\b/.test(cn) ||
    (/\bbg-/.test(cn) && (/\bw-\S+/.test(cn) || /\bh-\S+/.test(cn) || /\bsize-\S+/.test(cn)));
  const isLeafEmpty = ctx.enabled && ctx.isMounted && !iconElement && !looksStyledShape;

  prop.children = isLeafEmpty ? (
    <EditorEmptyLeafHint
      selected={ctx.isActive}
      icon={<TbIcons aria-hidden />}
      idleLabel="Empty icon"
      selectedLabel="Pick an icon"
    />
  ) : (
    iconElement
  );

  const final = applyAnimation({ ...prop, key: ctx.id }, props as any, null, ctx.enabled);
  return React.createElement(motionIt(props as any, "span", ctx.enabled), final);
}
