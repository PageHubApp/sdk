/**
 * Image — Component definition via defineComponent()
 */
import React from "react";
import { defineComponent } from "../define";
import { Image } from "./Image";
import { staticClasses, tag, buildAttrs, getCdnUrl, ariaAttrs, type ToHTMLFn } from "../utils/static-html";

const toHTML: ToHTMLFn = (props, _children, ctx) => {
  const { videoId, content, type } = props;
  const cls = staticClasses(props, ctx);
  const alt = props.alt || props.title || "";
  const title = props.title || "";

  // Inline SVG
  if (type === "svg" && content) {
    const svgCls = `${cls} [&>svg]:max-w-full [&>svg]:max-h-full [&>svg]:w-full [&>svg]:h-full`;
    return tag("div", {
      class: svgCls,
      style: "display: flex; align-items: center; justify-content: center",
      role: alt ? undefined : "presentation",
      "aria-label": alt || undefined,
      ...ariaAttrs(props),
    }, content);
  }

  // Resolve src
  let src = "";
  if (videoId) {
    src = getCdnUrl(videoId, { width: 1280, format: "auto" });
  } else if (content) {
    if (type === "cdn" && !content.startsWith("http") && !content.startsWith("/") && !content.startsWith("data:")) {
      src = getCdnUrl(content, { width: 1280, format: "auto" });
    } else {
      src = content;
    }
  }
  if (!src) return "";

  const imgAttrs: Record<string, any> = {
    src, alt, class: cls || undefined,
    title: title || undefined,
    loading: props.loading || "lazy",
    role: !alt ? "presentation" : undefined,
    fetchpriority: props.fetchPriority || undefined,
    ...ariaAttrs(props),
  };

  const imgTag = `<img${buildAttrs(imgAttrs)} />`;

  if (props.url) {
    return tag("a", {
      href: props.url,
      "aria-label": alt || title || "Image link",
    }, imgTag);
  }
  return imgTag;
};
import { ImageMainTab } from "../chrome/Toolbar/UnifiedSettings/mainTabs/ImageMainTab";
import { ImageGroupSettings } from "./ImageGroupSettings";
import { DeleteNodeController, ImageMediaTool } from "./editor-chrome";

export const ImageDef = defineComponent({
  name: "Image",
  component: Image,
  icon: "TbPhoto",
  category: "Media",
  settings: ImageMainTab,
  toHTML,
  disable: [
    "textColor", "bgColor", "background", "pattern",
    "font", "opacity",
  ],
  hoverClickVariant: "link",
  rules: {
    canDrag: () => true,
    canMoveIn: () => false,
  },
  groupSettings: ImageGroupSettings,
  tools: (props) => [
    <DeleteNodeController key="imageDelete" />,
    <ImageMediaTool key="imageMediaTool" />,
  ],
  presets: [
    {
      label: "Image",
      props: {
        type: "cdn",
        className: "object-cover flex overflow-hidden md:h-auto",
      },
    },
  ],
}, { __internal: true });
