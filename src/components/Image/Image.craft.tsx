/**
 * Image — Component definition via defineComponent()
 */
import React from "react";
import { TbPhoto } from "react-icons/tb";
import { defineComponent } from "../../define/defineComponent";
import { migrateActions, actionToHref, findLinkAction } from "../../utils/action";
import { Image } from "./Image";
import {
  staticClasses,
  tag,
  buildAttrs,
  getCdnUrl,
  ariaAttrs,
  type ToHTMLFn,
} from "../../utils/staticHtml";

const toHTML: ToHTMLFn = (props, _children, ctx) => {
  const { videoId, type } = props;
  const content = props.src ?? props.content;
  const cls = staticClasses(props, ctx);
  const alt = props.alt || props.title || "";
  const title = props.title || "";

  // Inline SVG
  if (type === "svg" && content) {
    const svgCls = `${cls} [&>svg]:max-w-full [&>svg]:max-h-full [&>svg]:w-full [&>svg]:h-full`;
    return tag(
      "div",
      {
        class: svgCls,
        style: "display: flex; align-items: center; justify-content: center",
        role: alt ? undefined : "presentation",
        "aria-label": alt || undefined,
        ...ariaAttrs(props),
      },
      content
    );
  }

  // Resolve src
  let src = "";
  if (videoId) {
    src = getCdnUrl(videoId, { width: 1280, format: "auto" });
  } else if (content) {
    if (
      type === "cdn" &&
      !content.startsWith("http") &&
      !content.startsWith("/") &&
      !content.startsWith("data:")
    ) {
      src = getCdnUrl(content, { width: 1280, format: "auto" });
    } else {
      src = content;
    }
  }
  if (!src) return "";

  const imgAttrs: Record<string, any> = {
    src,
    alt,
    class: cls || undefined,
    title: title || undefined,
    loading: props.loading || "lazy",
    role: !alt ? "presentation" : undefined,
    fetchpriority: props.fetchPriority || undefined,
    ...ariaAttrs(props),
  };

  const imgTag = `<img${buildAttrs(imgAttrs)} />`;

  const href = actionToHref(findLinkAction(migrateActions(props))) || props.url;
  if (href) {
    return tag(
      "a",
      {
        href,
        "aria-label": alt || title || "Image link",
      },
      imgTag
    );
  }
  return imgTag;
};
const ImageMainTab = React.lazy(() =>
  import("../../chrome/toolbar/inspector/mainTabs/ImageMainTab").then(mod => ({
    default: mod.ImageMainTab,
  }))
);
import { ImageGroupSettings } from "../../chrome/toolbar/inspector/ImageGroupSettings";

export const ImageDef = defineComponent(
  {
    name: "Image",
    component: Image,
    icon: TbPhoto,
    category: "Images",
    settings: ImageMainTab,
    toHTML,
    disable: ["textColor", "bgColor", "background", "pattern", "font", "opacity"],
    hoverClickVariant: "link",
    rules: {
      canDrag: () => true,
      canMoveIn: () => false,
    },
    groupSettings: ImageGroupSettings,
  },
  { __internal: true }
);
