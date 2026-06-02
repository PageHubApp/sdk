/** Pure body for MapPoint. NO `@craftjs/core`. */
import React from "react";
import { TbMapPin } from "../_emptyHintIcons";
import type { RenderCtx } from "../../render/react/RenderCtx";
import { BaseSelectorProps, applyAriaProps } from "../selectors";

export interface MapPointProps extends BaseSelectorProps {
  lat: number;
  lng: number;
  title?: string;
  description?: string;
}

export function renderMapPointBody(props: MapPointProps, ctx: RenderCtx) {
  if (!ctx.enabled) return null;
  const prop: any = {
    ref: (r: any) => {
      ctx.connect(ctx.drag(r));
    },
    className:
      "flex items-center gap-2 rounded-lg border border-dashed border-base-300 bg-neutral/50 px-3 py-2 text-sm text-neutral-content",
    "data-bounding-box": true,
    "data-empty-state": !props.lat && !props.lng,
  };
  applyAriaProps(prop, props);
  if (ctx.isMounted) prop["node-id"] = ctx.id;
  const label = props.title || `${(props.lat ?? 0).toFixed(4)}, ${(props.lng ?? 0).toFixed(4)}`;
  prop.children = (
    <>
      <TbMapPin className="shrink-0" />
      <span className="truncate">{label}</span>
    </>
  );
  return React.createElement("div", { ...prop, key: ctx.id });
}
