/** Pure body for MapPath. NO `@craftjs/core`. */
import React from "react";
import { TbRoute } from "../_emptyHintIcons";
import type { RenderCtx } from "../../render/react/RenderCtx";
import { BaseSelectorProps, applyAriaProps } from "../selectors";
import { parseLatLngList } from "./parsePath";

export interface MapPathProps extends BaseSelectorProps {
  /** Newline- / semicolon-separated `lat,lng` pairs, in travel order. */
  path?: string;
  /** Stroke colour. Accepts a CSS colour or a var(), e.g. `var(--color-primary)`. */
  color?: string;
  weight?: number;
  opacity?: number;
  dashed?: boolean;
  title?: string;
  /** Visible caption drawn on the route itself. Empty = no caption. */
  label?: string;
}

/**
 * Like MapPoint, the path itself renders nothing on the page — the parent Map
 * reads its props and draws the line. This body is the editor-only chip that
 * makes the node selectable in the layers tree.
 */
export function renderMapPathBody(props: MapPathProps, ctx: RenderCtx) {
  if (!ctx.enabled) return null;
  const points = parseLatLngList(props.path);
  const prop: any = {
    ref: (r: any) => {
      ctx.connect(ctx.drag(r));
    },
    className:
      "flex items-center gap-2 rounded-lg border border-dashed border-base-300 bg-neutral/50 px-3 py-2 text-sm text-neutral-content",
    "data-bounding-box": true,
    "data-empty-state": points.length < 2,
  };
  applyAriaProps(prop, props);
  if (ctx.isMounted) prop["node-id"] = ctx.id;
  const chip =
    props.label ||
    props.title ||
    (points.length >= 2 ? `${points.length} points` : "Add 2+ points");
  prop.children = (
    <>
      <TbRoute className="shrink-0" />
      <span className="truncate">{chip}</span>
    </>
  );
  return React.createElement("div", { ...prop, key: ctx.id });
}
