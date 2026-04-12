/**
 * ImageList — Component definition via defineComponent()
 */
import React from "react";
import { TbPhoto, TbPhotoScan } from "react-icons/tb";
import { defineComponent } from "../define";
import { ImageList } from "./ImageList";
import {
  staticClasses,
  collectClasses,
  getInlineStyle,
  styleObjToString,
  tag,
  ariaAttrs,
  type ToHTMLFn,
} from "../utils/static-html";

const toHTML: ToHTMLFn = (props, children, ctx) => {
  const cls = staticClasses(props, ctx);
  const style = getInlineStyle(props);
  let extraCls = "";
  const extraStyle: Record<string, string> = {};

  if (props.mode === "grid") {
    extraCls = `grid ${props.gap || "gap-2"}`;
    extraStyle["grid-template-columns"] = `repeat(${props.itemsPerView || 3}, minmax(0, 1fr))`;
  } else if (props.mode === "masonry") {
    extraCls = props.gap || "gap-2";
    extraStyle["column-count"] = String(props.itemsPerView || 3);
  } else if (props.mode === "carousel" || props.mode === "hero" || props.mode === "infinite") {
    extraCls = "relative overflow-hidden";
  }

  collectClasses(extraCls, ctx);
  const fullCls = [cls, extraCls].filter(Boolean).join(" ");
  const fullStyle = [style, styleObjToString(extraStyle)].filter(Boolean).join("; ");

  return tag(
    "div",
    {
      class: fullCls || undefined,
      style: fullStyle || undefined,
      ...ariaAttrs(props),
    },
    children
  );
};
import { ImageListMainTab } from "../chrome/Toolbar/UnifiedSettings/mainTabs/ImageListMainTab";
import { HoverNodeController, DeleteNodeController, SelectImageListTool } from "./editor-chrome";

export const ImageListDef = defineComponent(
  {
    name: "ImageList",
    displayName: "Image List",
    component: ImageList,
    icon: TbPhoto,
    category: "Media",
    canvas: true,
    settings: ImageListMainTab,
    toHTML,
    disable: ["textColor", "bgColor", "pattern", "font", "shadow", "opacity", "hoverClick"],
    rules: {
      canDrag: () => true,
      canMoveIn: nodes => nodes.every(node => node.data?.name === "Image"),
    },
    tools: props => [
      <HoverNodeController
        key="imageListHoverController"
        position="top"
        align="end"
        placement="end"
        alt={{
          position: "bottom",
          align: "start",
          placement: "start",
        }}
      />,
      <SelectImageListTool key="selectImageList" />,
      <DeleteNodeController key="imageListDelete" />,
    ],
    presets: [
      {
        label: "Image Gallery",
        icon: TbPhotoScan,
        props: {
          className: "w-full p-4 flex-row gap-4",
        },
      },
    ],
  },
  { __internal: true }
);
