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
  generateSrcSet,
  generateSizes,
  inferFixedSizesFromClassName,
  ariaAttrs,
  type ToHTMLFn,
} from "../../utils/staticHtml";

const RESPONSIVE_WIDTHS = [320, 640, 960, 1280, 1920, 2560];
const RESPONSIVE_SIZES = generateSizes({
  "(max-width: 640px)": "100vw",
  "(max-width: 1024px)": "50vw",
  default: "33vw",
});

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

  // Resolve src + responsive variants for CDN-hosted images
  let src = "";
  let srcset = "";
  let sizesAttr = "";
  let cdnId: string | null = null;
  if (videoId) {
    cdnId = videoId;
  } else if (content) {
    if (
      type === "cdn" &&
      !content.startsWith("http") &&
      !content.startsWith("/") &&
      !content.startsWith("data:")
    ) {
      cdnId = content;
    } else {
      src = content;
    }
  }
  if (cdnId) {
    src = getCdnUrl(cdnId, { width: 1280, format: "auto" });
    srcset = generateSrcSet(cdnId, RESPONSIVE_WIDTHS, { format: "auto" });
    sizesAttr = inferFixedSizesFromClassName(cls) || RESPONSIVE_SIZES;
  }
  if (!src) return "";

  const imgAttrs: Record<string, any> = {
    src,
    srcset: srcset || undefined,
    sizes: srcset ? sizesAttr : undefined,
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
