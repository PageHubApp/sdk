/**
 * Image — Component definition via defineComponent()
 */
import React from "react";
import { TbPhoto } from "react-icons/tb";
import { defineComponent } from "../../define/defineComponent";
import { migrateActions, actionToHref, findLinkAction } from "../../utils/action";
import { Image } from "./Image";
import {
  actionsAttr,
  ariaAttrs,
  attrsPassthrough,
  buildAttrs,
  generateSizes,
  generateSrcSet,
  getCdnUrl,
  getPageIndex,
  handlerAttrs,
  inferFixedSizesFromClassName,
  interpolate,
  stateAttrs,
  staticClasses,
  tag,
  type ToHTMLFn,
} from "../../utils/staticHtml";

const RESPONSIVE_WIDTHS = [320, 480, 640, 750, 828, 1080, 1200, 1920, 2048, 3840];
const RESPONSIVE_SIZES = generateSizes({
  "(max-width: 640px)": "100vw",
  "(max-width: 1024px)": "50vw",
  default: "33vw",
});

const toHTML: ToHTMLFn = (props, _children, ctx) => {
  const { videoId, type } = props;
  const rawContent = props.src ?? props.content;
  const content =
    typeof rawContent === "string" && rawContent.includes("{{")
      ? interpolate(rawContent, ctx)
      : rawContent;
  const cls = staticClasses(props, ctx);
  const alt = interpolate(props.alt || props.title || "", ctx);
  const title = interpolate(props.title || "", ctx);

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
        ...handlerAttrs(props),
        ...actionsAttr(props, ctx),
        ...stateAttrs(props, ctx),
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
    const quality = typeof props.quality === "number" ? props.quality : undefined;
    const cdnOpts: Parameters<typeof getCdnUrl>[1] = { width: 1280, format: "auto" };
    if (quality !== undefined) cdnOpts.quality = quality;
    src = getCdnUrl(cdnId, cdnOpts);
    srcset = generateSrcSet(cdnId, RESPONSIVE_WIDTHS, {
      format: "auto",
      ...(quality !== undefined ? { quality } : {}),
    });
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
    ...handlerAttrs(props),
    ...actionsAttr(props, ctx),
    ...stateAttrs(props, ctx),
    ...attrsPassthrough(props),
  };

  const imgTag = `<img${buildAttrs(imgAttrs)} />`;

  const rawHref = actionToHref(findLinkAction(migrateActions(props)), getPageIndex(ctx), ctx?.currentPath) || props.url;
  const href = typeof rawHref === "string" && rawHref.includes("{{")
    ? interpolate(rawHref, ctx)
    : rawHref;
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
